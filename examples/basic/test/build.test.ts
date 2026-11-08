/**
 * Checks the built example (`astro build` first). It exercises the real
 * pipeline: integration, Sätteri plugin, loader, runtime and components.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const page = (path: string) => readFileSync(new URL(`../dist/${path}`, import.meta.url), 'utf8');

test('every published note gets a page and drafts do not', () => {
  for (const path of [
    'notes/index.html',
    'notes/guides/wikilinks/index.html',
    'notes/guides/callouts/index.html',
    'notes/ideas/digital-garden/index.html'
  ]) {
    assert.ok(existsSync(new URL(`../dist/${path}`, import.meta.url)), path);
  }
  assert.ok(!existsSync(new URL('../dist/notes/ideas/draft/index.html', import.meta.url)));
});

test('wikilinks resolve by name, path, heading and alias', () => {
  const html = page('notes/guides/wikilinks/index.html');
  assert.match(html, /<a href="\/notes\/guides\/callouts" class="wikilink">Callouts<\/a>/);
  assert.match(html, /<a href="\/notes\/guides\/callouts" class="wikilink">Guides\/Callouts<\/a>/);
  assert.match(
    html,
    /<a href="\/notes\/guides\/callouts#foldable-callouts" class="wikilink">Callouts › Foldable callouts<\/a>/
  );
  assert.match(html, /<a href="\/notes\/ideas\/digital-garden" class="wikilink">Garden<\/a>/);
});

test('missing and draft notes render as muted text', () => {
  assert.match(page('notes/index.html'), /<span class="wikilink wikilink-missing" title="Someday">Someday<\/span>/);
  assert.match(page('notes/ideas/digital-garden/index.html'), /class="wikilink wikilink-missing" title="Draft"/);
});

test('code keeps its brackets', () => {
  const html = page('notes/guides/wikilinks/index.html');
  assert.match(html, /<code>\[\[Not a link\]\]<\/code>/);
  assert.match(html, /\[\[Also not a link\]\]/);
});

test('embedded images go through Astro image optimization', () => {
  assert.match(page('notes/guides/wikilinks/index.html'), /<img[^>]+src="\/_astro\/diagram\.[^"]+\.svg"/);
});

test('callouts get a type, a title and the fold marker', () => {
  const html = page('notes/guides/callouts/index.html');
  assert.match(html, /<blockquote class="callout" data-callout="note">\s*<p class="callout-title">Note<\/p>/);
  assert.match(html, /<blockquote class="callout" data-callout="tip">\s*<p class="callout-title">Custom title<\/p>/);
  assert.match(html, /<blockquote class="callout" data-callout="danger" data-callout-fold="-">/);
});

test('backlinks, the tree and previous / next come from the runtime', () => {
  const html = page('notes/guides/callouts/index.html');
  assert.match(
    html,
    /<section data-vault-backlinks>.*<a href="\/notes\/guides\/wikilinks">Wikilinks<\/a>.*<\/section>/s
  );
  assert.match(html, /<a href="\/notes\/guides\/callouts" aria-current="page">Callouts<\/a>/);
  assert.match(html, /<a href="\/notes\/guides\/wikilinks" rel="prev"/);
  assert.match(html, /<a href="\/notes\/guides\/mdx" rel="next"/);
});

test('MDX notes inherit the Markdown plugin', () => {
  const html = page('notes/guides/mdx/index.html');
  assert.match(html, /<a href="\/notes\/guides\/wikilinks" class="wikilink">Wikilinks<\/a>/);
  assert.match(html, /<blockquote class="callout" data-callout="info">/);
});
