'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ThreadGroupProps {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function ThreadGroup({
  label,
  children,
  defaultOpen = true,
}: ThreadGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <li className="group/thread-group">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <span className="truncate">{label}</span>
      </button>
      {isOpen && <ul className="flex w-full min-w-0 flex-col gap-0.5">{children}</ul>}
    </li>
  );
}
