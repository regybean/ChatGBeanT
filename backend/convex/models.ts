/**
 * Model configuration by tier
 */

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  tier: 'basic' | 'premium';
}

// Basic models (all users)
export const BASIC_MODELS: ModelInfo[] = [
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    tier: 'basic',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    tier: 'basic',
  },
  {
    id: 'google/gemini-flash-1.5',
    name: 'Gemini Flash 1.5',
    provider: 'Google',
    tier: 'basic',
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'DeepSeek',
    tier: 'basic',
  },
];

// Premium models (pro users only)
export const PREMIUM_MODELS: ModelInfo[] = [
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    tier: 'premium',
  },
  {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    tier: 'premium',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    tier: 'premium',
  },
  {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    provider: 'Google',
    tier: 'premium',
  },
];

export const ALL_MODELS = [...BASIC_MODELS, ...PREMIUM_MODELS];

export function getModelsForTier(tier: 'basic' | 'pro'): ModelInfo[] {
  if (tier === 'pro') {
    return ALL_MODELS;
  }
  return BASIC_MODELS;
}

export function isModelAvailableForTier(
  modelId: string,
  tier: 'basic' | 'pro',
): boolean {
  const model = ALL_MODELS.find((m) => m.id === modelId);
  if (!model) return false;

  if (model.tier === 'premium' && tier !== 'pro') {
    return false;
  }

  return true;
}

export function getModelById(modelId: string): ModelInfo | undefined {
  return ALL_MODELS.find((m) => m.id === modelId);
}

export function isBasicModel(modelId: string): boolean {
  return BASIC_MODELS.some((m) => m.id === modelId);
}

export function isPremiumModel(modelId: string): boolean {
  return PREMIUM_MODELS.some((m) => m.id === modelId);
}
