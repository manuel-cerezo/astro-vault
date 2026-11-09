import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';

import { Lockup } from './Brand';
import { Editor } from './Editor';
import { moves, useCamera } from './kit/camera';
import { Subtitles, type SubtitleCue } from './kit/Subtitle';
import { C, F } from './theme';

/**
 * 27.5 s at 30 fps, silent with subtitles (launch-video-kit: on social it plays
 * muted, so text carries it and subtitles only say what is not on screen).
 *
 *   0–75     title
 *   75–225   typing a wikilink in the editor
 *   225–315  setup: one command, one option
 *   315–720  the built site, driven by a cursor: preview a wikilink, follow it, open a
 *            foldable callout, come back through a backlink, dark mode
 *   720–825  call to action
 */
export const PROMO_FRAMES = 825;
const DESIGN = { width: 1920, height: 1080 };

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const smooth = { ...clamp, easing: Easing.inOut(Easing.cubic) } as const;

const rise = (frame: number, at: number) => ({
  opacity: interpolate(frame, [at, at + 14], [0, 1], clamp),
  transform: `translateY(${interpolate(frame, [at, at + 14], [18, 0], clamp)}px)`
});

/* 1. Title */

const Title: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.paper, padding: '0 220px', justifyContent: 'center', fontFamily: F.serif }}>
      <div style={{ ...rise(f, 0), position: 'absolute', top: 90, left: 220 }}>
        <Lockup size={44} />
      </div>
      <div style={{ fontSize: 104, lineHeight: 1.1, letterSpacing: '-0.02em', color: C.ink }}>
        <div style={rise(f, 6)}>You write in Obsidian.</div>
        <div style={{ ...rise(f, 30), color: C.muted }}>Your notes become a website.</div>
      </div>
    </AbsoluteFill>
  );
};

/* 2. Editor */

const LINE = [
  { at: 12, text: 'Read more about ' },
  { at: 36, text: '[[' },
  { at: 42, text: 'Cal' }
];
const COMPLETED = 'Read more about [[Callouts]]';
const TAIL = ' next.';

const typedAt = (f: number) => {
  if (f >= 64) {
    const extra = Math.max(0, Math.min(TAIL.length, Math.floor((f - 68) / 1.6)));
    return COMPLETED + TAIL.slice(0, extra);
  }
  let out = '';
  for (const chunk of LINE) {
    if (f < chunk.at) break;
    const count = Math.min(chunk.text.length, Math.floor((f - chunk.at) / 1.5) + 1);
    out += chunk.text.slice(0, count);
  }
  return out;
};

const EditorScene: React.FC = () => {
  const f = useCurrentFrame();
  const cam = useCamera(
    moves([
      { at: 0, fx: 1120, fy: 560, s: 1.15 },
      { at: 34, fx: 1040, fy: 640, s: 1.5 },
      { at: 150, fx: 1040, fy: 640, s: 1.5 }
    ]),
    f,
    DESIGN
  );
  const typing = (f >= 12 && f < 50) || (f >= 66 && f < 80);
  const caret = typing || Math.floor(f / 15) % 2 === 0;
  const suggest = f < 37 ? 0 : f < 64 ? interpolate(f, [37, 43], [0, 1], clamp) : 0;
  return (
    <AbsoluteFill style={{ background: C.editorBg }}>
      <div style={{ ...DESIGN, transform: cam.transform, transformOrigin: '0 0' }}>
        <Editor typed={typedAt(f)} caret={caret} suggest={suggest} picked={f >= 56} />
      </div>
    </AbsoluteFill>
  );
};

/* 3. Setup */

const COMMAND = 'npx astro add astro-vault';

const Card: React.FC<{ title: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  title,
  children,
  style
}) => (
  <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: '#fff', overflow: 'hidden', ...style }}>
    <div style={{ padding: '14px 24px', borderBottom: `1px solid ${C.border}`, color: C.muted, fontSize: 24 }}>
      {title}
    </div>
    <div style={{ padding: '22px 24px', fontFamily: F.mono, fontSize: 34, lineHeight: 1.55, color: C.ink }}>
      {children}
    </div>
  </div>
);

