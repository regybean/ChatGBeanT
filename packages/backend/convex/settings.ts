import { v } from 'convex/values';
import { mutation, query, internalMutation } from './_generated/server';

/**
 * Get user settings
 */
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
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

    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    return settings ?? { theme: 'system' as const };
  },
});

/**
 * Update theme setting
 */
export const updateTheme = mutation({
  args: {
    theme: v.union(v.literal('light'), v.literal('dark'), v.literal('system')),
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

    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        theme: args.theme,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('userSettings', {
        userId: user._id,
        theme: args.theme,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Internal mutation to update last used model and recent models list
 */
export const internalUpdateLastUsedModel = internalMutation({
  args: {
    userId: v.id('users'),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    // Build recent models list: most recent first, max 3, no duplicates
    const currentRecent = existing?.recentModels ?? [];
    const filtered = currentRecent.filter((m) => m !== args.model);
    const recentModels = [args.model, ...filtered].slice(0, 3);

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastUsedModel: args.model,
        recentModels,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('userSettings', {
        userId: args.userId,
        theme: 'system',
        lastUsedModel: args.model,
        recentModels,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Get recently used models for the current user
 */
export const getRecentModels = query({
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

    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    return settings?.recentModels ?? [];
  },
});
