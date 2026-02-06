import { v } from 'convex/values';
import { mutation, query, internalMutation } from './_generated/server';

/**
 * Create a media record (internal, used by sendMessage)
 */
export const createMediaRecord = internalMutation({
  args: {
    userId: v.id('users'),
    threadId: v.string(),
    type: v.union(v.literal('image'), v.literal('video')),
    prompt: v.string(),
    model: v.string(),
    provider: v.union(v.literal('openrouter'), v.literal('fal')),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('generatedMedia', {
      userId: args.userId,
      threadId: args.threadId,
      type: args.type,
      prompt: args.prompt,
      model: args.model,
      provider: args.provider,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update media status (internal)
 */
export const updateMediaStatus = internalMutation({
  args: {
    mediaId: v.id('generatedMedia'),
    status: v.union(v.literal('pending'), v.literal('generating'), v.literal('completed'), v.literal('failed')),
    url: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
    errorMessage: v.optional(v.string()),
    falRequestId: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { mediaId, ...updates } = args;
    // Remove undefined values
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.url !== undefined) patch.url = updates.url;
    if (updates.storageId !== undefined) patch.storageId = updates.storageId;
    if (updates.errorMessage !== undefined) patch.errorMessage = updates.errorMessage;
    if (updates.falRequestId !== undefined) patch.falRequestId = updates.falRequestId;
    if (updates.metadata !== undefined) patch.metadata = updates.metadata;
    await ctx.db.patch(mediaId, patch);
  },
});

/**
 * Get media for a thread
 */
export const getMediaForThread = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) return [];

    const media = await ctx.db
      .query('generatedMedia')
      .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
      .collect();

    // Only return media belonging to this user
    return media.filter((m) => m.userId === user._id);
  },
});

/**
 * Get all completed media for a user, filterable by type
 */
export const getMediaForUser = query({
  args: {
    type: v.optional(v.union(v.literal('image'), v.literal('video'))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) return [];

    let media;
    if (args.type) {
      media = await ctx.db
        .query('generatedMedia')
        .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('type', args.type!))
        .collect();
    } else {
      media = await ctx.db
        .query('generatedMedia')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect();
    }

    return media.filter((m) => m.status === 'completed');
  },
});

/**
 * Save media to documents section
 */
export const saveMediaToDocuments = mutation({
  args: {
    mediaId: v.id('generatedMedia'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) throw new Error('User not found');

    const media = await ctx.db.get(args.mediaId);
    if (!media || media.userId !== user._id) throw new Error('Media not found');

    await ctx.db.patch(args.mediaId, {
      savedToDocuments: true,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get user's saved generated images (for documents section)
 */
export const getGeneratedImages = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) return [];

    const media = await ctx.db
      .query('generatedMedia')
      .withIndex('by_user_saved', (q) => q.eq('userId', user._id).eq('savedToDocuments', true))
      .collect();

    return media.filter((m) => m.status === 'completed');
  },
});
