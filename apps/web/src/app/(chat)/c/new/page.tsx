'use client';

import { useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';

import { api } from '@chatgbeant/backend/convex/_generated/api';

import { ChatInterface } from '~/components/chat/chat-interface';

export default function NewChatPage() {
  const router = useRouter();
  const createThread = useMutation(api.chat.createThread);

  const handleFirstMessage = async (content: string, model: string) => {
    try {
      const { threadId } = await createThread({ model });
      router.push(`/c/${threadId}`);
      return threadId;
    } catch {
      throw new Error('Failed to create chat');
    }
  };

  return (
    <ChatInterface isNewChat={true} onFirstMessage={handleFirstMessage} />
  );
}
