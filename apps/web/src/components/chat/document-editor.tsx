'use client';

import { useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import { useTheme } from 'next-themes';
import type { Id } from '@chatgbeant/backend/convex/_generated/dataModel';
import '@blocknote/mantine/style.css';

import { api } from '@chatgbeant/backend/convex/_generated/api';

interface DocumentEditorProps {
    documentId: Id<'documents'>;
}

export function DocumentEditor({ documentId }: DocumentEditorProps) {
    const { resolvedTheme } = useTheme();
    const document = useQuery(api.documents.getDocument, { documentId });
    const updateContent = useMutation(api.documents.updateDocumentContent);

    const editor = useCreateBlockNote({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- BlockNote uses complex internal types\n        initialContent: document?.content ? (JSON.parse(document.content) as any) : undefined,
    });

    const handleChange = useCallback(() => {
        const content = JSON.stringify(editor.document);
        void updateContent({ documentId, content });
    }, [editor, documentId, updateContent]);

    if (!document) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading...
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto px-4">
            <BlockNoteView
                editor={editor}
                onChange={handleChange}
                theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            />
        </div>
    );
}
