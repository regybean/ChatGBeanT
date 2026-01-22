import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const authEnv = () =>
    createEnv({
        server: {
            CLERK_SECRET_KEY: z.string().min(1),
        },
        clientPrefix: 'NEXT_PUBLIC_',
        client: {
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
        },
        runtimeEnv: process.env,
        emptyStringAsUndefined: true,
        skipValidation:
            !!process.env.CI ||
            !!process.env.SKIP_ENV_VALIDATION ||
            process.env.npm_lifecycle_event === 'lint',
    });
