// @ts-check
import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';
import vault from 'astro-vault';

import vaultConfig from './src/vault.config.ts';

export default defineConfig({
  site: 'https://example.com',
  integrations: [mdx(), vault(vaultConfig)]
});
