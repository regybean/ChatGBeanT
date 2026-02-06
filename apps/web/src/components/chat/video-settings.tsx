'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@chatgbeant/ui/button';
import { cn } from '@chatgbeant/ui/cn';

export interface VideoConfig {
    duration: number;
    aspectRatio: '16:9' | '9:16' | '1:1';
    quality: 'draft' | 'standard';
}

interface VideoSettingsProps {
    config: VideoConfig;
    onChange: (config: VideoConfig) => void;
}

export function VideoSettings({ config, onChange }: VideoSettingsProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="mb-2 rounded-lg border bg-muted/50">
            <button
                className="flex w-full items-center justify-between px-3 py-2 text-sm"
                onClick={() => setExpanded(!expanded)}
                type="button"
            >
                <span className="font-medium">Video Settings</span>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <div className={cn(
                'grid transition-all duration-200 ease-in-out',
                expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}>
                <div className={cn('overflow-hidden', expanded && 'border-t')}>
                    <div className="space-y-3 px-3 py-3">
                        {/* Duration */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">
                                Duration: {config.duration}s
                            </label>
                            <input
                                type="range"
                                min={2}
                                max={10}
                                step={1}
                                value={config.duration}
                                onChange={(e) => onChange({ ...config, duration: Number.parseInt(e.target.value) })}
                                className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>2s</span>
                                <span>10s</span>
                            </div>
                        </div>

                        {/* Aspect Ratio */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Aspect Ratio</label>
                            <div className="flex gap-1">
                                {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
                                    <Button
                                        key={ratio}
                                        type="button"
                                        variant={config.aspectRatio === ratio ? 'default' : 'outline'}
                                        size="sm"
                                        className="flex-1 text-xs"
                                        onClick={() => onChange({ ...config, aspectRatio: ratio })}
                                    >
                                        {ratio}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Quality */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Quality</label>
                            <div className="flex gap-1">
                                {(['draft', 'standard'] as const).map((q) => (
                                    <Button
                                        key={q}
                                        type="button"
                                        variant={config.quality === q ? 'default' : 'outline'}
                                        size="sm"
                                        className={cn('flex-1 text-xs', q === 'standard' && 'capitalize')}
                                        onClick={() => onChange({ ...config, quality: q })}
                                    >
                                        {q.charAt(0).toUpperCase() + q.slice(1)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
