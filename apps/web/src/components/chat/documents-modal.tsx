'use client';

import { useState, useRef, useCallback, lazy, Suspense } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { FileText, Plus, Pencil, Trash2, Search, X, Loader2 } from 'lucide-react';
import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import { ScrollArea } from '@chatgbeant/ui/scroll-area';
import { cn } from '@chatgbeant/ui/cn';

const DocumentEditor = lazy(() =>
  import('./document-editor').then((m) => ({ default: m.DocumentEditor }))
);

interface DocumentsModalProps {
  open: boolean;
  onClose: () => void;
}

export function DocumentsModal({ open, onClose }: DocumentsModalProps) {
  const [selectedDocId, setSelectedDocId] = useState<Id<'documents'> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTitle, setEditingTitle] = useState<Id<'documents'> | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  const documents = useQuery(api.documents.listDocuments) ?? [];
  const createDocument = useMutation(api.documents.createDocument);
  const renameDocument = useMutation(api.documents.renameDocument);
  const deleteDocument = useMutation(api.documents.deleteDocument);

  const filteredDocs = searchQuery
    ? documents.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : documents;

  const handleCreate = async () => {
    const id = await createDocument({});
    setSelectedDocId(id);
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

  // Drag handlers for the modal
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!open) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="fixed inset-0 z-50"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="absolute left-1/2 top-1/2 flex h-[80vh] w-[80vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border bg-background shadow-xl"
        style={{
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
        }}
      >
        {/* Left panel: document list */}
        <div className="flex w-72 shrink-0 flex-col border-r">
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            className="flex items-center justify-between border-b p-3 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
          >
            <h2 className="font-semibold">Documents</h2>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

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
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleCreate}>
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
                  onClick={() => setSelectedDocId(doc._id)}
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
              {filteredDocs.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  {searchQuery ? 'No documents found' : 'No documents yet'}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right panel: editor */}
        <div className="flex flex-1 flex-col">
          {selectedDocId ? (
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
          )}
        </div>
      </div>
    </div>
  );
}
