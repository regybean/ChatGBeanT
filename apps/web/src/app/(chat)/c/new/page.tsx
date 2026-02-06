'use client';

import { useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

import { api } from '@chatgbeant/backend/convex/_generated/api';

import { ChatInterface } from '~/components/chat/chat-interface';

export default function NewChatPage() {
    const router = useRouter();
    const createThread = useMutation(api.chat.createThread);
    const [activeThreadId, _setActiveThreadId] = useState<string | null>(null);

    // Called when user sends first message - creates thread
    const handleFirstMessage = useCallback(async (_content: string, model: string) => {
        const { threadId } = await createThread({ model });
        return threadId;
    }, [createThread]);

    // Redirect to thread page - called immediately after thread creation
    const handleMessageSent = useCallback((threadId: string) => {
        router.push(`/c/${threadId}`);
    }, [router]);

    // No need to fetch settings - ChatInterface uses localStorage for last used model
    return (
        <ChatInterface
            isNewChat={!activeThreadId}
            threadId={activeThreadId ?? undefined}
            onFirstMessage={handleFirstMessage}
            onMessageSent={handleMessageSent}
        />
    );
}
