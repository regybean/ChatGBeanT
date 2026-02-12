import { v } from 'convex/values';
import { action, mutation, query } from './_generated/server';

/**
 * Save an API key for the current user
 */
export const saveApiKey = mutation({
  args: {
    provider: v.union(v.literal('openrouter'), v.literal('fal')),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();
    if (!user) throw new Error('User not found');

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.provider === 'openrouter') {
      patch.openRouterApiKey = args.apiKey;
    } else {
      patch.falApiKey = args.apiKey;
    }

    // Set hasByok if either key is now present
    const hasOpenRouter = args.provider === 'openrouter' ? true : !!user.openRouterApiKey;
    const hasFal = args.provider === 'fal' ? true : !!user.falApiKey;
    patch.hasByok = hasOpenRouter || hasFal;

    await ctx.db.patch(user._id, patch);
  },
});

/**
 * Remove an API key for the current user
 */
export const removeApiKey = mutation({
  args: {
    provider: v.union(v.literal('openrouter'), v.literal('fal')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();
    if (!user) throw new Error('User not found');

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.provider === 'openrouter') {
      patch.openRouterApiKey = undefined;
    } else {
      patch.falApiKey = undefined;
    }

    // Update hasByok
    const hasOpenRouter = args.provider === 'openrouter' ? false : !!user.openRouterApiKey;
    const hasFal = args.provider === 'fal' ? false : !!user.falApiKey;
    patch.hasByok = hasOpenRouter || hasFal;

    await ctx.db.patch(user._id, patch);
  },
});

/**
 * Get masked API keys and BYOK status for the current user
 */
export const getUserApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();
    if (!user) return null;

    return {
      hasOpenRouterKey: !!user.openRouterApiKey,
      hasFalKey: !!user.falApiKey,
      hasByok: !!user.hasByok,
      openRouterKeyLast4: user.openRouterApiKey
        ? `...${user.openRouterApiKey.slice(-4)}`
        : null,
      falKeyLast4: user.falApiKey
        ? `...${user.falApiKey.slice(-4)}`
        : null,
    };
  },
});

/**
 * Validate an OpenRouter API key by making a test request
 */
export const validateOpenRouterKey = action({
  args: {
    apiKey: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${args.apiKey}`,
        },
      });

      if (!response.ok) {
        return { valid: false, error: `Invalid key (${response.status})` };
      }

      return { valid: true, error: null };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  },
});

/**
 * Validate a fal.ai API key by making a test request
 */
export const validateFalKey = action({
  args: {
    apiKey: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${args.apiKey}`,
        },
        body: JSON.stringify({ prompt: 'test', num_images: 0 }),
      });

      // A 422 (validation error) still means the key is valid
      if (response.status === 422 || response.ok) {
        return { valid: true, error: null };
      }

      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid API key' };
      }

      return { valid: true, error: null };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  },
});
