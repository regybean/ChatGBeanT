'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';

import { cn } from '@chatgbeant/ui/cn';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@chatgbeant/ui/dropdown-menu';
import { Button } from '@chatgbeant/ui/button';

interface GroupHeaderProps {
    groupId: Id<'threadGroups'>;
    name: string;
    children: React.ReactNode;
    onRename: (groupId: Id<'threadGroups'>, currentName: string) => void;
    onDelete: (groupId: Id<'threadGroups'>) => void;
}

export function GroupHeader({
    groupId,
    name,
    children,
    onRename,
    onDelete,
}: GroupHeaderProps) {
    const [isOpen, setIsOpen] = useState(true);

    const { isOver, setNodeRef } = useDroppable({
        id: `group-${groupId}`,
        data: { groupId },
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'space-y-0.5 rounded-md transition-all duration-200 border-2 border-transparent',
                isOver && 'bg-accent/40 border-dashed border-primary/60 ring-2 ring-primary/20',
                !isOver && 'hover:border-dashed hover:border-muted-foreground/30'
            )}
        >
            <div className="group flex w-full items-center gap-1 px-2 py-1.5">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex flex-1 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                    {isOpen ? (
                        <ChevronDown className="h-3 w-3" />
                    ) : (
                        <ChevronRight className="h-3 w-3" />
                    )}
                    {name}
                </button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
                        >
                            <MoreHorizontal className="h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onRename(groupId, name)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(groupId)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Group
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {isOpen && <div className="space-y-0.5">{children}</div>}
        </div>
    );
}
