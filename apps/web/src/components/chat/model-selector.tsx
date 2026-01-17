'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@chatgbeant/ui/select';

interface Model {
  id: string;
  name: string;
  provider: string;
  tier: 'basic' | 'premium';
}

const BASIC_MODELS: Model[] = [
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

const PREMIUM_MODELS: Model[] = [
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

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  userTier: 'basic' | 'pro';
  disabled?: boolean;
}

export function ModelSelector({
  value,
  onChange,
  userTier,
  disabled,
}: ModelSelectorProps) {
  const availableModels =
    userTier === 'pro' ? [...BASIC_MODELS, ...PREMIUM_MODELS] : BASIC_MODELS;

  const selectedModel = availableModels.find((m) => m.id === value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Select a model">
          {selectedModel?.name ?? 'Select a model'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Basic Models</SelectLabel>
          {BASIC_MODELS.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center justify-between gap-2">
                <span>{model.name}</span>
                <span className="text-xs text-muted-foreground">
                  {model.provider}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
        {userTier === 'pro' && (
          <SelectGroup>
            <SelectLabel>Premium Models</SelectLabel>
            {PREMIUM_MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center justify-between gap-2">
                  <span>{model.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {model.provider}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
