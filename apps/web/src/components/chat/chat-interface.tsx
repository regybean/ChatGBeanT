'use client';

import { useState, useRef, useEffect } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import type { Id, Doc } from '@chatgbeant/backend/convex/_generated/dataModel';
import { Button } from '@chatgbeant/ui/button';
import { Textarea } from '@chatgbeant/ui/textarea';
import { ScrollArea } from '@chatgbeant/ui/scroll-area';

import { MessageBubble } from './message-bubble';
import { ModelSelector } from './model-selector';

interface ChatInterfaceProps {
    isNewChat: boolean;
    chatId?: Id<'chats'>;
    initialMessages?: Doc<'messages'>[];
    initialModel?: string;
    onFirstMessage?: (content: string, model: string) => Promise<Id<'chats'>>;
}

const DRAFT_KEY_PREFIX = 'chatgbeant:draft:';

export function ChatInterface({
    isNewChat,
    chatId,
    initialMessages = [],
    initialModel = 'anthropic/claude-3.5-haiku',
    onFirstMessage,
}: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState(initialModel);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const currentUser = useQuery(api.users.getCurrent);
    const getOrCreateUser = useMutation(api.users.getOrCreate);
    const sendMessage = useMutation(api.messages.send);
    const chat = useAction(api.openrouter.chat);

    // Draft key for localStorage
    const draftKey = `${DRAFT_KEY_PREFIX}${chatId ?? 'new'}`;

    // Load draft from localStorage
    useEffect(() => {
        const draft = localStorage.getItem(draftKey);
        if (draft) {
            setInput(draft);
        }
    }, [draftKey]);

    // Save draft to localStorage
    useEffect(() => {
        if (input) {
            localStorage.setItem(draftKey, input);
        } else {
            localStorage.removeItem(draftKey);
        }
    }, [input, draftKey]);

    // Ensure user exists
    useEffect(() => {
        getOrCreateUser();
    }, [getOrCreateUser]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [initialMessages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const content = input.trim();
        setInput('');
        localStorage.removeItem(draftKey);
        setIsLoading(true);

        try {
            let targetChatId = chatId;

            if (isNewChat && onFirstMessage) {
                targetChatId = await onFirstMessage(content, selectedModel);
            }

            if (!targetChatId) {
                throw new Error('No chat ID');
            }

            // Send user message
            await sendMessage({
                chatId: targetChatId,
                content,
            });

            // Get AI response
            await chat({
                chatId: targetChatId,
                userMessage: content,
                model: selectedModel,
            });
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
            handleSubmit(e);
        }
    };

    return (
        <div className="flex h-full flex-col">
            {initialMessages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center p-8">
                    <h1 className="mb-4 text-3xl font-bold">Welcome to ChatGBeanT</h1>
                    <p className="mb-8 text-center text-muted-foreground">
                        Start a conversation with AI. Choose a model and type your message
                        below.
                    </p>
                </div>
            ) : (
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="mx-auto max-w-3xl space-y-4">
                        {initialMessages.map((message) => (
                            <MessageBubble key={message._id} message={message} />
                        ))}
                        {isLoading && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Thinking...</span>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            )}

            <div className="border-t p-4">
                <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
                    <div className="mb-2 flex items-center gap-2">
                        <ModelSelector
                            value={selectedModel}
                            onChange={setSelectedModel}
                            userTier={currentUser?.tier ?? 'basic'}
                            disabled={!isNewChat && initialMessages.length > 0}
                        />
                    </div>
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
                    </div>
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                        Press Enter to send, Shift+Enter for new line
                    </p>
                </form>
            </div>
        </div>
    );
}
