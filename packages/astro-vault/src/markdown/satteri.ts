/**
 * Sätteri mdast plugin (Astro 7's default Markdown processor) for files inside
 * the vault:
 *
 * - `[[Note]]`, `[[Folder/Note]]`, `[[Note#Heading]]`, `[[Note|label]]` become
 *   links; a link to a missing or draft note becomes muted text.
 * - `![[image.png]]` embeds a file from anywhere in the vault, which Astro then
 *   optimizes like any other local Markdown image.
 * - `> [!type] Title` blockquotes become callouts.
 *
 * Files outside the vault are left untouched.
 */
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';

import { resolveVaultConfig, type VaultOptions } from '../config.ts';
import { createNoteHref, type UrlOptions } from '../core/urls.ts';
import { createVaultIndex, type VaultIndex } from '../vault-index.ts';
import { calloutParts, wikilinkNodes, type MdastNode } from './transform.ts';

export type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;

export interface VaultMarkdownOptions extends VaultOptions {
  /** Project root that `dir` is relative to. Default: `process.cwd()`. */
  root?: string;
  /** Astro's `base`, for link URLs. */
  base?: string;
  /** Astro's `trailingSlash`, for link URLs. */
  trailingSlash?: UrlOptions['trailingSlash'];
  /** Shared vault index; the integration passes one it invalidates on file changes. */
  index?: VaultIndex;
}

/** The Markdown plugin. The integration registers it for you unless `markdown: 'manual'`. */
export function vaultMarkdown(options: VaultMarkdownOptions = {}): MdastPlugin {
  const config = resolveVaultConfig(options);
  const vaultDir = resolve(options.root ?? process.cwd(), config.dir);
  const index = options.index ?? createVaultIndex(vaultDir, { draftProperty: config.draftProperty });
  const href = createNoteHref({
    basePath: config.basePath,
    homeNote: config.homeNote,
    base: options.base,
    trailingSlash: options.trailingSlash
  });
  const documents = new WeakMap<object, { fileDir: string } | null>();

  const documentFor = (ctx: { fileURL?: URL; data: object }) => {
    if (documents.has(ctx.data)) return documents.get(ctx.data) ?? null;
    const filePath = ctx.fileURL ? fileURLToPath(ctx.fileURL) : '';
    const doc = filePath.startsWith(vaultDir + sep) ? { fileDir: dirname(filePath) } : null;
    documents.set(ctx.data, doc);
    return doc;
  };

  return {
    name: 'astro-vault',
    text(node, ctx) {
      if (!node.value.includes('[[')) return;
      const doc = documentFor(ctx);
      if (!doc) return;
      const nodes = wikilinkNodes(node.value, {
        vault: index.get(),
        fileDir: doc.fileDir,
        vaultDir,
        href,
        classes: config.wikilinks
      });
      if (nodes.length !== 1 || nodes[0]?.type !== 'text') ctx.replaceNode(node, nodes as never);
    },
    blockquote(node, ctx) {
      if (!config.callouts || !documentFor(ctx)) return;
      const paragraph = node.children[0];
      if (paragraph?.type !== 'paragraph') return;
      const first = paragraph.children[0];
      if (first?.type !== 'text') return;

      const callout = calloutParts(first.value);
      if (!callout) return;

      const titleParagraph: MdastNode = {
        type: 'paragraph',
        data: { hProperties: { className: ['callout-title'] } },
        children: [{ type: 'text', value: callout.title }]
      };
      const hProperties: Record<string, unknown> = { className: ['callout'], dataCallout: callout.type };
      if (callout.fold) hProperties.dataCalloutFold = callout.fold;
      ctx.setProperty(node, 'data', { hProperties } as never);

      if (!callout.rest && paragraph.children.length === 1) {
        ctx.replaceNode(paragraph, titleParagraph as never);
      } else {
        if (callout.rest) ctx.replaceNode(first, { type: 'text', value: callout.rest } as never);
        else ctx.removeNode(first);
        ctx.insertBefore(paragraph, titleParagraph as never);
      }
    }
  };
}

export default vaultMarkdown;
