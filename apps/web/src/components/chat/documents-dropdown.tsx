'use client';

import { useMutation, useQuery } from 'convex/react';
import { FileText, Plus, Eye } from 'lucide-react';

import { api } from '@chatgbeant/backend/convex/_generated/api';
import { Button } from '@chatgbeant/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@chatgbeant/ui/dropdown-menu';

interface DocumentsDropdownProps {
    onOpenModal: () => void;
}

export function DocumentsDropdown({ onOpenModal }: DocumentsDropdownProps) {
    const documents = useQuery(api.documents.listDocuments) ?? [];
    const createDocument = useMutation(api.documents.createDocument);

    const recentDocs = documents.slice(0, 3);

    const handleCreate = async () => {
        await createDocument({});
        onOpenModal();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Documents
                    {documents.length > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground">
                            {documents.length}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-56">
                <DropdownMenuItem onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Document
                </DropdownMenuItem>
                {recentDocs.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        {recentDocs.map((doc) => (
                            <DropdownMenuItem key={doc._id} onClick={onOpenModal}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span className="truncate">{doc.title}</span>
                            </DropdownMenuItem>
                        ))}
                    </>
                )}
                {documents.length > 3 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onOpenModal}>
                            <Eye className="mr-2 h-4 w-4" />
                            View All ({documents.length})
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
