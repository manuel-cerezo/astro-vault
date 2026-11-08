/**
 * Options shared by the integration (`astro.config`) and the loader
 * (`content.config`). Keep them in one file and import it from both, so the
 * vault folder is written once:
 *
 * ```ts
 * // src/vault.config.ts
 * import { defineVaultConfig } from 'astro-vault/config';
 * export default defineVaultConfig({ dir: 'src/content/notes', basePath: '/notes' });
 * ```
 */
import { resolveLabels, type VaultLabels } from './labels.ts';

export type { VaultLabels } from './labels.ts';

export interface VaultOptions {
  /** Vault folder, relative to the project root. Default: `src/content/notes`. */
  dir?: string;
  /** Name of the content collection that loads the vault. Default: `notes`. */
  collection?: string;
  /** URL path the notes are published under. Default: `/notes`. */
  basePath?: string;
  /** Id of the landing note (`index.md` -> `index`), served at `basePath`. Default: `index`. */
  homeNote?: string;
  /** Locale used to sort the folder tree alphabetically, e.g. `es`. Default: the runtime locale. */
  locale?: string;
  /** Frontmatter property that hides a note when `true`. Default: `draft`. */
  draftProperty?: string;
  wikilinks?: {
    /** Class added to resolved wikilinks. Default: `wikilink`. */
    linkClass?: string;
    /** Class of the `<span>` that replaces a link to a missing or draft note. Default: `wikilink-missing`. */
    missingClass?: string;
  };
  /** Turn `> [!type] Title` blockquotes into callouts. Default: `true`. */
  callouts?: boolean;
  /**
   * `auto` adds the Markdown plugin to the configured Sätteri processor.
   * `manual` leaves `markdown.processor` alone: add `vaultMarkdown()` from
   * `astro-vault/satteri` yourself. Default: `auto`.
   */
  markdown?: 'auto' | 'manual';
  /**
   * Publish every note at `basePath` with the built-in, ready-styled pages:
   * folder tree, table of contents, backlinks, previous / next and dark mode.
   * Leave it off to render the notes with your own pages. Default: `false`.
   */
  pages?: boolean;
  /** Name of the vault, shown in the built-in pages' sidebar and titles. Default: `Notes`. */
  title?: string;
  /** Interface language of the components and pages: `en` and `es` are built in. Default: `en`. */
  lang?: string;
  /** Override any interface text, e.g. `{ backlinks: 'Mentioned in' }`. */
  labels?: Partial<VaultLabels>;
  /** Stylesheets added to the built-in pages, relative to the project root, e.g. `['./src/styles/notes.css']`. */
  customCss?: string[];
}

export interface ResolvedVaultConfig {
  dir: string;
  collection: string;
  basePath: string;
  homeNote: string;
  locale: string | undefined;
  draftProperty: string;
  wikilinks: { linkClass: string; missingClass: string };
  callouts: boolean;
  markdown: 'auto' | 'manual';
  pages: boolean;
  title: string;
  lang: string;
  labels: VaultLabels;
  customCss: string[];
}

/** Typed identity helper for a shared `vault.config.ts`. */
export function defineVaultConfig(options: VaultOptions = {}): VaultOptions {
  return options;
}

/** Fills in defaults and validates the options. */
export function resolveVaultConfig(options: VaultOptions = {}): ResolvedVaultConfig {
  const basePath = options.basePath ?? '/notes';
  if (!basePath.startsWith('/')) {
    throw new Error(`[astro-vault] \`basePath\` must start with "/", got "${basePath}".`);
  }
  const dir = (options.dir ?? 'src/content/notes').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
  return {
    dir,
    collection: options.collection ?? 'notes',
    basePath: basePath.length > 1 ? basePath.replace(/\/+$/, '') : basePath,
    homeNote: options.homeNote ?? 'index',
    locale: options.locale,
    draftProperty: options.draftProperty ?? 'draft',
    wikilinks: {
      linkClass: options.wikilinks?.linkClass ?? 'wikilink',
      missingClass: options.wikilinks?.missingClass ?? 'wikilink-missing'
    },
    callouts: options.callouts ?? true,
    markdown: options.markdown ?? 'auto',
    pages: options.pages ?? false,
    title: options.title ?? 'Notes',
    lang: options.lang ?? 'en',
    labels: resolveLabels(options.lang ?? 'en', options.labels),
    customCss: options.customCss ?? []
  };
}
