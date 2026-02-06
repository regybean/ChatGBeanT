'use client';

import { useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, FolderInput, FolderMinus, GripVertical } from 'lucide-react';
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
        // Navigate programmatically to avoid form submission issues
        e.preventDefault();
        router.push(href);
    };

    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'flex min-w-0 items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent',
                isActive && 'bg-accent',
                isDragging && 'opacity-50 shadow-lg',
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
                    'shrink-0 cursor-grab touch-none transition-opacity',
                    isHovered ? 'opacity-50 hover:opacity-100' : 'opacity-0'
                )}
                title="Drag to reorder"
            >
                <GripVertical className="h-4 w-4" />
            </div>
            <button
                onClick={handleClick}
                className="min-w-0 flex-1 cursor-pointer truncate text-left"
            >
                <span className="truncate">{title}</span>
            </button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            'h-6 w-6 shrink-0 transition-opacity',
                            isHovered ? 'opacity-100' : 'opacity-0'
                        )}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
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
        </div>
    );
}
