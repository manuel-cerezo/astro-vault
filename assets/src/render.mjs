/**
 * Renders the images and the promo video from promo.html.
 *
 *   node assets/src/render.mjs                 # images and video
 *   node assets/src/render.mjs images          # images only
 *   node assets/src/render.mjs preview 4 8 12  # single video frames, for checking
 *
 * Needs `playwright` (with Chromium) and `ffmpeg-static`, resolved from the
 * current directory or NODE_PATH; they are not dependencies of the repository.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(join(process.cwd(), 'noop.js'));
const { chromium } = require('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..');
const source = pathToFileURL(join(here, 'promo.html')).href;
const [mode = 'all', ...times] = process.argv.slice(2);

const IMAGES = {
  banner: { width: 1280, height: 640 },
  how: { width: 1600, height: 900 },
  social: { width: 1200, height: 675 },
  logo: { width: 512, height: 512 }
};
const FPS = 30;
const DURATION = 25;

const browser = await chromium.launch();

async function open(view, size, scale = 2) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: scale });
  await page.goto(`${source}?view=${view}`);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

if (mode === 'all' || mode === 'images') {
  for (const [view, size] of Object.entries(IMAGES)) {
    const page = await open(view, size);
    await page.screenshot({ path: join(out, `${view}.png`) });
    await page.close();
    console.log(`${view}.png`);
  }
}

if (mode === 'preview') {
  const page = await open('video', { width: 1920, height: 1080 }, 1);
  for (const t of times) {
    await page.evaluate((s) => window.renderAt(s), Number(t));
    await page.screenshot({ path: join(out, `preview-${t}.png`) });
    console.log(`preview-${t}.png`);
  }
}

if (mode === 'all' || mode === 'video') {
  const page = await open('video', { width: 1920, height: 1080 }, 1);
  const frames = mkdtempSync(join(tmpdir(), 'astro-vault-frames-'));
  const total = FPS * DURATION;
  for (let i = 0; i < total; i++) {
    await page.evaluate((s) => window.renderAt(s), i / FPS);
    await page.screenshot({ path: join(frames, `${String(i).padStart(4, '0')}.png`) });
  }
  mkdirSync(out, { recursive: true });
  const ffmpeg = require('ffmpeg-static');
  // H.264 + yuv420p + faststart: plays on X, LinkedIn, GitHub and every browser.
  execFileSync(ffmpeg, [
    '-y',
    '-framerate',
    String(FPS),
    '-i',
    join(frames, '%04d.png'),
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    join(out, 'astro-vault-promo.mp4')
  ]);
  rmSync(frames, { recursive: true, force: true });
  console.log('astro-vault-promo.mp4');
}

await browser.close();
