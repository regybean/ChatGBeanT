'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { ThemeProvider, useTheme } from 'next-themes';
import ConvexClientProvider from '~/components/convex-client-provider'
import { Toaster } from '@chatgbeant/ui/toaster';
import { env } from '~/env';

function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
    const { resolvedTheme } = useTheme();

    return (
        <ClerkProvider
            publishableKey={env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
            appearance={resolvedTheme === 'dark' ? { baseTheme: dark } : undefined}
        >
            {children}
        </ClerkProvider>
    );
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
            <ClerkThemeProvider>
                <ConvexClientProvider>
                    {children}
                    <Toaster />
                </ConvexClientProvider>
            </ClerkThemeProvider>
        </ThemeProvider>
    );
}
