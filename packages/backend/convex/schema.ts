import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    tier: v.union(v.literal('basic'), v.literal('pro')),
    role: v.union(v.literal('user'), v.literal('admin')),
    basicTokensUsed: v.number(),
    premiumTokensUsed: v.number(),
    lastTokenReset: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_clerk_id', ['clerkId']),

  userThreads: defineTable({
    userId: v.id('users'),
    threadId: v.string(),
    title: v.optional(v.string()),
    model: v.string(),
    isPinned: v.optional(v.boolean()),
    pinnedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_updated', ['userId', 'updatedAt'])
    .index('by_thread_id', ['threadId'])
    .index('by_user_pinned', ['userId', 'isPinned']),

  models: defineTable({
    openRouterId: v.string(),
    name: v.string(),
    provider: v.string(),
    description: v.optional(v.string()),
    contextLength: v.optional(v.number()),
    promptPrice: v.number(),
    completionPrice: v.number(),
    tier: v.union(v.literal('basic'), v.literal('premium')),
    isActive: v.boolean(),
    isFeatured: v.boolean(),
    lastUpdated: v.number(),
  })
    .index('by_openrouter_id', ['openRouterId'])
    .index('by_tier', ['tier'])
    .index('by_featured', ['isFeatured']),

  userSettings: defineTable({
    userId: v.id('users'),
    theme: v.union(v.literal('light'), v.literal('dark'), v.literal('system')),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),
});
