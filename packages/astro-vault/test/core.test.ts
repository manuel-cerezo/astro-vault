import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildBacklinks,
  buildNoteTree,
  createNoteHref,
  createNoteResolver,
  findAmbiguousNames,
  findDuplicateIds,
  flattenNoteTree,
  headingSlug,
  noteIdFromPath,
  noteTitle,
  parseWikilinks,
  readingOrder,
  stripCode
} from '../src/core/index.ts';
import { resolveVaultConfig } from '../src/config.ts';

test('note ids slug every folder and file name like a URL', () => {
  assert.equal(noteIdFromPath('Ideas/Jardín digital.md'), 'ideas/jardin-digital');
  assert.equal(noteIdFromPath('Desarrollo\\Tailwind 4.mdx'), 'desarrollo/tailwind-4');
  assert.equal(noteIdFromPath('index.md'), 'index');
});

test('hrefs put the home note at the base path and keep heading accents', () => {
  const href = createNoteHref({ basePath: '/notes', homeNote: 'index' });
  assert.equal(href('index'), '/notes');
  assert.equal(href('ideas/jardin-digital', 'Cómo lo aplico'), '/notes/ideas/jardin-digital#cómo-lo-aplico');
  assert.equal(headingSlug('Tokens con `@theme`!'), 'tokens-con-theme');
});

test("hrefs honour Astro's base and trailingSlash", () => {
  const href = createNoteHref({ basePath: '/notes', homeNote: 'index', base: '/docs/', trailingSlash: 'always' });
  assert.equal(href('index'), '/docs/notes/');
  assert.equal(href('a/b', 'Intro'), '/docs/notes/a/b/#intro');
  const atRoot = createNoteHref({ basePath: '/', homeNote: 'index' });
  assert.equal(atRoot('index'), '/');
  assert.equal(atRoot('ideas'), '/ideas');
});

test('wikilinks parse targets, headings, aliases and embeds', () => {
  const [link, embed] = parseWikilinks('Ver [[Astro#Islas|las islas]] y ![[foto.png]].');
  assert.deepEqual(
    { target: link?.target, heading: link?.heading, alias: link?.alias, embed: link?.embed },
    { target: 'Astro', heading: 'Islas', alias: 'las islas', embed: false }
  );
  assert.equal(embed?.embed, true);
  assert.equal(embed?.target, 'foto.png');
});

test('stripCode removes fenced blocks of any length and inline code', () => {
  const markdown = [
    'Keep [[A]]',
    '````md',
    '```',
    '[[B]]',
    '```',
    '````',
    '~~~',
    '[[C]]',
    '~~~',
    'Inline `[[D]]` and ``[[E]] ` x`` but [[F]]'
  ].join('\n');
  assert.deepEqual(
    parseWikilinks(stripCode(markdown)).map((link) => link.target),
    ['A', 'F']
  );
});

const vault = [
  { id: 'index', path: 'index.md', title: 'Notas', body: '[[Astro]] [[Jardín digital]]' },
  { id: 'desarrollo/astro', path: 'Desarrollo/Astro.md', title: 'Astro', order: 1, body: '[[Tailwind 4]]' },
  { id: 'desarrollo/tailwind-4', path: 'Desarrollo/Tailwind 4.md', title: 'Tailwind 4', order: 2, body: '[[Astro]]' },
  {
    id: 'ideas/jardin-digital',
    path: 'Ideas/Jardín digital.md',
    title: 'Jardín digital',
    aliases: ['Digital garden'],
    body: '[[Astro]] `[[Tailwind 4]]` [[Jardín digital]]'
  }
];

test('wikilinks resolve by file name, slug, path or alias, like Obsidian', () => {
  const resolve = createNoteResolver(vault);
  assert.equal(resolve('Tailwind 4'), 'desarrollo/tailwind-4');
  assert.equal(resolve('jardin-digital'), 'ideas/jardin-digital');
  assert.equal(resolve('Desarrollo/Astro'), 'desarrollo/astro');
  assert.equal(resolve('Digital garden'), 'ideas/jardin-digital');
  assert.equal(resolve('Nota pendiente'), undefined);
});

