'use client';

import { use } from 'react';
import { useQuery } from 'convex/react';

import { api } from '@chatgbeant/backend/convex/_generated/api';

import { ChatInterface } from '~/components/chat/chat-interface';

export default function ChatPage({
    params,
}: {
    params: Promise<{ chatId: string }>;
}) {
    // chatId in the URL is actually the threadId from the agent
    const { chatId: threadId } = use(params);
    const thread = useQuery(api.chat.getThread, { threadId });

    // Only show error for null (not found), not for undefined (loading)
    if (thread === null) {
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

    // Render ChatInterface immediately - it handles its own loading state for messages
    // Pass thread model when loaded, ChatInterface falls back to localStorage's last used model
    return (
        <ChatInterface
            isNewChat={false}
            threadId={threadId}
            threadModel={thread?.model}
        />
    );
}
