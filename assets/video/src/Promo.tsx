import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';

import { Lockup } from './Brand';
import { Editor } from './Editor';
import { moves, useCamera } from './kit/camera';
import { C, F } from './theme';

/**
 * ~35.6 s at 30 fps, with original music. On social it often plays muted, so the explanation is
 * written beside the product instead of subtitled under it: a column on the
 * left says what is happening, and the product plays in a window on the right.
 * Each part runs slower than it was first timed (see SPEED) so every step can be
 * read before the next one starts.
 *
 *   0–90       title
 *   90–947     the demo: write (editor), install (setup), publish (the built site)
 *   947–1067   call to action
 */
const TITLE = 90;
const DEMO = 857;
const OUTRO = 120;
export const PROMO_FRAMES = TITLE + DEMO + OUTRO;
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

const EditorScene: React.FC<{ speed: number }> = ({ speed }) => {
  const f = useCurrentFrame() / speed;
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

const Setup: React.FC<{ speed: number }> = ({ speed }) => {
  const f = useCurrentFrame() / speed;
  const typed = COMMAND.slice(0, Math.max(0, Math.floor((f - 10) / 1.1)));
  const done = f >= 42;
  const option = interpolate(f, [54, 64], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', fontFamily: F.sans }}>
      <Card title="Terminal" style={rise(f, 0)}>
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
            background: `rgba(43,89,195,${0.12 * option})`,
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
        transform: `scale(${1.35 / camScale})`,
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

const SiteScene: React.FC<{ speed: number }> = ({ speed }) => {
  const f = useCurrentFrame() / speed;
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
    </AbsoluteFill>
  );
};

/* 6. The demo: what is happening on the left, the product on the right */

// Each part plays slower than it was timed, so every step can be read.
const SPEED = { editor: 1.25, setup: 1.15, site: 1.35 };
// Where each part starts, in demo frames.
const PART = { editor: 0, setup: 190, site: 310 };

const WIN = { x: 580, w: 1240, bar: 44 };
const WIN_SCALE = WIN.w / DESIGN.width;
const WIN_H = Math.round(DESIGN.height * WIN_SCALE);
const WIN_Y = Math.round((DESIGN.height - WIN_H - WIN.bar) / 2);

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontFamily: F.mono, fontSize: '0.8em', color: C.accent, letterSpacing: 0 }}>{children}</span>
);

type Beat = { at: number; title: React.ReactNode; body: string };
/** Demo frames. Each line comes in just before the thing it explains happens. */
const BEATS: Beat[] = [
  {
    at: 0,
    title: (
      <>
        Link notes with <Code>[[wikilinks]]</Code>
      </>
    ),
    body: 'Exactly as you already do in Obsidian.'
  },
  { at: PART.setup, title: 'One command. One option.', body: 'Turn on the built-in pages and the site is ready.' },
  { at: PART.site, title: 'Every note becomes a page.', body: 'Your folders turn into the sidebar.' },
  { at: 400, title: 'Hover a link to preview it.', body: 'A card shows the start of the linked note.' },
  { at: 480, title: 'Click, and it opens instantly.', body: 'No full reload. The sidebar stays where it was.' },
  { at: 570, title: 'Callouts fold open.', body: 'Foldable callouts from Obsidian work as they are.' },
  { at: 705, title: 'Backlinks lead back.', body: 'Every note lists the notes that link to it.' },
  { at: 785, title: 'Light and dark, built in.', body: 'Both themes ship with the pages.' }
];

const STEPS = [
  { label: 'Write', from: PART.editor, to: PART.setup },
  { label: 'Install', from: PART.setup, to: PART.site },
  { label: 'Publish', from: PART.site, to: Infinity }
];

