'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';

export interface AttachedMedia {
    mediaId: Id<'generatedMedia'>;
    title: string;
    url: string;
    type: 'image' | 'video';
}

interface DocumentsModalContextValue {
    isOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
    onAttachDocument: ((documentId: Id<'documents'>, title: string) => void) | undefined;
    setOnAttachDocument: (fn: ((documentId: Id<'documents'>, title: string) => void) | undefined) => void;
    onAttachMedia: ((media: AttachedMedia) => void) | undefined;
    setOnAttachMedia: (fn: ((media: AttachedMedia) => void) | undefined) => void;
    onAttachThread: ((threadId: string, title: string) => void) | undefined;
    setOnAttachThread: (fn: ((threadId: string, title: string) => void) | undefined) => void;
    isThreadAttachMode: boolean;
    setIsThreadAttachMode: (value: boolean) => void;
}

const DocumentsModalContext = createContext<DocumentsModalContextValue | null>(null);

export function DocumentsModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [onAttach, setOnAttach] = useState<((documentId: Id<'documents'>, title: string) => void) | undefined>();
    const [onMedia, setOnMedia] = useState<((media: AttachedMedia) => void) | undefined>();
    const [onThread, setOnThread] = useState<((threadId: string, title: string) => void) | undefined>();
    const [isThreadAttachMode, setIsThreadAttachMode] = useState(false);

    const openModal = useCallback(() => setIsOpen(true), []);
    const closeModal = useCallback(() => setIsOpen(false), []);
    const setOnAttachDocument = useCallback(
        (fn: ((documentId: Id<'documents'>, title: string) => void) | undefined) => {
            setOnAttach(() => fn);
        },
        [],
    );
    const setOnAttachMedia = useCallback(
        (fn: ((media: AttachedMedia) => void) | undefined) => {
            setOnMedia(() => fn);
        },
        [],
    );
    const setOnAttachThread = useCallback(
        (fn: ((threadId: string, title: string) => void) | undefined) => {
            setOnThread(() => fn);
        },
        [],
    );

    return (
        <DocumentsModalContext.Provider
            value={{
                isOpen,
                openModal,
                closeModal,
                onAttachDocument: onAttach,
                setOnAttachDocument,
                onAttachMedia: onMedia,
                setOnAttachMedia,
                onAttachThread: onThread,
                setOnAttachThread,
                isThreadAttachMode,
                setIsThreadAttachMode,
            }}
        >
            {children}
        </DocumentsModalContext.Provider>
    );
}

export function useDocumentsModal() {
    const context = useContext(DocumentsModalContext);
    if (!context) {
        throw new Error('useDocumentsModal must be used within DocumentsModalProvider');
    }
    return context;
}