const Setup: React.FC = () => {
  const f = useCurrentFrame();
  const typed = COMMAND.slice(0, Math.max(0, Math.floor((f - 10) / 1.1)));
  const done = f >= 42;
  const option = interpolate(f, [54, 64], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: C.paper, padding: '130px 220px', fontFamily: F.sans }}>
      <div style={{ ...rise(f, 0), fontFamily: F.serif, fontSize: 76, letterSpacing: '-0.02em', color: C.ink }}>
        One command. One option.
      </div>
      <Card title="Terminal" style={{ ...rise(f, 4), marginTop: 60 }}>
        <span style={{ color: C.faint }}>$</span> {typed}
        <div style={{ opacity: done ? 1 : 0, color: '#16804a', fontSize: 28 }}>
          ✓ Added astro-vault to astro.config.mjs
        </div>
      </Card>
      <Card title="astro.config.mjs" style={{ ...rise(f, 48), marginTop: 28 }}>
        integrations: [vault(
        <span
          style={{
            color: C.accent,
            background: `rgba(43,89,195,${0.1 * option})`,
            borderRadius: 6,
            padding: '0 6px'
          }}
        >
          {'{ pages: true }'}
        </span>
        )]
      </Card>
    </AbsoluteFill>
  );
};

/* 4. The site, with a cursor */

const Shot: React.FC<{ src: string; opacity: number }> = ({ src, opacity }) =>
  opacity <= 0 ? null : (
    <Img src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: 1920, height: 1080, opacity }} />
  );

/** 0→1→0 visibility of a layer: fades in over [a, b] and out over [c, d]. */
const span = (f: number, a: number, b: number, c = Infinity, d = Infinity) =>
  Math.min(interpolate(f, [a, b], [0, 1], clamp), d === Infinity ? 1 : interpolate(f, [c, d], [1, 0], clamp));

// Element centres measured on the real pages (CSS pixels at 1920x1080).
const LINK = { x: 950, y: 217 };
const FOLD = { x: 760, y: 676 };
const BACKLINK = { x: 661, y: 979 };

type Waypoint = { at: number; x: number; y: number };
const PATH: Waypoint[] = [
  { at: 30, x: 1500, y: 760 },
  { at: 80, x: LINK.x, y: LINK.y },
  // Rests on the link while its preview opens.
  { at: 135, x: LINK.x, y: LINK.y },
  { at: 157, x: LINK.x + 40, y: LINK.y + 160 },
  { at: 200, x: FOLD.x, y: FOLD.y },
  { at: 260, x: FOLD.x + 30, y: FOLD.y + 60 },
  { at: 307, x: BACKLINK.x, y: BACKLINK.y },
  { at: 345, x: BACKLINK.x + 20, y: BACKLINK.y - 40 }
];
const CLICKS = [135, 210, 317];

const cursorAt = (f: number) => {
  const i = PATH.findIndex((p) => p.at > f);
  if (i === -1) return PATH[PATH.length - 1]!;
  if (i === 0) return PATH[0]!;
  const a = PATH[i - 1]!;
  const b = PATH[i]!;
  return {
    at: f,
    x: interpolate(f, [a.at, b.at], [a.x, b.x], smooth),
    y: interpolate(f, [a.at, b.at], [a.y, b.y], smooth)
  };
};

const Cursor: React.FC<{ f: number; camScale: number }> = ({ f, camScale }) => {
  const { x, y } = cursorAt(f);
  const visible = span(f, 26, 34, 341, 351);
  const press = Math.max(...CLICKS.map((c) => interpolate(f, [c - 3, c, c + 5], [0, 1, 0], clamp)));
  const ripple = CLICKS.map((c) => interpolate(f, [c, c + 16], [0, 1], clamp) * (f >= c && f < c + 16 ? 1 : 0));
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: visible,
        transform: `scale(${1 / camScale})`,
        transformOrigin: '0 0',
        zIndex: 20
      }}
    >
      {ripple.map((r, i) =>
        r > 0 ? (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: -28 * r - 6,
              top: -28 * r - 6,
              width: 12 + 56 * r,
              height: 12 + 56 * r,
              borderRadius: '50%',
              border: `3px solid rgba(43,89,195,${0.6 * (1 - r)})`
            }}
          />
        ) : null
      )}
      <svg
        width="34"
        height="40"
        viewBox="0 0 17 20"
        style={{ transform: `scale(${1 - 0.12 * press})`, transformOrigin: '2px 2px', overflow: 'visible' }}
      >
        <path
          d="M1.5 1.5v14.2l3.6-3.5 2.4 5.6 2.5-1.1-2.4-5.5h5.1z"
          fill={C.ink}
          stroke="#fff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

