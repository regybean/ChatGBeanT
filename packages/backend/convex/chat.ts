import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { action, mutation, query, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { listUIMessages, syncStreams, vStreamArgs } from '@convex-dev/agent';
import { chatAgent, createAgentWithModel } from './agent';
import { rateLimiter } from './rateLimiterConfig';
import { isModelAvailableForTier, isPremiumModel, BASIC_MODELS } from './models';
import { components } from './_generated/api';

const TOKEN_LIMITS = {
    basic: {
        basicTokens: 100,
        premiumTokens: 0,
    },
    pro: {
        basicTokens: 1000,
        premiumTokens: 100,
    },
} as const;

/**
 * Create a new thread
 */
export const createThread = mutation({
    args: {
        model: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const user = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
            .first();

        if (!user) {
            throw new Error('User not found. Please sign in again.');
        }

        const model = args.model ?? BASIC_MODELS[0]!.id;

        // Create agent thread
        const { threadId } = await chatAgent.createThread(ctx, {});

        const now = Date.now();
        const userThreadId = await ctx.db.insert('userThreads', {
            userId: user._id,
            threadId,
            model,
            createdAt: now,
            updatedAt: now,
        });

        return { userThreadId, threadId };
    },
});

/**
 * List all threads for current user
 */
export const listThreads = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }

        const user = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
            .first();

        if (!user) {
            return [];
        }

        const threads = await ctx.db
            .query('userThreads')
            .withIndex('by_user_updated', (q) => q.eq('userId', user._id))
            .order('desc')
            .collect();

        return threads;
    },
});

/**
 * Get a specific thread
 */
export const getThread = query({
    args: {
        threadId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }

        const user = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
            .first();

        if (!user) {
            return null;
        }

        const userThread = await ctx.db
            .query('userThreads')
            .withIndex('by_thread_id', (q) => q.eq('threadId', args.threadId))
            .first();

        if (!userThread || userThread.userId !== user._id) {
            return null;
        }

        return userThread;
    },
});

/**
 * Delete a thread
 */
export const deleteThread = action({
    args: {
        threadId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        // Get user
        const user = await ctx.runQuery(internal.chat.getUser, {
            clerkId: identity.subject,
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Verify ownership of thread
        const userThread = await ctx.runQuery(internal.chat.getUserThread, {
            threadId: args.threadId,
        });

        if (!userThread || userThread.userId !== user._id) {
            throw new Error('Thread not found');
        }

        // Delete the agent thread
        await chatAgent.deleteThreadSync(ctx, { threadId: args.threadId });

        // Delete the userThread record
        await ctx.runMutation(internal.chat.deleteUserThread, {
            userThreadId: userThread._id,
        });
    },
});

/**
 * Send a message and get a streaming response
 */
export const sendMessage = action({
    args: {
        threadId: v.string(),
        content: v.string(),
        model: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        // Get user to check tier and token limits
        const user = await ctx.runQuery(internal.chat.getUser, {
            clerkId: identity.subject,
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Verify ownership of thread
        const userThread = await ctx.runQuery(internal.chat.getUserThread, {
            threadId: args.threadId,
        });

        if (!userThread || userThread.userId !== user._id) {
            throw new Error('Thread not found');
        }

        // Check if model is available for user's tier
        if (!isModelAvailableForTier(args.model, user.tier)) {
            throw new Error('Model not available for your tier');
        }

        // Check token limits
        const limits = TOKEN_LIMITS[user.tier as keyof typeof TOKEN_LIMITS];
        const isPremium = isPremiumModel(args.model);

        if (isPremium) {
            if (user.premiumTokensUsed >= limits.premiumTokens) {
                throw new Error('Premium token limit reached');
            }
        } else {
            if (user.basicTokensUsed >= limits.basicTokens) {
                throw new Error('Basic token limit reached');
            }
        }

        // Check burst rate limit
        const { ok, retryAfter } = await rateLimiter.check(ctx, 'sendMessage', {
            key: user._id,
        });

        if (!ok) {
            throw new Error(
                `Rate limit exceeded. Please wait ${Math.ceil(retryAfter / 1000)} seconds.`
            );
        }

        // Create agent with the requested model
        const agent = createAgentWithModel(args.model);

        // Stream the response using the agent with delta streaming enabled
        await agent.streamText(
            ctx,
            { threadId: args.threadId },
            {
                prompt: args.content,
            },
            {
                // Enable delta streaming so messages update in real-time
                saveStreamDeltas: true,
            }
        );

        // Update token usage (+1 per message)
        await ctx.runMutation(internal.chat.updateTokenUsage, {
            userId: user._id,
            isPremium,
        });

        // Update thread title if needed
        await ctx.runMutation(internal.chat.maybeUpdateThreadTitle, {
            userThreadId: userThread._id,
            threadId: args.threadId,
            content: args.content,
        });

        // Update thread timestamp
        await ctx.runMutation(internal.chat.updateThreadTimestamp, {
            userThreadId: userThread._id,
        });

        return { threadId: args.threadId };
    },
});

/**
 * List messages for a thread with streaming support
 * This query is designed to work with useUIMessages hook
 */
export const listMessages = query({
    args: {
        threadId: v.string(),
        paginationOpts: paginationOptsValidator,
        streamArgs: vStreamArgs,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const user = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
            .first();

        if (!user) {
            throw new Error('User not found');
        }

        // Verify ownership
        const userThread = await ctx.db
            .query('userThreads')
            .withIndex('by_thread_id', (q) => q.eq('threadId', args.threadId))
            .first();

        if (!userThread || userThread.userId !== user._id) {
            throw new Error('Thread not found');
        }

        // Get messages using listUIMessages for UI-friendly format
        const paginated = await listUIMessages(ctx, components.agent, {
            threadId: args.threadId,
            paginationOpts: args.paginationOpts,
        });

        // Sync streams for real-time streaming updates
        const streams = await syncStreams(ctx, components.agent, {
            threadId: args.threadId,
            streamArgs: args.streamArgs,
        });

        return { ...paginated, streams };
    },
});

// Internal queries and mutations

export const getUser = internalQuery({
    args: {
        clerkId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
            .first();
    },
});

export const getUserThread = internalQuery({
    args: {
        threadId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('userThreads')
            .withIndex('by_thread_id', (q) => q.eq('threadId', args.threadId))
            .first();
    },
});

export const updateTokenUsage = internalMutation({
    args: {
        userId: v.id('users'),
        isPremium: v.boolean(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return;

        if (args.isPremium) {
            await ctx.db.patch(args.userId, {
                premiumTokensUsed: user.premiumTokensUsed + 1,
                updatedAt: Date.now(),
            });
        } else {
            await ctx.db.patch(args.userId, {
                basicTokensUsed: user.basicTokensUsed + 1,
                updatedAt: Date.now(),
            });
        }
    },
});

export const maybeUpdateThreadTitle = internalMutation({
    args: {
        userThreadId: v.id('userThreads'),
        threadId: v.string(),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const userThread = await ctx.db.get(args.userThreadId);
        if (!userThread || userThread.title) return;

        // Generate title from first message
        const title =
            args.content.length > 50
                ? args.content.substring(0, 47) + '...'
                : args.content;

        await ctx.db.patch(args.userThreadId, {
            title,
            updatedAt: Date.now(),
        });
    },
});

export const updateThreadTimestamp = internalMutation({
    args: {
        userThreadId: v.id('userThreads'),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userThreadId, {
            updatedAt: Date.now(),
        });
    },
});

export const deleteUserThread = internalMutation({
    args: {
        userThreadId: v.id('userThreads'),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.userThreadId);
    },
});
