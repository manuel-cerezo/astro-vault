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
import { findAmbiguousNames, findDuplicateIds } from './core/resolve.ts';
import { vaultMarkdown } from './markdown/satteri.ts';
import { createVaultIndex } from './vault-index.ts';

export type { VaultOptions } from './config.ts';

const VIRTUAL_ID = 'virtual:astro-vault/config';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const CSS_ID = 'virtual:astro-vault/user-css';
const RESOLVED_CSS_ID = `\0${CSS_ID}`;

export default function vault(options: VaultOptions = {}): AstroIntegration {
  const config = resolveVaultConfig(options);

  return {
    name: 'astro-vault',
    hooks: {
      'astro:config:setup': ({ config: astroConfig, updateConfig, injectRoute, logger }) => {
        const root = fileURLToPath(astroConfig.root);
        const vaultDir = resolve(root, config.dir);
        const index = createVaultIndex(vaultDir, { draftProperty: config.draftProperty });

        const { notes } = index.get();
        for (const group of findDuplicateIds(notes)) {
          logger.warn(`These notes publish at the same URL; only one will be built: ${group.join(', ')}`);
        }
        for (const { name, paths } of findAmbiguousNames(notes)) {
          logger.info(
            `[[${name}]] matches ${paths.length} notes and links to ${paths[0]}. ` +
              `Use [[Folder/${name}]] to link to another one: ${paths.slice(1).join(', ')}`
          );
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

        if (config.pages) {
          const base = config.basePath === '/' ? '' : config.basePath;
          // One rest route serves the landing page (no slug) and every note.
          injectRoute({ pattern: `${base}/[...slug]`, entrypoint: 'astro-vault/pages/note.astro', prerender: true });
        }

        // `customCss` files, imported by the built-in layout.
        const userCss = config.customCss
          .map((file) => `import ${JSON.stringify(resolve(root, file).split(sep).join('/'))};`)
          .join('\n');

        updateConfig({
          vite: {
            plugins: [
              {
                name: 'astro-vault:config',
                resolveId: (id: string) =>
                  id === VIRTUAL_ID ? RESOLVED_ID : id === CSS_ID ? RESOLVED_CSS_ID : undefined,
                load: (id: string) =>
                  id === RESOLVED_ID
                    ? `export default ${runtimeConfig};`
                    : id === RESOLVED_CSS_ID
                      ? userCss
                      : undefined,
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
