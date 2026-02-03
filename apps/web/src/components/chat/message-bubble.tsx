'use client';

import { User, Bot, Loader2 } from 'lucide-react';

import { cn } from '@chatgbeant/ui/cn';
import { MarkdownContent } from '@chatgbeant/ui/markdown-content';
import { Avatar, AvatarFallback } from '@chatgbeant/ui/avatar';

// Type for messages from @convex-dev/agent listMessages
interface AgentMessage {
  id?: string;
  role?: 'user' | 'assistant' | 'system' | 'tool';
  text?: string;
  status?: 'pending' | 'success' | 'failed';
  tool?: boolean;
}

interface MessageBubbleProps {
  message: AgentMessage;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // Get the text content from the message
  const rawText = message.text ?? '';

  // Show typing indicator when streaming but no content yet
  const showTypingIndicator = isStreaming && !rawText;

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
        {showTypingIndicator && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
        {!showTypingIndicator && isUser && (
          <p className="whitespace-pre-wrap">{rawText}</p>
        )}
        {!showTypingIndicator && !isUser && (
          <>
            <MarkdownContent content={rawText} />
            {isStreaming && rawText && (
              <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-foreground/50" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