const SiteScene: React.FC = () => {
  const f = useCurrentFrame();
  const cam = useCamera(
    moves([
      { at: 0, fx: 940, fy: 300, s: 1.6 },
      { at: 137, fx: 940, fy: 300, s: 1.6 },
      { at: 157, fx: 968, fy: 420, s: 1.45 },
      { at: 195, fx: 968, fy: 420, s: 1.45 },
      { at: 227, fx: 968, fy: 650, s: 1.45 },
      { at: 273, fx: 968, fy: 650, s: 1.45 },
      { at: 300, fx: 900, fy: 740, s: 1.45 },
      { at: 323, fx: 900, fy: 740, s: 1.45 },
      // The backlink opens a new page at its top: a quick move that reads as a cut.
      { at: 326, fx: 940, fy: 300, s: 1.6 },
      { at: 357, fx: 940, fy: 300, s: 1.6 },
      { at: 395, fx: 960, fy: 540, s: 1 }
    ]),
    f,
    DESIGN
  );
  const layers: [string, number][] = [
    // Following a link fades only between the two notes, like the built-in
    // view transitions; the sidebar is the same in both shots, so it stays put.
    ['site-wikilinks-light.png', f < 147 ? 1 : 0],
    ['site-wikilinks-hover.png', span(f, 74, 77, 90, 92)],
    ['site-wikilinks-preview.png', span(f, 90, 96, 139, 141)],
    ['site-callouts-light.png', span(f, 139, 147, 213, 216)],
    ['site-callouts-open.png', span(f, 213, 216, 322, 326)],
    ['site-wikilinks-light.png', span(f, 322, 326)],
    ['site-wikilinks-dark.png', span(f, 363, 377)]
  ];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <div style={{ ...DESIGN, position: 'relative', transform: cam.transform, transformOrigin: '0 0' }}>
        {layers.map(([src, opacity], i) => (
          <Shot key={i} src={src} opacity={opacity} />
        ))}
        <Cursor f={f} camScale={cam.s} />
      </div>
    </AbsoluteFill>
  );
};

/* 5. Call to action */

const CallToAction: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.paper, alignItems: 'center', justifyContent: 'center', fontFamily: F.sans }}>
      <div style={rise(f, 2)}>
        <Lockup size={110} />
      </div>
      <div
        style={{
          ...rise(f, 14),
          marginTop: 56,
          padding: '18px 36px',
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          background: '#fff',
          fontFamily: F.mono,
          fontSize: 44,
          color: C.ink
        }}
      >
        npx astro add astro-vault
      </div>
      <div style={{ ...rise(f, 24), marginTop: 36, fontSize: 36, color: C.muted }}>
        github.com/manuel-cerezo/astro-vault
      </div>
      <div style={{ ...rise(f, 32), marginTop: 18, fontSize: 28, color: C.faint }}>Open source · MIT · Astro 7</div>
      <div style={{ ...rise(f, 40), position: 'absolute', bottom: 48, fontSize: 22, color: C.faint }}>
        Video made with launch-video-kit by Borja Pérez (@borjaperfra)
      </div>
    </AbsoluteFill>
  );
};

/** Absolute frames. Only what is not already written on screen. */
const CUES: readonly SubtitleCue[] = [
  { at: 145, dur: 76, text: 'Link notes with [[wikilinks]], exactly as in Obsidian.' },
  { at: 322, dur: 70, text: 'Every note becomes a page.' },
  { at: 408, dur: 48, text: 'Hover a link to preview the note.' },
  { at: 462, dur: 52, text: 'Click, and it opens without reloading.' },
  { at: 535, dur: 68, text: 'Callouts fold open, no JavaScript needed.' },
  { at: 677, dur: 42, text: 'Light and dark, built in.' }
];

export const Promo: React.FC = () => {
  const frame = useCurrentFrame();
  const scenes: [number, number, React.ReactNode][] = [
    [0, 75, <Title />],
    [75, 225, <EditorScene />],
    [225, 315, <Setup />],
    [315, 720, <SiteScene />],
    [720, PROMO_FRAMES + 10, <CallToAction />]
  ];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {scenes.map(([from, to, node]) => (
        <Sequence key={from} from={from} durationInFrames={to - from}>
          <AbsoluteFill
            style={{
              opacity: interpolate(frame, [from, from + 8, to - 8, to], [from === 0 ? 1 : 0, 1, 1, 0], clamp)
            }}
          >
            {node}
          </AbsoluteFill>
        </Sequence>
      ))}
      <Subtitles cues={CUES} fontFamily={F.sans} />
    </AbsoluteFill>
  );
};
