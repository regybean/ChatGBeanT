'use client';

import { memo } from 'react';
import { User, Bot, Loader2 } from 'lucide-react';
import { useSmoothText } from '@convex-dev/agent/react';
import type { UIMessage } from '@convex-dev/agent';

import { cn } from '@chatgbeant/ui/cn';
import { MarkdownContent } from '@chatgbeant/ui/markdown-content';
import { Avatar, AvatarFallback } from '@chatgbeant/ui/avatar';
import { CopyButton } from '@chatgbeant/ui/copy-button';

interface MessageBubbleProps {
  message: UIMessage;
  model?: string;
}

export const MessageBubble = memo(function MessageBubble({ message, model }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';

  // Use smooth text for streaming messages - this creates the typewriter effect
  const [visibleText] = useSmoothText(message.text, {
    startStreaming: isStreaming,
  });

  // Show typing indicator when streaming but no content yet
  const showTypingIndicator = isStreaming && !visibleText;

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
        <div
          className={cn(
            'relative rounded-lg px-4 py-2',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
          )}
        >
          {showTypingIndicator && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
          {!showTypingIndicator && isUser && (
            <MarkdownContent
              content={visibleText}
              className="prose-invert"
            />
          )}
          {!showTypingIndicator && !isUser && (
            <>
              <MarkdownContent content={visibleText} />
              {isStreaming && visibleText && (
                <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-foreground/50" />
              )}
            </>
          )}

          {/* Copy button - visible on hover */}
          {!showTypingIndicator && visibleText && (
            <div
              className={cn(
                'absolute -bottom-8 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100',
                isUser ? 'right-0' : 'left-0',
              )}
            >
              <CopyButton text={visibleText} />
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
    prev.model === next.model
  );
});
