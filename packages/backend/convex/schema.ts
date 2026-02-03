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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_updated', ['userId', 'updatedAt'])
    .index('by_thread_id', ['threadId']),
});
