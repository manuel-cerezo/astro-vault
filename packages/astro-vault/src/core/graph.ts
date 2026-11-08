import { createNoteResolver, type NoteRef, type NoteResolver } from './resolve.ts';
import { parseWikilinks, stripCode } from './wikilink.ts';

/** Ids of the notes one note links to (embeds and self links excluded). */
export function outgoingLinks(note: NoteRef & { body?: string }, resolve: NoteResolver): string[] {
  const targets = new Set<string>();
  for (const link of parseWikilinks(stripCode(note.body ?? ''))) {
    if (link.embed) continue;
    const target = resolve(link.target);
    if (target && target !== note.id) targets.add(target);
  }
  return [...targets];
}

/** For every note id, the ids of the notes that link to it, in input order. */
export function buildBacklinks(
  notes: (NoteRef & { body?: string })[],
  resolve: NoteResolver = createNoteResolver(notes)
): Map<string, string[]> {
  const backlinks = new Map<string, string[]>();
  for (const note of notes) {
    for (const target of outgoingLinks(note, resolve)) {
      backlinks.set(target, [...(backlinks.get(target) ?? []), note.id]);
    }
  }
  return backlinks;
}
