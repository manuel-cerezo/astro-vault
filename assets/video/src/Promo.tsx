import React from 'react';
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';

import { Lockup } from './Brand';
import { Editor } from './Editor';
import { moves, useCamera } from './kit/camera';
import { Subtitles, type SubtitleCue } from './kit/Subtitle';
import { C, F } from './theme';

/**
 * 28 s at 30 fps. Silent by design: on social it plays muted, so the story is
 * told by on-screen text and, where there is none, subtitles (launch-video-kit).
 *
 *   0–90     title
 *   90–270   writing in the editor
 *   270–390  setup: two files
 *   390–720  the built site (real screenshots), light then dark
 *   720–840  call to action
 */
export const PROMO_FRAMES = 840;
const DESIGN = { width: 1920, height: 1080 };

const fade = (frame: number, from: number, to: number, length = 10) =>
  interpolate(frame, [from, from + length, to - length, to], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

const rise = (frame: number, at: number) => ({
  opacity: interpolate(frame, [at, at + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  transform: `translateY(${interpolate(frame, [at, at + 14], [18, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`
});

const Title: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.paper, padding: '0 220px', justifyContent: 'center', fontFamily: F.serif }}>
      <div style={{ fontSize: 96, lineHeight: 1.12, letterSpacing: '-0.02em', color: C.ink }}>
        <div style={rise(f, 4)}>Your notes live in Obsidian.</div>
        <div style={{ ...rise(f, 34), color: C.muted }}>Your site runs on Astro.</div>
      </div>
      <div style={{ ...rise(f, 60), marginTop: 64, fontFamily: F.sans, fontSize: 36, color: C.muted }}>
        <span style={{ color: C.ink, fontWeight: 600 }}>astro-vault</span> publishes one with the other.
      </div>
    </AbsoluteFill>
  );
};

const EditorScene: React.FC = () => {
  const f = useCurrentFrame();
  const cam = useCamera(
    moves([
      { at: 0, fx: 960, fy: 540, s: 1 },
      { at: 70, fx: 1080, fy: 395, s: 1.45 },
      { at: 165, fx: 1080, fy: 395, s: 1.45 }
    ]),
    f,
    DESIGN
  );
  const highlight = interpolate(f, [75, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: C.editorBg }}>
      <div style={{ ...DESIGN, transform: cam.transform, transformOrigin: '0 0' }}>
        <Editor highlight={highlight} />
      </div>
    </AbsoluteFill>
  );
};

const Code: React.FC<{ file: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  file,
  children,
  style
}) => (
  <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: '#fff', overflow: 'hidden', ...style }}>
    <div
      style={{
        padding: '14px 24px',
        borderBottom: `1px solid ${C.border}`,
        color: C.muted,
        fontFamily: F.sans,
        fontSize: 24
      }}
    >
      {file}
    </div>
    <div style={{ padding: '22px 24px', fontFamily: F.mono, fontSize: 32, lineHeight: 1.5, color: C.ink }}>
      {children}
    </div>
  </div>
);

const Setup: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.paper, padding: '120px 220px', fontFamily: F.serif }}>
      <div style={{ ...rise(f, 4), fontSize: 72, letterSpacing: '-0.02em', color: C.ink }}>
        Two files. No layout to write.
      </div>
      <Code file="terminal" style={{ ...rise(f, 18), marginTop: 64 }}>
        <span style={{ color: C.faint }}>$</span> npx astro add astro-vault
      </Code>
      <Code file="astro.config.mjs" style={{ ...rise(f, 40), marginTop: 28 }}>
        integrations: [vault(<span style={{ color: C.accent }}>{'{ pages: true }'}</span>)]
      </Code>
    </AbsoluteFill>
  );
};

const Shot: React.FC<{ src: string; opacity: number }> = ({ src, opacity }) => (
  <Img src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: 1920, height: 1080, opacity }} />
);

const SiteScene: React.FC = () => {
  const f = useCurrentFrame();
  // Starts full frame, like the setup card it follows; every move is a short travel.
  const cam = useCamera(
    moves([
      { at: 0, fx: 960, fy: 540, s: 1 },
      { at: 60, fx: 960, fy: 262, s: 1.55 },
      { at: 150, fx: 960, fy: 262, s: 1.55 },
      { at: 175, fx: 968, fy: 420, s: 1.3 },
      { at: 225, fx: 968, fy: 420, s: 1.3 },
      { at: 250, fx: 760, fy: 880, s: 1.45 },
      { at: 270, fx: 760, fy: 880, s: 1.45 },
      { at: 295, fx: 960, fy: 540, s: 1 }
    ]),
    f,
    DESIGN
  );
  const toCallouts = interpolate(f, [150, 170], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const toDark = interpolate(f, [292, 304], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <div style={{ ...DESIGN, position: 'relative', transform: cam.transform, transformOrigin: '0 0' }}>
        <Shot src="site-wikilinks-light.png" opacity={1} />
        <Shot src="site-callouts-light.png" opacity={toCallouts * (1 - toDark)} />
        <Shot src="site-wikilinks-dark.png" opacity={toDark} />
      </div>
    </AbsoluteFill>
  );
};

const CallToAction: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.paper, alignItems: 'center', justifyContent: 'center', fontFamily: F.sans }}>
      <div style={rise(f, 4)}>
        <Lockup size={110} />
      </div>
      <div
        style={{
          ...rise(f, 20),
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
        npm i astro-vault
      </div>
      <div style={{ ...rise(f, 32), marginTop: 36, fontSize: 36, color: C.muted }}>
        github.com/manuel-cerezo/astro-vault
      </div>
      <div style={{ ...rise(f, 42), marginTop: 18, fontSize: 28, color: C.faint }}>Open source · MIT · Astro 7</div>
      <div style={{ ...rise(f, 50), position: 'absolute', bottom: 48, fontSize: 22, color: C.faint }}>
        Video made with launch-video-kit by Borja Pérez (@borjaperfra)
      </div>
    </AbsoluteFill>
  );
};

/** Absolute frames. Only lines that are not already written on screen. */
const CUES: readonly SubtitleCue[] = [
  { at: 100, dur: 160, text: 'Write the way you already do: wikilinks, embeds, callouts.' },
  { at: 400, dur: 140, text: 'Astro builds a page for every note, and the links just work.' },
  { at: 560, dur: 95, text: 'Callouts, backlinks and the folder tree come built in.' },
  { at: 664, dur: 52, text: 'Light and dark mode included.' }
];

export const Promo: React.FC = () => {
  const frame = useCurrentFrame();
  const scenes: [number, number, React.ReactNode][] = [
    [0, 90, <Title />],
    [90, 270, <EditorScene />],
    [270, 390, <Setup />],
    [390, 720, <SiteScene />],
    [720, PROMO_FRAMES + 10, <CallToAction />]
  ];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {scenes.map(([from, to, node]) => (
        <Sequence key={from} from={from} durationInFrames={to - from}>
          <AbsoluteFill style={{ opacity: fade(frame, from === 0 ? -10 : from, to, 8) }}>{node}</AbsoluteFill>
        </Sequence>
      ))}
      <Subtitles cues={CUES} fontFamily={F.sans} />
    </AbsoluteFill>
  );
};