const Narrative: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: 'absolute', left: 120, top: WIN_Y, width: 400, height: WIN_H + WIN.bar }}>
    <div style={{ display: 'flex', gap: 22, fontFamily: F.mono, fontSize: 20, whiteSpace: 'nowrap' }}>
      {STEPS.map((s, i) => {
        const on = span(f, s.from - 1, s.from + 10, s.to, s.to + 10);
        return (
          <div key={s.label} style={{ color: C.ink, opacity: 0.28 + 0.72 * on }}>
            <span style={{ color: C.faint }}>0{i + 1}</span> {s.label}
            <div
              style={{
                height: 2,
                marginTop: 10,
                background: C.ink,
                transform: `scaleX(${on})`,
                transformOrigin: '0 0'
              }}
            />
          </div>
        );
      })}
    </div>
    {BEATS.map((b, i) => {
      const end = BEATS[i + 1]?.at ?? DEMO + 20;
      const enter = i === 0 ? 1 : interpolate(f, [b.at, b.at + 16], [0, 1], smooth);
      const exit = interpolate(f, [end - 10, end], [0, 1], smooth);
      if (f < b.at || f >= end) return null;
      return (
        <div
          key={b.at}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 200,
            opacity: enter * (1 - exit),
            transform: `translateY(${(1 - enter) * 22 - exit * 12}px)`
          }}
        >
          <div style={{ fontFamily: F.serif, fontSize: 58, lineHeight: 1.12, letterSpacing: '-0.02em', color: C.ink }}>
            {b.title}
          </div>
          <div style={{ marginTop: 24, fontFamily: F.sans, fontSize: 29, lineHeight: 1.45, color: C.muted }}>
            {b.body}
          </div>
        </div>
      );
    })}
  </div>
);

const Window: React.FC<{ label: string; dark?: boolean; opacity: number; children: React.ReactNode }> = ({
  label,
  dark,
  opacity,
  children
}) =>
  opacity <= 0 ? null : (
    <div
      style={{
        position: 'absolute',
        left: WIN.x,
        top: WIN_Y,
        width: WIN.w,
        opacity,
        borderRadius: 14,
        overflow: 'hidden',
        border: `1px solid ${dark ? '#3a3a3a' : C.border}`,
        background: dark ? C.editorBg : C.paper,
        boxShadow: '0 30px 80px rgba(36,35,31,0.16), 0 4px 14px rgba(36,35,31,0.08)'
      }}
    >
      <div
        style={{
          height: WIN.bar,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 18px',
          background: dark ? '#2a2a2a' : C.surface,
          borderBottom: `1px solid ${dark ? '#3a3a3a' : C.border}`
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 6, background: dark ? '#4a4a4a' : '#d9d5cc' }} />
        ))}
        <div
          style={{
            flex: 1,
            marginRight: 52,
            textAlign: 'center',
            fontFamily: F.sans,
            fontSize: 18,
            color: dark ? C.editorMuted : C.muted
          }}
        >
          {label}
        </div>
      </div>
      <div style={{ position: 'relative', width: WIN.w, height: WIN_H, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            ...DESIGN,
            transform: `scale(${WIN_SCALE})`,
            transformOrigin: '0 0'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );

const Demo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Narrative f={f} />
      <Window label="Ideas / Digital garden.md" dark opacity={span(f, -1, 0, PART.setup - 8, PART.setup + 4)}>
        <Sequence durationInFrames={PART.setup + 4} layout="none">
          <EditorScene speed={SPEED.editor} />
        </Sequence>
      </Window>
      <Sequence from={PART.setup - 4} durationInFrames={PART.site - PART.setup + 8} layout="none">
        <div
          style={{
            position: 'absolute',
            left: WIN.x,
            top: 0,
            width: WIN.w,
            height: DESIGN.height,
            opacity: span(f, PART.setup - 4, PART.setup + 8, PART.site - 4, PART.site + 4)
          }}
        >
          <Setup speed={SPEED.setup} />
        </div>
      </Sequence>
      <Window label="localhost:4321/notes" opacity={span(f, PART.site - 4, PART.site + 10)}>
        <Sequence from={PART.site} layout="none">
          <SiteScene speed={SPEED.site} />
        </Sequence>
      </Window>
    </AbsoluteFill>
  );
};

export const Promo: React.FC = () => {
  const frame = useCurrentFrame();
  const scenes: [number, number, React.ReactNode][] = [
    [0, TITLE, <Title />],
    [TITLE, TITLE + DEMO, <Demo />],
    [TITLE + DEMO, PROMO_FRAMES + 10, <CallToAction />]
  ];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {/* Original music, synthesised by music/compose.py and timed to this cut. */}
      <Audio src={staticFile('music.mp3')} volume={0.6} />
      {scenes.map(([from, to, node]) => (
        <Sequence key={from} from={from} durationInFrames={to - from}>
          <AbsoluteFill
            style={{
              opacity: interpolate(frame, [from, from + 10, to - 10, to], [from === 0 ? 1 : 0, 1, 1, 0], clamp)
            }}
          >
            {node}
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
