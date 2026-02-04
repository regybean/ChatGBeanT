'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useUIMessages } from '@convex-dev/agent/react';
import { Send, Loader2, Square } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import { Textarea } from '@chatgbeant/ui/textarea';
import { ScrollArea } from '@chatgbeant/ui/scroll-area';

import { MessageBubble } from './message-bubble';
import { ModelSelector } from './model-selector';
import { FileUploadZone, type UploadedFile } from './file-upload-zone';

interface ChatInterfaceProps {
  isNewChat: boolean;
  threadId?: string;
  initialModel?: string;
  onFirstMessage?: (content: string, model: string) => Promise<string>;
  onMessageSent?: (threadId: string) => void;
}

const DRAFT_KEY_PREFIX = 'chatgbeant:draft:';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export function ChatInterface({
  isNewChat,
  threadId,
  initialModel,
  onFirstMessage,
  onMessageSent,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(initialModel ?? DEFAULT_MODEL);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update model when initialModel loads (e.g. from async query)
  useEffect(() => {
    if (initialModel) {
      setSelectedModel(initialModel);
    }
  }, [initialModel]);

  const currentUser = useQuery(api.users.getCurrent);

  // Check if selected model supports file/image input
  const selectedModelInfo = useQuery(api.openrouter.getModelByOpenRouterId, {
    openRouterId: selectedModel,
  });
  const supportsFiles = selectedModelInfo?.inputModalities?.some(
    (m) => m === 'image' || m === 'file',
  ) ?? false;

  // Use agent's useUIMessages hook for real-time streaming support
  const { results: messages } = useUIMessages(
    api.chat.listMessages,
    threadId ? { threadId } : 'skip',
    { initialNumItems: 100, stream: true }
  );

  const sendMessage = useAction(api.chat.sendMessage);

  // Draft key for localStorage
  const draftKey = `${DRAFT_KEY_PREFIX}${threadId ?? 'new'}`;

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      setInput(draft);
    }
  }, [draftKey]);

  // Save draft to localStorage (debounced to avoid lag)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input) {
        localStorage.setItem(draftKey, input);
      } else {
        localStorage.removeItem(draftKey);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [input, draftKey]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const content = input.trim();
    const filesToSend = [...uploadedFiles];
    setInput('');
    setUploadedFiles([]);
    localStorage.removeItem(draftKey);
    setIsLoading(true);

    try {
      let targetThreadId = threadId;

      if (isNewChat && onFirstMessage) {
        targetThreadId = await onFirstMessage(content, selectedModel);
      }

      if (!targetThreadId) {
        throw new Error('No thread ID');
      }

      await sendMessage({
        threadId: targetThreadId,
        content,
        model: selectedModel,
        ...(filesToSend.length > 0 && {
          fileIds: filesToSend.map((f) => f.storageId),
        }),
      });

      // Notify parent that message was sent (for redirecting on new chats)
      if (onMessageSent) {
        onMessageSent(targetThreadId);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to send message',
      );
      // Restore input on error
      setInput(content);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e);
    }
  };

  const hasMessages = messages.length > 0;

  // Check if any message is currently streaming
  const isAnyStreaming = messages.some((m) => m.status === 'streaming');

  const handleStop = () => {
    setIsLoading(false);
  };

  return (
    <div className="flex h-full flex-col">
      {hasMessages ? (
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.key}
                message={message}
                model={message.role === 'assistant' ? selectedModel : undefined}
              />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <h1 className="mb-4 text-3xl font-bold">Welcome to ChatGBeanT</h1>
          <p className="mb-8 text-center text-muted-foreground">
            Start a conversation with AI. Choose a model and type your message
            below.
          </p>
        </div>
      )}

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <div className="mb-2 flex items-center gap-2">
            <ModelSelector
              value={selectedModel}
              onChange={setSelectedModel}
              userTier={currentUser?.tier ?? 'basic'}
            />
          </div>
          {supportsFiles ? (
            <FileUploadZone
              files={uploadedFiles}
              onFilesChange={setUploadedFiles}
              disabled={isLoading}
            >
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="min-h-[100px] resize-none pl-12 pr-12"
                disabled={isLoading}
              />
              {isAnyStreaming ? (
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute bottom-2 right-2"
                  onClick={handleStop}
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  className="absolute bottom-2 right-2"
                  disabled={!input.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              )}
            </FileUploadZone>
          ) : (
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="min-h-[100px] resize-none pr-12"
                disabled={isLoading}
              />
              {isAnyStreaming ? (
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute bottom-2 right-2"
                  onClick={handleStop}
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  className="absolute bottom-2 right-2"
                  disabled={!input.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          )}
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
