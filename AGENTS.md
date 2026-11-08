# Repository instructions

- Work on `develop` (the default branch). Never push to `main` directly: a push to `main` publishes a release to npm. Releases are made with `pnpm release` when Manuel asks for one.
- Commit messages follow Conventional Commits, and they decide the next version (see «Branches and releases» in the README). Use `feat` and `fix` only for changes users of the package will notice. Use `docs`, `test`, `chore`, `ci` or `refactor` for everything else. Do not use `!` or `BREAKING CHANGE` before 1.0 unless Manuel asks for 1.0.
- Run `pnpm validate` before every commit that changes code or configuration.
- Keep `packages/astro-vault/README.md` in sync with the options, syntax and API. Add or update a test in `examples/basic/test` when a change affects the HTML output.
- Do not add Astro-site-specific code (layouts, design system, i18n) to the package. The package resolves and provides data; sites render it.
