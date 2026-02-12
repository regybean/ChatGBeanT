'use client';

import { useState, useRef, lazy, Suspense } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { FileText, Plus, Pencil, Trash2, Search, Loader2, Image, Video, MessageSquarePlus, ChevronDown, ChevronRight, Download, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import { ScrollArea } from '@chatgbeant/ui/scroll-area';
import { cn } from '@chatgbeant/ui/cn';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@chatgbeant/ui/dialog';

const DocumentEditor = lazy(() =>
    import('./document-editor').then((m) => ({ default: m.DocumentEditor }))
);

interface DocumentsModalProps {
    open: boolean;
    onClose: () => void;
    onAttachDocument?: (documentId: Id<'documents'>, title: string) => void;
    onAttachMedia?: (media: { mediaId: Id<'generatedMedia'>; title: string; url: string; type: 'image' | 'video' }) => void;
}

export function DocumentsModal({ open, onClose, onAttachDocument, onAttachMedia }: DocumentsModalProps) {
    const [selectedDocId, setSelectedDocId] = useState<Id<'documents'> | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingTitle, setEditingTitle] = useState<Id<'documents'> | null>(null);
    const [editTitleValue, setEditTitleValue] = useState('');
    const [showNamePrompt, setShowNamePrompt] = useState(false);
    const [newDocName, setNewDocName] = useState('');
    const titleInputRef = useRef<HTMLInputElement>(null);
    const newDocInputRef = useRef<HTMLInputElement>(null);

    const [showDocuments, setShowDocuments] = useState(true);
    const [showImages, setShowImages] = useState(false);
    const [showVideos, setShowVideos] = useState(false);
    const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video'; mediaId?: Id<'generatedMedia'>; title?: string; prompt?: string } | null>(null);

    // Media rename state
    const [editingMediaId, setEditingMediaId] = useState<Id<'generatedMedia'> | null>(null);
    const [editMediaTitleValue, setEditMediaTitleValue] = useState('');
    const mediaTitleInputRef = useRef<HTMLInputElement>(null);

    const documents = useQuery(api.documents.listDocuments) ?? [];
    const createDocument = useMutation(api.documents.createDocument);
    const renameDocument = useMutation(api.documents.renameDocument);
    const deleteDocument = useMutation(api.documents.deleteDocument);
    const renameMedia = useMutation(api.media.renameMedia);
    const savedImages = useQuery(api.media.getMediaForUser, { type: 'image' }) ?? [];
    const savedVideos = useQuery(api.media.getMediaForUser, { type: 'video' }) ?? [];

    const filteredDocs = searchQuery
        ? documents.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : documents;

    const filteredImages = searchQuery
        ? savedImages.filter((img) => (img.title ?? img.prompt).toLowerCase().includes(searchQuery.toLowerCase()))
        : savedImages;

    const filteredVideos = searchQuery
        ? savedVideos.filter((vid) => (vid.title ?? vid.prompt).toLowerCase().includes(searchQuery.toLowerCase()))
        : savedVideos;

    const handleCreateClick = () => {
        setNewDocName('');
        setShowNamePrompt(true);
        setTimeout(() => newDocInputRef.current?.focus(), 100);
    };

    const handleCreateConfirm = async () => {
        const title = newDocName.trim() || undefined;
        const id = await createDocument({ title });
        setSelectedDocId(id);
        setShowNamePrompt(false);
        setNewDocName('');
    };

    const startRename = (docId: Id<'documents'>, currentTitle: string) => {
        setEditingTitle(docId);
        setEditTitleValue(currentTitle);
        setTimeout(() => titleInputRef.current?.focus(), 0);
    };

    const handleRename = async (docId: Id<'documents'>) => {
        if (editTitleValue.trim()) {
            await renameDocument({ documentId: docId, title: editTitleValue.trim() });
        }
        setEditingTitle(null);
    };

    const handleDelete = async (docId: Id<'documents'>) => {
        await deleteDocument({ documentId: docId });
        if (selectedDocId === docId) {
            setSelectedDocId(null);
        }
    };

    const startMediaRename = (mediaId: Id<'generatedMedia'>, currentTitle: string) => {
        setEditingMediaId(mediaId);
        setEditMediaTitleValue(currentTitle);
        setTimeout(() => mediaTitleInputRef.current?.focus(), 0);
    };

    const handleMediaRename = async (mediaId: Id<'generatedMedia'>) => {
        if (editMediaTitleValue.trim()) {
            await renameMedia({ mediaId, title: editMediaTitleValue.trim() });
        }
        setEditingMediaId(null);
    };

    const handleCopyMedia = async (url: string, type: 'image' | 'video') => {
        if (type === 'image') {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type]: blob }),
                ]);
                toast.success('Image copied to clipboard');
            } catch {
                await navigator.clipboard.writeText(url);
                toast.success('Image URL copied to clipboard');
            }
        } else {
            await navigator.clipboard.writeText(url);
            toast.success('Video URL copied to clipboard');
        }
    };

    const handleDownloadMedia = (url: string, type: 'image' | 'video', id: string) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated-${type}-${id}`;
        a.target = '_blank';
        document.body.append(a);
        a.click();
        a.remove();
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="flex h-[80vh] max-w-5xl flex-col gap-0 p-0 sm:max-h-[80vh]">
                <div className="flex flex-1 overflow-hidden">
                    {/* Left panel: document list */}
                    <div className="flex w-72 shrink-0 flex-col border-r">
                        <DialogHeader className="border-b p-3">
                            <DialogTitle>Documents</DialogTitle>
                        </DialogHeader>

                        <div className="flex items-center gap-2 border-b px-3 py-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 w-full rounded-md border bg-transparent pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleCreateClick}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-1">
                                {/* Text Documents — collapsible */}
                                <button
                                    className="flex w-full items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowDocuments(!showDocuments)}
                                >
                                    {showDocuments ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    <FileText className="h-3 w-3" />
                                    Text Documents ({filteredDocs.length})
                                </button>
                                {showDocuments && (
                                    <div className="space-y-0.5">
                                        {filteredDocs.map((doc) => (
                                            <div
                                                key={doc._id}
                                                className={cn(
                                                    'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer',
                                                    selectedDocId === doc._id && 'bg-accent',
                                                )}
                                                onClick={() => { setPreviewMedia(null); setSelectedDocId(doc._id); }}
                                            >
                                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                {editingTitle === doc._id ? (
                                                    <input
                                                        ref={titleInputRef}
                                                        value={editTitleValue}
                                                        onChange={(e) => setEditTitleValue(e.target.value)}
                                                        onBlur={() => handleRename(doc._id)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') void handleRename(doc._id);
                                                            if (e.key === 'Escape') setEditingTitle(null);
                                                        }}
                                                        className="flex-1 bg-transparent text-sm outline-none"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span className="flex-1 truncate">{doc.title}</span>
                                                )}
                                                <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                                                    {onAttachDocument && (
                                                        <button
                                                            className="rounded p-0.5 hover:bg-muted"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onAttachDocument(doc._id, doc.title);
                                                                toast.success(`Added "${doc.title}" to chat`);
                                                            }}
                                                            title="Add to chat"
                                                        >
                                                            <MessageSquarePlus className="h-3 w-3 text-primary" />
                                                        </button>
                                                    )}
                                                    <button
                                                        className="rounded p-0.5 hover:bg-muted"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startRename(doc._id, doc.title);
                                                        }}
                                                    >
                                                        <Pencil className="h-3 w-3 text-muted-foreground" />
                                                    </button>
                                                    <button
                                                        className="rounded p-0.5 hover:bg-muted"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            void handleDelete(doc._id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3 text-destructive" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredDocs.length === 0 && !searchQuery && (
                                            <p className="px-2 py-2 text-center text-xs text-muted-foreground">
                                                No documents yet
                                            </p>
                                        )}
                                        {filteredDocs.length === 0 && searchQuery && (
                                            <p className="px-2 py-2 text-center text-xs text-muted-foreground">
                                                No documents found
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Generated Images Section */}
                                {savedImages.length > 0 && (
                                    <div className="border-t pt-2 mt-2">
                                        <button
                                            className="flex w-full items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                                            onClick={() => setShowImages(!showImages)}
                                        >
                                            {showImages ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            <Image className="h-3 w-3" />
                                            Generated Images ({filteredImages.length})
                                        </button>
                                        {showImages && (
                                            <div className="grid grid-cols-3 gap-1 p-1 mt-1">
                                                {filteredImages.map((img) => (
                                                    <div key={img._id} className="group relative aspect-square overflow-hidden rounded border hover:ring-2 hover:ring-primary">
                                                        <button
                                                            className="h-full w-full"
                                                            onClick={() => img.url && setPreviewMedia({ url: img.url, type: 'image', mediaId: img._id, title: img.title, prompt: img.prompt })}
                                                        >
                                                            {img.url && (
                                                                <img src={img.url} alt={img.title ?? img.prompt} className="h-full w-full object-cover" loading="lazy" />
                                                            )}
                                                        </button>
                                                        {/* Hover overlay with title */}
                                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[10px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {img.title ?? img.prompt.slice(0, 30)}
                                                        </div>
                                                        {/* Hover action buttons */}
                                                        <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {onAttachMedia && img.url && (
                                                                <button
                                                                    className="rounded bg-black/60 p-0.5 hover:bg-black/80"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onAttachMedia({ mediaId: img._id, title: img.title ?? img.prompt.slice(0, 30), url: img.url!, type: 'image' });
                                                                        toast.success('Image attached to chat');
                                                                    }}
                                                                    title="Add to chat"
                                                                >
                                                                    <MessageSquarePlus className="h-3 w-3 text-white" />
                                                                </button>
                                                            )}
                                                            <button
                                                                className="rounded bg-black/60 p-0.5 hover:bg-black/80"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    startMediaRename(img._id, img.title ?? img.prompt.slice(0, 30));
                                                                }}
                                                                title="Rename"
                                                            >
                                                                <Pencil className="h-3 w-3 text-white" />
                                                            </button>
                                                            {img.url && (
                                                                <button
                                                                    className="rounded bg-black/60 p-0.5 hover:bg-black/80"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        void handleCopyMedia(img.url!, 'image');
                                                                    }}
                                                                    title="Copy"
                                                                >
                                                                    <Copy className="h-3 w-3 text-white" />
                                                                </button>
                                                            )}
                                                            {img.url && (
                                                                <button
                                                                    className="rounded bg-black/60 p-0.5 hover:bg-black/80"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDownloadMedia(img.url!, 'image', img._id);
                                                                    }}
                                                                    title="Download"
                                                                >
                                                                    <Download className="h-3 w-3 text-white" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Generated Videos Section — thumbnails */}
                                {savedVideos.length > 0 && (
                                    <div className="border-t pt-2 mt-2">
                                        <button
                                            className="flex w-full items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                                            onClick={() => setShowVideos(!showVideos)}
                                        >
                                            {showVideos ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            <Video className="h-3 w-3" />
                                            Generated Videos ({filteredVideos.length})
                                        </button>
                                        {showVideos && (
                                            <div className="grid grid-cols-3 gap-1 p-1 mt-1">
                                                {filteredVideos.map((vid) => (
                                                    <div key={vid._id} className="group relative overflow-hidden rounded border hover:ring-2 hover:ring-primary">
                                                        <button
                                                            className="block h-full w-full"
                                                            onClick={() => vid.url && setPreviewMedia({ url: vid.url, type: 'video', mediaId: vid._id, title: vid.title, prompt: vid.prompt })}
                                                        >
                                                            {vid.url && (
                                                                <div className="relative aspect-video">
                                                                    <video
                                                                        src={vid.url}
                                                                        preload="metadata"
                                                                        className="h-full w-full object-contain bg-black"
                                                                        muted
                                                                    />
                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                        <div className="rounded-full bg-black/50 p-1.5">
                                                                            <Video className="h-3 w-3 text-white" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </button>
                                                        {/* Hover overlay with title */}
                                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[10px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {vid.title ?? vid.prompt.slice(0, 30)}
                                                        </div>
                                                        {/* Hover action buttons */}
                                                        <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {onAttachMedia && vid.url && (
                                                                <button
                                                                    className="rounded bg-black/60 p-0.5 hover:bg-black/80"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onAttachMedia({ mediaId: vid._id, title: vid.title ?? vid.prompt.slice(0, 30), url: vid.url!, type: 'video' });
                                                                        toast.success('Video attached to chat');
                                                                    }}
                                                                    title="Add to chat"
                                                                >
                                                                    <MessageSquarePlus className="h-3 w-3 text-white" />
                                                                </button>
                                                            )}
                                                            <button
                                                                className="rounded bg-black/60 p-0.5 hover:bg-black/80"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    startMediaRename(vid._id, vid.title ?? vid.prompt.slice(0, 30));
                                                                }}
                                                                title="Rename"
                                                            >
                                                                <Pencil className="h-3 w-3 text-white" />
                                                            </button>
                                                            {vid.url && (
                                                                <button
                                                                    className="rounded bg-black/60 p-0.5 hover:bg-black/80"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        void handleCopyMedia(vid.url!, 'video');
                                                                    }}
                                                                    title="Copy URL"
                                                                >
                                                                    <Copy className="h-3 w-3 text-white" />
                                                                </button>
                                                            )}
                                                            {vid.url && (
                                                                <button
                                                                    className="rounded bg-black/60 p-0.5 hover:bg-black/80"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDownloadMedia(vid.url!, 'video', vid._id);
                                                                    }}
                                                                    title="Download"
                                                                >
                                                                    <Download className="h-3 w-3 text-white" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right panel: editor or media preview */}
                    <div className="flex flex-1 flex-col overflow-hidden pt-10">
                        {previewMedia ? (
                            <div className="flex flex-1 flex-col items-center justify-center p-4">
                                <div className="mb-4 flex w-full items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPreviewMedia(null)}
                                    >
                                        Back to documents
                                    </Button>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void handleCopyMedia(previewMedia.url, previewMedia.type)}
                                        >
                                            <Copy className="mr-1 h-3 w-3" />
                                            Copy
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDownloadMedia(previewMedia.url, previewMedia.type, previewMedia.mediaId ?? 'unknown')}
                                        >
                                            <Download className="mr-1 h-3 w-3" />
                                            Download
                                        </Button>
                                    </div>
                                </div>
                                {previewMedia.type === 'image' ? (
                                    <img src={previewMedia.url} alt="Preview" className="max-h-full max-w-full rounded-lg object-contain" />
                                ) : (
                                    <video src={previewMedia.url} controls className="max-h-full max-w-full rounded-lg" />
                                )}
                            </div>
                        ) : (selectedDocId ? (
                            <Suspense
                                fallback={
                                    <div className="flex flex-1 items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                }
                            >
                                <DocumentEditor documentId={selectedDocId} />
                            </Suspense>
                        ) : (
                            <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
                                <FileText className="mb-4 h-12 w-12 opacity-20" />
                                <p>Select a document or create a new one</p>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>

            {/* Name prompt dialog */}
            <Dialog open={showNamePrompt} onOpenChange={setShowNamePrompt}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Create New Document</DialogTitle>
                        <DialogDescription>
                            Enter a name for your new document. Leave blank for &quot;Untitled Document&quot;.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <input
                            ref={newDocInputRef}
                            type="text"
                            value={newDocName}
                            onChange={(e) => setNewDocName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleCreateConfirm();
                                if (e.key === 'Escape') setShowNamePrompt(false);
                            }}
                            placeholder="Document name..."
                            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNamePrompt(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => void handleCreateConfirm()}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Media rename dialog */}
            <Dialog open={editingMediaId !== null} onOpenChange={(isOpen) => !isOpen && setEditingMediaId(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Rename Media</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <input
                            ref={mediaTitleInputRef}
                            type="text"
                            value={editMediaTitleValue}
                            onChange={(e) => setEditMediaTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && editingMediaId) void handleMediaRename(editingMediaId);
                                if (e.key === 'Escape') setEditingMediaId(null);
                            }}
                            placeholder="Enter a name..."
                            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingMediaId(null)}>
                            Cancel
                        </Button>
                        <Button onClick={() => editingMediaId && void handleMediaRename(editingMediaId)}>
                            Rename
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
