import { v } from 'convex/values';

import { query } from './_generated/server';
import { isPremiumModel } from './models';

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
 * Check if user can make a request with the given model
 */
export const canMakeRequest = query({
  args: {
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        allowed: false,
        reason: 'Not authenticated',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return {
        allowed: false,
        reason: 'User not found',
      };
    }

    const limits = TOKEN_LIMITS[user.tier];
    const isPremium = isPremiumModel(args.modelId);

    // Check if user can use this model type
    if (isPremium && user.tier !== 'pro') {
      return {
        allowed: false,
        reason: 'Premium model requires Pro tier',
      };
    }

    // Check token availability
    if (isPremium) {
      if (user.premiumTokensUsed >= limits.premiumTokens) {
        return {
          allowed: false,
          reason: 'Premium token limit reached for this month',
          tokensUsed: user.premiumTokensUsed,
          tokenLimit: limits.premiumTokens,
        };
      }
    } else {
      if (user.basicTokensUsed >= limits.basicTokens) {
        return {
          allowed: false,
          reason: 'Basic token limit reached for this month',
          tokensUsed: user.basicTokensUsed,
          tokenLimit: limits.basicTokens,
        };
      }
    }

    return {
      allowed: true,
      tokensRemaining: isPremium
        ? limits.premiumTokens - user.premiumTokensUsed
        : limits.basicTokens - user.basicTokensUsed,
    };
  },
});

/**
 * Get user's current token usage
 */
export const getTokenUsage = query({
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
      tier: user.tier,
      basicTokensUsed: user.basicTokensUsed,
      basicTokensLimit: limits.basicTokens,
      basicTokensRemaining: limits.basicTokens - user.basicTokensUsed,
      premiumTokensUsed: user.premiumTokensUsed,
      premiumTokensLimit: limits.premiumTokens,
      premiumTokensRemaining: limits.premiumTokens - user.premiumTokensUsed,
      lastReset: user.lastTokenReset,
    };
  },
});
