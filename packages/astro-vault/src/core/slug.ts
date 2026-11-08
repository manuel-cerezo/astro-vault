import { slug as githubSlug } from 'github-slugger';

/** Markdown files that count as notes. */
export const NOTE_EXTENSION = /\.(md|mdx)$/i;

/** URL-safe slug for one path segment: "Mis Proyectos" -> "mis-proyectos". */
export function slugifySegment(segment: string): string {
  return segment
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Normalises Windows separators to `/`. */
export const toPosix = (path: string): string => path.replace(/\\/g, '/');

/**
 * Collection id (and URL path) for a vault file path, relative to the vault
 * root: `Ideas/Jardín digital.md` -> `ideas/jardin-digital`.
 */
export function noteIdFromPath(relativePath: string, slugify: (segment: string) => string = slugifySegment): string {
  return toPosix(relativePath)
    .replace(NOTE_EXTENSION, '')
    .split('/')
    .filter(Boolean)
    .map(slugify)
    .filter(Boolean)
    .join('/');
}

/** File name without folders or extension: "Proyectos/Mi nota.md" -> "Mi nota". */
export function noteBasename(relativePath: string): string {
  const name = toPosix(relativePath).split('/').pop() ?? '';
  return name.replace(NOTE_EXTENSION, '');
}

/** The anchor Astro gives a Markdown heading (github-slugger, accents kept). */
export function headingSlug(heading: string): string {
  return githubSlug(heading.trim());
}

/** Title fallback when a note has no `title` property: its file name, like Obsidian. */
export function noteTitle(path: string, title?: string): string {
  return title?.trim() || noteBasename(path);
}
