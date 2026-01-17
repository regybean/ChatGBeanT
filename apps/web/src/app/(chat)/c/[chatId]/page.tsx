'use client';

import { use } from 'react';
import { useQuery } from 'convex/react';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';

import { ChatInterface } from '~/components/chat/chat-interface';

export default function ChatPage({
    params,
}: {
    params: Promise<{ chatId: string }>;
}) {
    const { chatId } = use(params);
    const chat = useQuery(api.chats.get, {
        chatId: chatId as unknown as Id<'chats'>,
    });
    const messages = useQuery(api.messages.list, {
        chatId: chatId as unknown as Id<'chats'>,
    });

    if (chat === undefined || messages === undefined) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (chat === null) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">Chat not found</h2>
                    <p className="text-muted-foreground">
                        This chat may have been deleted.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <ChatInterface
            isNewChat={false}
            chatId={chatId as unknown as Id<'chats'>}
            initialMessages={messages}
            initialModel={chat.model}
        />
    );
}
