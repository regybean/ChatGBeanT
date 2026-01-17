import { v } from 'convex/values';

import { mutation, query } from './_generated/server';

/**
 * Get messages for a chat
 */
export const list = query({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
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

    // Verify user owns this chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== user._id) {
      return [];
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat_created', (q) => q.eq('chatId', args.chatId))
      .order('asc')
      .collect();

    return messages;
  },
});

/**
 * Send a user message
 */
export const send = mutation({
  args: {
    chatId: v.id('chats'),
    content: v.string(),
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

    // Verify user owns this chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== user._id) {
      throw new Error('Chat not found');
    }

    const now = Date.now();

    // Insert user message
    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      role: 'user',
      content: args.content,
      createdAt: now,
    });

    // Update chat timestamp
    await ctx.db.patch(args.chatId, {
      updatedAt: now,
    });

    return messageId;
  },
});

/**
 * Save assistant response
 */
export const saveAssistantMessage = mutation({
  args: {
    chatId: v.id('chats'),
    content: v.string(),
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

    // Verify user owns this chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== user._id) {
      throw new Error('Chat not found');
    }

    const now = Date.now();

    // Insert assistant message
    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      role: 'assistant',
      content: args.content,
      model: args.model,
      createdAt: now,
    });

    // Auto-generate title if this is the first assistant message
    if (!chat.title) {
      // Get the first user message for title generation
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_chat_created', (q) => q.eq('chatId', args.chatId))
        .order('asc')
        .take(1);

      if (messages.length > 0 && messages[0]) {
        const firstMessage = messages[0].content;
        // Create a simple title from the first user message
        const title =
          firstMessage.length > 50
            ? firstMessage.substring(0, 47) + '...'
            : firstMessage;

        await ctx.db.patch(args.chatId, {
          title,
          updatedAt: now,
        });
      }
    } else {
      await ctx.db.patch(args.chatId, {
        updatedAt: now,
      });
    }

    return messageId;
  },
});

/**
 * Delete a message
 */
export const remove = mutation({
  args: {
    messageId: v.id('messages'),
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

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Verify user owns the chat
    const chat = await ctx.db.get(message.chatId);
    if (!chat || chat.userId !== user._id) {
      throw new Error('Unauthorized');
    }

    await ctx.db.delete(args.messageId);
  },
});
