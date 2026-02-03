'use client';

import { useQuery } from 'convex/react';
import Image from 'next/image';
import { FileText, ImageIcon, Download } from 'lucide-react';
import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { cn } from '@chatgbeant/ui/cn';

interface FileAttachmentProps {
  storageId: Id<'_storage'>;
  fileName: string;
  fileType: string;
  className?: string;
}

export function FileAttachment({
  storageId,
  fileName,
  fileType,
  className,
}: FileAttachmentProps) {
  const fileUrl = useQuery(api.files.getFileUrl, { storageId });

  const isImage = fileType.startsWith('image/');

  if (isImage && fileUrl) {
    return (
      <div className={cn('mt-2 overflow-hidden rounded-md', className)}>
        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
          <Image
            src={fileUrl}
            alt={fileName}
            width={400}
            height={300}
            className="max-h-[300px] max-w-full rounded-md object-contain"
            unoptimized
          />
        </a>
        <p className="mt-1 text-xs text-muted-foreground">{fileName}</p>
      </div>
    );
  }

  return (
    <a
      href={fileUrl ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'mt-2 flex items-center gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-accent',
        className,
      )}
    >
      {isImage ? (
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="flex-1 truncate">{fileName}</span>
      <Download className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}
