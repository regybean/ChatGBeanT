import { defineConfig } from 'eslint/config';

import { baseConfig } from '@chatgbeant/eslint-config/base';
import { reactConfig } from '@chatgbeant/eslint-config/react';

export default defineConfig(baseConfig, reactConfig);
