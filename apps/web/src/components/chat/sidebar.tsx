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
    Plus,
    FileText,
} from 'lucide-react';
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import {
    Sidebar as ShadcnSidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarRail,
} from '@chatgbeant/ui/sidebar';
import { ScrollArea } from '@chatgbeant/ui/scroll-area';

import { TokenUsage } from './token-usage';
import { ThreadSearch } from './thread-search';
import { ThreadGroup } from './thread-group';
import { ThreadItem } from './thread-item';
import { GroupHeader } from './group-header';
import { RenameDialog } from './rename-dialog';
import { DocumentsModal } from './documents-modal';
import { useDocumentsModal } from '~/hooks/use-documents-modal';

// Hidden component that maintains an active subscription to prefetch thread data
function ThreadPrefetcher({ threadId }: { threadId: string | null }) {
    useQuery(api.chat.getThread, threadId ? { threadId } : 'skip');
    useUIMessages(
        api.chat.listMessages,
        threadId ? { threadId } : 'skip',
        { initialNumItems: 100, stream: true }
    );
    return null;
}

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();
    const currentUser = useQuery(api.users.getCurrent);

    const { isOpen: documentsModalOpen, openModal: openDocumentsModal, closeModal: closeDocumentsModal, onAttachDocument, onAttachMedia, onAttachThread } = useDocumentsModal();

    const [searchTerm, setSearchTerm] = useState('');
    const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);
    const [isDraggingThread, setIsDraggingThread] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [renameTarget, setRenameTarget] = useState<{
        threadId?: string;
        groupId?: Id<'threadGroups'>;
        title: string;
    } | null>(null);

    // Always keep groupedThreads subscribed to prevent blank state
    const groupedThreads = useQuery(api.chat.listThreadsGrouped, {});
    const searchResults = useQuery(
        api.chat.searchThreads,
        searchTerm ? { searchTerm } : 'skip',
    );
    const groups = useQuery(api.chat.listGroups) ?? [];

    const deleteThread = useAction(api.chat.deleteThread);
    const renameThread = useMutation(api.chat.renameThread);
    const createGroup = useMutation(api.chat.createGroup);
    const renameGroup = useMutation(api.chat.renameGroup);
    const deleteGroup = useMutation(api.chat.deleteGroup);
    const moveThreadToGroup = useMutation(api.chat.moveThreadToGroup);

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

    const handleGroupRenameClick = useCallback(
        (groupId: Id<'threadGroups'>, currentName: string) => {
            setRenameTarget({ groupId, title: currentName });
            setRenameDialogOpen(true);
        },
        [],
    );

    const handleRename = useCallback(
        async (newTitle: string) => {
            if (renameTarget?.threadId) {
                await renameThread({
                    threadId: renameTarget.threadId,
                    title: newTitle,
                });
            } else if (renameTarget?.groupId) {
                await renameGroup({
                    groupId: renameTarget.groupId,
                    name: newTitle,
                });
            }
        },
        [renameTarget, renameThread, renameGroup],
    );

    const handleMoveToGroup = useCallback(
        async (threadId: string, groupId?: Id<'threadGroups'>) => {
            await moveThreadToGroup({ threadId, groupId });
        },
        [moveThreadToGroup],
    );

    const handleDeleteGroup = useCallback(
        async (groupId: Id<'threadGroups'>) => {
            await deleteGroup({ groupId });
        },
        [deleteGroup],
    );

    const handleCreateGroup = useCallback(async () => {
        await createGroup({ name: 'New Group' });
    }, [createGroup]);

    const handleDragStart = useCallback((_event: DragStartEvent) => {
        setIsDraggingThread(true);
    }, []);

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            setIsDraggingThread(false);
            const { active, over } = event;
            if (!over) return;

            const activeData = active.data.current as { threadId?: string } | undefined;
            const overData = over.data.current as { groupId?: Id<'threadGroups'> } | undefined;
            const threadId = activeData?.threadId;
            const targetGroupId = overData?.groupId;

            if (threadId && targetGroupId) {
                void moveThreadToGroup({ threadId, groupId: targetGroupId });
            }
        },
        [moveThreadToGroup],
    );

    const handleDragCancel = useCallback(() => {
        setIsDraggingThread(false);
    }, []);

    const groupList = groups.map((g) => ({ _id: g._id, name: g.name }));

    const handleAttachToChat = useCallback(
        (threadId: string, title: string) => {
            onAttachThread?.(threadId, title);
        },
        [onAttachThread],
    );

    const renderThread = (thread: {
        threadId: string;
        title?: string;
        isPinned?: boolean;
        model?: string;
        groupId?: Id<'threadGroups'>;
    }) => (
        <ThreadItem
            key={thread.threadId}
            threadId={thread.threadId}
            title={thread.title ?? 'New conversation'}
            groupId={thread.groupId}
            groups={groupList}
            onRename={handleRenameClick}
            onDelete={handleDelete}
            onMoveToGroup={handleMoveToGroup}
            onHover={setHoveredThreadId}
            onAttachToChat={onAttachThread ? handleAttachToChat : undefined}
        />
    );

    return (
        <>
            <ShadcnSidebar>
                <ThreadPrefetcher threadId={hoveredThreadId} />

                <SidebarHeader className="border-b p-4">
                    <Link href="/c/new" className="flex items-center gap-2">
                        <span className="text-lg font-semibold">ChatGBeanT</span>
                    </Link>
                </SidebarHeader>

                <div className="space-y-2 p-2">
                    <Button asChild variant="outline" className="w-full justify-start">
                        <Link href="/c/new">
                            <MessageSquarePlus className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">New Chat</span>
                        </Link>
                    </Button>
                    <ThreadSearch value={searchTerm} onChange={setSearchTerm} />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs text-muted-foreground"
                        onClick={handleCreateGroup}
                    >
                        <Plus className="mr-2 h-3 w-3 shrink-0" />
                        <span className="truncate">Create Group</span>
                    </Button>
                </div>

                <SidebarContent>
                    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                        <ScrollArea className="flex-1 px-2">
                            <SidebarGroup>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {searchTerm && searchResults !== undefined && searchResults.length > 0 && (
                                            <ThreadGroup label={`Results (${searchResults.length})`}>
                                                {searchResults.map((t) => renderThread(t))}
                                            </ThreadGroup>
                                        )}
                                        {searchTerm && searchResults !== undefined && searchResults.length === 0 && (
                                            <p className="px-3 py-2 text-xs text-muted-foreground">
                                                No threads found
                                            </p>
                                        )}
                                        {searchTerm && searchResults === undefined && (
                                            <p className="px-3 py-2 text-xs text-muted-foreground animate-pulse">
                                                Searching...
                                            </p>
                                        )}
                                        {!searchTerm && (
                                            <>
                                                {/* User-created groups */}
                                                {groupedThreads?.groups.map((g) => (
                                                    <GroupHeader
                                                        key={g._id}
                                                        groupId={g._id}
                                                        name={g.name}
                                                        onRename={handleGroupRenameClick}
                                                        onDelete={handleDeleteGroup}
                                                        isDraggingThread={isDraggingThread}
                                                    >
                                                        {g.threads.map((t) => renderThread(t))}
                                                    </GroupHeader>
                                                ))}

                                                {/* Date-based groups */}
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
                                                {groupedThreads?.last7Days && groupedThreads.last7Days.length > 0 && (
                                                    <ThreadGroup label="Last 7 Days">
                                                        {groupedThreads.last7Days.map((t) => renderThread(t))}
                                                    </ThreadGroup>
                                                )}
                                                {groupedThreads?.last30Days && groupedThreads.last30Days.length > 0 && (
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
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </ScrollArea>
                    </DndContext>
                </SidebarContent>

                <div className="border-t px-2 py-2">
                    <Button variant="ghost" className="w-full justify-start text-sm"
                        onClick={openDocumentsModal}>
                        <FileText className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">Documents</span>
                    </Button>
                </div>

                <TokenUsage />

                <SidebarFooter className="border-t p-2">
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
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                                {user?.fullName ?? user?.emailAddresses[0]?.emailAddress}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                                {currentUser?.tier === 'pro' ? 'Pro' : (currentUser?.hasByok ? 'BYOK' : 'Basic')} Plan
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0" asChild>
                            <Link href="/settings">
                                <Settings className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </SidebarFooter>

                <SidebarRail />

                <RenameDialog
                    open={renameDialogOpen}
                    onOpenChange={setRenameDialogOpen}
                    currentTitle={renameTarget?.title ?? ''}
                    onRename={handleRename}
                />
            </ShadcnSidebar>

            <DocumentsModal
                open={documentsModalOpen}
                onClose={closeDocumentsModal}
                onAttachDocument={onAttachDocument}
                onAttachMedia={onAttachMedia}
            />
        </>
    );
}
