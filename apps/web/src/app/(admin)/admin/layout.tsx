'use client';

import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import Link from 'next/link';

import { Button } from '@chatgbeant/ui/button';

import { AdminSidebar } from '~/components/admin/sidebar';

export default function AdminLayout({
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
                        You need to be signed in to access the admin panel.
                    </p>
                    <div className="flex gap-4">
                        <Button asChild variant="outline">
                            <Link href="/sign-in">Sign In</Link>
                        </Button>
                    </div>
                </div>
            </Unauthenticated>

            <Authenticated>
                <div className="flex h-screen bg-background">
                    <AdminSidebar />
                    <main className="flex-1 overflow-y-auto p-6">
                        {children}
                    </main>
                </div>
            </Authenticated>
        </>
    );
}
