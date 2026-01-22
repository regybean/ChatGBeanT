import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { BASIC_MODELS } from './models';

/**
 * Create a new chat
 */
export const create = mutation({
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

    if (!user) {
      throw new Error('User not found. Please sign in again.');
    }

    const now = Date.now();
    const chatId = await ctx.db.insert('chats', {
      userId: user._id,
      model: args.model ?? BASIC_MODELS[0]!.id,
      createdAt: now,
      updatedAt: now,
    });

    return chatId;
  },
});

/**
 * List all chats for current user
 */
export const list = query({
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

    const chats = await ctx.db
      .query('chats')
      .withIndex('by_user_updated', (q) => q.eq('userId', user._id))
      .order('desc')
      .collect();

    return chats;
  },
});

/**
 * Get a specific chat
 */
export const get = query({
  args: {
    chatId: v.id('chats'),
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

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== user._id) {
      return null;
    }

    return chat;
  },
});

/**
 * Delete a chat and all its messages
 */
export const remove = mutation({
  args: {
    chatId: v.id('chats'),
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

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== user._id) {
      throw new Error('Chat not found');
    }

    // Delete all messages in the chat
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat_created', (q) => q.eq('chatId', args.chatId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the chat
    await ctx.db.delete(args.chatId);
  },
});

/**
 * Update chat title
 */
export const updateTitle = mutation({
  args: {
    chatId: v.id('chats'),
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

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== user._id) {
      throw new Error('Chat not found');
    }

    await ctx.db.patch(args.chatId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update chat model
 */
export const updateModel = mutation({
  args: {
    chatId: v.id('chats'),
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

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== user._id) {
      throw new Error('Chat not found');
    }

    await ctx.db.patch(args.chatId, {
      model: args.model,
      updatedAt: Date.now(),
    });
  },
});
