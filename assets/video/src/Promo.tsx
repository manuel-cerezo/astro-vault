import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';

import { Lockup } from './Brand';
import { charX, Editor, typedLineY } from './Editor';
import { moves, useCamera } from './kit/camera';
import { C, F } from './theme';
import TYPING from './typing.json';

/**
 * 25 s at 30 fps, with a soundtrack from music/compose.py. No captions: the
 * product tells the story, full screen.
 *
 *   0–55      title
 *   55–165    a wikilink typed in the editor; the note zooms out
 *   135–165   the note dissolves into characters and becomes its published page
 *   135–630   the site, driven by a cursor: preview, follow, fold, backlink, dark
 *   630–750   call to action: the command, copy, star
 *
 * music/compose.py uses the same frames: the beat drops in the middle of the
 * dissolve (frame 150) and the last chord lands on the call to action.
 */
export const TIMELINE = { editor: 55, dissolve: 135, cta: 630, end: 750 };
export const PROMO_FRAMES = TIMELINE.end;
const DISSOLVE = 30;
/** Site frames shown full size under the dissolve before the camera moves in. */
export const SITE_INTRO = 50;
/** The site part was timed at 30 fps; it plays a little slower to fill its slot. */
export const SITE_SPEED = (TIMELINE.cta - TIMELINE.dissolve) / (SITE_INTRO + 405);

const DESIGN = { width: 1920, height: 1080 };
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const smooth = { ...clamp, easing: Easing.inOut(Easing.cubic) } as const;

const rise = (frame: number, at: number) => ({
  opacity: interpolate(frame, [at, at + 12], [0, 1], clamp),
  transform: `translateY(${interpolate(frame, [at, at + 12], [18, 0], clamp)}px)`
});

/** 0→1→0 visibility of a layer: fades in over [a, b] and out over [c, d]. */
const span = (f: number, a: number, b: number, c = Infinity, d = Infinity) =>
  Math.min(interpolate(f, [a, b], [0, 1], clamp), d === Infinity ? 1 : interpolate(f, [c, d], [1, 0], clamp));

/* Cursor */

type Waypoint = { at: number; x: number; y: number };

const pathAt = (path: Waypoint[], f: number) => {
  const i = path.findIndex((p) => p.at > f);
  if (i === -1) return path[path.length - 1]!;
  if (i === 0) return path[0]!;
  const a = path[i - 1]!;
  const b = path[i]!;
  return {
    at: f,
    x: interpolate(f, [a.at, b.at], [a.x, b.x], smooth),
    y: interpolate(f, [a.at, b.at], [a.y, b.y], smooth)
  };
};

const Cursor: React.FC<{
  f: number;
  path: Waypoint[];
  clicks: number[];
  show: [number, number, number?, number?];
  scale?: number;
}> = ({ f, path, clicks, show, scale = 1 }) => {
  const { x, y } = pathAt(path, f);
  const visible = span(f, ...show);
  const press = Math.max(0, ...clicks.map((c) => interpolate(f, [c - 3, c, c + 5], [0, 1, 0], clamp)));
  const ripple = clicks.map((c) => interpolate(f, [c, c + 16], [0, 1], clamp) * (f >= c && f < c + 16 ? 1 : 0));
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: visible,
        transform: `scale(${scale})`,
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

/* 1. Title */

const Title: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.paper, padding: '0 220px', justifyContent: 'center', fontFamily: F.serif }}>
      <div style={{ ...rise(f, 0), position: 'absolute', top: 90, left: 220 }}>
        <Lockup size={44} />
      </div>
      <div style={{ fontSize: 104, lineHeight: 1.1, letterSpacing: '-0.02em', color: C.ink }}>
        <div style={rise(f, 4)}>You write in Obsidian.</div>
        <div style={{ ...rise(f, 20), color: C.muted }}>Your notes become a website.</div>
      </div>
    </AbsoluteFill>
  );
};

/* 2. Editor */

// When each character appears, typed like a person (written by music/compose.py,
// which times the key sounds to the same list).
const typedCount = (times: number[], f: number) => times.filter((t) => t <= f).length;

const LEAD = 'Next, read ';
const BEFORE_PICK = `${LEAD}[[Cal`;
const COMPLETED = `${LEAD}[[Callouts]]`;
const PICK = 46;

const typedAt = (f: number) =>
  f >= PICK ? COMPLETED + '.'.slice(0, typedCount(TYPING.tail, f)) : BEFORE_PICK.slice(0, typedCount(TYPING.editor, f));

