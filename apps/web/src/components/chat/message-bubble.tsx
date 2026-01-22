'use client';

import { User, Bot } from 'lucide-react';

import type { Doc } from '@chatgbeant/backend/convex/_generated/dataModel';
import { cn } from '@chatgbeant/ui/cn';
import { MarkdownContent } from '@chatgbeant/ui/markdown-content';
import { Avatar, AvatarFallback } from '@chatgbeant/ui/avatar';

interface MessageBubbleProps {
    message: Doc<'messages'>;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user';

    return (
        <div
            className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
        >
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                    className={cn(
                        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
                    )}
                >
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </AvatarFallback>
            </Avatar>
            <div
                className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2',
                    isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
            >
                {isUser ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                    <MarkdownContent content={message.content} />
                )}
                {message.model && (
                    <p className="mt-2 text-xs opacity-60">{message.model}</p>
                )}
            </div>
        </div>
    );
}
