'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { ChevronsUpDown, Check, Search, Clock, Image, Video, MessageSquare } from 'lucide-react';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import { Badge } from '@chatgbeant/ui/badge';
import { ProviderIcon } from '@chatgbeant/ui/provider-icon';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@chatgbeant/ui/popover';
import { cn } from '@chatgbeant/ui/cn';

interface ModelSelectorProps {
    value: string;
    onChange: (value: string) => void;
    userTier: 'basic' | 'pro';
    hasByok?: boolean;
    disabled?: boolean;
}

export function ModelSelector({
    value,
    onChange,
    userTier,
    hasByok = false,
    disabled,
}: ModelSelectorProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'text' | 'image' | 'video'>('all');
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const lastValidResultsRef = useRef<NonNullable<typeof allModels>>([]);

    // Debounce search input (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Scroll to selected model when popover opens
    useEffect(() => {
        if (open && value && scrollAreaRef.current) {
            const timer = setTimeout(() => {
                const selected = scrollAreaRef.current?.querySelector(`[data-model-id="${value}"]`) as HTMLElement | null;
                selected?.scrollIntoView({ block: 'center' });
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [open, value]);

    const featuredModels = useQuery(api.openrouter.getFeaturedModels);
    const allModels = useQuery(
        api.openrouter.listModels,
        debouncedSearch ? { searchTerm: debouncedSearch } : {},
    );
    const recentModelIds = useQuery(api.settings.getRecentModels);

    // Update ref cache when we get valid results
    if (allModels !== undefined && allModels.length > 0) {
        lastValidResultsRef.current = allModels;
    }

    const isSearching = !!debouncedSearch && allModels === undefined;

    // Use featured models when no search, all models when searching
    // When searching and loading, show cached previous results to avoid flicker
    const displayModels = useMemo(() => {
        if (debouncedSearch) {
            return allModels ?? lastValidResultsRef.current;
        }
        return featuredModels ?? [];
    }, [debouncedSearch, allModels, featuredModels]);

    // Apply type filter, then show all models; premium ones are grayed out for basic users
    const filteredModels = useMemo(() => {
        if (typeFilter === 'all') return displayModels;
        return displayModels.filter((m) => {
            const out = (m as { outputModalities?: string[] }).outputModalities ?? [];
            if (typeFilter === 'text') return !out.includes('image') && !out.includes('video');
            if (typeFilter === 'image') return out.includes('image');
            if (typeFilter === 'video') return out.includes('video');
            return true;
        });
    }, [displayModels, typeFilter]);

    // Categorize models by output modality
    const { textModels, imageModels, videoModels } = useMemo(() => {
        const text: typeof filteredModels = [];
        const image: typeof filteredModels = [];
        const video: typeof filteredModels = [];
        for (const m of filteredModels) {
            const out = (m as { outputModalities?: string[] }).outputModalities ?? [];
            if (out.includes('video')) video.push(m);
            else if (out.includes('image')) image.push(m);
            else text.push(m);
        }
        return { textModels: text, imageModels: image, videoModels: video };
    }, [filteredModels]);

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

    const displayName = selectedModel?.name;

    const handleSelect = (openRouterId: string) => {
        onChange(openRouterId);
        setOpen(false);
        setSearch('');
        setTypeFilter('all');
    };

    const canAccessPro = userTier === 'pro' || hasByok;

    const isModelDisabled = (model: NonNullable<typeof selectedModel>) => {
        if (!canAccessPro && model.tier === 'premium') return true;
        const out = (model as { outputModalities?: string[] }).outputModalities ?? [];
        if (!canAccessPro && (out.includes('image') || out.includes('video'))) return true;
        return false;
    };

    const renderModelItem = (model: NonNullable<typeof selectedModel>) => {
        const disabled = isModelDisabled(model);
        return (
            <button
                key={model._id}
                data-model-id={model.openRouterId}
                onClick={() => !disabled && handleSelect(model.openRouterId)}
                className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm',
                    disabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-accent',
                    value === model.openRouterId && 'bg-accent',
                )}
                title={disabled ? 'This model requires Pro or your own API key. Visit Settings to add your key.' : undefined}
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
                    className="w-full sm:w-[340px] justify-between"
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
            <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[420px] overflow-hidden p-0" align="start" side="top" sideOffset={8}>
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
                <div className="flex gap-1 border-b px-2 py-1.5">
                    {(['all', 'text', 'image', 'video'] as const).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setTypeFilter(filter)}
                            className={cn(
                                'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                                typeFilter === filter
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                            )}
                        >
                            {filter === 'all' && 'All'}
                            {filter === 'text' && <><MessageSquare className="h-3 w-3" />Text</>}
                            {filter === 'image' && <><Image className="h-3 w-3" />Image</>}
                            {filter === 'video' && <><Video className="h-3 w-3" />Video</>}
                        </button>
                    ))}
                </div>
                <div className="max-h-[min(450px,50vh)] overflow-y-auto" ref={scrollAreaRef}>
                    <div className="p-1">
                        {!search && recentModels.length > 0 && (
                            <>
                                <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    Recently Used
                                </div>
                                {recentModels.map((m) => renderModelItem(m))}
                                <div className="my-1 border-t" />
                            </>
                        )}
                        {!search && (
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                Featured Models
                            </div>
                        )}
                        {filteredModels.length === 0 && !isSearching ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No models found
                            </div>
                        ) : ((imageModels.length > 0 || videoModels.length > 0) ? (
                            <>
                                {textModels.length > 0 && (
                                    <>
                                        {search && (
                                            <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                                <MessageSquare className="h-3 w-3" />
                                                Text Models
                                            </div>
                                        )}
                                        {textModels.map((m) => renderModelItem(m))}
                                    </>
                                )}
                                {imageModels.length > 0 && (
                                    <>
                                        <div className="my-1 border-t" />
                                        <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                            <Image className="h-3 w-3" />
                                            Image Models
                                            {!canAccessPro && <Badge variant="default" className="ml-1 text-[9px] px-1 py-0">Pro</Badge>}
                                        </div>
                                        {imageModels.map((m) => renderModelItem(m))}
                                    </>
                                )}
                                {videoModels.length > 0 && (
                                    <>
                                        <div className="my-1 border-t" />
                                        <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                            <Video className="h-3 w-3" />
                                            Video Models
                                            {!canAccessPro && <Badge variant="default" className="ml-1 text-[9px] px-1 py-0">Pro</Badge>}
                                        </div>
                                        {videoModels.map((m) => renderModelItem(m))}
                                    </>
                                )}
                            </>
                        ) : (
                            filteredModels.map((m) => renderModelItem(m))
                        ))}
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
                </div>
            </PopoverContent>
        </Popover>
    );
}