const EditorScene: React.FC = () => {
  const f = useCurrentFrame();
  const fy = typedLineY;
  const cam = useCamera(
    moves(
      [
        { at: 0, fx: charX(10), fy, s: 1.5 },
        { at: 56, fx: charX(10), fy, s: 1.5 },
        { at: 76, fx: 960, fy: 540, s: 1 }
      ],
      20
    ),
    f,
    DESIGN
  );
  const typing = (f >= 4 && f < 42) || (f >= 50 && f < 56);
  const caret = typing || Math.floor(f / 15) % 2 === 0;
  const suggest = f < 29 ? 0 : f < PICK + 6 ? interpolate(f, [29, 34], [0, 1], clamp) : 0;
  return (
    <AbsoluteFill style={{ background: C.editorBg }}>
      <div style={{ ...DESIGN, transform: cam.transform, transformOrigin: '0 0' }}>
        <Editor typed={typedAt(f)} caret={caret} suggest={suggest} picked={f >= PICK - 4} pickerAt={LEAD.length} />
      </div>
    </AbsoluteFill>
  );
};

/* 3. The dissolve: the note breaks into characters and becomes its page */

const COLS = 96;
const ROWS = 30;
const CELL_W = DESIGN.width / COLS;
const CELL_H = DESIGN.height / ROWS;
const RAMP = ' .:-=+*#%@';
const BAND = 520;

const hash = (a: number, b: number, c: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Where the wipe front is, in design pixels, at dissolve frame `f`. */
const frontAt = (f: number) =>
  interpolate(f, [0, DISSOLVE], [-BAND / 2, DESIGN.width + BAND / 2], {
    ...clamp,
    easing: Easing.inOut(Easing.quad)
  });

const Glyphs: React.FC<{ f: number }> = ({ f }) => {
  const front = frontAt(f);
  // Glyphs change on twos, like the rest of a hand-made transition.
  const tick = Math.floor(f / 2);
  const rows: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) {
    let light = '';
    let dark = '';
    for (let c = 0; c < COLS; c++) {
      const x = (c + 0.5) * CELL_W;
      const d = (x - front) / (BAND / 2);
      const strength = Math.max(0, 1 - Math.abs(d)) ** 0.8;
      const n = hash(c, r, tick);
      const visible = n < strength * 1.15;
      const level = Math.min(RAMP.length - 1, Math.floor((strength * 0.7 + hash(c, r, 99) * 0.5) * RAMP.length));
      const ch = visible ? RAMP[Math.max(1, level)]! : ' ';
      // Left of the front the page is already there: glyphs in ink blue. Right of
      // it is the editor: glyphs in the editor's link colour.
      light += d < 0 ? ch : ' ';
      dark += d >= 0 ? ch : ' ';
    }
    rows.push(
      <div key={r} style={{ position: 'absolute', left: 0, top: r * CELL_H, height: CELL_H, whiteSpace: 'pre' }}>
        <span style={{ position: 'absolute', left: 0, color: C.accent }}>{light}</span>
        <span style={{ position: 'absolute', left: 0, color: C.editorLink }}>{dark}</span>
      </div>
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        fontFamily: F.mono,
        fontSize: CELL_W / 0.6,
        lineHeight: `${CELL_H}px`,
        fontWeight: 600,
        letterSpacing: 0
      }}
    >
      {rows}
    </div>
  );
};

/** The band behind the glyphs: it hides the hard edge between the two shots. */
const Veil: React.FC<{ f: number }> = ({ f }) => {
  const front = frontAt(f);
  const w = BAND * 0.7;
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: front - w / 2,
        width: w,
        background: `linear-gradient(to right, rgba(251,250,247,0), ${C.paper} 30%, ${C.editorBg} 70%, rgba(30,30,30,0))`
      }}
    />
  );
};

/* 4. The site, with a cursor */

const Shot: React.FC<{ src: string; opacity: number }> = ({ src, opacity }) =>
  opacity <= 0 ? null : (
    <Img src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: 1920, height: 1080, opacity }} />
  );

// Element centres measured on the real pages (CSS pixels at 1920x1080).
const LINK = { x: 950, y: 217 };
const FOLD = { x: 760, y: 676 };
const BACKLINK = { x: 661, y: 979 };

