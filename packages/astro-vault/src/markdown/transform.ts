import { join, relative, sep } from 'node:path';

import { parseWikilinks } from '../core/wikilink.ts';
import type { VaultScan } from '../vault-index.ts';

/** The subset of mdast nodes this package creates. */
export interface MdastNode {
  type: string;
  value?: string;
  url?: string;
  alt?: string;
  children?: MdastNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface WikilinkContext {
  vault: Pick<VaultScan, 'resolveNote' | 'findAttachment'>;
  /** Absolute folder of the note being rendered (image URLs are relative to it). */
  fileDir: string;
  /** Absolute vault folder. */
  vaultDir: string;
  href: (id: string, heading?: string) => string;
  classes: { linkClass: string; missingClass: string };
}

/** Splits one text value into text, link, image and html nodes. */
export function wikilinkNodes(value: string, context: WikilinkContext): MdastNode[] {
  const nodes: MdastNode[] = [];
  let cursor = 0;

  for (const link of parseWikilinks(value)) {
    if (link.index > cursor) nodes.push({ type: 'text', value: value.slice(cursor, link.index) });
    cursor = link.index + link.raw.length;

    const attachment = link.embed ? context.vault.findAttachment(link.target) : undefined;
    if (attachment) {
      let url = relative(context.fileDir, join(context.vaultDir, attachment)).split(sep).join('/');
      if (!url.startsWith('.')) url = `./${url}`;
      nodes.push({ type: 'image', url: encodeURI(url), alt: link.alias ?? '' });
      continue;
    }

    const label = link.alias ?? (link.heading ? `${link.target} › ${link.heading}` : link.target);
    const id = context.vault.resolveNote(link.target);
    if (id) {
      nodes.push({
        type: 'link',
        url: context.href(id, link.heading),
        children: [{ type: 'text', value: label }],
        data: { hProperties: { className: [context.classes.linkClass] } }
      });
    } else {
      nodes.push({
        type: 'html',
        value: `<span class="${escapeHtml(context.classes.linkClass)} ${escapeHtml(context.classes.missingClass)}" title="${escapeHtml(link.target)}">${escapeHtml(label)}</span>`
      });
    }
  }

  if (cursor < value.length) nodes.push({ type: 'text', value: value.slice(cursor) });
  return nodes;
}

const CALLOUT = /^\[!([\w-]+)\]([+-]?)[ \t]*(.*)$/;

export interface CalloutParts {
  /** Lower-cased callout type: `note`, `tip`, `warning`… */
  type: string;
  title: string;
  /** `+` (foldable, open) or `-` (foldable, closed). */
  fold?: '+' | '-';
  /** Text after the `[!type]` line, if the first paragraph continues. */
  rest: string;
}

/** Reads the `[!type]± Title` marker from the first text of a blockquote. */
export function calloutParts(firstText: string): CalloutParts | undefined {
  const [line = '', ...rest] = firstText.split('\n');
  const match = CALLOUT.exec(line);
  if (!match) return undefined;
  const type = (match[1] ?? 'note').toLowerCase();
  const fold = match[2] === '+' || match[2] === '-' ? match[2] : undefined;
  return {
    type,
    title: (match[3] ?? '').trim() || type.charAt(0).toUpperCase() + type.slice(1),
    fold,
    rest: rest.join('\n')
  };
}
