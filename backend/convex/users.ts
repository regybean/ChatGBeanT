import { v } from 'convex/values';

import { mutation, query } from './_generated/server';

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
 * Get or create a user based on Clerk identity
 */
export const getOrCreate = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const clerkId = identity.subject;
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId))
      .first();

    if (existing) {
      // Check if token reset is needed (monthly)
      const now = Date.now();
      const lastReset = existing.lastTokenReset;
      const lastResetDate = new Date(lastReset);
      const currentDate = new Date(now);

      if (
        lastResetDate.getMonth() !== currentDate.getMonth() ||
        lastResetDate.getFullYear() !== currentDate.getFullYear()
      ) {
        // Reset tokens for new month
        await ctx.db.patch(existing._id, {
          basicTokensUsed: 0,
          premiumTokensUsed: 0,
          lastTokenReset: now,
          updatedAt: now,
        });
      }

      return existing._id;
    }

    // Create new user
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      clerkId,
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

    return userId;
  },
});

/**
 * Get current user
 */
export const getCurrent = query({
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

    const limits = TOKEN_LIMITS[user.tier];
    return {
      ...user,
      tokenLimits: limits,
      basicTokensRemaining: limits.basicTokens - user.basicTokensUsed,
      premiumTokensRemaining: limits.premiumTokens - user.premiumTokensUsed,
    };
  },
});

/**
 * Update user tier (admin only)
 */
export const updateTier = mutation({
  args: {
    userId: v.id('users'),
    tier: v.union(v.literal('basic'), v.literal('pro')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Check if current user is admin
    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    await ctx.db.patch(args.userId, {
      tier: args.tier,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update token usage
 */
export const updateTokenUsage = mutation({
  args: {
    tokensUsed: v.number(),
    isPremiumModel: v.boolean(),
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

    if (args.isPremiumModel) {
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

/**
 * Reset user tokens (admin only)
 */
export const resetTokens = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Check if current user is admin
    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    await ctx.db.patch(args.userId, {
      basicTokensUsed: 0,
      premiumTokensUsed: 0,
      lastTokenReset: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
