'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { ChevronsUpDown, Check, Search } from 'lucide-react';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import { Badge } from '@chatgbeant/ui/badge';
import { ProviderIcon } from '@chatgbeant/ui/provider-icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@chatgbeant/ui/popover';
import { ScrollArea } from '@chatgbeant/ui/scroll-area';
import { cn } from '@chatgbeant/ui/cn';

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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const featuredModels = useQuery(api.openrouter.getFeaturedModels);
  const allModels = useQuery(
    api.openrouter.listModels,
    search ? { searchTerm: search } : {},
  );

  // Use featured models when no search, all models when searching
  const displayModels = useMemo(() => {
    if (search) {
      return allModels ?? [];
    }
    return featuredModels ?? [];
  }, [search, allModels, featuredModels]);

  // Filter by user tier
  const filteredModels = useMemo(() => {
    if (userTier === 'pro') return displayModels;
    return displayModels.filter((m) => m.tier === 'basic');
  }, [displayModels, userTier]);

  // Find selected model info
  const selectedModel = useMemo(() => {
    const fromAll = allModels?.find((m) => m.openRouterId === value);
    if (fromAll) return fromAll;
    const fromFeatured = featuredModels?.find((m) => m.openRouterId === value);
    if (fromFeatured) return fromFeatured;
    return null;
  }, [value, allModels, featuredModels]);

  const displayName = selectedModel?.name ?? value.split('/').pop() ?? 'Select model';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
          disabled={disabled}
        >
          <div className="flex items-center gap-2 truncate">
            <ProviderIcon
              provider=""
              modelId={value}
              size={14}
              className="shrink-0"
            />
            <span className="truncate">{displayName}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            type="text"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ScrollArea className="max-h-[300px]">
          <div className="p-1">
            {!search && (
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Featured Models
              </div>
            )}
            {filteredModels.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No models found
              </div>
            ) : (
              filteredModels.map((model) => (
                <button
                  key={model._id}
                  onClick={() => {
                    onChange(model.openRouterId);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent',
                    value === model.openRouterId && 'bg-accent',
                  )}
                >
                  <ProviderIcon
                    provider={model.provider}
                    modelId={model.openRouterId}
                    size={14}
                    className="shrink-0"
                  />
                  <div className="flex flex-1 flex-col items-start gap-0.5 overflow-hidden">
                    <div className="flex w-full items-center gap-1.5">
                      <span className="truncate font-medium">
                        {model.name}
                      </span>
                      {value === model.openRouterId && (
                        <Check className="ml-auto h-4 w-4 shrink-0" />
                      )}
                    </div>
                    {model.description && (
                      <span className="truncate text-xs text-muted-foreground">
                        {model.description.length > 60
                          ? model.description.slice(0, 60) + '...'
                          : model.description}
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={model.tier === 'premium' ? 'default' : 'secondary'}
                    className="ml-auto shrink-0 text-[10px]"
                  >
                    {model.tier === 'premium' ? 'Pro' : 'Basic'}
                  </Badge>
                </button>
              ))
            )}
            {!search && (
              <div className="border-t px-2 py-2">
                <button
                  onClick={() => setSearch(' ')}
                  className="w-full rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  Browse all models...
                </button>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