const SITE_PATH: Waypoint[] = [
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
export const SITE_CLICKS = [135, 210, 317];

const SiteScene: React.FC = () => {
  // Site frames: negative while the page is still shown whole under the dissolve.
  const f = useCurrentFrame() / SITE_SPEED - SITE_INTRO;
  const cam = useCamera(
    moves([
      { at: -SITE_INTRO, fx: 960, fy: 540, s: 1 },
      { at: -6, fx: 960, fy: 540, s: 1 },
      { at: 22, fx: 940, fy: 300, s: 1.6 },
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
        <Cursor f={f} path={SITE_PATH} clicks={SITE_CLICKS} show={[26, 34, 341, 351]} scale={1 / cam.s} />
      </div>
    </AbsoluteFill>
  );
};

/** Editor and site under the dissolve, then the site alone. */
const Demo: React.FC = () => {
  const frame = useCurrentFrame(); // from TIMELINE.editor
  const d = frame - (TIMELINE.dissolve - TIMELINE.editor);
  const front = frontAt(d);
  const dissolving = d >= 0 && d <= DISSOLVE;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Sequence from={TIMELINE.dissolve - TIMELINE.editor} layout="none">
        <AbsoluteFill
          style={{ clipPath: d <= DISSOLVE ? `inset(0 ${Math.max(0, DESIGN.width - front)}px 0 0)` : undefined }}
        >
          <SiteScene />
        </AbsoluteFill>
      </Sequence>
      {d <= DISSOLVE && (
        <AbsoluteFill style={{ clipPath: d >= 0 ? `inset(0 0 0 ${Math.max(0, front)}px)` : undefined }}>
          <EditorScene />
        </AbsoluteFill>
      )}
      {dissolving && (
        <>
          <Veil f={d} />
          <Glyphs f={d} />
        </>
      )}
    </AbsoluteFill>
  );
};

/* 5. Call to action */

const COMMAND = 'npx astro add astro-vault';
// CTA frames.
const COPY_AT = 64;
const STAR_AT = 90;

const CopyIcon: React.FC<{ done: boolean }> = ({ done }) =>
  done ? (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#7bd88f"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ) : (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="1.8">
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );

const CallToAction: React.FC = () => {
  const f = useCurrentFrame();
  const typed = COMMAND.slice(0, typedCount(TYPING.cta, f));
  const caret = f < 48 || Math.floor(f / 12) % 2 === 0;
  const copied = f >= COPY_AT;
  const starred = f >= STAR_AT;
  const pop = interpolate(f, [STAR_AT, STAR_AT + 4, STAR_AT + 10], [1, 1.12, 1], clamp);
  // Layout, in design pixels, for the cursor.
  const copyPos = { x: 1352, y: 592 };
  const starPos = { x: 646, y: 702 };
  const path: Waypoint[] = [
    { at: 44, x: 1560, y: 900 },
    { at: COPY_AT - 4, x: copyPos.x, y: copyPos.y },
    { at: COPY_AT + 6, x: copyPos.x, y: copyPos.y },
    { at: STAR_AT - 4, x: starPos.x, y: starPos.y },
    { at: 140, x: starPos.x + 30, y: starPos.y + 60 }
  ];
  return (
    <AbsoluteFill style={{ background: C.paper, alignItems: 'center', justifyContent: 'center', fontFamily: F.sans }}>
      <div style={rise(f, 0)}>
        <Lockup size={110} />
      </div>
      <div
        style={{
          ...rise(f, 6),
          marginTop: 64,
          width: 880,
          height: 96,
          padding: '0 28px 0 36px',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          borderRadius: 48,
          background: C.ink,
          fontFamily: F.mono,
          fontSize: 40,
          color: C.paper,
          boxShadow: '0 18px 50px rgba(36,35,31,0.18)'
        }}
      >
        <span style={{ color: '#7bd88f' }}>$</span>
        <span style={{ flex: 1, whiteSpace: 'pre' }}>
          {typed}
          <span
            style={{
              display: 'inline-block',
              width: 3,
              height: 42,
              marginLeft: 3,
              verticalAlign: -7,
              background: caret ? C.paper : 'transparent'
            }}
          />
        </span>
        <CopyIcon done={copied} />
      </div>
      <div style={{ ...rise(f, 14), marginTop: 34, display: 'flex', alignItems: 'center', gap: 22 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 20px',
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            background: '#fff',
            fontSize: 28,
            fontWeight: 600,
            color: C.ink,
            transform: `scale(${pop})`
          }}
        >
          <span style={{ color: starred ? '#e3a008' : C.muted, fontSize: 30 }}>{starred ? '★' : '☆'}</span>
          {starred ? 'Starred' : 'Star'}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 30, color: C.muted }}>github.com/manuel-cerezo/astro-vault</div>
      </div>
      <Cursor f={f} path={path} clicks={[COPY_AT, STAR_AT]} show={[40, 48]} />
    </AbsoluteFill>
  );
};

export const Promo: React.FC = () => {
  const frame = useCurrentFrame();
  const scenes: [number, number, React.ReactNode, number][] = [
    [0, TIMELINE.editor, <Title />, 8],
    [TIMELINE.editor, TIMELINE.cta, <Demo />, 8],
    [TIMELINE.cta, TIMELINE.end + 10, <CallToAction />, 6]
  ];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {/* Music and sound effects from music/compose.py, timed to this cut. */}
      <Audio src={staticFile('music.mp3')} />
      {scenes.map(([from, to, node, fade]) => (
        <Sequence key={from} from={from} durationInFrames={to - from}>
          <AbsoluteFill
            style={{
              opacity: interpolate(frame, [from, from + fade, to - fade, to], [from === 0 ? 1 : 0, 1, 1, 0], clamp)
            }}
          >
            {node}
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
