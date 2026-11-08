# astro-vault

Publish an Obsidian vault as part of any Astro site: wikilinks, image embeds, callouts, backlinks and a folder tree on top of content collections.

**Documentation:** [packages/astro-vault/README.md](./packages/astro-vault/README.md)

## Repository

| Folder                 | Contents                                                                      |
| ---------------------- | ----------------------------------------------------------------------------- |
| `packages/astro-vault` | The npm package: integration, loader, Markdown plugin, runtime, components.   |
| `examples/basic`       | A minimal Astro site that uses the package. CI builds it and checks its HTML. |

## Development

Requires Node 22.12+ and pnpm (`corepack enable`).

```sh
pnpm install
pnpm test          # unit tests of the package
pnpm test:example  # build the package and the example, then check the example's HTML
pnpm validate      # format, types, tests and example: what CI runs
pnpm --filter example-basic dev
```

## Releasing

Versions and the changelog are managed with [Changesets](https://github.com/changesets/changesets): run `pnpm changeset` in each pull request that changes the package.

## License

[MIT](./LICENSE)
