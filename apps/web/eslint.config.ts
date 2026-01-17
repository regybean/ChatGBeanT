import {
    baseConfig,
    restrictEnvAccess,
} from '@chatgbeant/eslint-config/base';
import { nextjsConfig } from '@chatgbeant/eslint-config/nextjs';
import { reactConfig } from '@chatgbeant/eslint-config/react';
import { securityConfig } from '@chatgbeant/eslint-config/security';
import { testingConfig } from '@chatgbeant/eslint-config/testing';

export default [
    {
        ignores: ['.next/**', 'convex/_generated/**'],
    },
    ...baseConfig,
    ...reactConfig,
    ...securityConfig,
    ...restrictEnvAccess,
    ...testingConfig,
    ...nextjsConfig,
    {
        // instrumentation.ts runs before env validation and uses Next.js-specific
        // process.env variables that can't be validated through our env schema
        files: ['src/instrumentation.ts'],
        rules: {
            'no-restricted-properties': 'off',
            'turbo/no-undeclared-env-vars': 'off',
        },
    },
];
