import { headingSlug } from './slug.ts';

export interface UrlOptions {
  /** URL path the notes live under, e.g. `/notes`. `/` publishes them at the site root. */
  basePath: string;
  /** Id of the landing note, served at `basePath` itself. */
  homeNote: string;
  /** Astro's `base` option. */
  base?: string;
  /** Astro's `trailingSlash` option. Only `always` adds one. */
  trailingSlash?: 'always' | 'never' | 'ignore';
}

const joinPath = (...parts: string[]) => {
  const joined = parts
    .flatMap((part) => part.split('/'))
    .filter(Boolean)
    .join('/');
  return `/${joined}`;
};

/** Builds `href(id, heading?)` for note links, honouring Astro's `base` and `trailingSlash`. */
export function createNoteHref(options: UrlOptions): (id: string, heading?: string) => string {
  return (id, heading) => {
    let path = joinPath(options.base ?? '/', options.basePath, id === options.homeNote ? '' : id);
    if (options.trailingSlash === 'always' && !path.endsWith('/')) path += '/';
    return heading ? `${path}#${headingSlug(heading)}` : path;
  };
}
