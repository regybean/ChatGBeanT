'use client';

import { useAction, useQuery } from 'convex/react';
import { useUser, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageSquarePlus,
  Settings,
  Trash2,
  LayoutDashboard,
} from 'lucide-react';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import { ScrollArea } from '@chatgbeant/ui/scroll-area';
import { cn } from '@chatgbeant/ui/cn';

import { TokenUsage } from './token-usage';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const threads = useQuery(api.chat.listThreads);
  const currentUser = useQuery(api.users.getCurrent);
  const deleteThread = useAction(api.chat.deleteThread);

  const handleDeleteThread = async (
    e: React.MouseEvent,
    threadId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteThread({ threadId });
    if (pathname.includes(threadId)) {
      router.push('/c/new');
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/30">
      <div className="flex items-center justify-between border-b p-4">
        <Link href="/c/new" className="flex items-center gap-2">
          <span className="text-lg font-semibold">ChatGBeanT</span>
        </Link>
      </div>

      <div className="p-2">
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/c/new">
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            New Chat
          </Link>
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 py-2">
          {threads?.map((thread) => (
            <Link
              key={thread._id}
              href={`/c/${thread.threadId}`}
              className={cn(
                'group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                pathname === `/c/${thread.threadId}` && 'bg-accent',
              )}
            >
              <span className="truncate">
                {thread.title ?? 'New conversation'}
              </span>
              <button
                onClick={(e) => handleDeleteThread(e, thread.threadId)}
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </button>
            </Link>
          ))}
        </div>
      </ScrollArea>

      <TokenUsage />

      <div className="border-t p-2">
        {isAdmin && (
          <Button
            asChild
            variant="ghost"
            className="mb-2 w-full justify-start"
          >
            <Link href="/admin">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Admin Dashboard
            </Link>
          </Button>
        )}
        <div className="flex items-center gap-2 rounded-md p-2">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8',
              },
            }}
          />
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium">
              {user?.fullName ?? user?.emailAddresses[0]?.emailAddress}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {currentUser?.tier === 'pro' ? 'Pro' : 'Basic'} Plan
            </p>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
