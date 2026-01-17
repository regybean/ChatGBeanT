import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

import { authEnv } from '@chatgbeant/auth/env';

export const env = createEnv({
    extends: [authEnv()],
    server: {
        CONVEX_DEPLOYMENT: z.string().optional(),
        OPENROUTER_API_KEY: z.string().min(1),
        NODE_ENV: z
            .enum(['development', 'production', 'test'])
            .default('development'),
    },
    client: {
        NEXT_PUBLIC_CONVEX_URL: z.string().url(),
        NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    },
    experimental__runtimeEnv: {
        NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
            process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    },
    skipValidation:
        !!process.env.CI || process.env.npm_lifecycle_event === 'lint',
});
