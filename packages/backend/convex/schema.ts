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
    openRouterApiKey: v.optional(v.string()),
    falApiKey: v.optional(v.string()),
    hasByok: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_clerk_id', ['clerkId']),

  threadGroups: defineTable({
    userId: v.id('users'),
    name: v.string(),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_order', ['userId', 'order'])
    .index('by_user', ['userId']),

  userThreads: defineTable({
    userId: v.id('users'),
    threadId: v.string(),
    title: v.optional(v.string()),
    model: v.string(),
    isPinned: v.optional(v.boolean()),
    pinnedAt: v.optional(v.number()),
    groupId: v.optional(v.id('threadGroups')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_updated', ['userId', 'updatedAt'])
    .index('by_thread_id', ['threadId'])
    .index('by_user_pinned', ['userId', 'isPinned'])
    .index('by_group', ['groupId']),

  models: defineTable({
    openRouterId: v.string(),
    name: v.string(),
    provider: v.string(),
    description: v.optional(v.string()),
    contextLength: v.optional(v.number()),
    inputModalities: v.optional(v.array(v.string())),
    outputModalities: v.optional(v.array(v.string())),
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
    lastUsedModel: v.optional(v.string()),
    recentModels: v.optional(v.array(v.string())),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  generatedMedia: defineTable({
    userId: v.id('users'),
    threadId: v.string(),
    type: v.union(v.literal('image'), v.literal('video')),
    url: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
    prompt: v.string(),
    model: v.string(),
    provider: v.union(v.literal('openrouter'), v.literal('fal')),
    status: v.union(v.literal('pending'), v.literal('generating'), v.literal('completed'), v.literal('failed')),
    title: v.optional(v.string()),
    savedToDocuments: v.optional(v.boolean()),
    metadata: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    falRequestId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_thread', ['threadId'])
    .index('by_user', ['userId'])
    .index('by_user_type', ['userId', 'type'])
    .index('by_status', ['status'])
    .index('by_user_saved', ['userId', 'savedToDocuments']),

  documents: defineTable({
    userId: v.id('users'),
    title: v.string(),
    content: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_updated', ['userId', 'updatedAt'])
    .index('by_user', ['userId']),
});
