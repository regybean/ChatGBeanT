'use client';

import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import Link from 'next/link';

import { Button } from '@chatgbeant/ui/button';

import { Sidebar } from '~/components/chat/sidebar';

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <AuthLoading>
                <div className="flex h-screen items-center justify-center bg-background">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            </AuthLoading>

            <Unauthenticated>
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
            </Unauthenticated>

            <Authenticated>
                <div className="flex h-screen bg-background">
                    <Sidebar />
                    <main className="flex flex-1 flex-col overflow-hidden">
                        {children}
                    </main>
                </div>
            </Authenticated>
        </>
    );
}
