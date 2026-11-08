import { defineVaultConfig } from 'astro-vault/config';

/** Shared by astro.config.mjs and src/content.config.ts. */
export default defineVaultConfig({
  dir: 'src/content/notes',
  basePath: '/notes'
});
