'use client';

import { useState, useRef, lazy, Suspense } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { FileText, Plus, Pencil, Trash2, Search, Loader2, Image, Video, MessageSquarePlus, ChevronDown, ChevronRight } from 'lucide-react';
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
}

export function DocumentsModal({ open, onClose, onAttachDocument }: DocumentsModalProps) {
    const [selectedDocId, setSelectedDocId] = useState<Id<'documents'> | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingTitle, setEditingTitle] = useState<Id<'documents'> | null>(null);
    const [editTitleValue, setEditTitleValue] = useState('');
    const [showNamePrompt, setShowNamePrompt] = useState(false);
    const [newDocName, setNewDocName] = useState('');
    const titleInputRef = useRef<HTMLInputElement>(null);
    const newDocInputRef = useRef<HTMLInputElement>(null);

    const [showImages, setShowImages] = useState(false);
    const [showVideos, setShowVideos] = useState(false);
    const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

    const documents = useQuery(api.documents.listDocuments) ?? [];
    const createDocument = useMutation(api.documents.createDocument);
    const renameDocument = useMutation(api.documents.renameDocument);
    const deleteDocument = useMutation(api.documents.deleteDocument);
    const savedImages = useQuery(api.media.getMediaForUser, { type: 'image' }) ?? [];
    const savedVideos = useQuery(api.media.getMediaForUser, { type: 'video' }) ?? [];

    const filteredDocs = searchQuery
        ? documents.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : documents;

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
                                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                                        No documents yet
                                    </p>
                                )}
                                {filteredDocs.length === 0 && searchQuery && (
                                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                                        No documents found
                                    </p>
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
                                            Generated Images ({savedImages.length})
                                        </button>
                                        {showImages && (
                                            <div className="grid grid-cols-3 gap-1 p-1 mt-1">
                                                {savedImages.map((img) => (
                                                    <button
                                                        key={img._id}
                                                        className="aspect-square overflow-hidden rounded border hover:ring-2 hover:ring-primary"
                                                        onClick={() => img.url && setPreviewMedia({ url: img.url, type: 'image' })}
                                                    >
                                                        {img.url && (
                                                            <img src={img.url} alt={img.prompt} className="h-full w-full object-cover" loading="lazy" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Generated Videos Section */}
                                {savedVideos.length > 0 && (
                                    <div className="border-t pt-2 mt-2">
                                        <button
                                            className="flex w-full items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                                            onClick={() => setShowVideos(!showVideos)}
                                        >
                                            {showVideos ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            <Video className="h-3 w-3" />
                                            Generated Videos ({savedVideos.length})
                                        </button>
                                        {showVideos && (
                                            <div className="space-y-1 p-1 mt-1">
                                                {savedVideos.map((vid) => (
                                                    <button
                                                        key={vid._id}
                                                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent"
                                                        onClick={() => vid.url && setPreviewMedia({ url: vid.url, type: 'video' })}
                                                    >
                                                        <Video className="h-3 w-3 shrink-0 text-muted-foreground" />
                                                        <span className="truncate">{vid.prompt.slice(0, 40)}</span>
                                                    </button>
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
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mb-4 self-start"
                                    onClick={() => setPreviewMedia(null)}
                                >
                                    Back to documents
                                </Button>
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
        </Dialog>
    );
}
