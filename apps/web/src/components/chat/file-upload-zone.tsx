'use client';

import { useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Paperclip, X, FileText, ImageIcon, Loader2 } from 'lucide-react';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';
import { Button } from '@chatgbeant/ui/button';
import { cn } from '@chatgbeant/ui/cn';

export interface UploadedFile {
    storageId: string;
    name: string;
    type: string;
    size: number;
}

export interface FileUploadZoneHandle {
    openFilePicker: () => void;
}

interface FileUploadZoneProps {
    files: UploadedFile[];
    onFilesChange: (files: UploadedFile[]) => void;
    disabled?: boolean;
    showTriggerButton?: boolean;
    children: React.ReactNode;
}

const ACCEPTED_TYPES = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileChip({
    file,
    onRemove,
}: {
    file: UploadedFile;
    onRemove: () => void;
}) {
    const fileUrl = useQuery(api.files.getFileUrl, {
        storageId: file.storageId as Id<'_storage'>,
    });
    const isImage = file.type.startsWith('image/');

    return (
        <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs">
            {isImage && fileUrl ? (
                <img
                    src={fileUrl}
                    alt={file.name}
                    className="h-8 w-8 rounded object-cover"
                />
            ) : (isImage ? (
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            ))}
            <span className="max-w-[120px] truncate">{file.name}</span>
            <span className="text-muted-foreground">
                ({formatFileSize(file.size)})
            </span>
            <button
                onClick={onRemove}
                className="ml-1 text-muted-foreground hover:text-destructive"
            >
                <X className="h-3 w-3" />
            </button>
        </div>
    );
}

export const FileUploadZone = forwardRef<FileUploadZoneHandle, FileUploadZoneProps>(function FileUploadZone({
    files,
    onFilesChange,
    disabled,
    showTriggerButton = true,
    children,
}, ref) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);

    useImperativeHandle(ref, () => ({
        openFilePicker: () => fileInputRef.current?.click(),
    }));

    const uploadFile = useCallback(
        async (file: File): Promise<UploadedFile | null> => {
            if (!ACCEPTED_TYPES.includes(file.type)) {
                return null;
            }
            if (file.size > MAX_FILE_SIZE) {
                return null;
            }

            const uploadUrl = await generateUploadUrl();
            const result = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': file.type },
                body: file,
            });

            if (!result.ok) {
                return null;
            }

            const { storageId } = (await result.json()) as { storageId: string };
            return {
                storageId,
                name: file.name,
                type: file.type,
                size: file.size,
            };
        },
        [generateUploadUrl],
    );

    const handleFiles = useCallback(
        async (fileList: FileList) => {
            setIsUploading(true);
            const newFiles: UploadedFile[] = [];

            for (const file of fileList) {
                const uploaded = await uploadFile(file);
                if (uploaded) {
                    newFiles.push(uploaded);
                }
            }

            onFilesChange([...files, ...newFiles]);
            setIsUploading(false);
        },
        [files, onFilesChange, uploadFile],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (disabled || isUploading) return;
            void handleFiles(e.dataTransfer.files);
        },
        [disabled, isUploading, handleFiles],
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
        },
        [disabled],
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const removeFile = useCallback(
        (index: number) => {
            onFilesChange(files.filter((_, i) => i !== index));
        },
        [files, onFilesChange],
    );

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn('relative', isDragging && 'ring-2 ring-primary ring-offset-2 rounded-lg')}
        >
            {isDragging && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-primary/10">
                    <p className="text-sm font-medium text-primary">Drop files here</p>
                </div>
            )}

            {files.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                    {files.map((file, index) => (
                        <FileChip
                            key={file.storageId}
                            file={file}
                            onRemove={() => removeFile(index)}
                        />
                    ))}
                </div>
            )}

            <div className="relative">
                {children}
                {showTriggerButton && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1">
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={disabled === true || isUploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Paperclip className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_TYPES.join(',')}
                onChange={(e) => {
                    if (e.target.files) {
                        void handleFiles(e.target.files);
                    }
                    e.target.value = '';
                }}
                className="hidden"
            />
        </div>
    );
});
