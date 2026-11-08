/**
 * Content collection pieces for `src/content.config.ts`:
 *
 * ```ts
 * import { defineCollection } from 'astro:content';
 * import { vaultLoader, vaultSchema } from 'astro-vault/loader';
 * import vaultConfig from './vault.config';
 *
 * export const collections = {
 *   notes: defineCollection({ loader: vaultLoader(vaultConfig), schema: vaultSchema })
 * };
 * ```
 */
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import { resolveVaultConfig, type VaultOptions } from './config.ts';
import { noteIdFromPath } from './core/slug.ts';

/** Loads every `.md` and `.mdx` file in the vault, with ids that mirror its folders. */
export function vaultLoader(options: VaultOptions = {}) {
  const config = resolveVaultConfig(options);
  return glob({
    pattern: ['**/*.{md,mdx}', '!**/.*/**'],
    base: `./${config.dir}`,
    generateId: ({ entry }) => noteIdFromPath(entry)
  });
}

/** Obsidian writes list properties as lists, but a hand-written single value is valid too. */
const stringList = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((value) => (typeof value === 'string' ? [value] : (value ?? [])));

/**
 * Every property is optional, so a note straight from Obsidian builds as-is.
 * Extend it for your own properties: `vaultSchema.extend({ cover: z.string().optional() })`.
 */
export const vaultSchema = z.object({
  /** Page and sidebar title. Defaults to the file name. */
  title: z.string().optional(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  updated: z.coerce.date().optional(),
  /** `true` hides the note everywhere; links to it render as missing. */
  draft: z.boolean().optional(),
  tags: stringList,
  /** Other names `[[wikilinks]]` can use for this note. */
  aliases: stringList,
  /** Position among its siblings in the tree; notes without it sort by title. */
  order: z.number().optional()
});

export type VaultSchema = typeof vaultSchema;
