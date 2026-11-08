export interface Wikilink {
  /** The note name or path as written, without heading or alias. */
  target: string;
  heading?: string;
  alias?: string;
  /** `![[...]]`: an embed (images, mostly) rather than a link. */
  embed: boolean;
  /** The full source text, e.g. `[[Nota|alias]]`. */
  raw: string;
  /** Offset of `raw` in the parsed text. */
  index: number;
}

const WIKILINK = /(!?)\[\[([^[\]|#\n]+)(?:#([^[\]|\n]+))?(?:\|([^[\]\n]+))?\]\]/g;

/** Every `[[target#heading|alias]]` and `![[embed]]` in a piece of text. */
export function parseWikilinks(text: string): Wikilink[] {
  return [...text.matchAll(WIKILINK)].map((match) => ({
    target: (match[2] ?? '').trim(),
    heading: match[3]?.trim() || undefined,
    alias: match[4]?.trim() || undefined,
    embed: match[1] === '!',
    raw: match[0],
    index: match.index ?? 0
  }));
}

/**
 * Drops fenced code blocks (``` and ~~~, any fence length) and inline code, so
 * `[[...]]` inside code samples is not counted as a link.
 */
export function stripCode(markdown: string): string {
  const withoutFences = markdown.replace(
    /^[ \t]{0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[ \t]{0,3}\1[`~]*[ \t]*$|(?![\s\S]))/gm,
    ''
  );
  return withoutFences.replace(/(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g, '');
}
