// @ts-check
import { defineConfig } from 'astro/config';
import vault from 'astro-vault';

// No pages to write: `pages: true` publishes the vault at /notes with the built-in theme.
export default defineConfig({
  site: 'https://example.com',
  integrations: [vault({ pages: true, title: 'Digital garden' })]
});
