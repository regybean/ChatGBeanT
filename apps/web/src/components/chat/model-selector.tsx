'use client';

import { useState, useMemo, useRef } from 'react';
import { useQuery } from 'convex/react';
import { ChevronsUpDown, Check, Search, Clock } from 'lucide-react';

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
    const recentModelIds = useQuery(api.settings.getRecentModels);

    // Cache last valid search results to prevent flicker while loading
    const lastSearchResultsRef = useRef<NonNullable<typeof allModels>>([]);
    if (search && allModels !== undefined) {
        lastSearchResultsRef.current = allModels;
    }

    // Use featured models when no search, all models when searching
    // When searching and loading, show cached previous results to avoid flicker
    const displayModels = useMemo(() => {
        if (search) {
            return allModels ?? lastSearchResultsRef.current;
        }
        return featuredModels ?? [];
    }, [search, allModels, featuredModels]);

    // Show all models; premium ones are grayed out for basic users
    const filteredModels = displayModels;

    // Build recently used models list from IDs
    const recentModels = useMemo(() => {
        if (!recentModelIds || recentModelIds.length === 0) return [];
        const allAvailable = [...(allModels ?? []), ...(featuredModels ?? [])];
        // Deduplicate by openRouterId
        const modelMap = new Map(allAvailable.map((m) => [m.openRouterId, m]));
        return recentModelIds
            .map((id) => modelMap.get(id))
            .filter((m): m is NonNullable<typeof m> => m != null);
    }, [recentModelIds, allModels, featuredModels]);

    // Find selected model info
    const selectedModel = useMemo(() => {
        const fromAll = allModels?.find((m) => m.openRouterId === value);
        if (fromAll) return fromAll;
        const fromFeatured = featuredModels?.find((m) => m.openRouterId === value);
        if (fromFeatured) return fromFeatured;
        return null;
    }, [value, allModels, featuredModels]);

    // Format display name with provider prefix for consistency
    const formatModelDisplayName = (model: NonNullable<typeof selectedModel>) => {
        return `${model.provider}: ${model.name}`;
    };

    const displayName = selectedModel
        ? formatModelDisplayName(selectedModel)
        : 'Loading model...';

    const handleSelect = (openRouterId: string) => {
        onChange(openRouterId);
        setOpen(false);
        setSearch('');
    };

    const isModelDisabled = (model: NonNullable<typeof selectedModel>) =>
        userTier !== 'pro' && model.tier === 'premium';

    const renderModelItem = (model: NonNullable<typeof selectedModel>) => {
        const disabled = isModelDisabled(model);
        return (
            <button
                key={model._id}
                onClick={() => !disabled && handleSelect(model.openRouterId)}
                className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm',
                    disabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-accent',
                    value === model.openRouterId && 'bg-accent',
                )}
                title={disabled ? 'Upgrade to Pro to use this model' : undefined}
            >
                <ProviderIcon
                    provider={model.provider}
                    modelId={model.openRouterId}
                    size={14}
                    className="shrink-0"
                />
                <div className="min-w-0 flex flex-1 flex-col items-start gap-0.5 overflow-hidden">
                    <div className="flex w-full min-w-0 items-center gap-1.5">
                        <span className="truncate font-medium">
                            {model.name}
                        </span>
                        <Badge
                            variant={model.tier === 'premium' ? 'default' : 'secondary'}
                            className="shrink-0 text-[10px]"
                        >
                            {model.tier === 'premium' ? 'Pro' : 'Basic'}
                        </Badge>
                        {value === model.openRouterId && (
                            <Check className="ml-auto h-4 w-4 shrink-0" />
                        )}
                    </div>
                    {model.description && (
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                            {model.description}
                        </span>
                    )}
                </div>
            </button>
        );
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[340px] justify-between"
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
            <PopoverContent className="w-[420px] p-0" align="start">
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
                <ScrollArea className="max-h-[450px]">
                    <div className="p-1">
                        {!search && recentModels.length > 0 && (
                            <>
                                <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    Recently Used
                                </div>
                                {recentModels.map(renderModelItem)}
                                <div className="my-1 border-t" />
                            </>
                        )}
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
                            filteredModels.map(renderModelItem)
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
