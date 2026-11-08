declare module 'virtual:astro-vault/config' {
  import type { ResolvedVaultConfig } from './config.ts';

  const config: ResolvedVaultConfig & {
    base: string;
    trailingSlash: 'always' | 'never' | 'ignore';
  };
  export default config;
}

// Only what this package uses; the full types come from the user's project at build time.
declare module 'astro:content' {
  export function getCollection(collection: never): Promise<unknown[]>;
}
