import { defineCollection } from 'astro:content';
import { vaultLoader, vaultSchema } from 'astro-vault/loader';

import vaultConfig from './vault.config';

export const collections = {
  notes: defineCollection({ loader: vaultLoader(vaultConfig), schema: vaultSchema })
};
