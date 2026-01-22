'use client';

import { useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';

import { api } from '@chatgbeant/backend/convex/_generated/api';

import { ChatInterface } from '~/components/chat/chat-interface';

export default function NewChatPage() {
    const router = useRouter();
    const createChat = useMutation(api.chats.create);


    const handleFirstMessage = async (content: string, model: string) => {
        try {
            const chatId = await createChat({ model });
            router.push(`/c/${chatId}`);
            return chatId;
        } catch {
            throw new Error('Failed to create chat');
        }
    };

    return (
        <ChatInterface isNewChat={true} onFirstMessage={handleFirstMessage} />
    );
}
