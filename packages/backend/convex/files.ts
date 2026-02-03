import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Generate a URL for uploading a file to Convex storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get the URL of a stored file
 */
export const getFileUrl = query({
  args: {
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Get metadata for a stored file
 */
export const getFileMetadata = query({
  args: {
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getMetadata(args.storageId);
  },
});
