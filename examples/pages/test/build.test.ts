/**
 * Checks the built zero-config example (`astro build` first): `pages: true`
 * publishes every note with the built-in layout, no pages of its own.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const page = (path: string) => readFileSync(new URL(`../dist/${path}`, import.meta.url), 'utf8');

test('the built-in route publishes the landing note and every other note', () => {
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

test('pages have a full document: charset, language and titles', () => {
  const html = page('notes/guides/wikilinks/index.html');
  assert.match(html, /<html lang="en"/);
  assert.match(html, /<meta charset="utf-8">/);
  assert.match(html, /<title>Wikilinks · Digital garden<\/title>/);
  assert.match(page('notes/index.html'), /<title>Digital garden<\/title>/);
});

test('the layout has the tree, breadcrumbs, table of contents, backlinks and previous / next', () => {
  const html = page('notes/guides/callouts/index.html');
  assert.match(html, /<a class="vault-brand" href="\/notes">Digital garden<\/a>/);
  assert.match(html, /<a href="\/notes\/guides\/callouts" aria-current="page">Callouts<\/a>/);
  assert.match(html, /<p class="vault-breadcrumbs">\s*<span>Guides<\/span>/);
  assert.match(html, /<nav data-vault-toc.*<a href="#foldable-callouts">Foldable callouts<\/a>/s);
  assert.match(
    html,
    /<section data-vault-backlinks>.*Linked from.*<a href="\/notes\/guides\/wikilinks">Wikilinks<\/a>/s
  );
  assert.match(html, /<a href="\/notes\/guides\/wikilinks" rel="prev"/);
});

test('the Markdown plugin still runs on the built-in pages', () => {
  const html = page('notes/guides/wikilinks/index.html');
  assert.match(html, /<a href="\/notes\/guides\/callouts" class="wikilink">Callouts<\/a>/);
  assert.match(page('notes/index.html'), /class="wikilink wikilink-missing" title="Someday"/);
});