test('an ambiguous name resolves to the note closest to the vault root', () => {
  const resolve = createNoteResolver([
    { id: 'b/deep/readme', path: 'B/Deep/README.md' },
    { id: 'a/readme', path: 'A/README.md' },
    { id: 'z/readme', path: 'Z/README.md' }
  ]);
  assert.equal(resolve('README'), 'a/readme');
});

test('aliases never shadow a real file name', () => {
  const resolve = createNoteResolver([
    { id: 'astro', path: 'Astro.md' },
    { id: 'other', path: 'Other.md', aliases: ['Astro'] }
  ]);
  assert.equal(resolve('Astro'), 'astro');
});

test('names shared by several notes are reported, closest to the root first', () => {
  assert.deepEqual(
    findAmbiguousNames([
      { id: 'b/deep/readme', path: 'B/Deep/README.md' },
      { id: 'a/readme', path: 'A/README.md' },
      { id: 'astro', path: 'Astro.md' }
    ]),
    [{ name: 'README', paths: ['A/README.md', 'B/Deep/README.md'] }]
  );
});

test('notes that would share a URL are reported', () => {
  assert.deepEqual(
    findDuplicateIds([
      { id: 'ideas/a', path: 'Ideas/A.md' },
      { id: 'ideas/a', path: 'ideas/a.mdx' },
      { id: 'b', path: 'B.md' }
    ]),
    [['Ideas/A.md', 'ideas/a.mdx']]
  );
});

test('backlinks skip self links and links inside code', () => {
  const backlinks = buildBacklinks(vault);
  assert.deepEqual(backlinks.get('desarrollo/astro'), ['index', 'desarrollo/tailwind-4', 'ideas/jardin-digital']);
  assert.deepEqual(backlinks.get('desarrollo/tailwind-4'), ['desarrollo/astro']);
  assert.deepEqual(backlinks.get('ideas/jardin-digital'), ['index']);
});

test('the tree puts folders first, follows order then title, and leaves out the home note', () => {
  const tree = buildNoteTree([...vault, { id: 'suelta', path: 'Suelta.md', title: 'Suelta' }], {
    homeNote: 'index',
    locale: 'es'
  });
  assert.deepEqual(
    tree.map((node) => node.title),
    ['Desarrollo', 'Ideas', 'Suelta']
  );
  assert.deepEqual(
    flattenNoteTree(tree).map((leaf) => leaf.id),
    ['desarrollo/astro', 'desarrollo/tailwind-4', 'ideas/jardin-digital', 'suelta']
  );
  assert.deepEqual(readingOrder(tree, 'index').slice(0, 2), ['index', 'desarrollo/astro']);
});

test('a note without a title property is named after its file', () => {
  assert.equal(noteTitle('Ideas/Jardín digital.md'), 'Jardín digital');
  assert.equal(noteTitle('Ideas/Jardín digital.md', 'Mi jardín'), 'Mi jardín');
});

test('labels come in English and Spanish and take overrides', () => {
  assert.equal(resolveVaultConfig().labels.backlinks, 'Linked from');
  assert.equal(resolveVaultConfig({ lang: 'es-ES' }).labels.backlinks, 'Enlazan aquí');
  assert.equal(resolveVaultConfig({ lang: 'fr' }).labels.next, 'Next');
  assert.equal(resolveVaultConfig({ lang: 'es', labels: { next: 'Sigue' } }).labels.next, 'Sigue');
  assert.equal(resolveVaultConfig().pages, false);
  assert.equal(resolveVaultConfig().navigation, true);
  assert.equal(resolveVaultConfig({ previews: false }).previews, false);
});

test('the config fills defaults and rejects a relative base path', () => {
  const config = resolveVaultConfig({ dir: './vault/', basePath: '/garden/' });
  assert.equal(config.dir, 'vault');
  assert.equal(config.basePath, '/garden');
  assert.equal(config.collection, 'notes');
  assert.throws(() => resolveVaultConfig({ basePath: 'notes' }), /must start with/);
});
