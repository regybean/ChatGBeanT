'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { Download, Copy, Bookmark, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import { cn } from '@chatgbeant/ui/cn';
import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';

interface GeneratedVideoMessageProps {
    media: {
        _id: Id<'generatedMedia'>;
        url?: string;
        status: 'pending' | 'generating' | 'completed' | 'failed';
        prompt: string;
        errorMessage?: string;
        savedToDocuments?: boolean;
    };
}

export function GeneratedVideoMessage({ media }: GeneratedVideoMessageProps) {
    const [hovering, setHovering] = useState(false);
    const saveToDocuments = useMutation(api.media.saveMediaToDocuments);

    const handleCopyUrl = async () => {
        if (!media.url) return;
        await navigator.clipboard.writeText(media.url);
        toast.success('Video URL copied to clipboard');
    };

    const handleDownload = () => {
        if (!media.url) return;
        const a = document.createElement('a');
        a.href = media.url;
        a.download = `generated-${media._id}.mp4`;
        a.target = '_blank';
        document.body.append(a);
        a.click();
        a.remove();
    };

    const handleSave = async () => {
        try {
            await saveToDocuments({ mediaId: media._id });
            toast.success('Video saved to documents');
        } catch {
            toast.error('Failed to save video');
        }
    };

    if (media.status === 'pending' || media.status === 'generating') {
        return (
            <div className="flex h-64 w-full max-w-md items-center justify-center rounded-lg bg-muted animate-pulse">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-sm">Generating video...</span>
                    <span className="text-xs">This may take a minute</span>
                </div>
            </div>
        );
    }

    if (media.status === 'failed') {
        return (
            <div className="flex h-32 w-full max-w-md items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5">
                <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{media.errorMessage ?? 'Video generation failed'}</span>
                </div>
            </div>
        );
    }

    if (!media.url) return null;

    return (
        <div
            className="relative max-w-md overflow-hidden rounded-lg"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
        >
            <video
                src={media.url}
                controls
                className="h-auto w-full rounded-lg"
                preload="metadata"
                poster={`${media.url}#t=0.1`}
            />
            <div
                className={cn(
                    'absolute top-2 right-2 flex gap-1 transition-opacity',
                    hovering ? 'opacity-100' : 'opacity-0',
                )}
            >
                <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCopyUrl}
                    title="Copy video URL"
                >
                    <Copy className="h-4 w-4" />
                </Button>
                <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDownload}
                    title="Download video"
                >
                    <Download className="h-4 w-4" />
                </Button>
                {!media.savedToDocuments && (
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleSave}
                        title="Save to documents"
                    >
                        <Bookmark className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
