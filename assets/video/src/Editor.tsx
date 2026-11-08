import React from 'react';

import { C, F } from './theme';

/**
 * A generic Markdown editor showing the source of `Guides/Wikilinks.md`, the
 * same note the site screenshots show rendered. Laid out in a 1920x1080
 * design space for the camera.
 */
const L: React.FC<{ children: React.ReactNode; dim?: boolean }> = ({ children, dim }) => (
  <div style={{ minHeight: 44, color: dim ? C.editorMuted : C.editorText }}>{children}</div>
);
const Link: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: C.editorLink }}>{children}</span>
);

export const Editor: React.FC<{ highlight?: number }> = ({ highlight = 0 }) => (
  <div
    style={{
      width: 1920,
      height: 1080,
      background: C.editorBg,
      display: 'grid',
      gridTemplateColumns: '360px 1fr',
      fontFamily: F.sans
    }}
  >
    <div style={{ background: C.editorPanel, padding: '48px 28px', color: C.editorMuted, fontSize: 24, lineHeight: 2 }}>
      <div style={{ color: C.editorText, fontWeight: 600, marginBottom: 12 }}>notes</div>
      <div>▾ Guides</div>
      <div style={{ paddingLeft: 28, color: C.editorText, background: '#333', borderRadius: 6 }}>Wikilinks</div>
      <div style={{ paddingLeft: 28 }}>Callouts</div>
      <div>▾ Ideas</div>
      <div style={{ paddingLeft: 28 }}>Digital garden</div>
      <div>▸ attachments</div>
      <div>index</div>
    </div>
    <div style={{ padding: '64px 96px', fontFamily: F.mono, fontSize: 30, lineHeight: 1.5 }}>
      <div style={{ fontFamily: F.sans, color: C.editorMuted, fontSize: 22, marginBottom: 36 }}>
        Guides / Wikilinks.md
      </div>
      <L dim>---</L>
      <L dim>tags: [syntax]</L>
      <L dim>---</L>
      <L> </L>
      <L>
        Link to any note by its file name:{' '}
        <span
          style={{
            borderRadius: 6,
            boxShadow: `0 0 0 ${4 * highlight}px rgba(168,139,250,${0.45 * highlight})`,
            background: `rgba(168,139,250,${0.16 * highlight})`
          }}
        >
          <Link>[[Callouts]]</Link>
        </span>
        .
      </L>
      <L>
        Link to a heading with <Link>[[Callouts#Foldable callouts]]</Link>
      </L>
      <L>
        and change the text with <Link>[[Digital garden|a custom label]]</Link>.
      </L>
      <L> </L>
      <L>Images embed from anywhere in the vault:</L>
      <L>
        <Link>![[diagram.svg]]</Link>
      </L>
      <L> </L>
      <L>
        <span style={{ color: C.editorMuted }}>&gt; </span>
        <span style={{ color: C.editorCallout }}>[!tip]</span> Callouts become styled blocks
      </L>
    </div>
  </div>
);
