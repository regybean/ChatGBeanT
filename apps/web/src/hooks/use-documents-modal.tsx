'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';

interface DocumentsModalContextValue {
    isOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
    onAttachDocument: ((documentId: Id<'documents'>, title: string) => void) | undefined;
    setOnAttachDocument: (fn: ((documentId: Id<'documents'>, title: string) => void) | undefined) => void;
}

const DocumentsModalContext = createContext<DocumentsModalContextValue | null>(null);

export function DocumentsModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [onAttach, setOnAttach] = useState<((documentId: Id<'documents'>, title: string) => void) | undefined>();

    const openModal = useCallback(() => setIsOpen(true), []);
    const closeModal = useCallback(() => setIsOpen(false), []);
    const setOnAttachDocument = useCallback(
        (fn: ((documentId: Id<'documents'>, title: string) => void) | undefined) => {
            setOnAttach(() => fn);
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
