# astro-vault

Publish an [Obsidian](https://obsidian.md) vault as part of any Astro site. You write in Obsidian and Astro builds the pages: `[[wikilinks]]`, `![[image]]` embeds, callouts, backlinks, a folder tree and previous / next links, all on top of Astro's own content collections.

- **Your design, your pages.** astro-vault resolves links and builds the data. You render it with your own layout, or start from the unstyled components it ships.
- **Built for Astro 7.** It runs on Sätteri, Astro's default Markdown processor, and works with `.md` and `.mdx` notes.
- **Static output.** Everything is resolved at build time. No client JavaScript is added.

> Status: early `0.x`. The API may change between minor versions until 1.0.

## Quick start

### 1. Install

```sh
npx astro add astro-vault
```

Or install `astro-vault` with your package manager and add the integration by hand (step 3).

### 2. Point it at your vault

Create a config file that both `astro.config` and `content.config` import, so the vault folder is written once:

```ts
// src/vault.config.ts
import { defineVaultConfig } from 'astro-vault/config';

export default defineVaultConfig({
  dir: 'src/content/notes', // open this folder in Obsidian as a vault
  basePath: '/notes' // where the notes are published
});
```

### 3. Add the integration and the collection

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import vault from 'astro-vault';
import vaultConfig from './src/vault.config.ts';

export default defineConfig({
  integrations: [vault(vaultConfig)]
});
```

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { vaultLoader, vaultSchema } from 'astro-vault/loader';
import vaultConfig from './vault.config';

export const collections = {
  notes: defineCollection({ loader: vaultLoader(vaultConfig), schema: vaultSchema })
};
```

### 4. Create the pages

```astro
---
// src/pages/notes/[...slug].astro
import { getVault } from 'astro-vault/runtime';
import { render, type CollectionEntry } from 'astro:content';
import Backlinks from 'astro-vault/components/Backlinks.astro';
import VaultTree from 'astro-vault/components/VaultTree.astro';
import 'astro-vault/styles.css';

export async function getStaticPaths() {
  const vault = await getVault<CollectionEntry<'notes'>>();
  return vault.notes
    .filter((note) => !vault.isHome(note.id))
    .map((note) => ({ params: { slug: note.id }, props: { note } }));
}

const { note } = Astro.props;
const vault = await getVault<CollectionEntry<'notes'>>();
const { Content } = await render(note);
---

<VaultTree vault={vault} currentId={note.id} />
<h1>{vault.titles.get(note.id)}</h1>
<Content />
<Backlinks vault={vault} id={note.id} />
```

Render `vault.home` (your `index.md`) the same way from `src/pages/notes/index.astro`. [`examples/basic`](https://github.com/manuel-cerezo/astro-vault/tree/main/examples/basic) is a complete, working site you can copy.

### 5. Write in Obsidian

In Obsidian, choose **Open folder as vault** and select `src/content/notes`. Folders become the tree. Pasted images can live anywhere in the vault, for example in `attachments/`.

Add `.obsidian/` to your `.gitignore`: it holds per-device settings that change every time Obsidian opens.

## Supported syntax

| Syntax                      | Result                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `[[Note]]`                  | Link to the note with that file name, slug or alias, anywhere in the vault.                    |
| `[[Folder/Note]]`           | Link by path, for names that exist in more than one folder.                                    |
| `[[Note#Heading]]`          | Link to a heading. The label reads "Note › Heading".                                           |
| `[[Note\|label]]`           | Link with custom text.                                                                         |
| `![[image.png]]`            | Image from anywhere in the vault, optimized by Astro at build time.                            |
| `> [!type] Title`           | Callout: `<blockquote class="callout" data-callout="type">` with a `.callout-title` paragraph. |
| `> [!type]-` / `> [!type]+` | Foldable callout. The marker is kept in `data-callout-fold` for your own styles or scripts.    |
| `[[Missing note]]`          | `<span class="wikilink wikilink-missing">` instead of a broken link. Drafts count as missing.  |

`[[...]]` inside inline code and code blocks is left as text.

**How names resolve.** A bare name matches a note's file name first, then its slug, then its `aliases`. When several notes share a name, the one closest to the vault root wins, as in Obsidian. Use `[[Folder/Note]]` to pick another one. The build warns when two files would publish at the same URL.

**Not supported yet:** note embeds (`![[Other note]]`), block references (`^id`), image sizes (`![[image.png|300]]`), Dataview and Canvas.

## Frontmatter

Every property is optional, so a note created in Obsidian builds as-is.

| Property      | Type           | Effect                                                               |
| ------------- | -------------- | -------------------------------------------------------------------- |
| `title`       | string         | Page and tree title. Defaults to the file name.                      |
| `description` | string         | Available to your layout.                                            |
| `date`        | date           | Available to your layout.                                            |
| `updated`     | date           | Available to your layout.                                            |
| `tags`        | list or string | Normalised to a list.                                                |
| `aliases`     | list or string | Other names wikilinks can use for this note.                         |
| `order`       | number         | Position among its siblings in the tree; others sort by title.       |
| `draft`       | boolean        | `true` hides the note everywhere, and links to it render as missing. |

Add your own properties with `vaultSchema.extend({ ... })`:

```ts
import { z } from 'astro/zod';

const schema = vaultSchema.extend({ cover: z.string().optional() });
```

## Options

| Option                   | Default             | Description                                                                                               |
| ------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------- |
| `dir`                    | `src/content/notes` | Vault folder, relative to the project root.                                                               |
| `collection`             | `notes`             | Name of the content collection that loads the vault.                                                      |
| `basePath`               | `/notes`            | URL path of the notes. `/` publishes them at the site root.                                               |
| `homeNote`               | `index`             | Id of the landing note, served at `basePath`.                                                             |
| `locale`                 | runtime locale      | Locale for sorting the tree alphabetically, e.g. `es`.                                                    |
| `draftProperty`          | `draft`             | Frontmatter property that hides a note when `true`.                                                       |
| `wikilinks.linkClass`    | `wikilink`          | Class of resolved links.                                                                                  |
| `wikilinks.missingClass` | `wikilink-missing`  | Extra class of the `<span>` that replaces a missing link.                                                 |
| `callouts`               | `true`              | Turn `> [!type]` blockquotes into callouts.                                                               |
| `markdown`               | `auto`              | `auto` adds the plugin to your Sätteri processor. `manual` leaves `markdown.processor` alone (see below). |

Links honour Astro's `base` and `trailingSlash` options.

## Runtime API

`getVault()` from `astro-vault/runtime` loads the collection once per build and returns:

| Field                | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `notes`              | Published entries (drafts removed).                          |
| `home`               | The landing note, if it exists.                              |
| `tree`               | Folder tree: folders first, then notes by `order` and title. |
| `titles`             | `Map` of note id → title.                                    |
| `backlinks`          | `Map` of note id → ids of the notes that link to it.         |
| `readingOrder`       | Home first, then the tree order.                             |
| `href(id, heading?)` | URL of a note.                                               |
| `pathOf(entry)`      | Vault-relative path with the original folder and file names. |
| `foldersOf(entry)`   | Folder names above a note, for breadcrumbs.                  |
| `neighbours(id)`     | `{ previous, next }` ids in reading order.                   |
| `isHome(id)`         | Whether the id is the landing note.                          |
| `resolve(target)`    | Resolves a wikilink target to a note id.                     |

Pass your entry type to keep the frontmatter typed: `getVault<CollectionEntry<'notes'>>()`.

The pure helpers (slugs, wikilink parsing, resolution, backlinks, tree) are in `astro-vault/core`, which has no Astro dependency.

## Components

The components are unstyled. They expose `class` props, `data-*` attributes and slots, so you can style them with plain CSS or Tailwind.

| Component                                | Props                                                     | Hooks for styling                                                          |
| ---------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| `astro-vault/components/VaultTree.astro` | `vault`, `currentId`, `class`, `linkClass`, `folderClass` | `[data-vault-tree]`, `[data-depth]`, `[data-vault-folder]`, `aria-current` |
| `astro-vault/components/Backlinks.astro` | `vault`, `id`, `class`, `linkClass`                       | `[data-vault-backlinks]`; slots `title` and `empty`                        |
| `astro-vault/components/PrevNext.astro`  | `vault`, `id`, `class`, `linkClass`                       | `[data-vault-prev-next]`, `[data-direction]`; slots `previous` and `next`  |

## Styles

`import 'astro-vault/styles.css'` gives wikilinks, missing links and callouts a default look. Every rule uses `:where()`, so your own CSS always wins. To change the colours, set the variables:

```css
:root {
  --vault-accent: rebeccapurple;
  --vault-callout-tip: seagreen;
}
```

Or skip the file and target `.wikilink`, `.wikilink-missing`, `.callout`, `.callout-title` and `[data-callout]` yourself.

## Registering the Markdown plugin yourself

With the default `markdown: 'auto'`, the integration adds its plugin to your Sätteri processor, keeping your existing plugins and features. If you build the processor yourself and prefer to control the order, set `markdown: 'manual'` and add the plugin to your processor:

```js
import { satteri } from '@astrojs/markdown-satteri';
import { vaultMarkdown } from 'astro-vault/satteri';

export default defineConfig({
  integrations: [vault({ ...vaultConfig, markdown: 'manual' })],
  markdown: { processor: satteri({ mdastPlugins: [vaultMarkdown(vaultConfig)] }) }
});
```

The unified (remark/rehype) processor is not supported yet. With it, the integration warns and the wikilink syntax renders as plain text.

## Publishing workflow

Notes are plain Markdown in your repository, so they deploy like the rest of your site. A common setup is the [Obsidian Git](https://github.com/Vinzent03/obsidian-git) plugin pushing to the branch your host builds from.

Every non-draft file in the vault folder is public. Keep private notes in a different vault.

## Compatibility

| astro-vault | Astro | Node    |
| ----------- | ----- | ------- |
| 0.x         | ≥ 7.2 | ≥ 22.12 |

## Known limitations

- In `astro dev`, a new or renamed note resolves in the notes you edit afterwards. A note that has not changed keeps its cached rendering until you save it or restart the server.
- Drafts are detected from `draft: true` (a YAML boolean), the same rule as the schema.

## License

[MIT](./LICENSE) © Manuel Cerezo
