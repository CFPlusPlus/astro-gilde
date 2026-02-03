import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * ESLint Flat Config (ESLint v9)
 * - Lints Astro + TS/JS source files
 * - Leaves formatting to Prettier (checked separately via `npm run format:check`)
 */
export default [
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**', 'public/**', 'src/partials/**'],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules (only applies to TS/TSX by default)
  ...tseslint.configs.recommended,

  // Astro rules (includes parser/processor for .astro)
  ...astro.configs['flat/recommended'],

  // Common language options + globals for this project
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,astro}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Disable formatting-related rules that conflict with Prettier
  eslintConfigPrettier,
];
