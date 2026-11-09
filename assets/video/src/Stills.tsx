import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';

import { Lockup, Mark } from './Brand';
import { C, F } from './theme';

/** A real screenshot of the built-in pages in a minimal browser frame. */
const Browser: React.FC<{
  src: string;
  width: number;
  /** Visible height, in px. */
  height: number;
  /** Zoom into the screenshot, from its left edge at `offset` (a fraction of its width). */
  zoom?: number;
  offset?: number;
  style?: React.CSSProperties;
}> = ({ src, width, height, zoom = 1.67, offset = 0.17, style }) => (
  <div
    style={{
      width,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      background: C.paper,
      boxShadow: '0 1px 2px rgba(36,35,31,0.06), 0 24px 48px -24px rgba(36,35,31,0.25)',
      ...style
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 36,
        padding: '0 14px',
        borderBottom: `1px solid ${C.border}`,
        background: '#fff'
      }}
    >
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 10, height: 10, borderRadius: 5, background: C.border }} />
      ))}
      <span style={{ marginLeft: 12, color: C.faint, fontFamily: F.mono, fontSize: 13 }}>
        example.com/notes/guides/callouts
      </span>
    </div>
    <div style={{ height, overflow: 'hidden' }}>
      <Img
        src={staticFile(src)}
        style={{ width: width * zoom, maxWidth: 'none', marginLeft: -offset * width * zoom, display: 'block' }}
      />
    </div>
  </div>
);

const Features: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ fontFamily: F.sans, fontSize: size, color: C.muted, lineHeight: 1.6 }}>
    Wikilinks · embeds · callouts · backlinks · folder tree
  </div>
);

export const Banner: React.FC = () => (
  <AbsoluteFill style={{ background: C.paper, flexDirection: 'row', alignItems: 'center' }}>
    <div style={{ width: 560, paddingLeft: 72 }}>
      <Lockup size={46} />
      <div
        style={{
          marginTop: 40,
          fontFamily: F.serif,
          fontSize: 50,
          lineHeight: 1.12,
          letterSpacing: '-0.02em',
          color: C.ink
        }}
      >
        Write in Obsidian.
        <br />
        <span style={{ color: C.muted }}>Publish with Astro.</span>
      </div>
      <div style={{ marginTop: 28 }}>
        <Features size={19} />
      </div>
    </div>
    <Browser
      src="site-callouts-light.png"
      width={720}
      height={470}
      style={{ position: 'absolute', left: 620, top: 85 }}
    />
  </AbsoluteFill>
);

export const Social: React.FC = () => (
  <AbsoluteFill style={{ background: C.paper }}>
    <div style={{ position: 'absolute', left: 64, top: 56 }}>
      <Lockup size={40} />
    </div>
    <div
      style={{
        position: 'absolute',
        right: 64,
        top: 58,
        padding: '10px 18px',
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        background: '#fff',
        fontFamily: F.mono,
        fontSize: 22,
        color: C.ink
      }}
    >
      npx astro add astro-vault
    </div>
    <div
      style={{
        position: 'absolute',
        left: 64,
        top: 138,
        fontFamily: F.serif,
        fontSize: 54,
        letterSpacing: '-0.02em',
        color: C.ink
      }}
    >
      Write in Obsidian. <span style={{ color: C.muted }}>Publish with Astro.</span>
    </div>
    <Browser
      src="site-callouts-light.png"
      width={1072}
      height={366}
      style={{ position: 'absolute', left: 64, top: 236 }}
    />
  </AbsoluteFill>
);

export const Poster: React.FC = () => (
  <AbsoluteFill style={{ background: C.paper }}>
    {/* A frame of the video: a wikilink typed in the editor. */}
    <Img src={staticFile('poster-frame.png')} style={{ width: 1920, height: 1080 }} />
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 96 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          padding: '26px 44px 26px 26px',
          borderRadius: 999,
          background: C.paper,
          color: C.ink,
          fontFamily: F.sans,
          fontSize: 40,
          fontWeight: 600,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)'
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            background: C.ink,
            display: 'grid',
            placeItems: 'center'
          }}
        >
          <svg width="34" height="38" viewBox="0 0 34 38">
            <path d="M5 3l26 16L5 35z" fill={C.paper} />
          </svg>
        </div>
        Watch the overview
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

export const Logo: React.FC = () => (
  <AbsoluteFill style={{ background: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
    <Mark size={512} />
  </AbsoluteFill>
);
