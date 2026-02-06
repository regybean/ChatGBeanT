'use client';

/* eslint-disable react-hooks/refs */

import React from 'react';
import { useConvexAuth } from 'convex/react';
import Link from 'next/link';

import { Button } from '@chatgbeant/ui/button';
import { SidebarProvider, SidebarTrigger } from '@chatgbeant/ui/sidebar';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@chatgbeant/ui/tooltip';

import { Sidebar } from '~/components/chat/sidebar';
import { DocumentsModalProvider } from '~/hooks/use-documents-modal';

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading, isAuthenticated } = useConvexAuth();
    // Track if we've ever been authenticated to prevent showing loading state on navigation
    const hasBeenAuthenticatedRef = React.useRef(false);

    // Update the ref when authenticated - using proper initialization pattern
    if (isAuthenticated && hasBeenAuthenticatedRef.current === false) {
        hasBeenAuthenticatedRef.current = true;
    }

    const hasBeenAuthenticated = hasBeenAuthenticatedRef.current;

    // Only show loading on initial auth check, not on subsequent navigations
    if (isLoading && !hasBeenAuthenticated) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    // Show unauthenticated state only if we're done loading and not authenticated
    if (!isLoading && !isAuthenticated && !hasBeenAuthenticated) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background">
                <h1 className="mb-4 text-2xl font-bold">Sign in to continue</h1>
                <p className="mb-6 text-muted-foreground">
                    You need to be signed in to access the chat.
                </p>
                <div className="flex gap-4">
                    <Button asChild variant="outline">
                        <Link href="/sign-in">Sign In</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/sign-up">Sign Up</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Once authenticated, always show the main content (prevents loading flash on navigation)
    return (
        <DocumentsModalProvider>
            <SidebarProvider>
                <Sidebar />
                <main className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex items-center gap-2 border-b px-2 py-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <SidebarTrigger className="h-9 w-9" />
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                Toggle sidebar (Ctrl+B)
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <div className="flex flex-1 flex-col overflow-hidden">
                        {children}
                    </div>
                </main>
            </SidebarProvider>
        </DocumentsModalProvider>
    );
}
