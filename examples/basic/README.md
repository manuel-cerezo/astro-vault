# astro-vault: basic example

A minimal Astro site that publishes `src/content/notes` with `astro-vault`. The notes show every supported syntax.

```sh
pnpm install
pnpm --filter example-basic dev
```

To start a new site from it:

```sh
npm create astro@latest -- --template manuel-cerezo/astro-vault/examples/basic
```

Then replace `"astro-vault": "workspace:*"` in `package.json` with the latest version from npm.
