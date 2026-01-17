'use client';

import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { ThemeProvider } from 'next-themes';

import { Toaster } from '@chatgbeant/ui/toaster';

import { env } from '~/env';

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <ClerkProvider
        publishableKey={env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
        afterSignOutUrl="/"
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          {children}
          <Toaster />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </ThemeProvider>
  );
}
