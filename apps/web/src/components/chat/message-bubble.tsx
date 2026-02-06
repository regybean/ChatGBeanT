'use client';

import { memo, useMemo, useState, useEffect } from 'react';
import { User, Bot, Loader2, FileText, AlertCircle } from 'lucide-react';
import { useSmoothText } from '@convex-dev/agent/react';
import type { UIMessage } from '@convex-dev/agent';

import { cn } from '@chatgbeant/ui/cn';
import { MarkdownContent } from '@chatgbeant/ui/markdown-content';
import { Avatar, AvatarFallback } from '@chatgbeant/ui/avatar';
import { CopyButton } from '@chatgbeant/ui/copy-button';
import { GeneratedImageMessage } from './image-message';
import { GeneratedVideoMessage } from './video-message';
import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';

// Parse document references from message text and separate them from the actual message
function parseDocumentReferences(text: string): { documents: string[]; cleanedText: string } {
    const docPattern = /\[Document: ([^\]]+)\]\n[\s\S]*?(?=\n\n---\n\n|\[Document:|$)/g;
    const documents: string[] = [];
    let match;

    while ((match = docPattern.exec(text)) !== null) {
        if (match[1]) {
            documents.push(match[1]);
        }
    }

    // Remove document sections and the separator from the text
    const cleanedText = text
        .replaceAll(/\[Document: [^\]]+\]\n[\s\S]*?\n\n---\n\n/g, '')
        .replaceAll(/\[Document: [^\]]+\]\n[\s\S]*$/g, '')
        .trim();

    return { documents, cleanedText };
}

// Parse attached image URLs from message text
function parseAttachedImages(text: string): { imageUrls: string[]; cleanedText: string } {
    const imagePattern = /\[ATTACHED_IMAGE:(https?:\/\/[^\]]+)\]/g;
    const imageUrls: string[] = [];
    let match;

    while ((match = imagePattern.exec(text)) !== null) {
        if (match[1]) {
            imageUrls.push(match[1]);
        }
    }

    const cleanedText = text.replaceAll(/\[ATTACHED_IMAGE:[^\]]+\]\n?/g, '').trim();
    return { imageUrls, cleanedText };
}

interface MediaRecord {
    _id: Id<'generatedMedia'>;
    url?: string;
    status: 'pending' | 'generating' | 'completed' | 'failed';
    prompt: string;
    errorMessage?: string;
    savedToDocuments?: boolean;
    type: 'image' | 'video';
}

interface MessageBubbleProps {
    message: UIMessage;
    model?: string;
    isCancelled?: boolean;
    mediaRecords?: MediaRecord[];
}

// Detect media message patterns
const IMAGE_PATTERN = /^\[GENERATED_IMAGE:([\w]+)\]$/;
const VIDEO_PATTERN = /^\[GENERATED_VIDEO:([\w]+)\]$/;

