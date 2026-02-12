'use client';

import { useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, FolderInput, FolderMinus, GripVertical, MessageSquarePlus } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';

import { cn } from '@chatgbeant/ui/cn';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@chatgbeant/ui/dropdown-menu';
import { Button } from '@chatgbeant/ui/button';
import { SidebarMenuItem, SidebarMenuButton } from '@chatgbeant/ui/sidebar';

interface ThreadGroup {
    _id: Id<'threadGroups'>;
    name: string;
}

interface ThreadItemProps {
    threadId: string;
    title: string;
    isPinned?: boolean;
    groupId?: Id<'threadGroups'>;
    groups?: ThreadGroup[];
    onRename: (threadId: string, currentTitle: string) => void;
    onDelete: (threadId: string) => void;
    onMoveToGroup?: (threadId: string, groupId?: Id<'threadGroups'>) => void;
    onHover?: (threadId: string | null) => void;
    onAttachToChat?: (threadId: string, title: string) => void;
    isAttachMode?: boolean;
}

export function ThreadItem({
    threadId,
    title,
    groupId,
    groups,
    onRename,
    onDelete,
    onMoveToGroup,
    onHover,
    onAttachToChat,
    isAttachMode,
}: ThreadItemProps) {
    const pathname = usePathname();
    const router = useRouter();
    const isActive = pathname === `/c/${threadId}`;
    const isDraggingRef = useRef(false);
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);

    // Clean URL - no model param needed (model loaded from localStorage or thread data)
    const href = `/c/${threadId}`;

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `thread-${threadId}`,
        data: { threadId },
    });

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
        : undefined;

    // Track if we're actually dragging (moved more than 5px)
    const handlePointerDown = (e: React.PointerEvent) => {
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        isDraggingRef.current = false;
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (dragStartPos.current) {
            const dx = Math.abs(e.clientX - dragStartPos.current.x);
            const dy = Math.abs(e.clientY - dragStartPos.current.y);
            if (dx > 5 || dy > 5) {
                isDraggingRef.current = true;
            }
        }
    };

    const handlePointerUp = () => {
        // Reset drag start position on pointer up
        dragStartPos.current = null;
    };

    const handleClick = (e: React.MouseEvent) => {
        // Prevent navigation if we were dragging
        if (isDraggingRef.current || isDragging) {
            e.preventDefault();
            e.stopPropagation();
            // Reset dragging state after a short delay
            setTimeout(() => {
                isDraggingRef.current = false;
            }, 100);
            return;
        }
        // In attach mode, attach thread to chat instead of navigating
        if (isAttachMode && onAttachToChat) {
            e.preventDefault();
            onAttachToChat(threadId, title);
            return;
        }
        // Navigate programmatically to avoid form submission issues
        e.preventDefault();
        router.push(href);
    };

    const [isHovered, setIsHovered] = useState(false);

    return (
        <SidebarMenuItem
            ref={setNodeRef}
            style={style}
            className={cn(
                isDragging && 'opacity-50 shadow-lg',
                isAttachMode && 'bg-purple-500/15 rounded-md cursor-pointer',
            )}
            onMouseEnter={() => {
                setIsHovered(true);
                onHover?.(threadId);
            }}
            onMouseLeave={() => {
                setIsHovered(false);
                onHover?.(null);
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {/* Drag handle - only visible when this specific thread is hovered */}
            <div
                {...listeners}
                {...attributes}
                className={cn(
                    'absolute left-0.5 top-1/2 -translate-y-1/2 shrink-0 cursor-grab touch-none transition-opacity z-10',
                    isHovered ? 'opacity-50 hover:opacity-100' : 'opacity-0'
                )}
                title="Drag to reorder"
            >
                <GripVertical className="h-3 w-3" />
            </div>
            <SidebarMenuButton
                isActive={isActive}
                onClick={handleClick}
                className="pl-5"
            >
                <span>{title}</span>
            </SidebarMenuButton>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            'absolute right-1 top-1.5 h-5 w-5 shrink-0 transition-opacity',
                            isHovered ? 'opacity-100' : 'opacity-0'
                        )}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    {onAttachToChat && (
                        <DropdownMenuItem onClick={() => onAttachToChat(threadId, title)}>
                            <MessageSquarePlus className="mr-2 h-4 w-4" />
                            Attach to Chat
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onRename(threadId, title)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                    </DropdownMenuItem>
                    {onMoveToGroup && groups && groups.length > 0 && (
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <FolderInput className="mr-2 h-4 w-4" />
                                Move to Group
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                {groups.map((g) => (
                                    <DropdownMenuItem
                                        key={g._id}
                                        onClick={() => onMoveToGroup(threadId, g._id)}
                                        disabled={groupId === g._id}
                                    >
                                        {g.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    )}
                    {onMoveToGroup && groupId && (
                        <DropdownMenuItem onClick={() => onMoveToGroup(threadId)}>
                            <FolderMinus className="mr-2 h-4 w-4" />
                            Remove from Group
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(threadId)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem>
    );
}
