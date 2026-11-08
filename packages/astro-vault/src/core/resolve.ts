import { NOTE_EXTENSION, noteBasename, noteIdFromPath, slugifySegment, toPosix } from './slug.ts';

export interface NoteRef {
  /** Collection id, also the URL path below the notes base path. */
  id: string;
  /** Path relative to the vault root, with the original folder and file names. */
  path: string;
  /** Obsidian `aliases`: other names a wikilink may use for this note. */
  aliases?: string[];
}

export type NoteResolver = (target: string) => string | undefined;

/** Shallower notes first, then alphabetical: the note Obsidian picks for an ambiguous name. */
const byDepthThenPath = (a: NoteRef, b: NoteRef) =>
  a.path.split('/').length - b.path.split('/').length || a.path.localeCompare(b.path);

/**
 * Obsidian-style resolution. A bare name matches any note with that file name,
 * slug or alias; when several notes share it, the one closest to the vault
 * root wins. A name with folders matches the end of a note's path.
 */
export function createNoteResolver(notes: NoteRef[]): NoteResolver {
  const sorted = [...notes].sort(byDepthThenPath);
  const byName = new Map<string, string>();
  const add = (key: string, id: string) => {
    if (key && !byName.has(key)) byName.set(key, id);
  };
  for (const note of sorted) {
    add(noteBasename(note.path).toLowerCase(), note.id);
    add(note.id.split('/').pop() ?? '', note.id);
  }
  // Aliases never shadow a real file name.
  for (const note of sorted) {
    for (const alias of note.aliases ?? []) {
      add(alias.trim().toLowerCase(), note.id);
      add(slugifySegment(alias), note.id);
    }
  }

  return (target) => {
    const cleaned = toPosix(target.trim()).replace(NOTE_EXTENSION, '');
    if (!cleaned) return undefined;
    if (cleaned.includes('/')) {
      const wanted = noteIdFromPath(cleaned);
      return sorted.find((note) => note.id === wanted || note.id.endsWith(`/${wanted}`))?.id;
    }
    return byName.get(cleaned.toLowerCase()) ?? byName.get(slugifySegment(cleaned));
  };
}

export interface AmbiguousName {
  /** The file name shared by several notes, as a bare `[[name]]` would write it. */
  name: string;
  /** Every note with that name, closest to the vault root first: `[[name]]` links to the first. */
  paths: string[];
}

/** File names that several notes share, so a bare `[[name]]` is ambiguous. */
export function findAmbiguousNames(notes: NoteRef[]): AmbiguousName[] {
  const groups = new Map<string, NoteRef[]>();
  for (const note of [...notes].sort(byDepthThenPath)) {
    const key = noteBasename(note.path).toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), note]);
  }
  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({ name: noteBasename(group[0]!.path), paths: group.map((note) => note.path) }));
}

/** Groups of vault paths that would publish at the same URL. */
export function findDuplicateIds(notes: NoteRef[]): string[][] {
  const paths = new Map<string, string[]>();
  for (const note of notes) paths.set(note.id, [...(paths.get(note.id) ?? []), note.path]);
  return [...paths.values()].filter((group) => group.length > 1);
}
