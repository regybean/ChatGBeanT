'use client';

import { X, FileText } from 'lucide-react';
import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';

interface DocumentChipProps {
  documentId: Id<'documents'>;
  title: string;
  onRemove: (documentId: Id<'documents'>) => void;
}

export function DocumentChip({ documentId, title, onRemove }: DocumentChipProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs">
      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="max-w-[120px] truncate">{title}</span>
      <button
        onClick={() => onRemove(documentId)}
        className="ml-1 text-muted-foreground hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
