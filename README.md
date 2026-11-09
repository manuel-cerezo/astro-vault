<p align="center">
  <img src="./assets/banner.png" alt="astro-vault: publish your Obsidian vault with any Astro site" width="100%">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/astro-vault"><img alt="npm version" src="https://img.shields.io/npm/v/astro-vault?color=8b5cf6&label=npm"></a>
  <a href="https://github.com/manuel-cerezo/astro-vault/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/manuel-cerezo/astro-vault/ci.yml?branch=develop&label=CI"></a>
  <img alt="Astro 7" src="https://img.shields.io/badge/Astro-7-fb923c">
  <a href="./LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-34d399"></a>
</p>

<p align="center">
  <b>Write in Obsidian. Publish with Astro.</b><br>
  <a href="./packages/astro-vault/README.md">Documentation</a> · <a href="./examples/basic">Example site</a> · <a href="https://www.npmjs.com/package/astro-vault">npm</a>
</p>

# astro-vault

Publish an [Obsidian](https://obsidian.md) vault as part of any Astro site. You keep writing in Obsidian; `astro build` turns every note into a page.

<a href="https://github.com/manuel-cerezo/astro-vault/raw/develop/assets/astro-vault-promo.mp4"><img src="./assets/poster.png" alt="Watch the 25-second overview video" width="100%"></a>

- **Wikilinks** resolve the way Obsidian does: `[[Note]]`, `[[Folder/Note]]`, `[[Note#Heading]]`, `[[Note|label]]` and aliases.
- **Callouts, image embeds and backlinks**, with a folder tree, breadcrumbs and previous / next links.
- **Ready-made pages** with `pages: true`: a clean theme, dark mode, no-reload navigation and link previews.
- **Or your own design**: content collections and unstyled components, with no JavaScript at all.

![The built-in pages: a note with a link preview open](./assets/theme-light.png)

## Get started

```sh
npx astro add astro-vault
```

Add the collection, set `vault({ pages: true })` and write. The [quick start](./packages/astro-vault/README.md#quick-start) has the two snippets, and [`examples/pages`](./examples/pages) is the same setup ready to copy. For your own design, see [`examples/basic`](./examples/basic).

Everything is resolved at build time. The built-in pages ship about 2 KB of JavaScript (gzipped) plus Astro's `ClientRouter` for navigation and previews; set `navigation: false` and `previews: false` to ship none.

## Contributing

Requires Node 22.12+ and pnpm (`corepack enable`).

```sh
pnpm install
pnpm validate   # format, types, tests and the example sites: what CI runs
```

| Folder                 | Contents                                                                    |
| ---------------------- | --------------------------------------------------------------------------- |
| `packages/astro-vault` | The npm package: integration, loader, Markdown plugin, runtime, components. |
| `examples/pages`       | The zero-config setup with `pages: true`. CI builds it and checks its HTML. |
| `examples/basic`       | A site with its own layout and the components. CI checks its HTML too.      |
| `assets`               | Banner, screenshots and the overview video, made with Remotion.             |

Branches, commit messages and releases are described in [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
