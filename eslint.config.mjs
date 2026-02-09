import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * ESLint Flat Config (ESLint v9)
 * - Prueft Astro- sowie TS/JS-Quellcode
 * - Ueberlaesst Formatierung Prettier (separat via `npm run format:check`)
 */
export default [
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**', 'public/**', 'src/partials/**'],
  },

  // Basisregeln fuer JavaScript
  js.configs.recommended,

  // TypeScript-Regeln (greifen standardmaessig fuer TS/TSX)
  ...tseslint.configs.recommended,

  // Astro-Regeln (inklusive Parser/Processor fuer .astro)
  ...astro.configs['flat/recommended'],

  // Gemeinsame Sprachoptionen + Globals fuer dieses Projekt
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

  // Deaktiviert Formatierungsregeln, die mit Prettier kollidieren
  eslintConfigPrettier,
];
