'use client';

import { memo, useState, useEffect, useMemo } from 'react';
import { User, Bot, Loader2, AlertCircle, FileText } from 'lucide-react';
import { useSmoothText } from '@convex-dev/agent/react';
import type { UIMessage } from '@convex-dev/agent';

import { cn } from '@chatgbeant/ui/cn';
import { MarkdownContent } from '@chatgbeant/ui/markdown-content';
import { Avatar, AvatarFallback } from '@chatgbeant/ui/avatar';
import { CopyButton } from '@chatgbeant/ui/copy-button';

// Parse document references from message text and separate them from the actual message
function parseDocumentReferences(text: string): { documents: string[]; cleanedText: string } {
    const docPattern = /\[Document: ([^\]]+)\]\n[\s\S]*?(?=\n\n---\n\n|\[Document:|$)/g;
    const documents: string[] = [];
    let match;

    while ((match = docPattern.exec(text)) !== null) {
        documents.push(match[1]);
    }

    // Remove document sections and the separator from the text
    let cleanedText = text
        .replace(/\[Document: [^\]]+\]\n[\s\S]*?\n\n---\n\n/g, '')
        .replace(/\[Document: [^\]]+\]\n[\s\S]*$/g, '')
        .trim();

    return { documents, cleanedText };
}

interface MessageBubbleProps {
    message: UIMessage;
    model?: string;
    isCancelled?: boolean;
}

export const MessageBubble = memo(function MessageBubble({ message, model, isCancelled }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const isStreaming = message.status === 'streaming' && !isCancelled;
    const isPending = message.status === 'pending';

    // Use smooth text for streaming messages - this creates the typewriter effect
    const [visibleText] = useSmoothText(message.text, {
        startStreaming: isStreaming,
    });

    // Parse document references for user messages
    const { documents, cleanedText } = useMemo(() => {
        if (isUser && visibleText) {
            return parseDocumentReferences(visibleText);
        }
        return { documents: [], cleanedText: visibleText };
    }, [isUser, visibleText]);

    // Use cleaned text for display
    const displayText = isUser ? cleanedText : visibleText;

    // For non-streaming messages, only render if there's content
    const hasContent = displayText && displayText.length > 0;

    // Show typing indicator when:
    // 1. Streaming with no visible content yet, OR
    // 2. Pending with no content (waiting to start streaming), OR
    // 3. Message has text but visibleText hasn't caught up yet (prevents flicker)
    const showTypingIndicator = !hasContent && (isStreaming || isPending || (message.text && message.text.length > 0));

    // Thinking timeout: show error if stuck thinking for 30s
    const [thinkingTimedOut, setThinkingTimedOut] = useState(false);
    useEffect(() => {
        if (!showTypingIndicator) {
            setThinkingTimedOut(false);
            return;
        }
        const timer = setTimeout(() => setThinkingTimedOut(true), 30000);
        return () => clearTimeout(timer);
    }, [showTypingIndicator]);

    // Don't render empty bubble for user messages that have no content (unless they have docs)
    // For assistant messages, always render (will show thinking indicator if no content)
    const shouldRender = isUser ? (hasContent || documents.length > 0) : (hasContent || showTypingIndicator || (isCancelled && !visibleText));

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
            <div className="flex max-w-[80%] flex-col gap-1">
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
                        'relative rounded-lg px-4 py-2',
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
                    {!showTypingIndicator && !isUser && hasContent && (
                        <>
                            <MarkdownContent content={displayText} />
                            {isCancelled && (
                                <div className="mt-1 text-xs italic text-muted-foreground">[Response cancelled]</div>
                            )}
                            {isStreaming && !isCancelled && (
                                <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-foreground/50" />
                            )}
                        </>
                    )}

                    {/* Copy button + model info - visible on hover */}
                    {!showTypingIndicator && hasContent && (
                        <div
                            className={cn(
                                'absolute -bottom-8 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100',
                                isUser ? 'right-0' : 'left-0',
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
        </div>
    );
}, (prev, next) => {
    return (
        prev.message.key === next.message.key &&
        prev.message.text === next.message.text &&
        prev.message.status === next.message.status &&
        prev.model === next.model &&
        prev.isCancelled === next.isCancelled
    );
});
