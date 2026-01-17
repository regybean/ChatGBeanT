import { v } from 'convex/values';

import { action, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { isModelAvailableForTier, isPremiumModel } from './models';

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
 * Send a message to OpenRouter and get a response
 * This is a Convex action that calls the OpenRouter API
 */
export const chat = action({
  args: {
    chatId: v.id('chats'),
    userMessage: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get user to check tier and token limits
    const user = await ctx.runQuery(internal.openrouter.getUser, {
      clerkId: identity.subject,
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if model is available for user's tier
    if (!isModelAvailableForTier(args.model, user.tier)) {
      throw new Error('Model not available for your tier');
    }

    // Check token limits
    const limits = TOKEN_LIMITS[user.tier];
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

    // Get chat history
    const messages = await ctx.runQuery(internal.openrouter.getChatMessages, {
      chatId: args.chatId,
    });

    // Build messages array for OpenRouter
    const openRouterMessages = [
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      { role: 'user' as const, content: args.userMessage },
    ];

    // Get API key from environment
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': 'ChatGBeanT',
      },
      body: JSON.stringify({
        model: args.model,
        messages: openRouterMessages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${errorText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
    };
    const assistantMessage = data.choices[0]?.message?.content ?? '';
    const tokensUsed = data.usage?.total_tokens ?? 1;

    // Save user message
    await ctx.runMutation(internal.openrouter.saveUserMessage, {
      chatId: args.chatId,
      content: args.userMessage,
    });

    // Save assistant message
    await ctx.runMutation(internal.openrouter.saveAssistantMessage, {
      chatId: args.chatId,
      content: assistantMessage,
      model: args.model,
    });

    // Update token usage
    await ctx.runMutation(internal.openrouter.updateTokenUsage, {
      clerkId: identity.subject,
      tokensUsed,
      isPremium,
    });

    return {
      content: assistantMessage,
      model: args.model,
    };
  },
});

/**
 * Internal query to get user by Clerk ID
 */
export const getUser = internalMutation({
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

/**
 * Internal query to get chat messages
 */
export const getChatMessages = internalMutation({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('messages')
      .withIndex('by_chat_created', (q) => q.eq('chatId', args.chatId))
      .order('asc')
      .collect();
  },
});

/**
 * Internal mutation to save user message
 */
export const saveUserMessage = internalMutation({
  args: {
    chatId: v.id('chats'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert('messages', {
      chatId: args.chatId,
      role: 'user',
      content: args.content,
      createdAt: now,
    });
    await ctx.db.patch(args.chatId, {
      updatedAt: now,
    });
  },
});

/**
 * Internal mutation to save assistant message
 */
export const saveAssistantMessage = internalMutation({
  args: {
    chatId: v.id('chats'),
    content: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const chat = await ctx.db.get(args.chatId);

    await ctx.db.insert('messages', {
      chatId: args.chatId,
      role: 'assistant',
      content: args.content,
      model: args.model,
      createdAt: now,
    });

    // Auto-generate title if not set
    if (chat && !chat.title) {
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_chat_created', (q) => q.eq('chatId', args.chatId))
        .order('asc')
        .take(1);

      if (messages.length > 0 && messages[0]) {
        const firstMessage = messages[0].content;
        const title =
          firstMessage.length > 50
            ? firstMessage.substring(0, 47) + '...'
            : firstMessage;

        await ctx.db.patch(args.chatId, {
          title,
          updatedAt: now,
        });
      }
    } else {
      await ctx.db.patch(args.chatId, {
        updatedAt: now,
      });
    }
  },
});

/**
 * Internal mutation to update token usage
 */
export const updateTokenUsage = internalMutation({
  args: {
    clerkId: v.string(),
    tokensUsed: v.number(),
    isPremium: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .first();

    if (!user) return;

    if (args.isPremium) {
      await ctx.db.patch(user._id, {
        premiumTokensUsed: user.premiumTokensUsed + args.tokensUsed,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(user._id, {
        basicTokensUsed: user.basicTokensUsed + args.tokensUsed,
        updatedAt: Date.now(),
      });
    }
  },
});
