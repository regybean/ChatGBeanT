'use client';

import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

import { api } from '@chatgbeant/backend/convex/_generated/api';

import { ChatInterface } from '~/components/chat/chat-interface';

export default function NewChatPage() {
  const router = useRouter();
  const createThread = useMutation(api.chat.createThread);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const settings = useQuery(api.settings.getSettings);

  // Called when user sends first message - just creates thread
  // ChatInterface handles sending the actual message
  const handleFirstMessage = useCallback(async (_content: string, model: string) => {
    const { threadId } = await createThread({ model });
    // Set threadId so ChatInterface can start showing/sending messages
    setActiveThreadId(threadId);
    return threadId;
  }, [createThread]);

  // Redirect to thread page after message is sent successfully
  // This is triggered by ChatInterface completing the sendMessage
  const handleMessageSent = useCallback((threadId: string) => {
    router.push(`/c/${threadId}`);
  }, [router]);

  const lastUsedModel = settings && 'lastUsedModel' in settings ? settings.lastUsedModel : undefined;

  return (
    <ChatInterface
      isNewChat={!activeThreadId}
      threadId={activeThreadId ?? undefined}
      initialModel={lastUsedModel ?? undefined}
      onFirstMessage={handleFirstMessage}
      onMessageSent={handleMessageSent}
    />
  );
}
