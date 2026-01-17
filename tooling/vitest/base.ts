import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        env: {
            SKIP_ENV_VALIDATION: 'true',
        },
        mockReset: true,
        testTimeout: 30000,
        hookTimeout: 30000,
        reporters: ['verbose'],
        passWithNoTests: true,
        coverage: {
            provider: 'istanbul',
            reporter: ['text', 'json', 'html'],
        },
        include: [
            'src/**/*.test.{ts,tsx}',
            'src/**/__tests__/**/*.test.{ts,tsx}',
            'src/**/tests/**/*.test.{ts,tsx}',
            'src/tests/**/*.test.{ts,tsx}',
        ],
    },
});
