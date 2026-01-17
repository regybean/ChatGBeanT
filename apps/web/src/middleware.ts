import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';


// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/pricing',
    '/terms-of-service',
    '/privacy-policy',
    '/api/webhooks(.*)',
    '/health',
]);

// Admin routes that require admin role
const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, request) => {
    // if not sign in then protect the route
    if (!isPublicRoute(request)) {
        await auth.protect();
    }
    // if it is an admin route and your an admin then go to that route
    if (isAdminRoute(request)) {
        const authResult = await auth();
        if (authResult.sessionClaims?.metadata.role !== 'admin') {
            const url = new URL('/', request.url);
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
});


export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        `/((?!_next|[^?]*.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)`,
    ],
};

