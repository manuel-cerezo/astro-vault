import type { NoteRef } from './resolve.ts';
import { slugifySegment, toPosix } from './slug.ts';

export interface NoteLeaf {
  kind: 'note';
  id: string;
  title: string;
  order?: number;
}

export interface NoteFolder {
  kind: 'folder';
  /** Slugged folder path, unique within the tree. */
  id: string;
  /** The folder name as written in the vault. */
  title: string;
  children: NoteTreeNode[];
}

export type NoteTreeNode = NoteLeaf | NoteFolder;

export interface TreeInput extends NoteRef {
  title: string;
  order?: number;
}

export interface TreeOptions {
  /** Id of the landing note, left out of the tree (it is the tree's root link). */
  homeNote?: string;
  /** Locale for alphabetical sorting, e.g. `es`. Defaults to the runtime locale. */
  locale?: string;
}

const compareNodes = (locale?: string) => (a: NoteTreeNode, b: NoteTreeNode) => {
  if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
  const orderA = a.kind === 'note' ? (a.order ?? Infinity) : Infinity;
  const orderB = b.kind === 'note' ? (b.order ?? Infinity) : Infinity;
  if (orderA !== orderB) return orderA - orderB;
  return a.title.localeCompare(b.title, locale, { sensitivity: 'base', numeric: true });
};

/** Folder tree for a sidebar: folders first, then notes by `order` and title. */
export function buildNoteTree(notes: TreeInput[], options: TreeOptions = {}): NoteTreeNode[] {
  const root: NoteFolder = { kind: 'folder', id: '', title: '', children: [] };

  for (const note of notes) {
    if (note.id === options.homeNote) continue;
    const folders = toPosix(note.path).split('/').slice(0, -1);
    let parent = root;
    for (const folderName of folders) {
      const slug = slugifySegment(folderName);
      const id = parent.id ? `${parent.id}/${slug}` : slug;
      let folder = parent.children.find((child): child is NoteFolder => child.kind === 'folder' && child.id === id);
      if (!folder) {
        folder = { kind: 'folder', id, title: folderName, children: [] };
        parent.children.push(folder);
      }
      parent = folder;
    }
    parent.children.push({ kind: 'note', id: note.id, title: note.title, order: note.order });
  }

  const compare = compareNodes(options.locale);
  const sort = (nodes: NoteTreeNode[]) => {
    nodes.sort(compare);
    for (const node of nodes) if (node.kind === 'folder') sort(node.children);
  };
  sort(root.children);
  return root.children;
}

/** Notes in sidebar order, depth first. */
export function flattenNoteTree(nodes: NoteTreeNode[]): NoteLeaf[] {
  return nodes.flatMap((node) => (node.kind === 'note' ? [node] : flattenNoteTree(node.children)));
}

/** Whether a folder holds a note at any depth (to open it in the sidebar). */
export function folderContains(folder: NoteFolder, noteId: string): boolean {
  return folder.children.some((child) => (child.kind === 'note' ? child.id === noteId : folderContains(child, noteId)));
}

/** Previous / next order: the home note first (when it exists), then the sidebar order. */
export function readingOrder(tree: NoteTreeNode[], homeNote?: string): string[] {
  return [...(homeNote ? [homeNote] : []), ...flattenNoteTree(tree).map((leaf) => leaf.id)];
}
