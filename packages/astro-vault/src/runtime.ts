/**
 * Server-side helpers for pages and components. Requires the `astro-vault`
 * integration, which provides the configuration through a virtual module.
 *
 * ```astro
 * ---
 * import { getVault } from 'astro-vault/runtime';
 * const vault = await getVault();
 * ---
 * ```
 */
import { getCollection } from 'astro:content';
import config from 'virtual:astro-vault/config';

import { buildBacklinks } from './core/graph.ts';
import { createNoteResolver } from './core/resolve.ts';
import { noteTitle, toPosix } from './core/slug.ts';
import { buildNoteTree, folderContains, readingOrder, type NoteTreeNode } from './core/tree.ts';
import { createNoteHref } from './core/urls.ts';
import type { VaultLabels } from './labels.ts';

export { folderContains };
export type { VaultLabels } from './labels.ts';
export type { NoteFolder, NoteLeaf, NoteTreeNode } from './core/tree.ts';

/** The fields of a collection entry the vault reads. `CollectionEntry<'notes'>` satisfies it. */
export interface VaultEntry {
  id: string;
  filePath?: string;
  body?: string;
  data: {
    title?: string;
    order?: number;
    aliases?: string[];
    [key: string]: unknown;
  };
}

export interface Vault<Entry extends VaultEntry = VaultEntry> {
  /** The vault name (`title` option). */
  title: string;
  /** Interface language (`lang` option). */
  lang: string;
  /** Interface text in that language, with your overrides. */
  labels: VaultLabels;
  /** Published notes (drafts excluded), in collection order. */
  notes: Entry[];
  /** The landing note, when the vault has one. */
  home: Entry | undefined;
  /** Folder tree for a sidebar (the home note is left out). */
  tree: NoteTreeNode[];
  /** Note id -> title (the `title` property or the file name). */
  titles: Map<string, string>;
  /** Home first, then the tree order: what previous / next links follow. */
  readingOrder: string[];
  /** Note id -> ids of the notes that link to it. */
  backlinks: Map<string, string[]>;
  /** URL of a note, optionally to one of its headings. */
  href: (id: string, heading?: string) => string;
  /** Vault-relative path with the original folder and file names. */
  pathOf: (entry: Entry) => string;
  /** Folder names above a note, for breadcrumbs. */
  foldersOf: (entry: Entry) => string[];
  isHome: (id: string) => boolean;
  /** Previous and next note ids in reading order. */
  neighbours: (id: string) => { previous?: string; next?: string };
  /** Resolves a wikilink target (`Note`, `Folder/Note`, an alias) to a note id. */
  resolve: (target: string) => string | undefined;
}

let cached: Promise<Vault> | undefined;

/** Loads the vault collection once per build and derives the tree, backlinks and reading order. */
export function getVault<Entry extends VaultEntry = VaultEntry>(): Promise<Vault<Entry>> {
  cached ??= loadVault();
  return cached as unknown as Promise<Vault<Entry>>;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function loadVault(): Promise<Vault> {
  const prefix = new RegExp(`^(?:\\./)?${escapeRegExp(config.dir)}/`);
  const pathOf = (entry: VaultEntry) => toPosix(entry.filePath ?? `${entry.id}.md`).replace(prefix, '');

  const all = (await getCollection(config.collection as never)) as unknown as VaultEntry[];
  const notes = all.filter((entry) => entry.data[config.draftProperty] !== true);
  const refs = notes.map((entry) => ({
    id: entry.id,
    path: pathOf(entry),
    body: entry.body,
    aliases: entry.data.aliases,
    title: noteTitle(pathOf(entry), entry.data.title),
    order: entry.data.order
  }));

  const resolve = createNoteResolver(refs);
  const tree = buildNoteTree(refs, { homeNote: config.homeNote, locale: config.locale });
  const home = notes.find((entry) => entry.id === config.homeNote);
  const order = readingOrder(tree, home ? config.homeNote : undefined);

  return {
    title: config.title,
    lang: config.lang,
    labels: config.labels,
    notes,
    home,
    tree,
    titles: new Map(refs.map((ref) => [ref.id, ref.title])),
    readingOrder: order,
    backlinks: buildBacklinks(refs, resolve),
    href: createNoteHref(config),
    pathOf,
    foldersOf: (entry) => pathOf(entry).split('/').slice(0, -1),
    isHome: (id) => id === config.homeNote,
    neighbours: (id) => {
      const position = order.indexOf(id);
      if (position < 0) return {};
      return { previous: order[position - 1], next: order[position + 1] };
    },
    resolve
  };
}
