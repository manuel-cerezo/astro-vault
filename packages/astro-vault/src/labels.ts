/** Interface text used by the components and the built-in pages. */
export interface VaultLabels {
  /** Link to the landing note at the top of the tree. */
  home: string;
  /** Mobile button that opens the tree. */
  browse: string;
  /** Heading of the table of contents. */
  onThisPage: string;
  /** Heading of the backlinks section. */
  backlinks: string;
  /** Shown when no note links to the current one. */
  noBacklinks: string;
  previous: string;
  next: string;
  /** Before the last-updated date. */
  updated: string;
  /** Heading of the generated landing page when the vault has no index note. */
  allNotes: string;
}

const en: VaultLabels = {
  home: 'Start here',
  browse: 'Browse notes',
  onThisPage: 'On this page',
  backlinks: 'Linked from',
  noBacklinks: 'No other note links here yet.',
  previous: 'Previous',
  next: 'Next',
  updated: 'Updated',
  allNotes: 'All notes'
};

const es: VaultLabels = {
  home: 'Empieza aquí',
  browse: 'Explorar notas',
  onThisPage: 'En esta página',
  backlinks: 'Enlazan aquí',
  noBacklinks: 'Todavía ninguna otra nota enlaza aquí.',
  previous: 'Anterior',
  next: 'Siguiente',
  updated: 'Actualizada',
  allNotes: 'Todas las notas'
};

export const BUILT_IN_LABELS: Record<string, VaultLabels> = { en, es };

/** Built-in labels for a language (`es`, `es-ES`…), English otherwise, with overrides applied. */
export function resolveLabels(lang: string, overrides: Partial<VaultLabels> = {}): VaultLabels {
  const base = BUILT_IN_LABELS[lang] ?? BUILT_IN_LABELS[lang.split('-')[0] ?? ''] ?? en;
  return { ...base, ...overrides };
}
