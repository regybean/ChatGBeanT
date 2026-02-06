import { v } from 'convex/values';
import { action, internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { internal } from './_generated/api';

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

const PREMIUM_PRICE_THRESHOLD = 5; // $5 per million tokens

function extractProvider(modelId: string): string {
  const prefix = modelId.split('/')[0] ?? 'unknown';
  const providerMap: Record<string, string> = {
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    google: 'Google',
    deepseek: 'DeepSeek',
    meta: 'Meta',
    'meta-llama': 'Meta',
    'x-ai': 'xAI',
    mistral: 'Mistral',
    mistralai: 'Mistral',
    cohere: 'Cohere',
    perplexity: 'Perplexity',
    'nousresearch': 'Nous Research',
  };
  return providerMap[prefix.toLowerCase()] ?? prefix;
}

function calculateTier(completionPriceStr: string): 'basic' | 'premium' {
  const pricePerToken = parseFloat(completionPriceStr);
  if (isNaN(pricePerToken)) return 'basic';
  const pricePerMillion = pricePerToken * 1_000_000;
  return pricePerMillion > PREMIUM_PRICE_THRESHOLD ? 'premium' : 'basic';
}

/**
 * Sync models from OpenRouter API
 */
export const syncModels = action({
  args: {},
  handler: async (ctx) => {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = (await response.json()) as OpenRouterResponse;
    const models = data.data;

    // Process models in batches
    const batchSize = 50;
    for (let i = 0; i < models.length; i += batchSize) {
      const batch = models.slice(i, i + batchSize);
      await ctx.runMutation(internal.openrouter.upsertModelsBatch, {
        models: batch.map((model) => ({
          openRouterId: model.id,
          name: model.name,
          provider: extractProvider(model.id),
          description: model.description?.substring(0, 500),
          contextLength: model.context_length,
          inputModalities: model.architecture?.input_modalities,
          outputModalities: model.architecture?.output_modalities,
          promptPrice: parseFloat(model.pricing.prompt) || 0,
          completionPrice: parseFloat(model.pricing.completion) || 0,
          tier: calculateTier(model.pricing.completion),
        })),
      });
    }

    return { syncedCount: models.length };
  },
});

/**
 * Internal mutation to upsert models in batches
 */
export const upsertModelsBatch = internalMutation({
  args: {
    models: v.array(
      v.object({
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
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const model of args.models) {
      const existing = await ctx.db
        .query('models')
        .withIndex('by_openrouter_id', (q) => q.eq('openRouterId', model.openRouterId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: model.name,
          provider: model.provider,
          description: model.description,
          contextLength: model.contextLength,
          inputModalities: model.inputModalities,
          outputModalities: model.outputModalities,
          promptPrice: model.promptPrice,
          completionPrice: model.completionPrice,
          tier: model.tier,
          lastUpdated: now,
        });
      } else {
        await ctx.db.insert('models', {
          openRouterId: model.openRouterId,
          name: model.name,
          provider: model.provider,
          description: model.description,
          contextLength: model.contextLength,
          inputModalities: model.inputModalities,
          outputModalities: model.outputModalities,
          promptPrice: model.promptPrice,
          completionPrice: model.completionPrice,
          tier: model.tier,
          isActive: true,
          isFeatured: false,
          lastUpdated: now,
        });
      }
    }
  },
});

/**
 * List all active models
 */
export const listModels = query({
  args: {
    searchTerm: v.optional(v.string()),
    tier: v.optional(v.union(v.literal('basic'), v.literal('premium'))),
  },
  handler: async (ctx, args) => {
    let models;
    if (args.tier) {
      models = await ctx.db
        .query('models')
        .withIndex('by_tier', (q) => q.eq('tier', args.tier!))
        .collect();
    } else {
      models = await ctx.db.query('models').collect();
    }

    // Filter active models
    models = models.filter((m) => m.isActive);

    // Apply search filter with relevance scoring
    if (args.searchTerm) {
      const search = args.searchTerm.toLowerCase();
      const scored = models
        .map((m) => {
          const nameLower = m.name.toLowerCase();
          const providerLower = m.provider.toLowerCase();
          const idLower = m.openRouterId.toLowerCase();
          let score = 0;
          if (nameLower.startsWith(search)) score = 3;
          else if (nameLower.includes(search)) score = 2;
          else if (providerLower.startsWith(search)) score = 1.5;
          else if (providerLower.includes(search)) score = 1;
          else if (idLower.includes(search)) score = 0.5;
          return { model: m, score };
        })
        .filter((s) => s.score > 0);
      scored.sort((a, b) => b.score - a.score || a.model.name.localeCompare(b.model.name));
      models = scored.map((s) => s.model);
    } else {
      // Sort by name when not searching
      models.sort((a, b) => a.name.localeCompare(b.name));
    }

    return models;
  },
});

/**
 * Get featured models
 */
export const getFeaturedModels = query({
  args: {},
  handler: async (ctx) => {
    const featured = await ctx.db
      .query('models')
      .withIndex('by_featured', (q) => q.eq('isFeatured', true))
      .collect();

    // If no featured models, return first 5 active models
    if (featured.length === 0) {
      const allActive = await ctx.db.query('models').collect();
      return allActive
        .filter((m) => m.isActive)
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 5);
    }

    return featured.filter((m) => m.isActive).slice(0, 5);
  },
});

/**
 * Search models
 */
export const searchModels = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const search = args.searchTerm.toLowerCase();
    const models = await ctx.db.query('models').collect();

    const scored = models
      .filter((m) => m.isActive)
      .map((m) => {
        const nameLower = m.name.toLowerCase();
        const providerLower = m.provider.toLowerCase();
        const idLower = m.openRouterId.toLowerCase();
        let score = 0;
        if (nameLower.startsWith(search)) score = 3;
        else if (nameLower.includes(search)) score = 2;
        else if (providerLower.startsWith(search)) score = 1.5;
        else if (providerLower.includes(search)) score = 1;
        else if (idLower.includes(search)) score = 0.5;
        return { model: m, score };
      })
      .filter((s) => s.score > 0);
    scored.sort((a, b) => b.score - a.score || a.model.name.localeCompare(b.model.name));
    return scored.map((s) => s.model).slice(0, 50);
  },
});

