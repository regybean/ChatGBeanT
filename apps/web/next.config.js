import fs from 'fs';
import path from 'path';
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);
await jiti.import('./src/env');

const pkg = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'),
);

const transpilePackages = Object.keys(pkg.dependencies ?? {}).filter((dep) =>
    dep.startsWith('@chatgbeant/'),
);

/** @type {import('next').NextConfig} */
const config = {
    transpilePackages,
    typescript: { ignoreBuildErrors: true },
    output: 'standalone',
};

export default config;