export const MessageBubble = memo(function MessageBubble({ message, model, isCancelled, mediaRecords }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const isStreaming = message.status === 'streaming' && !isCancelled;
    const isPending = message.status === 'pending';

    // Check if this is a media message from the raw message text (not smoothed)
    // This allows us to detect media messages even during streaming before visibleText catches up
    const rawImageMatch = !isUser && message.text ? IMAGE_PATTERN.exec(message.text) : null;
    const rawVideoMatch = !isUser && message.text ? VIDEO_PATTERN.exec(message.text) : null;
    const isKnownMediaMessage = Boolean(rawImageMatch ?? rawVideoMatch);

    // Use smooth text for streaming messages - this creates the typewriter effect
    // But skip smooth text for media messages to avoid showing partial pattern
    const [smoothedText] = useSmoothText(message.text, {
        startStreaming: isStreaming && !isKnownMediaMessage,
    });
    
    // For media messages, use the raw text directly to avoid smooth text delay
    const visibleText = isKnownMediaMessage ? message.text : smoothedText;

    // Parse document references and attached images for user messages
    const { documents, attachedImages, cleanedText } = useMemo(() => {
        if (isUser && visibleText) {
            const { imageUrls, cleanedText: afterImages } = parseAttachedImages(visibleText);
            const { documents, cleanedText: afterDocs } = parseDocumentReferences(afterImages);
            return { documents, attachedImages: imageUrls, cleanedText: afterDocs };
        }
        return { documents: [], attachedImages: [] as string[], cleanedText: visibleText };
    }, [isUser, visibleText]);

    // Use cleaned text for display
    const displayText = isUser ? cleanedText : visibleText;

    // Check if this is a generated media message
    const imageMatch = !isUser && displayText ? IMAGE_PATTERN.exec(displayText) : null;
    const videoMatch = !isUser && displayText ? VIDEO_PATTERN.exec(displayText) : null;
    const mediaId = imageMatch?.[1] ?? videoMatch?.[1];
    const mediaRecord = mediaId && mediaRecords
        ? mediaRecords.find((m) => m._id === mediaId)
        : undefined;

    // For non-streaming messages, only render if there's content
    const hasContent = displayText && displayText.length > 0;

    // Check if this is a media message (has media ID pattern)
    const isMediaMessage = Boolean(mediaId);

    // Show typing indicator when:
    // 1. Streaming with no visible content yet, OR
    // 2. Pending with no content (waiting to start streaming), OR
    // 3. Message has text but visibleText hasn't caught up yet (prevents flicker)
    // BUT NOT for media messages - they have their own loading state
    const showTypingIndicator = !isMediaMessage && !hasContent && (isStreaming || isPending || (message.text && message.text.length > 0));

    // Thinking timeout: show error if stuck thinking for 30s
    const [thinkingTimedOut, setThinkingTimedOut] = useState(false);
    useEffect(() => {
        if (!showTypingIndicator) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setThinkingTimedOut(false);
            return;
        }
        const timer = setTimeout(() => setThinkingTimedOut(true), 30_000);
        return () => clearTimeout(timer);
    }, [showTypingIndicator]);

    // Don't render empty bubble for user messages that have no content (unless they have docs or images)
    // For assistant messages, always render (will show thinking indicator if no content, or media loading state)
    const shouldRender = isUser
        ? (hasContent || documents.length > 0 || attachedImages.length > 0)
        : (hasContent || showTypingIndicator || isMediaMessage || (isCancelled && !visibleText));

    if (!shouldRender) {
        return null;
    }

    return (
        <div
            className={cn(
                'group flex gap-3',
                isUser ? 'flex-row-reverse' : 'flex-row',
            )}
        >
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                    className={cn(
                        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
                    )}
                >
                    {isUser ? (
                        <User className="h-4 w-4" />
                    ) : (
                        <Bot className="h-4 w-4" />
                    )}
                </AvatarFallback>
            </Avatar>
            <div className="flex max-w-[90%] md:max-w-[80%] flex-col gap-1">
                {/* Attached images for user messages */}
                {isUser && attachedImages.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-end">
                        {attachedImages.map((url, idx) => (
                            <img
                                key={idx}
                                src={url}
                                alt="Attached image"
                                className="max-h-32 max-w-[200px] rounded-md object-cover"
                                loading="lazy"
                            />
                        ))}
                    </div>
                )}
                {/* Document reference chips for user messages */}
                {isUser && documents.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-end">
                        {documents.map((docTitle, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-1.5 rounded-md border border-primary-foreground/20 bg-primary/80 px-2 py-1 text-xs text-primary-foreground"
                            >
                                <FileText className="h-3.5 w-3.5" />
                                <span className="max-w-[120px] truncate">{docTitle}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div
                    className={cn(
                        'rounded-lg px-4 py-2 overflow-hidden break-words text-sm md:text-base',
                        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
                    )}
                >
                    {isCancelled && !visibleText && (
                        <div className="flex items-center gap-2 text-muted-foreground italic">
                            <span>[Response cancelled]</span>
                        </div>
                    )}
                    {showTypingIndicator && !thinkingTimedOut && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Thinking...</span>
                        </div>
                    )}
                    {showTypingIndicator && thinkingTimedOut && (
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span>Model may be unavailable. Try again or choose another model.</span>
                        </div>
                    )}
                    {!showTypingIndicator && isUser && hasContent && (
                        <MarkdownContent
                            content={displayText}
                            className="prose-invert"
                        />
                    )}
                    {!showTypingIndicator && !isUser && hasContent && mediaRecord?.type === 'image' && (
                        <GeneratedImageMessage media={mediaRecord} />
                    )}
                    {!showTypingIndicator && !isUser && hasContent && mediaRecord?.type === 'video' && (
                        <GeneratedVideoMessage media={mediaRecord} />
                    )}
                    {!showTypingIndicator && !isUser && hasContent && !mediaRecord && Boolean(mediaId) && (
                        /* Media message but record not loaded yet — show skeleton */
                        <div className="flex h-64 w-full max-w-md items-center justify-center rounded-lg bg-muted/50 animate-pulse">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <span className="text-sm">{imageMatch ? 'Loading image...' : 'Loading video...'}</span>
                            </div>
                        </div>
                    )}
                    {!showTypingIndicator && !isUser && !mediaRecord && !mediaId && (
                        <>
                            <MarkdownContent content={displayText} />
                            {isCancelled && (
                                <div className="mt-1 text-xs italic text-muted-foreground">[Response cancelled]</div>
                            )}
                            {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
                            {isStreaming && !isCancelled && (
                                <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-foreground/50" />
                            )}
                        </>
                    )}

                </div>
                {/* Copy button + model info - visible on hover, only when message is complete */}
                {hasContent && !showTypingIndicator && !isStreaming && !isPending && (
                    <div
                        className={cn(
                            'flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100',
                            isUser ? 'justify-end' : 'justify-start',
                        )}
                    >
                        <CopyButton text={displayText} />
                        {model && !isUser && (
                            <span className="text-[10px] text-muted-foreground">
                                {model.split('/').pop()}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => {
    return (
        prev.message.key === next.message.key &&
        prev.message.text === next.message.text &&
        prev.message.status === next.message.status &&
        prev.model === next.model &&
        prev.isCancelled === next.isCancelled &&
        prev.mediaRecords === next.mediaRecords
    );
});
