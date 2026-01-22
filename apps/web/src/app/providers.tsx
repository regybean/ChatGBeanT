'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import ConvexClientProvider from '~/components/convex-client-provider'
import { Toaster } from '@chatgbeant/ui/toaster';


export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
            <ClerkProvider>
                <ConvexClientProvider>
                    {children}
                    <Toaster />
                </ConvexClientProvider>
            </ClerkProvider>
        </ThemeProvider>
    );
}
