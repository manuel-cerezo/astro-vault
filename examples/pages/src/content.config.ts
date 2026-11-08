import { defineCollection } from 'astro:content';
import { vaultLoader, vaultSchema } from 'astro-vault/loader';

export const collections = {
  notes: defineCollection({ loader: vaultLoader(), schema: vaultSchema })
};
