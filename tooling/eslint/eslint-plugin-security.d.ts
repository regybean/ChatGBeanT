declare module 'eslint-plugin-security' {
    import type { ESLint } from 'eslint';

    const plugin: ESLint.Plugin & {
        configs: {
            recommended: {
                rules: Record<string, unknown>;
            };
        };
    };

    export default plugin;
}