/**
 * Set featured models (admin only)
 */
export const setFeaturedModels = mutation({
  args: {
    modelIds: v.array(v.id('models')),
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

    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    // Clear all featured flags first
    const allModels = await ctx.db.query('models').collect();
    for (const model of allModels) {
      if (model.isFeatured) {
        await ctx.db.patch(model._id, { isFeatured: false });
      }
    }

    // Set new featured models
    for (const modelId of args.modelIds) {
      await ctx.db.patch(modelId, { isFeatured: true });
    }
  },
});

/**
 * Toggle model active status (admin only)
 */
export const toggleModelActive = mutation({
  args: {
    modelId: v.id('models'),
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

    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const model = await ctx.db.get(args.modelId);
    if (!model) {
      throw new Error('Model not found');
    }

    await ctx.db.patch(args.modelId, { isActive: !model.isActive });
  },
});

/**
 * Toggle model featured status (admin only)
 */
export const toggleModelFeatured = mutation({
  args: {
    modelId: v.id('models'),
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

    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const model = await ctx.db.get(args.modelId);
    if (!model) {
      throw new Error('Model not found');
    }

    await ctx.db.patch(args.modelId, { isFeatured: !model.isFeatured });
  },
});

/**
 * Get all models for admin (includes inactive)
 */
export const listAllModelsAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const models = await ctx.db.query('models').collect();
    return models.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Internal query to get a model by openRouterId (for use in actions)
 */
export const internalGetModel = internalQuery({
  args: { openRouterId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query('models')
      .withIndex('by_openrouter_id', (q) => q.eq('openRouterId', args.openRouterId))
      .first();
  },
});

/**
 * Get a single model by openRouterId
 */
export const getModelByOpenRouterId = query({
  args: {
    openRouterId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('models')
      .withIndex('by_openrouter_id', (q) => q.eq('openRouterId', args.openRouterId))
      .first();
  },
});

/**
 * Internal action for cron-triggered sync
 */
export const internalSyncModels = internalAction({
  args: {},
  handler: async (ctx) => {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = (await response.json()) as OpenRouterResponse;
    const models = data.data;

    const batchSize = 50;
    for (let i = 0; i < models.length; i += batchSize) {
      const batch = models.slice(i, i + batchSize);
      await ctx.runMutation(internal.openrouter.upsertModelsBatch, {
        models: batch.map((model) => ({
          openRouterId: model.id,
          name: model.name,
          provider: extractProvider(model.id),
          description: model.description?.substring(0, 500),
          contextLength: model.context_length,
          inputModalities: model.architecture?.input_modalities,
          outputModalities: model.architecture?.output_modalities,
          promptPrice: parseFloat(model.pricing.prompt) || 0,
          completionPrice: parseFloat(model.pricing.completion) || 0,
          tier: calculateTier(model.pricing.completion),
        })),
      });
    }
  },
});
