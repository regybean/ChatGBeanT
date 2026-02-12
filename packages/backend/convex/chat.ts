import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { action, mutation, query, internalAction, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { listUIMessages, syncStreams, vStreamArgs } from '@convex-dev/agent';
import { chatAgent, createAgentWithModel, createLanguageModel } from './agent';
import { rateLimiter } from './rateLimiterConfig';
import { isModelAvailableForTier, isPremiumModel, BASIC_MODELS } from './models';
import { components } from './_generated/api';

// ─── Title generation constants ──────────────────
const TITLE_UPDATE_INTERVAL = 5;    // Generate/update title every N user messages
const TITLE_CONTEXT_MESSAGES = 15;  // Use last N messages for title generation
const TITLE_MODEL = 'openrouter/auto'; // Free model for title generation

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

        let userId;
        if (!user) {
            // Create user if not found (first time user)
            const now = Date.now();
            userId = await ctx.db.insert('users', {
                clerkId: identity.subject,
                email: identity.email ?? '',
                name: identity.name,
                imageUrl: identity.pictureUrl,
                tier: 'basic',
                role: 'user',
                basicTokensUsed: 0,
                premiumTokensUsed: 0,
                lastTokenReset: now,
                createdAt: now,
                updatedAt: now,
            });
        } else {
            userId = user._id;
        }

        const model = args.model ?? BASIC_MODELS[0]!.id;

        // Create agent thread
        const { threadId } = await chatAgent.createThread(ctx, {});

        const nowTs = Date.now();
        const userThreadId = await ctx.db.insert('userThreads', {
            userId: userId,
            threadId,
            model,
            createdAt: nowTs,
            updatedAt: nowTs,
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
        fileIds: v.optional(v.array(v.string())),
        documentIds: v.optional(v.array(v.id('documents'))),
        mediaUrls: v.optional(v.array(v.string())),
        threadIds: v.optional(v.array(v.string())),
        duration: v.optional(v.number()),
        aspectRatio: v.optional(v.string()),
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

        // Fetch user BYOK keys
        const byokKeys = await ctx.runQuery(internal.chat.getUserByokKeys, {
            userId: user._id,
        });

        // Look up model info to determine output type and tier
        const modelInfo = await ctx.runQuery(internal.openrouter.internalGetModel, {
            openRouterId: args.model,
        });
        const modelTier = modelInfo?.tier ?? 'basic';
        const isFalProvider = modelInfo?.provider === 'FalAI' || args.model.startsWith('fal-ai/');

        // Resolve which API key to use
        let resolvedOpenRouterKey: string | undefined;
        let resolvedFalKey: string | undefined;

        if (modelTier === 'premium' || isFalProvider) {
            if (user.tier === 'pro') {
                // Pro users use system keys
                resolvedOpenRouterKey = undefined; // will fallback to env
                resolvedFalKey = undefined;
            } else if (isFalProvider && byokKeys?.falApiKey) {
                resolvedFalKey = byokKeys.falApiKey;
            } else if (!isFalProvider && byokKeys?.openRouterApiKey) {
                resolvedOpenRouterKey = byokKeys.openRouterApiKey;
            } else if (isFalProvider) {
                throw new Error('This model requires Pro or your own fal.ai API key. Visit Settings to add your key.');
            } else {
                // Check old access control for non-BYOK users
                if (!isModelAvailableForTier(args.model, user.tier)) {
                    throw new Error('This model requires Pro or your own API key. Visit Settings to add your key.');
                }
            }
        } else {
            // Basic model — use BYOK key if available, otherwise system key
            if (byokKeys?.openRouterApiKey) {
                resolvedOpenRouterKey = byokKeys.openRouterApiKey;
            }
        }

        // Check token limits
        const limits = TOKEN_LIMITS[user.tier as keyof typeof TOKEN_LIMITS];
        const isPremium = isPremiumModel(args.model);

        if (isPremium) {
            if (user.premiumTokensUsed >= limits.premiumTokens && user.tier !== 'basic') {
                throw new Error('Premium token limit reached');
            }
            // BYOK users on basic tier bypass premium token limits
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

        const outputModalities = modelInfo?.outputModalities ?? [];
        const isImageModel = outputModalities.includes('image');
        const isVideoModel = outputModalities.includes('video');
        const isFalModel = isFalProvider;

        // ─── FalAI image generation path ───────────────
        if (isFalModel && isImageModel) {

            const mediaId = await ctx.runMutation(internal.media.createMediaRecord, {
                userId: user._id,
                threadId: args.threadId,
                type: 'image',
                prompt: args.content,
                model: args.model,
                provider: 'fal',
            });

            // Resolve attached image URLs for image-to-image models
            const imageUrls: string[] = [];
            if (args.fileIds && args.fileIds.length > 0) {
                for (const fileId of args.fileIds) {
                    const url = await ctx.storage.getUrl(fileId as Id<'_storage'>);
                    if (url) imageUrls.push(url);
                }
            }

            // Save user message with image markers if files attached
            const imageMarkers = imageUrls.map((url) => `[ATTACHED_IMAGE:${url}]`).join('\n');
            const userMessageContent = imageMarkers ? `${imageMarkers}\n${args.content}` : args.content;
            await chatAgent.saveMessage(ctx, {
                threadId: args.threadId,
                prompt: userMessageContent,
            });

            // Schedule image generation via FalAI
            await ctx.scheduler.runAfter(0, internal.fal.submitImageGeneration, {
                mediaId,
                threadId: args.threadId,
                model: args.model,
                prompt: args.content,
                ...(imageUrls.length > 0 ? { imageUrls } : {}),
                ...(resolvedFalKey ? { falApiKey: resolvedFalKey } : {}),
            });

            // Add placeholder assistant message with media reference
            await chatAgent.saveMessage(ctx, {
                threadId: args.threadId,
                message: { role: 'assistant', content: `[GENERATED_IMAGE:${mediaId}]` },
            });

            await ctx.runMutation(internal.chat.updateTokenUsage, { userId: user._id, isPremium: true });
            await ctx.runMutation(internal.settings.internalUpdateLastUsedModel, { userId: user._id, model: args.model });
            await ctx.runMutation(internal.chat.maybeUpdateThreadTitle, { userThreadId: userThread._id, threadId: args.threadId, content: args.content });
            await ctx.runMutation(internal.chat.updateThreadTimestamp, { userThreadId: userThread._id });

            return { threadId: args.threadId };
        }

        // ─── FalAI video generation path ───────────────
        if (isFalModel && isVideoModel) {

            const mediaId = await ctx.runMutation(internal.media.createMediaRecord, {
                userId: user._id,
                threadId: args.threadId,
                type: 'video',
                prompt: args.content,
                model: args.model,
                provider: 'fal',
            });

            // Resolve attached image URLs for image-to-video models
            const imageUrls: string[] = [];
            if (args.fileIds && args.fileIds.length > 0) {
                for (const fileId of args.fileIds) {
                    const url = await ctx.storage.getUrl(fileId as Id<'_storage'>);
                    if (url) imageUrls.push(url);
                }
            }

            // Save user message with image markers if files attached
            const imageMarkers = imageUrls.map((url) => `[ATTACHED_IMAGE:${url}]`).join('\n');
            const userMessageContent = imageMarkers ? `${imageMarkers}\n${args.content}` : args.content;
            await chatAgent.saveMessage(ctx, {
                threadId: args.threadId,
                prompt: userMessageContent,
            });

            // Schedule video generation via FalAI queue
            await ctx.scheduler.runAfter(0, internal.fal.submitVideoGeneration, {
                mediaId,
                threadId: args.threadId,
                model: args.model,
                prompt: args.content,
                ...(imageUrls.length > 0 ? { imageUrls } : {}),
                ...(args.duration ? { duration: args.duration } : {}),
                ...(args.aspectRatio ? { aspectRatio: args.aspectRatio } : {}),
                ...(resolvedFalKey ? { falApiKey: resolvedFalKey } : {}),
            });

            // Add placeholder assistant message
            await chatAgent.saveMessage(ctx, {
                threadId: args.threadId,
                message: { role: 'assistant', content: `[GENERATED_VIDEO:${mediaId}]` },
            });

            await ctx.runMutation(internal.chat.updateTokenUsage, { userId: user._id, isPremium: true });
            await ctx.runMutation(internal.settings.internalUpdateLastUsedModel, { userId: user._id, model: args.model });
            await ctx.runMutation(internal.chat.maybeUpdateThreadTitle, { userThreadId: userThread._id, threadId: args.threadId, content: args.content });
            await ctx.runMutation(internal.chat.updateThreadTimestamp, { userThreadId: userThread._id });

            return { threadId: args.threadId };
        }

        // ─── OpenRouter Image generation path ─────────────────────
        if (isImageModel) {
            console.log(`[openrouter:image] Starting image generation with model=${args.model}`);

            // Create media record
            const mediaId = await ctx.runMutation(internal.media.createMediaRecord, {
                userId: user._id,
                threadId: args.threadId,
                type: 'image',
                prompt: args.content,
                model: args.model,
                provider: 'openrouter',
            });

            // Add user message via the default agent
            await chatAgent.saveMessage(ctx, {
                threadId: args.threadId,
                prompt: args.content,
            });

            try {
                // Update status to generating
                await ctx.runMutation(internal.media.updateMediaStatus, {
                    mediaId,
                    status: 'generating',
                });

                const orKey = resolvedOpenRouterKey ?? process.env.OPENROUTER_API_KEY;
                console.log(`[openrouter:image] Calling OpenRouter API for model=${args.model}, hasApiKey=${!!orKey}, byok=${!!resolvedOpenRouterKey}`);

                // Call OpenRouter API for image generation
                // Include modalities param so models like gpt-5-image know to generate images
                const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${orKey}`,
                    },
                    body: JSON.stringify({
                        model: args.model,
                        messages: [{ role: 'user', content: args.content }],
                        modalities: ['text', 'image'],
                    }),
                });

                console.log(`[openrouter:image] Response status: ${apiResponse.status}`);

                if (!apiResponse.ok) {
                    const errBody = await apiResponse.text();
                    console.log(`[openrouter:image] Error response: ${errBody}`);
                    throw new Error(`${apiResponse.status}: ${errBody || apiResponse.statusText}`);
                }

                const result = await apiResponse.json() as {
                    choices?: Array<{
                        message?: {
                            content?: string | Array<{
                                type: string;
                                image_url?: { url: string };
                            }>;
                            // OpenRouter returns images in a separate array
                            images?: Array<{
                                type: string;
                                image_url?: { url: string };
                            }>;
                        };
                    }>;
                };

                console.log(`[openrouter:image] Response has choices: ${!!result.choices?.length}, message keys: ${Object.keys(result.choices?.[0]?.message ?? {}).join(',')}`);

                // Extract image URL from response
                let imageUrl: string | undefined;
                const message = result.choices?.[0]?.message;
                const content = message?.content;

                // 1. Check the images array (OpenRouter/OpenAI image models)
                if (message?.images && message.images.length > 0) {
                    imageUrl = message.images[0]?.image_url?.url;
                }

                // 2. Fall back to checking content
                if (!imageUrl && typeof content === 'string') {
                    // Check for markdown image or URL in text
                    const urlMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/) ??
                        content.match(/(https?:\/\/[^\s]+\.(png|jpg|jpeg|webp|gif))/i);
                    imageUrl = urlMatch?.[1];
                    if (!imageUrl && content.startsWith('data:image/')) {
                        imageUrl = content;
                    }
                } else if (!imageUrl && Array.isArray(content)) {
                    const imageBlock = content.find((c) => c.type === 'image_url');
                    imageUrl = imageBlock?.image_url?.url;
                }

                console.log(`[openrouter:image] Extracted imageUrl: ${imageUrl ? `${imageUrl.substring(0, 80)}...` : 'none'}`);

                if (imageUrl) {
                    let storageId: string | undefined;

                    // If it's a URL (not base64), download and store in Convex
                    if (imageUrl.startsWith('http')) {
                        const imgResponse = await fetch(imageUrl);
                        if (imgResponse.ok) {
                            const blob = await imgResponse.blob();
                            storageId = await ctx.storage.store(blob);
                        }
                    } else if (imageUrl.startsWith('data:image/')) {
                        // Decode base64
                        const [header, base64Data] = imageUrl.split(',');
                        if (base64Data) {
                            const mimeMatch = header?.match(/data:([^;]+)/);
                            const mimeType = mimeMatch?.[1] ?? 'image/png';
                            const binaryData = atob(base64Data);
                            const bytes = new Uint8Array(binaryData.length);
                            for (let i = 0; i < binaryData.length; i++) {
                                bytes[i] = binaryData.charCodeAt(i);
                            }
                            const blob = new Blob([bytes], { type: mimeType });
                            storageId = await ctx.storage.store(blob);
                        }
                    }

                    // Get public URL if stored
                    let publicUrl = imageUrl;
                    if (storageId) {
                        const sUrl = await ctx.storage.getUrl(storageId);
                        if (sUrl) publicUrl = sUrl;
                    }

                    await ctx.runMutation(internal.media.updateMediaStatus, {
                        mediaId,
                        status: 'completed',
                        url: publicUrl,
                        ...(storageId ? { storageId: storageId as never } : {}),
                    });

                    // Add assistant message with media reference
                    await chatAgent.saveMessage(ctx, {
                        threadId: args.threadId,
                        message: { role: 'assistant', content: `[GENERATED_IMAGE:${mediaId}]` },
                    });
                } else {
                    // No image extracted - treat response as text
                    const textContent = typeof content === 'string' ? content : 'Image generation did not return an image.';
                    await ctx.runMutation(internal.media.updateMediaStatus, {
                        mediaId,
                        status: 'failed',
                        errorMessage: 'No image in response',
                    });
                    await chatAgent.saveMessage(ctx, {
                        threadId: args.threadId,
                        message: { role: 'assistant', content: textContent },
                    });
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                await ctx.runMutation(internal.media.updateMediaStatus, {
                    mediaId,
                    status: 'failed',
                    errorMessage: errorMsg,
                });
                await chatAgent.saveMessage(ctx, {
                    threadId: args.threadId,
                    message: { role: 'assistant', content: `Image generation failed: ${errorMsg}` },
                });
            }

            // Update token usage + tracking
            await ctx.runMutation(internal.chat.updateTokenUsage, {
                userId: user._id,
                isPremium: true,
            });
            await ctx.runMutation(internal.settings.internalUpdateLastUsedModel, {
                userId: user._id,
                model: args.model,
            });
            await ctx.runMutation(internal.chat.maybeUpdateThreadTitle, {
                userThreadId: userThread._id,
                threadId: args.threadId,
                content: args.content,
            });
            await ctx.runMutation(internal.chat.updateThreadTimestamp, {
                userThreadId: userThread._id,
            });

            return { threadId: args.threadId };
        }

        // ─── Text generation path (existing) ───────────
        // Create agent with the requested model (with BYOK key if available)
        const agent = createAgentWithModel(args.model, resolvedOpenRouterKey);

        // Fetch attached document content and prepend to message
        let messageContent = args.content;
        if (args.documentIds && args.documentIds.length > 0) {
            const docContents: string[] = [];
            for (const docId of args.documentIds) {
                const doc = await ctx.runQuery(internal.documents.internalGetDocument, {
                    documentId: docId,
                });
                if (doc?.content) {
                    // Parse BlockNote JSON to extract plain text
                    try {
                        const blocks = JSON.parse(doc.content) as Array<{
                            content?: Array<{ text?: string }>;
                        }>;
                        const text = blocks
                            .map((b) =>
                                (b.content ?? [])
                                    .map((c) => c.text ?? '')
                                    .join(''),
                            )
                            .filter(Boolean)
                            .join('\n');
                        if (text) {
                            docContents.push(`[Document: ${doc.title}]\n${text}`);
                        }
                    } catch {
                        // Fallback: include raw content
                        docContents.push(`[Document: ${doc.title}]\n${doc.content}`);
                    }
                }
            }
            if (docContents.length > 0) {
                messageContent = `${docContents.join('\n\n')}\n\n---\n\n${args.content}`;
            }
        }

        // Fetch attached thread content and prepend to message
        if (args.threadIds && args.threadIds.length > 0) {
            const threadContents: string[] = [];
            for (const tid of args.threadIds) {
                const threadInfo = await ctx.runQuery(internal.chat.getUserThread, { threadId: tid });
                if (threadInfo) {
                    const threadMessages = await ctx.runQuery(internal.chat.getThreadMessagesInternal, { threadId: tid });
                    const messagesText = threadMessages
                        .map((m: { role: string; text?: string }) => `${m.role}: ${m.text ?? ''}`)
                        .join('\n');
                    threadContents.push(`[Thread: ${threadInfo.title ?? 'Untitled'}]\n${messagesText}`);
                }
            }
            if (threadContents.length > 0) {
                messageContent = `${threadContents.join('\n\n')}\n\n---\n\n${messageContent}`;
            }
        }

        // Append media URLs as attached images
        if (args.mediaUrls && args.mediaUrls.length > 0) {
            const mediaMarkers = args.mediaUrls.map((url) => `[ATTACHED_IMAGE:${url}]`).join('\n');
            messageContent = `${mediaMarkers}\n${messageContent}`;
        }

        // Build message content - support file attachments
        if (args.fileIds && args.fileIds.length > 0) {
            const parts: Array<{ type: string; text?: string; image?: string; mimeType?: string }> = [];

            // Resolve file URLs and embed markers in message text for display
            const imageUrls: string[] = [];
            for (const fileId of args.fileIds) {
                const url = await ctx.storage.getUrl(fileId as never);
                if (url) {
                    imageUrls.push(url);
                    parts.push({ type: 'image', image: url });
                }
            }

            // Prepend image markers so message-bubble can render them
            const imageMarkers = imageUrls.map((url) => `[ATTACHED_IMAGE:${url}]`).join('\n');
            const textWithMarkers = imageMarkers ? `${imageMarkers}\n${messageContent}` : messageContent;
            parts.unshift({ type: 'text', text: textWithMarkers });

            await agent.streamText(
                ctx,
                { threadId: args.threadId },
                {
                    messages: [{ role: 'user', content: parts as never }],
                },
                {
                    saveStreamDeltas: true,
                }
            );
        } else {
            // Stream the response using the agent with delta streaming enabled
            await agent.streamText(
                ctx,
                { threadId: args.threadId },
                {
                    prompt: messageContent,
                },
                {
                    // Enable delta streaming so messages update in real-time
                    saveStreamDeltas: true,
                }
            );
        }

        // Update token usage (+1 per message)
        await ctx.runMutation(internal.chat.updateTokenUsage, {
            userId: user._id,
            isPremium,
        });

        // Track last used model
        await ctx.runMutation(internal.settings.internalUpdateLastUsedModel, {
            userId: user._id,
            model: args.model,
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

export const getUserByokKeys = internalQuery({
    args: {
        userId: v.id('users'),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return null;
        return {
            openRouterApiKey: user.openRouterApiKey,
            falApiKey: user.falApiKey,
            hasByok: !!user.hasByok,
        };
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

export const getThreadMessagesInternal = internalQuery({
    args: {
        threadId: v.string(),
    },
    handler: async (ctx, args) => {
        const paginated = await listUIMessages(ctx, components.agent, {
            threadId: args.threadId,
            paginationOpts: { cursor: null, numItems: 100 },
        });
        return paginated.page;
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
        if (!userThread) return;

        // Never auto-rename manually renamed threads
        if (userThread.manuallyRenamed) return;

        // Increment message count
        const newCount = (userThread.messageCount ?? 0) + 1;
        await ctx.db.patch(args.userThreadId, {
            messageCount: newCount,
            updatedAt: Date.now(),
        });

        // Schedule AI title generation on first message or every TITLE_UPDATE_INTERVAL messages
        const lastUpdate = userThread.lastTitleUpdateAt ?? 0;
        if (newCount === 1 || newCount - lastUpdate >= TITLE_UPDATE_INTERVAL) {
            await ctx.scheduler.runAfter(0, internal.chat.generateThreadTitle, {
                userThreadId: userThread._id,
                threadId: args.threadId,
                messageCount: newCount,
            });
        }
    },
});

export const generateThreadTitle = internalAction({
    args: {
        userThreadId: v.id('userThreads'),
        threadId: v.string(),
        messageCount: v.number(),
    },
    handler: async (ctx, args) => {
        try {
            // Fetch recent messages for context
            const messages = await ctx.runQuery(internal.chat.getThreadMessagesInternal, {
                threadId: args.threadId,
            });

            const recentMessages = messages.slice(-TITLE_CONTEXT_MESSAGES);
            if (recentMessages.length === 0) return;

            const conversationSummary = recentMessages
                .map((m: { role: string; text?: string }) => `${m.role}: ${m.text ?? ''}`)
                .join('\n');

            // Call OpenRouter free model for title generation
            const model = createLanguageModel(TITLE_MODEL);
            const { generateText } = await import('ai');
            const result = await generateText({
                model,
                prompt: `Generate a short, descriptive title (max 50 characters) for this conversation. Return ONLY the title text, nothing else. No quotes, no prefixes.\n\nConversation:\n${conversationSummary}`,
            });

            const title = result.text.trim().replace(/^["']|["']$/g, '').substring(0, 50);
            if (title) {
                await ctx.runMutation(internal.chat.setThreadTitle, {
                    userThreadId: args.userThreadId,
                    title,
                    messageCount: args.messageCount,
                });
            }
        } catch (error) {
            // Silently fail — title generation is non-critical
            console.error('Title generation failed:', error);
        }
    },
});

export const setThreadTitle = internalMutation({
    args: {
        userThreadId: v.id('userThreads'),
        title: v.string(),
        messageCount: v.number(),
    },
    handler: async (ctx, args) => {
        const userThread = await ctx.db.get(args.userThreadId);
        if (!userThread || userThread.manuallyRenamed) return;

        await ctx.db.patch(args.userThreadId, {
            title: args.title,
            lastTitleUpdateAt: args.messageCount,
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

/**
 * Rename a thread
 */
export const renameThread = mutation({
    args: {
        threadId: v.string(),
        title: v.string(),
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

        const userThread = await ctx.db
            .query('userThreads')
            .withIndex('by_thread_id', (q) => q.eq('threadId', args.threadId))
            .first();

        if (!userThread || userThread.userId !== user._id) {
            throw new Error('Thread not found');
        }

        await ctx.db.patch(userThread._id, {
            title: args.title.trim(),
            manuallyRenamed: true,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Toggle pin status of a thread
 */
export const togglePinThread = mutation({
    args: {
        threadId: v.string(),
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

        const userThread = await ctx.db
            .query('userThreads')
            .withIndex('by_thread_id', (q) => q.eq('threadId', args.threadId))
            .first();

        if (!userThread || userThread.userId !== user._id) {
            throw new Error('Thread not found');
        }

        const isPinned = !userThread.isPinned;
        await ctx.db.patch(userThread._id, {
            isPinned,
            pinnedAt: isPinned ? Date.now() : undefined,
            updatedAt: Date.now(),
        });
    },
});

/**
 * List threads grouped by date
 */
export const listThreadsGrouped = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return { groups: [], pinned: [], today: [], last7Days: [], last30Days: [], older: [] };
        }

        const user = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
            .first();

        if (!user) {
            return { groups: [], pinned: [], today: [], last7Days: [], last30Days: [], older: [] };
        }

        const threads = await ctx.db
            .query('userThreads')
            .withIndex('by_user_updated', (q) => q.eq('userId', user._id))
            .order('desc')
            .collect();

        // Fetch user's thread groups
        const userGroups = await ctx.db
            .query('threadGroups')
            .withIndex('by_user_order', (q) => q.eq('userId', user._id))
            .collect();

        const now = Date.now();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayMs = todayStart.getTime();
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

        const pinned: typeof threads = [];
        const today: typeof threads = [];
        const last7Days: typeof threads = [];
        const last30Days: typeof threads = [];
        const older: typeof threads = [];

        // Build group maps
        const groupThreadsMap = new Map<string, typeof threads>();
        for (const g of userGroups) {
            groupThreadsMap.set(g._id, []);
        }

        for (const thread of threads) {
            if (thread.groupId && groupThreadsMap.has(thread.groupId)) {
                groupThreadsMap.get(thread.groupId)!.push(thread);
            } else if (thread.isPinned) {
                pinned.push(thread);
            } else if (thread.updatedAt >= todayMs) {
                today.push(thread);
            } else if (thread.updatedAt >= sevenDaysAgo) {
                last7Days.push(thread);
            } else if (thread.updatedAt >= thirtyDaysAgo) {
                last30Days.push(thread);
            } else {
                older.push(thread);
            }
        }

        // Sort pinned by pinnedAt descending
        pinned.sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));

        const groups = userGroups.map((g) => ({
            _id: g._id,
            name: g.name,
            threads: groupThreadsMap.get(g._id) ?? [],
        }));

        return { groups, pinned, today, last7Days, last30Days, older };
    },
});

/**
 * Search threads by title
 */
export const searchThreads = query({
    args: {
        searchTerm: v.string(),
    },
    handler: async (ctx, args) => {
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

        const search = args.searchTerm.toLowerCase();
        return threads.filter((thread) => {
            const title = thread.title ?? 'New conversation';
            return title.toLowerCase().includes(search);
        });
    },
});

/**
 * Update model for a thread
 */
export const updateThreadModel = mutation({
    args: {
        threadId: v.string(),
        model: v.string(),
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

        const userThread = await ctx.db
            .query('userThreads')
            .withIndex('by_thread_id', (q) => q.eq('threadId', args.threadId))
            .first();

        if (!userThread || userThread.userId !== user._id) {
            throw new Error('Thread not found');
        }

        await ctx.db.patch(userThread._id, {
            model: args.model,
            updatedAt: Date.now(),
        });
    },
});

// ─── Group CRUD ─────────────────────────────────────────────

/**
 * Create a new thread group
 */
export const createGroup = mutation({
    args: {
        name: v.string(),
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

        // Determine order: one more than the current max
        const existing = await ctx.db
            .query('threadGroups')
            .withIndex('by_user_order', (q) => q.eq('userId', user._id))
            .collect();

        const maxOrder = existing.reduce((max, g) => Math.max(max, g.order), -1);

        const now = Date.now();
        return await ctx.db.insert('threadGroups', {
            userId: user._id,
            name: args.name.trim(),
            order: maxOrder + 1,
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Rename a thread group
 */
export const renameGroup = mutation({
    args: {
        groupId: v.id('threadGroups'),
        name: v.string(),
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

        const group = await ctx.db.get(args.groupId);
        if (!group || group.userId !== user._id) {
            throw new Error('Group not found');
        }

        await ctx.db.patch(args.groupId, {
            name: args.name.trim(),
            updatedAt: Date.now(),
        });
    },
});

/**
 * Delete a thread group (ungroups all threads first)
 */
export const deleteGroup = mutation({
    args: {
        groupId: v.id('threadGroups'),
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

        const group = await ctx.db.get(args.groupId);
        if (!group || group.userId !== user._id) {
            throw new Error('Group not found');
        }

        // Ungroup all threads in this group
        const threadsInGroup = await ctx.db
            .query('userThreads')
            .withIndex('by_group', (q) => q.eq('groupId', args.groupId))
            .collect();

        for (const thread of threadsInGroup) {
            await ctx.db.patch(thread._id, {
                groupId: undefined,
                updatedAt: Date.now(),
            });
        }

        await ctx.db.delete(args.groupId);
    },
});

/**
 * Move a thread to a group (or remove from group)
 */
export const moveThreadToGroup = mutation({
    args: {
        threadId: v.string(),
        groupId: v.optional(v.id('threadGroups')),
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

        const userThread = await ctx.db
            .query('userThreads')
            .withIndex('by_thread_id', (q) => q.eq('threadId', args.threadId))
            .first();

        if (!userThread || userThread.userId !== user._id) {
            throw new Error('Thread not found');
        }

        // Verify group ownership if groupId provided
        if (args.groupId) {
            const group = await ctx.db.get(args.groupId);
            if (!group || group.userId !== user._id) {
                throw new Error('Group not found');
            }
        }

        // Clear legacy pin fields when grouping
        await ctx.db.patch(userThread._id, {
            groupId: args.groupId,
            isPinned: args.groupId ? undefined : userThread.isPinned,
            pinnedAt: args.groupId ? undefined : userThread.pinnedAt,
            updatedAt: Date.now(),
        });
    },
});

/**
 * List thread groups for current user
 */
export const listGroups = query({
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

        return await ctx.db
            .query('threadGroups')
            .withIndex('by_user_order', (q) => q.eq('userId', user._id))
            .collect();
    },
});
