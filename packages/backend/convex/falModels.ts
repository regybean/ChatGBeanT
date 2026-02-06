import { v } from 'convex/values';
import { action, internalAction, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';

// FalAI Platform API response types
interface FalModel {
    endpoint_id: string;
    metadata: {
        display_name: string;
        category: string;
        description?: string;
        status: string;
        tags?: string[];
        license_type?: string;
        duration_estimate?: number;
        kind?: string;
    };
}

interface FalModelsResponse {
    models: FalModel[];
    next_cursor: string | null;
    has_more: boolean;
}

// Map FalAI categories to output modalities
const CATEGORY_TO_OUTPUT_MODALITY: Record<string, string[]> = {
    'text-to-image': ['image'],
    'image-to-image': ['image'],
    'text-to-video': ['video'],
    'image-to-video': ['video'],
    'video-to-video': ['video'],
};

// Categories we want to sync (image and video generation models)
const SUPPORTED_CATEGORIES = new Set(Object.keys(CATEGORY_TO_OUTPUT_MODALITY));

// Format category for display: "text-to-video" -> "Text to Video"
function formatCategory(category: string): string {
    return category
        .split('-')
        .map((w, i) => (i === 0 || w.length > 2) ? w.charAt(0).toUpperCase() + w.slice(1) : w)
        .join(' ');
}

// Map FalAI categories to input modalities
function getInputModalities(category: string): string[] {
    if (category.startsWith('text-to-')) return ['text'];
    if (category.startsWith('image-to-')) return ['text', 'image'];
    if (category.startsWith('video-to-')) return ['text', 'video'];
    return ['text'];
}

/**
 * Sync models from FalAI Platform API (admin-triggered)
 */
export const syncFalModels = action({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error('Not authenticated');

        const user = await ctx.runQuery(internal.falModels.internalGetUser, {
            clerkId: identity.subject,
        });

        if (!user || user.role !== 'admin') throw new Error('Admin access required');

        return await syncAllFalModels(ctx);
    },
});

/**
 * Internal action for cron-triggered sync
 */
export const internalSyncFalModels = internalAction({
    args: {},
    handler: async (ctx) => {
        return await syncAllFalModels(ctx);
    },
});

import type { ActionCtx } from './_generated/server';

/**
 * Shared sync logic — fetches all pages from FalAI and upserts
 */
async function syncAllFalModels(ctx: Pick<ActionCtx, 'runMutation'>) {
    let cursor: string | null = null;
    let hasMore = true;
    let totalSynced = 0;
    const pageSize = 100;

    while (hasMore) {
        const url = new URL('https://api.fal.ai/v1/models');
        url.searchParams.set('limit', String(pageSize));
        if (cursor) {
            url.searchParams.set('cursor', cursor);
        }

        const response = await fetch(url.toString(), {
            headers: {
                'Content-Type': 'application/json',
                // Auth is optional but gives higher rate limits
                ...(process.env.FAL_KEY
                    ? { Authorization: `Key ${process.env.FAL_KEY}` }
                    : {}),
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch FalAI models: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as FalModelsResponse;

        // Filter to only supported categories (image/video generation)
        const relevantModels = data.models.filter(
            (m) =>
                m.metadata.status === 'active' &&
                SUPPORTED_CATEGORIES.has(m.metadata.category),
        );

        if (relevantModels.length > 0) {
            // Batch upsert
            const batchSize = 50;
            for (let i = 0; i < relevantModels.length; i += batchSize) {
                const batch = relevantModels.slice(i, i + batchSize);
                await ctx.runMutation(internal.falModels.upsertFalModelsBatch, {
                    models: batch.map((model) => ({
                        endpointId: model.endpoint_id,
                        name: `${model.metadata.display_name} (${formatCategory(model.metadata.category)})`,
                        description: model.metadata.description?.substring(0, 500),
                        category: model.metadata.category,
                        outputModalities:
                            CATEGORY_TO_OUTPUT_MODALITY[model.metadata.category] ?? [],
                        inputModalities: getInputModalities(model.metadata.category),
                        tags: model.metadata.tags ?? [],
                        licenseType: model.metadata.license_type,
                    })),
                });
            }
            totalSynced += relevantModels.length;
        }

        cursor = data.next_cursor;
        hasMore = data.has_more;
    }

    return { syncedCount: totalSynced };
}

/**
 * Internal mutation to upsert FalAI models in batches
 */
export const upsertFalModelsBatch = internalMutation({
    args: {
        models: v.array(
            v.object({
                endpointId: v.string(),
                name: v.string(),
                description: v.optional(v.string()),
                category: v.string(),
                outputModalities: v.array(v.string()),
                inputModalities: v.array(v.string()),
                tags: v.array(v.string()),
                licenseType: v.optional(v.string()),
            }),
        ),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        for (const model of args.models) {
            const existing = await ctx.db
                .query('models')
                .withIndex('by_openrouter_id', (q) => q.eq('openRouterId', model.endpointId))
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    name: model.name,
                    description: model.description,
                    inputModalities: model.inputModalities,
                    outputModalities: model.outputModalities,
                    lastUpdated: now,
                });
            } else {
                await ctx.db.insert('models', {
                    openRouterId: model.endpointId,
                    name: model.name,
                    provider: 'FalAI',
                    description: model.description,
                    inputModalities: model.inputModalities,
                    outputModalities: model.outputModalities,
                    promptPrice: 0,
                    completionPrice: 0,
                    tier: 'premium',
                    isActive: true,
                    isFeatured: false,
                    lastUpdated: now,
                });
            }
        }
    },
});

/**
 * Internal query to get user by clerkId (for auth in actions)
 */
export const internalGetUser = internalQuery({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
            .first();
    },
});
