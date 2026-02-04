import { v } from 'convex/values';
import { internalQuery, mutation, query } from './_generated/server';

/**
 * Create a new document
 */
export const createDocument = mutation({
    args: {
        title: v.optional(v.string()),
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

        const now = Date.now();
        return await ctx.db.insert('documents', {
            userId: user._id,
            title: args.title ?? 'Untitled Document',
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * List documents for current user
 */
export const listDocuments = query({
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

        return await ctx.db
            .query('documents')
            .withIndex('by_user_updated', (q) => q.eq('userId', user._id))
            .order('desc')
            .collect();
    },
});

/**
 * Get a single document
 */
export const getDocument = query({
    args: {
        documentId: v.id('documents'),
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

        const doc = await ctx.db.get(args.documentId);
        if (!doc || doc.userId !== user._id) {
            return null;
        }

        return doc;
    },
});

/**
 * Rename a document
 */
export const renameDocument = mutation({
    args: {
        documentId: v.id('documents'),
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

        const doc = await ctx.db.get(args.documentId);
        if (!doc || doc.userId !== user._id) {
            throw new Error('Document not found');
        }

        await ctx.db.patch(args.documentId, {
            title: args.title.trim(),
            updatedAt: Date.now(),
        });
    },
});

/**
 * Delete a document
 */
export const deleteDocument = mutation({
    args: {
        documentId: v.id('documents'),
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

        const doc = await ctx.db.get(args.documentId);
        if (!doc || doc.userId !== user._id) {
            throw new Error('Document not found');
        }

        await ctx.db.delete(args.documentId);
    },
});

/**
 * Update document content
 */
export const updateDocumentContent = mutation({
    args: {
        documentId: v.id('documents'),
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

        const doc = await ctx.db.get(args.documentId);
        if (!doc || doc.userId !== user._id) {
            throw new Error('Document not found');
        }

        await ctx.db.patch(args.documentId, {
            content: args.content,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Internal query to get a document by ID (for use in actions)
 */
export const internalGetDocument = internalQuery({
    args: {
        documentId: v.id('documents'),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.documentId);
    },
});
