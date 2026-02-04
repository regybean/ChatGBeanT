'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal, Pin, PinOff, Pencil, Trash2 } from 'lucide-react';

import { cn } from '@chatgbeant/ui/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@chatgbeant/ui/dropdown-menu';
import { Button } from '@chatgbeant/ui/button';

interface ThreadItemProps {
  threadId: string;
  title: string;
  isPinned?: boolean;
  model?: string;
  onRename: (threadId: string, currentTitle: string) => void;
  onTogglePin: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  onHover?: (threadId: string | null) => void;
}

export function ThreadItem({
  threadId,
  title,
  isPinned,
  model,
  onRename,
  onTogglePin,
  onDelete,
  onHover,
}: ThreadItemProps) {
  const pathname = usePathname();
  const isActive = pathname === `/c/${threadId}`;
  
  // Build URL with model param for faster loading
  const href = model ? `/c/${threadId}?model=${encodeURIComponent(model)}` : `/c/${threadId}`;

  return (
    <div
      className={cn(
        'group flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent',
        isActive && 'bg-accent',
      )}
      onMouseEnter={() => onHover?.(threadId)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Link
        href={href}
        className="flex-1 truncate"
      >
        {isPinned && <Pin className="mr-1 inline h-3 w-3 text-muted-foreground" />}
        <span className="truncate">{title}</span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => onRename(threadId, title)}>
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTogglePin(threadId)}>
            {isPinned ? (
              <>
                <PinOff className="mr-2 h-4 w-4" />
                Unpin
              </>
            ) : (
              <>
                <Pin className="mr-2 h-4 w-4" />
                Pin
              </>
            )}
          </DropdownMenuItem>
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
