# Contributing

Requires Node 22.12+ and pnpm (`corepack enable`).

```sh
pnpm install
pnpm test          # unit tests of the package
pnpm test:example  # build the package and the examples, then check their HTML
pnpm validate      # format, types, tests and examples: what CI runs
pnpm --filter example-basic dev
```

## Branches and releases

- **`develop`** is the default branch. Day-to-day commits and pull requests go there, and CI checks every push.
- **`main`** is the release branch. Every push to `main` runs the [release workflow](./.github/workflows/release.yml). It validates the repository, works out the next version from the commit messages since the last release, publishes it to npm with provenance, and creates the `vX.Y.Z` tag and the GitHub release with its notes.

To release what is on `develop`:

```sh
pnpm release   # fast-forwards main to origin/develop
```

It only moves `main` forward, so it stops if `main` has commits that `develop` does not.

The version comes from [Conventional Commits](https://www.conventionalcommits.org):

| Commit                                       | Release                   |
| -------------------------------------------- | ------------------------- |
| `fix: …`, `perf: …`                          | patch (`0.1.0` → `0.1.1`) |
| `feat: …`                                    | minor (`0.1.0` → `0.2.0`) |
| `feat!: …` or a `BREAKING CHANGE:` footer    | major (`0.x` → `1.0.0`)   |
| `docs`, `test`, `chore`, `ci`, `refactor`, … | no release                |

While the package is `0.x`, ship breaking changes as `feat` and explain them in the commit body: a `!` releases `1.0.0`.

The `version` in `packages/astro-vault/package.json` is a placeholder. The real version lives in the git tags and on npm.

**npm access.** Until trusted publishing is set up, the workflow publishes with the `NPM_TOKEN` repository secret, an npm granular access token with read and write access to packages. Once the package exists on npm, configure [trusted publishing](https://docs.npmjs.com/trusted-publishers) for this repository and the `release.yml` workflow, then delete the secret.
