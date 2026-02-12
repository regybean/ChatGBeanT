'use client';

import { useState, useRef, useEffect } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useUIMessages } from '@convex-dev/agent/react';
import { Send, Loader2, Square, Paperclip, User, Bot, FileText, Video, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import { Textarea } from '@chatgbeant/ui/textarea';
import { ScrollArea } from '@chatgbeant/ui/scroll-area';
import { Avatar, AvatarFallback } from '@chatgbeant/ui/avatar';
import { MarkdownContent } from '@chatgbeant/ui/markdown-content';

import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';

import { MessageBubble } from './message-bubble';
import { ModelSelector } from './model-selector';
import type { UploadedFile, FileUploadZoneHandle } from './file-upload-zone';
import { FileUploadZone } from './file-upload-zone';
import { DocumentChip } from './document-chip';
import { VideoSettings } from './video-settings';
import type { VideoConfig } from './video-settings';
import { useLastUsedModel } from '~/hooks/use-last-used-model';
import { useDocumentsModal } from '~/hooks/use-documents-modal';
import type { AttachedMedia } from '~/hooks/use-documents-modal';

// Optimistic user message component - shown immediately before server confirms
function OptimisticUserMessage({ content }: { content: string }) {
    return (
        <div className="group flex gap-3 flex-row-reverse">
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                </AvatarFallback>
            </Avatar>
            <div className="flex max-w-[90%] md:max-w-[80%] flex-col gap-1 overflow-hidden">
                <div className="relative rounded-lg px-4 py-2 bg-primary text-primary-foreground overflow-hidden break-words text-sm md:text-base">
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
            <div className="flex max-w-[90%] md:max-w-[80%] flex-col gap-1 overflow-hidden">
                <div className="relative rounded-lg px-4 py-2 bg-muted text-sm md:text-base">
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
    /** Model from thread data (for existing chats). If not provided, uses last used model from localStorage. */
    threadModel?: string;
    onFirstMessage?: (content: string, model: string) => Promise<string>;
    onMessageSent?: (threadId: string) => void;
}

const DRAFT_KEY_PREFIX = 'chatgbeant:draft:';

export function ChatInterface({
    isNewChat,
    threadId,
    threadModel,
    onFirstMessage,
    onMessageSent,
}: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // Use localStorage for last used model (instant, no server roundtrip)
    const [lastUsedModel, setLastUsedModel] = useLastUsedModel();
    // For existing threads, use thread's model; for new chats, use last used model
    const [selectedModel, setSelectedModel] = useState(threadModel ?? lastUsedModel);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [attachedDocuments, setAttachedDocuments] = useState<
        { documentId: Id<'documents'>; title: string }[]
    >([]);
    const [attachedMedia, setAttachedMedia] = useState<AttachedMedia[]>([]);
    const [attachedThreads, setAttachedThreads] = useState<{ threadId: string; title: string }[]>([]);
    // Optimistic message state for immediate feedback
    const [optimisticMessage, setOptimisticMessage] = useState<{ content: string; model: string } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const prevMessageCountRef = useRef(0);
    const prevThreadIdRef = useRef(threadId);
    const cancelledKeysRef = useRef<Set<string>>(new Set());
    const fileUploadRef = useRef<FileUploadZoneHandle>(null);
    const [videoConfig, setVideoConfig] = useState<VideoConfig>({
        duration: 5,
        aspectRatio: '16:9',
        quality: 'standard',
    });

    // Update model only when threadModel loads for existing chats
    // This handles the case where we navigate to an existing thread
    useEffect(() => {
        if (threadModel && !isNewChat) {
            setSelectedModel(threadModel);
        }
    }, [threadModel, isNewChat]);

    const currentUser = useQuery(api.users.getCurrent);
    const { setOnAttachDocument, setOnAttachMedia, setOnAttachThread } = useDocumentsModal();

    const documents = useQuery(api.documents.listDocuments) ?? [];

    // Check if selected model supports file/image input
    const selectedModelInfo = useQuery(api.openrouter.getModelByOpenRouterId, {
        openRouterId: selectedModel,
    });
    const supportsFiles = selectedModelInfo?.inputModalities?.some(
        (m) => m === 'image' || m === 'file',
    ) ?? false;
    const isVideoModel = selectedModelInfo?.outputModalities?.includes('video') ?? false;

    // Register document attach callback with documents modal context
    useEffect(() => {
        const handleAttach = (documentId: Id<'documents'>, title: string) => {
            setAttachedDocuments((prev) => {
                if (prev.some((d) => d.documentId === documentId)) return prev;
                return [...prev, { documentId, title }];
            });
        };
        setOnAttachDocument(handleAttach);
        return () => setOnAttachDocument(undefined);
    }, [setOnAttachDocument]);

    // Register media attach callback with documents modal context
    useEffect(() => {
        const handleMediaAttach = (media: AttachedMedia) => {
            if (!supportsFiles) {
                toast.error('This model does not support image/video input');
                return;
            }
            setAttachedMedia((prev) => {
                if (prev.some((m) => m.mediaId === media.mediaId)) return prev;
                return [...prev, media];
            });
        };
        setOnAttachMedia(handleMediaAttach);
        return () => setOnAttachMedia(undefined);
    }, [setOnAttachMedia, supportsFiles]);

    // Register thread attach callback
    useEffect(() => {
        const handleThreadAttach = (tid: string, title: string) => {
            setAttachedThreads((prev) => {
                if (prev.some((t) => t.threadId === tid)) return prev;
                return [...prev, { threadId: tid, title }];
            });
            toast.success(`Thread "${title}" attached to chat`);
        };
        setOnAttachThread(handleThreadAttach);
        return () => setOnAttachThread(undefined);
    }, [setOnAttachThread]);

    // Query media for this thread
    const mediaRecords = useQuery(
        api.media.getMediaForThread,
        threadId ? { threadId } : 'skip',
    ) ?? [];

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
                    const parsed = JSON.parse(pending) as { content: string; model: string; targetThreadId: string };
                    const { content, model, targetThreadId } = parsed;
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
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- text can be undefined
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

    // Load draft from localStorage when thread changes, then refocus textarea
    useEffect(() => {
        const draft = localStorage.getItem(draftKey);
        setInput(draft ?? '');
        // Refocus textarea after state settles to avoid losing focus on thread switch
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
        });
    }, [draftKey]);

    // Save draft to localStorage (debounced)
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

    // Helper to get the Radix ScrollArea viewport
    const getViewport = () =>
        scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;

    // Unified scroll management: scroll to bottom on new messages, thread change, or messages loading
    useEffect(() => {
        const vp = getViewport();
        if (!vp) return;

        const threadChanged = threadId !== prevThreadIdRef.current;
        const messageCountChanged = messages.length !== prevMessageCountRef.current;
        const isNearBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight < 100;

        if (threadChanged) {
            prevThreadIdRef.current = threadId;
            prevMessageCountRef.current = messages.length;
            // On thread change, always scroll to bottom after messages render
            const timer = setTimeout(() => {
                vp.scrollTop = vp.scrollHeight;
            }, 100);
            return () => clearTimeout(timer);
        }

        if (messageCountChanged || isNearBottom) {
            const timer = setTimeout(() => {
                vp.scrollTop = vp.scrollHeight;
            }, 50);
            prevMessageCountRef.current = messages.length;
            return () => clearTimeout(timer);
        }
        prevMessageCountRef.current = messages.length;
    }, [messages, threadId, messagesStatus]);

    const handleSubmit = async (e: { preventDefault: () => void }) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const content = input.trim();
        const filesToSend = [...uploadedFiles];
        const docsToSend = [...attachedDocuments];
        const mediaToSend = [...attachedMedia];
        const threadsToSend = [...attachedThreads];
        setInput('');
        setUploadedFiles([]);
        setAttachedDocuments([]);
        setAttachedMedia([]);
        setAttachedThreads([]);
        localStorage.removeItem(draftKey);
        setIsLoading(true);

        // Save model to localStorage immediately for instant access on next chat
        setLastUsedModel(selectedModel);

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
            const videoArgs = isVideoModel
                ? { duration: videoConfig.duration, aspectRatio: videoConfig.aspectRatio }
                : {};

            const messagePromise = sendMessage({
                threadId: targetThreadId,
                content,
                model: selectedModel,
                ...(filesToSend.length > 0 && {
                    fileIds: filesToSend.map((f) => f.storageId),
                }),
                ...(docsToSend.length > 0 && {
                    documentIds: docsToSend.map((d) => d.documentId),
                }),
                ...(mediaToSend.length > 0 && {
                    mediaUrls: mediaToSend.map((m) => m.url),
                }),
                ...(threadsToSend.length > 0 && {
                    threadIds: threadsToSend.map((t) => t.threadId),
                }),
                ...videoArgs,
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

    // Check if the last message in the thread is from the user (no assistant response yet)
    const lastMessage = messages.at(-1) ?? null;
    const awaitingAssistantResponse = lastMessage?.role === 'user' && !messages.some(
        (m) => m.role === 'assistant' && (m.status === 'streaming' || m.status === 'pending')
    );

    // Show thinking state when:
    // 1. We have an optimistic message but no assistant response yet, OR
    // 2. We're still loading (action running) and the last real message is from the user
    //    with no assistant response (handles OpenRouter image models where the action
    //    takes time and the optimistic message gets cleared before the assistant responds)
    const showOptimisticThinking = (
        optimisticMessage !== null && !messages.some(
            (m) => m.role === 'assistant' && m.status === 'streaming'
        )
    ) || (
            isLoading && !optimisticMessage && awaitingAssistantResponse
        );

    // Show skeleton when loading existing thread with no messages yet and no optimistic message
    const showSkeleton = isLoadingMessages && messages.length === 0 && !optimisticMessage && !isNewChat;

    const handleStop = () => {
        // Soft cancel: mark all currently streaming messages as cancelled
        for (const m of messages) {
            if (m.status === 'streaming') {
                cancelledKeysRef.current.add(m.key);
            }
        }
        setIsLoading(false);
        setOptimisticMessage(null);
    };

    return (
        <div className="flex h-full flex-col">
            {showMessageArea ? (
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="mx-auto max-w-3xl space-y-6 px-2 md:px-0">
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
                                mediaRecords={mediaRecords}
                            />
                        ))}
                        {/* Optimistic user message - shown immediately before server confirms */}
                        {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- text can be undefined */}
                        {optimisticMessage?.content && !messages.some(m => m.role === 'user' && m.text?.includes(optimisticMessage.content.slice(0, 50))) && (
                            <OptimisticUserMessage content={optimisticMessage.content} />
                        )}
                        {/* Optimistic thinking indicator - shown while waiting for assistant response */}
                        {showOptimisticThinking && (
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
                    {(() => {
                        const inputMods = selectedModelInfo?.inputModalities ?? ['text'];
                        const outputMods = selectedModelInfo?.outputModalities ?? ['text'];
                        const inputLabel = inputMods.includes('image') ? 'Text+Image' : 'Text';
                        const outputLabel = outputMods.includes('video') ? 'Video' : outputMods.includes('image') ? 'Image' : 'Text';
                        const modeLabel = `${inputLabel} → ${outputLabel}`;
                        const isSpecial = modeLabel !== 'Text → Text';
                        return (
                            <div className={`h-5 mb-1 text-xs text-muted-foreground transition-opacity ${isSpecial ? 'opacity-100' : 'opacity-0'}`}>
                                {isSpecial ? modeLabel : '\u00A0'}
                            </div>
                        );
                    })()}
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <ModelSelector
                            value={selectedModel}
                            onChange={setSelectedModel}
                            userTier={currentUser?.tier ?? 'basic'}
                            hasByok={!!currentUser?.hasByok}
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
                        {documents.length > 0 && documents.slice(0, 3).map((doc) => (
                            <button
                                key={doc._id}
                                type="button"
                                className="hidden sm:flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                                disabled={isLoading || attachedDocuments.some((d) => d.documentId === doc._id)}
                                onClick={() =>
                                    setAttachedDocuments((prev) => [
                                        ...prev,
                                        { documentId: doc._id, title: doc.title },
                                    ])
                                }
                                title={`Attach "${doc.title}"`}
                            >
                                <FileText className="h-3 w-3" />
                                <span className="max-w-[80px] truncate">{doc.title}</span>
                            </button>
                        ))}
                    </div>
                    {attachedDocuments.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                            {attachedDocuments.map((doc) => (
                                <DocumentChip
                                    key={doc.documentId}
                                    documentId={doc.documentId}
                                    title={doc.title}
                                    onRemove={(id) =>
                                        setAttachedDocuments((prev) =>
                                            prev.filter((d) => d.documentId !== id),
                                        )
                                    }
                                />
                            ))}
                        </div>
                    )}
                    {attachedMedia.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                            {attachedMedia.map((media) => (
                                <div
                                    key={media.mediaId}
                                    className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                                >
                                    {media.type === 'image' ? (
                                        <img src={media.url} alt={media.title} className="h-5 w-5 rounded object-cover" />
                                    ) : (
                                        <Video className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    <span className="max-w-[80px] truncate">{media.title}</span>
                                    <button
                                        type="button"
                                        className="ml-0.5 text-muted-foreground hover:text-foreground"
                                        onClick={() => setAttachedMedia((prev) => prev.filter((m) => m.mediaId !== media.mediaId))}
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {attachedThreads.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                            {attachedThreads.map((thread) => (
                                <div
                                    key={thread.threadId}
                                    className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                                >
                                    <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                    <span className="max-w-[100px] truncate">{thread.title}</span>
                                    <button
                                        type="button"
                                        className="ml-0.5 text-muted-foreground hover:text-foreground"
                                        onClick={() => setAttachedThreads((prev) => prev.filter((t) => t.threadId !== thread.threadId))}
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {isVideoModel && (
                        <VideoSettings config={videoConfig} onChange={setVideoConfig} />
                    )}
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
