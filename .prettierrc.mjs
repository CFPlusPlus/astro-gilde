/** @type {import('prettier').Config} */
export default {
  // Reihenfolge wichtig: Tailwind-Plugin zuletzt, damit Klassen sortiert werden
  plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],

  // Persönliche Stil-Defaults (kannst du nach Geschmack anpassen)
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  printWidth: 100,
};
