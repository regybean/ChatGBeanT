'use client';

import { useState, useCallback } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useUIMessages } from '@convex-dev/agent/react';
import { useUser, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageSquarePlus,
  Settings,
  LayoutDashboard,
} from 'lucide-react';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import { ScrollArea } from '@chatgbeant/ui/scroll-area';

import { TokenUsage } from './token-usage';
import { ThreadSearch } from './thread-search';
import { ThreadGroup } from './thread-group';
import { ThreadItem } from './thread-item';
import { RenameDialog } from './rename-dialog';

// Hidden component that maintains an active subscription to prefetch thread data
// This follows the "prefetch by rendering" pattern - the hook populates the cache
function ThreadPrefetcher({ threadId }: { threadId: string | null }) {
  // These hooks keep subscriptions alive, populating the reactive cache
  // When user clicks the thread, ChatInterface will get cached data instantly
  useQuery(api.chat.getThread, threadId ? { threadId } : 'skip');
  useUIMessages(
    api.chat.listMessages,
    threadId ? { threadId } : 'skip',
    { initialNumItems: 100, stream: true }
  );
  return null; // Renders nothing - just maintains subscriptions
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrent);

  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    threadId: string;
    title: string;
  } | null>(null);

  // Use grouped threads when not searching, search results when searching
  const groupedThreads = useQuery(
    api.chat.listThreadsGrouped,
    searchTerm ? 'skip' : {},
  );
  const searchResults = useQuery(
    api.chat.searchThreads,
    searchTerm ? { searchTerm } : 'skip',
  );

  const deleteThread = useAction(api.chat.deleteThread);
  const renameThread = useMutation(api.chat.renameThread);
  const togglePin = useMutation(api.chat.togglePinThread);

  const isAdmin = currentUser?.role === 'admin';

  const handleDelete = useCallback(
    async (threadId: string) => {
      await deleteThread({ threadId });
      if (pathname.includes(threadId)) {
        router.push('/c/new');
      }
    },
    [deleteThread, pathname, router],
  );

  const handleRenameClick = useCallback(
    (threadId: string, currentTitle: string) => {
      setRenameTarget({ threadId, title: currentTitle });
      setRenameDialogOpen(true);
    },
    [],
  );

  const handleRename = useCallback(
    async (newTitle: string) => {
      if (renameTarget) {
        await renameThread({
          threadId: renameTarget.threadId,
          title: newTitle,
        });
      }
    },
    [renameTarget, renameThread],
  );

  const handleTogglePin = useCallback(
    async (threadId: string) => {
      await togglePin({ threadId });
    },
    [togglePin],
  );

  const renderThread = (thread: {
    threadId: string;
    title?: string;
    isPinned?: boolean;
    model?: string;
  }) => (
    <ThreadItem
      key={thread.threadId}
      threadId={thread.threadId}
      title={thread.title ?? 'New conversation'}
      isPinned={thread.isPinned}
      model={thread.model}
      onRename={handleRenameClick}
      onTogglePin={handleTogglePin}
      onDelete={handleDelete}
      onHover={setHoveredThreadId}
    />
  );

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/30">
      {/* Invisible component that maintains subscription for hovered thread */}
      <ThreadPrefetcher threadId={hoveredThreadId} />
      <div className="flex items-center justify-between border-b p-4">
        <Link href="/c/new" className="flex items-center gap-2">
          <span className="text-lg font-semibold">ChatGBeanT</span>
        </Link>
      </div>

      <div className="space-y-2 p-2">
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/c/new">
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            New Chat
          </Link>
        </Button>
        <ThreadSearch value={searchTerm} onChange={setSearchTerm} />
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-2 py-2">
          {searchTerm && searchResults && searchResults.length > 0 && (
            <ThreadGroup label={`Results (${searchResults.length})`}>
              {searchResults.map((t) => renderThread(t))}
            </ThreadGroup>
          )}
          {searchTerm && searchResults?.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No threads found
            </p>
          )}
          {!searchTerm && (
            <>
              {groupedThreads?.pinned && groupedThreads.pinned.length > 0 && (
                <ThreadGroup label="Pinned">
                  {groupedThreads.pinned.map((t) => renderThread(t))}
                </ThreadGroup>
              )}
              {groupedThreads?.today && groupedThreads.today.length > 0 && (
                <ThreadGroup label="Today">
                  {groupedThreads.today.map((t) => renderThread(t))}
                </ThreadGroup>
              )}
              {groupedThreads?.last7Days &&
                groupedThreads.last7Days.length > 0 && (
                  <ThreadGroup label="Last 7 Days">
                    {groupedThreads.last7Days.map((t) => renderThread(t))}
                  </ThreadGroup>
                )}
              {groupedThreads?.last30Days &&
                groupedThreads.last30Days.length > 0 && (
                  <ThreadGroup label="Last 30 Days">
                    {groupedThreads.last30Days.map((t) => renderThread(t))}
                  </ThreadGroup>
                )}
              {groupedThreads?.older && groupedThreads.older.length > 0 && (
                <ThreadGroup label="Older" defaultOpen={false}>
                  {groupedThreads.older.map((t) => renderThread(t))}
                </ThreadGroup>
              )}
            </>
          )}
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

      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        currentTitle={renameTarget?.title ?? ''}
        onRename={handleRename}
      />
    </div>
  );
}
