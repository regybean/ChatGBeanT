'use client';

import { useState, useRef, useEffect } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useUIMessages } from '@convex-dev/agent/react';
import { Send, Loader2, Square, Paperclip, User, Bot } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import { Textarea } from '@chatgbeant/ui/textarea';
import { ScrollArea } from '@chatgbeant/ui/scroll-area';
import { Avatar, AvatarFallback } from '@chatgbeant/ui/avatar';
import { MarkdownContent } from '@chatgbeant/ui/markdown-content';

import { MessageBubble } from './message-bubble';
import { ModelSelector } from './model-selector';
import { FileUploadZone, type UploadedFile, type FileUploadZoneHandle } from './file-upload-zone';

// Optimistic user message component - shown immediately before server confirms
function OptimisticUserMessage({ content }: { content: string }) {
    return (
        <div className="group flex gap-3 flex-row-reverse">
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                </AvatarFallback>
            </Avatar>
            <div className="flex max-w-[80%] flex-col gap-1">
                <div className="relative rounded-lg px-4 py-2 bg-primary text-primary-foreground">
                    <MarkdownContent content={content} className="prose-invert" />
                </div>
            </div>
        </div>
    );
}

// Optimistic thinking indicator - shown while waiting for assistant response
function OptimisticThinkingIndicator() {
    return (
        <div className="group flex gap-3 flex-row">
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-muted">
                    <Bot className="h-4 w-4" />
                </AvatarFallback>
            </Avatar>
            <div className="flex max-w-[80%] flex-col gap-1">
                <div className="relative rounded-lg px-4 py-2 bg-muted">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Thinking...</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Message skeleton for loading states - shows while messages are being fetched
function MessageSkeleton({ isUser }: { isUser: boolean }) {
    return (
        <div className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="h-8 w-8 shrink-0 rounded-full bg-muted animate-pulse" />
            <div className="flex max-w-[60%] flex-col gap-1">
                <div className={`rounded-lg px-4 py-3 ${isUser ? 'bg-primary/20' : 'bg-muted'}`}>
                    <div className="h-4 w-48 rounded bg-foreground/10 animate-pulse" />
                    {!isUser && <div className="h-4 w-32 mt-2 rounded bg-foreground/10 animate-pulse" />}
                </div>
            </div>
        </div>
    );
}

// Pending message storage key - used to pass message across redirect
const PENDING_MESSAGE_KEY = 'chatgbeant:pending-message';

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
    // Optimistic message state for immediate feedback
    const [optimisticMessage, setOptimisticMessage] = useState<{ content: string; model: string } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const prevMessageCountRef = useRef(0);
    const cancelledKeysRef = useRef<Set<string>>(new Set());
    const fileUploadRef = useRef<FileUploadZoneHandle>(null);

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
    const { results: messages, status: messagesStatus } = useUIMessages(
        api.chat.listMessages,
        threadId ? { threadId } : 'skip',
        { initialNumItems: 100, stream: true }
    );

    // Check if messages are still loading (for existing threads)
    const isLoadingMessages = messagesStatus === 'LoadingFirstPage';

    // Load pending message from localStorage (for seamless new chat redirect)
    useEffect(() => {
        if (threadId && !isNewChat) {
            const pending = localStorage.getItem(PENDING_MESSAGE_KEY);
            if (pending) {
                try {
                    const { content, model, targetThreadId } = JSON.parse(pending);
                    if (targetThreadId === threadId) {
                        setOptimisticMessage({ content, model });
                        // Clear immediately - real messages will replace optimistic ones
                        localStorage.removeItem(PENDING_MESSAGE_KEY);
                    }
                } catch {
                    localStorage.removeItem(PENDING_MESSAGE_KEY);
                }
            }
        }
    }, [threadId, isNewChat]);

    // Clear optimistic message once real messages arrive
    useEffect(() => {
        if (messages.length > 0 && optimisticMessage) {
            // Check if our optimistic message content appears in the real messages
            const hasRealUserMessage = messages.some(
                (m) => m.role === 'user' && m.text?.includes(optimisticMessage.content.slice(0, 50))
            );
            if (hasRealUserMessage) {
                setOptimisticMessage(null);
            }
        }
    }, [messages, optimisticMessage]);

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

    // Scroll to bottom only when new messages arrive or user is near bottom
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const messageCountChanged = messages.length !== prevMessageCountRef.current;
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        if (messageCountChanged || isNearBottom) {
            el.scrollTop = el.scrollHeight;
        }
        prevMessageCountRef.current = messages.length;
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

        // Only show optimistic message for existing chats (not new chats that will redirect)
        if (!isNewChat) {
            setOptimisticMessage({ content, model: selectedModel });
        }

        try {
            let targetThreadId = threadId;

            if (isNewChat && onFirstMessage) {
                targetThreadId = await onFirstMessage(content, selectedModel);
                // Store pending message for the thread page to pick up immediately
                if (targetThreadId) {
                    localStorage.setItem(PENDING_MESSAGE_KEY, JSON.stringify({
                        content,
                        model: selectedModel,
                        targetThreadId,
                    }));
                }
                // Redirect immediately after thread creation, before awaiting message
                if (onMessageSent && targetThreadId) {
                    onMessageSent(targetThreadId);
                }
            }

            if (!targetThreadId) {
                throw new Error('No thread ID');
            }

            // Send message - don't await if we already redirected for new chats
            const messagePromise = sendMessage({
                threadId: targetThreadId,
                content,
                model: selectedModel,
                ...(filesToSend.length > 0 && {
                    fileIds: filesToSend.map((f) => f.storageId),
                }),
            });

            // For existing chats, wait for message to complete
            if (!isNewChat) {
                await messagePromise;
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to send message';
            if (msg.includes('Rate limit')) {
                toast.error('Rate limited — please wait a moment and try again.');
            } else if (msg.includes('token limit') || msg.includes('Token limit')) {
                toast.error('Token limit reached. Upgrade to Pro for more tokens.');
            } else if (msg.includes('not available') || msg.includes('Model not')) {
                toast.error('This model is currently unavailable. Please choose another.');
            } else {
                toast.error(msg);
            }
            // Restore input on error and clear optimistic message
            setInput(content);
            setOptimisticMessage(null);
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

    // Determine if we should show the message area vs welcome screen
    // Show message area if: has messages, is loading existing thread, or has optimistic message
    const hasMessages = messages.length > 0 || optimisticMessage !== null;
    const showMessageArea = hasMessages || (isLoadingMessages && !isNewChat);

    // Check if any message is currently streaming
    const isAnyStreaming = messages.some((m) => m.status === 'streaming');

    // Show thinking state when we have optimistic message but no assistant response yet
    const showOptimisticThinking = optimisticMessage !== null && !messages.some(
        (m) => m.role === 'assistant' && m.status === 'streaming'
    );

    // Show skeleton when loading existing thread with no messages yet and no optimistic message
    const showSkeleton = isLoadingMessages && messages.length === 0 && !optimisticMessage && !isNewChat;

    const handleStop = () => {
        // Soft cancel: mark all currently streaming messages as cancelled
        messages.forEach((m) => {
            if (m.status === 'streaming') {
                cancelledKeysRef.current.add(m.key);
            }
        });
        setIsLoading(false);
        setOptimisticMessage(null);
    };

    return (
        <div className="flex h-full flex-col">
            {showMessageArea ? (
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="mx-auto max-w-3xl space-y-6">
                        {/* Show skeletons while loading existing thread */}
                        {showSkeleton && (
                            <>
                                <MessageSkeleton isUser={true} />
                                <MessageSkeleton isUser={false} />
                            </>
                        )}
                        {/* Real messages */}
                        {messages.map((message) => (
                            <MessageBubble
                                key={message.key}
                                message={message}
                                model={message.role === 'assistant' ? selectedModel : undefined}
                                isCancelled={cancelledKeysRef.current.has(message.key)}
                            />
                        ))}
                        {/* Optimistic user message - shown immediately before server confirms */}
                        {optimisticMessage?.content && !messages.some(m => m.role === 'user' && m.text?.includes(optimisticMessage.content.slice(0, 50))) && (
                            <OptimisticUserMessage content={optimisticMessage.content} />
                        )}
                        {/* Optimistic thinking indicator - shown while waiting for assistant response */}
                        {showOptimisticThinking && optimisticMessage?.content && (
                            <OptimisticThinkingIndicator />
                        )}
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
                        {/* Always render attach button to prevent layout shift - just disable when not supported */}
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            disabled={isLoading || !supportsFiles}
                            onClick={() => fileUploadRef.current?.openFilePicker()}
                            title={supportsFiles ? 'Attach files' : 'This model does not support file attachments'}
                        >
                            <Paperclip className="h-4 w-4" />
                        </Button>
                    </div>
                    {supportsFiles ? (
                        <FileUploadZone
                            ref={fileUploadRef}
                            files={uploadedFiles}
                            onFilesChange={setUploadedFiles}
                            disabled={isLoading}
                            showTriggerButton={false}
                        >
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
