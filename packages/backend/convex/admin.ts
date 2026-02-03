import { v } from 'convex/values';

import { mutation, query } from './_generated/server';

/**
 * Get admin dashboard stats
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get all users
    const users = await ctx.db.query('users').collect();
    const totalUsers = users.length;
    const proUsers = users.filter((u) => u.tier === 'pro').length;
    const basicUsers = users.filter((u) => u.tier === 'basic').length;

    // Get all threads
    const threads = await ctx.db.query('userThreads').collect();
    const totalChats = threads.length;

    // Calculate total messages from token usage
    const totalBasicTokensUsed = users.reduce(
      (acc, u) => acc + u.basicTokensUsed,
      0,
    );
    const totalPremiumTokensUsed = users.reduce(
      (acc, u) => acc + u.premiumTokensUsed,
      0,
    );
    const totalMessages = totalBasicTokensUsed + totalPremiumTokensUsed;

    return {
      totalUsers,
      proUsers,
      basicUsers,
      totalChats,
      totalMessages,
      totalBasicTokensUsed,
      totalPremiumTokensUsed,
    };
  },
});

/**
 * List all users (admin only)
 */
export const listUsers = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    let users = await ctx.db.query('users').collect();

    // Filter by search term if provided
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(searchLower) ||
          u.name?.toLowerCase().includes(searchLower),
      );
    }

    // Sort by creation date (newest first)
    users.sort((a, b) => b.createdAt - a.createdAt);

    // Apply pagination
    const offset = args.offset ?? 0;
    const limit = args.limit ?? 50;
    const paginatedUsers = users.slice(offset, offset + limit);

    return {
      users: paginatedUsers,
      total: users.length,
      hasMore: offset + limit < users.length,
    };
  },
});

/**
 * Get a specific user by ID (admin only)
 */
export const getUser = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    // Get user's thread count
    const threads = await ctx.db
      .query('userThreads')
      .withIndex('by_user_updated', (q) => q.eq('userId', args.userId))
      .collect();

    return {
      ...user,
      chatCount: threads.length,
    };
  },
});

/**
 * Update user role (admin only)
 */
export const updateRole = mutation({
  args: {
    userId: v.id('users'),
    role: v.union(v.literal('user'), v.literal('admin')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Prevent admin from removing their own admin role
    if (args.userId === currentUser._id && args.role !== 'admin') {
      throw new Error('Cannot remove your own admin role');
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });
  },
});
