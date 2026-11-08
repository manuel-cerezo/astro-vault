/**
 * The Astro integration:
 *
 * ```js
 * import vault from 'astro-vault';
 * import vaultConfig from './src/vault.config';
 *
 * export default defineConfig({ integrations: [vault(vaultConfig)] });
 * ```
 */
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isSatteriProcessor, satteri } from '@astrojs/markdown-satteri';
import type { AstroIntegration } from 'astro';

import { resolveVaultConfig, type VaultOptions } from './config.ts';
import { findDuplicateIds } from './core/resolve.ts';
import { vaultMarkdown } from './markdown/satteri.ts';
import { createVaultIndex } from './vault-index.ts';

export type { VaultOptions } from './config.ts';

const VIRTUAL_ID = 'virtual:astro-vault/config';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export default function vault(options: VaultOptions = {}): AstroIntegration {
  const config = resolveVaultConfig(options);

  return {
    name: 'astro-vault',
    hooks: {
      'astro:config:setup': ({ config: astroConfig, updateConfig, logger }) => {
        const root = fileURLToPath(astroConfig.root);
        const vaultDir = resolve(root, config.dir);
        const index = createVaultIndex(vaultDir, { draftProperty: config.draftProperty });

        for (const group of findDuplicateIds(index.get().notes)) {
          logger.warn(`These notes publish at the same URL; only one will be built: ${group.join(', ')}`);
        }

        const processor = astroConfig.markdown.processor;
        if (config.markdown === 'auto') {
          if (processor && isSatteriProcessor(processor)) {
            const plugin = vaultMarkdown({
              ...options,
              root,
              base: astroConfig.base,
              trailingSlash: astroConfig.trailingSlash,
              index
            });
            updateConfig({
              markdown: {
                processor: satteri({
                  ...processor.options,
                  mdastPlugins: [...processor.options.mdastPlugins, plugin]
                })
              }
            });
          } else {
            logger.warn(
              `Wikilinks, embeds and callouts need the Sätteri Markdown processor (Astro's default), ` +
                `but \`markdown.processor\` is "${processor?.name}". Support for other processors is planned.`
            );
          }
        }

        const runtimeConfig = JSON.stringify({
          ...config,
          base: astroConfig.base,
          trailingSlash: astroConfig.trailingSlash
        });

        updateConfig({
          vite: {
            plugins: [
              {
                name: 'astro-vault:config',
                resolveId: (id: string) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
                load: (id: string) => (id === RESOLVED_ID ? `export default ${runtimeConfig};` : undefined),
                configureServer(server) {
                  // New, renamed or deleted notes change how links resolve.
                  const onChange = (file: string) => {
                    if (resolve(file).startsWith(vaultDir + sep)) index.invalidate();
                  };
                  server.watcher.on('add', onChange);
                  server.watcher.on('unlink', onChange);
                  server.watcher.on('change', onChange);
                }
              }
            ],
            ssr: { noExternal: ['astro-vault'] }
          }
        });
      }
    }
  };
}

export { vault };
