import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import { parse as parseYaml } from 'yaml';

import { createNoteResolver, type NoteRef, type NoteResolver } from './core/resolve.ts';
import { NOTE_EXTENSION, noteIdFromPath, toPosix } from './core/slug.ts';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/** The YAML frontmatter of a note, or `{}` when it is missing or invalid. */
export function readFrontmatter(source: string): Record<string, unknown> {
  const match = FRONTMATTER.exec(source);
  if (!match) return {};
  try {
    const data: unknown = parseYaml(match[1] ?? '');
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Obsidian accepts a list or a single string for list properties. */
export function toList(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return [];
}

export interface VaultScan {
  /** Published notes (drafts excluded). */
  notes: NoteRef[];
  /** Every non-Markdown file, as vault-relative paths. */
  attachments: string[];
  resolveNote: NoteResolver;
  /** Vault-relative path of an embedded file: exact path first, then by file name. */
  findAttachment: (name: string) => string | undefined;
}

export interface ScanOptions {
  draftProperty?: string;
}

const EMPTY: VaultScan = {
  notes: [],
  attachments: [],
  resolveNote: () => undefined,
  findAttachment: () => undefined
};

/** Reads the vault folder once: published notes, attachments and the resolvers. */
export function scanVault(vaultDir: string, options: ScanOptions = {}): VaultScan {
  const draftProperty = options.draftProperty ?? 'draft';
  let files: string[];
  try {
    files = readdirSync(vaultDir, { recursive: true, encoding: 'utf8' }).map((file) => file.split(sep).join('/'));
  } catch {
    return EMPTY;
  }
  // Dot folders (.obsidian, .trash, .git) are never published.
  const visible = files.filter((file) => !file.split('/').some((part) => part.startsWith('.')));
  const notes: NoteRef[] = [];
  const attachments: string[] = [];
  for (const file of visible) {
    if (!NOTE_EXTENSION.test(file)) {
      if (/\.[^/]+$/.test(file)) attachments.push(file);
      continue;
    }
    const data = readFrontmatter(readFileSync(join(vaultDir, file), 'utf8'));
    if (data[draftProperty] === true) continue;
    notes.push({ id: noteIdFromPath(file), path: file, aliases: toList(data.aliases) });
  }

  return {
    notes,
    attachments,
    resolveNote: createNoteResolver(notes),
    findAttachment: (name) => {
      const wanted = toPosix(name.trim()).toLowerCase();
      return (
        attachments.find((file) => file.toLowerCase() === wanted) ??
        attachments.find((file) => file.toLowerCase().endsWith(`/${wanted}`))
      );
    }
  };
}

export interface VaultIndex {
  /** The current scan, read from disk on first use and after `invalidate()`. */
  get(): VaultScan;
  /** Drops the cached scan, e.g. when a file in the vault changes during `astro dev`. */
  invalidate(): void;
}

/** A cached `scanVault`, so a build reads the vault once instead of once per note. */
export function createVaultIndex(vaultDir: string, options: ScanOptions = {}): VaultIndex {
  let scan: VaultScan | undefined;
  return {
    get: () => (scan ??= scanVault(vaultDir, options)),
    invalidate: () => {
      scan = undefined;
    }
  };
}
