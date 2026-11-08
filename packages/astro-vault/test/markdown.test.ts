import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createNoteHref } from '../src/core/urls.ts';
import { calloutParts, wikilinkNodes } from '../src/markdown/transform.ts';
import { createVaultIndex, readFrontmatter, scanVault } from '../src/vault-index.ts';

function fixtureVault() {
  const dir = mkdtempSync(join(tmpdir(), 'astro-vault-'));
  mkdirSync(join(dir, 'Ideas'));
  mkdirSync(join(dir, 'attachments'));
  mkdirSync(join(dir, '.obsidian'));
  writeFileSync(join(dir, 'Ideas', 'Jardín digital.md'), '---\naliases: Garden\n---\n# Jardín');
  writeFileSync(join(dir, 'Borrador.md'), '---\ntitle: B\ndraft: true\n---\nHola');
  writeFileSync(join(dir, 'Not a draft.md'), '---\ndraft: "true"\n---\nStill published, like the zod schema decides');
  writeFileSync(join(dir, 'attachments', 'foto.png'), '');
  writeFileSync(join(dir, '.obsidian', 'workspace.json'), '{}');
  return dir;
}

const classes = { linkClass: 'wikilink', missingClass: 'wikilink-missing' };
const href = createNoteHref({ basePath: '/notes', homeNote: 'index' });

test('the vault scan skips drafts and dot folders and reads aliases', () => {
  const dir = fixtureVault();
  const scan = scanVault(dir);
  assert.deepEqual(scan.notes.map((note) => note.path).sort(), ['Ideas/Jardín digital.md', 'Not a draft.md']);
  assert.deepEqual(scan.attachments, ['attachments/foto.png']);
  assert.equal(scan.resolveNote('Garden'), 'ideas/jardin-digital');
});

test('the plugin output links notes, embeds attachments and mutes drafts', () => {
  const dir = fixtureVault();
  const nodes = wikilinkNodes('Mira [[Jardín digital|el jardín]], [[Borrador]] y ![[foto.png]]', {
    vault: scanVault(dir),
    fileDir: join(dir, 'Ideas'),
    vaultDir: dir,
    href,
    classes
  });
  assert.deepEqual(
    nodes.map((node) => node.type),
    ['text', 'link', 'text', 'html', 'text', 'image']
  );
  assert.equal(nodes[1]?.url, '/notes/ideas/jardin-digital');
  assert.equal(nodes[3]?.value, '<span class="wikilink wikilink-missing" title="Borrador">Borrador</span>');
  assert.equal(nodes[5]?.url, '../attachments/foto.png');
});

test('the cached index rescans only after invalidate()', () => {
  const dir = fixtureVault();
  const index = createVaultIndex(dir);
  assert.equal(index.get().resolveNote('Nueva'), undefined);
  writeFileSync(join(dir, 'Nueva.md'), '# Nueva');
  assert.equal(index.get().resolveNote('Nueva'), undefined);
  index.invalidate();
  assert.equal(index.get().resolveNote('Nueva'), 'nueva');
});

test('callout markers read type, fold and title', () => {
  assert.deepEqual(calloutParts('[!TIP] Pro tip\nBody'), {
    type: 'tip',
    title: 'Pro tip',
    fold: undefined,
    rest: 'Body'
  });
  assert.deepEqual(calloutParts('[!warning]-'), { type: 'warning', title: 'Warning', fold: '-', rest: '' });
  assert.equal(calloutParts('Just a quote'), undefined);
});

test('invalid frontmatter is ignored instead of failing the build', () => {
  assert.deepEqual(readFrontmatter('---\ntitle: a: b: [\n---\n'), {});
  assert.deepEqual(readFrontmatter('No frontmatter'), {});
});
