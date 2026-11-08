import React from 'react';

import { C, F } from './theme';

/**
 * A generic Markdown editor with the source of `Ideas/Digital garden.md`.
 * The last line is typed live (`typed`), and `suggest` shows the note picker
 * that appears after `[[`. Laid out in a 1920x1080 design space.
 */
const L: React.FC<{ children?: React.ReactNode; dim?: boolean }> = ({ children, dim }) => (
  <div style={{ minHeight: 48, color: dim ? C.editorMuted : C.editorText, whiteSpace: 'pre' }}>{children}</div>
);
const Link: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: C.editorLink }}>{children}</span>
);

/** Colours `[[...]]` in a plain string as the editor would. */
const highlightLinks = (text: string) =>
  text.split(/(\[\[[^\]]*\]?\]?)/).map((part, i) => (part.startsWith('[[') ? <Link key={i}>{part}</Link> : part));

export const Editor: React.FC<{ typed: string; caret: boolean; suggest: number; picked: boolean }> = ({
  typed,
  caret,
  suggest,
  picked
}) => (
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
      <div style={{ paddingLeft: 28 }}>Wikilinks</div>
      <div style={{ paddingLeft: 28 }}>Callouts</div>
      <div>▾ Ideas</div>
      <div style={{ paddingLeft: 28, color: C.editorText, background: '#333', borderRadius: 6 }}>Digital garden</div>
      <div>▸ attachments</div>
      <div>index</div>
    </div>
    <div style={{ position: 'relative', padding: '64px 96px', fontFamily: F.mono, fontSize: 32, lineHeight: 1.5 }}>
      <div style={{ fontFamily: F.sans, color: C.editorMuted, fontSize: 22, marginBottom: 36 }}>
        Ideas / Digital garden.md
      </div>
      <L dim>---</L>
      <L dim>tags: [ideas]</L>
      <L dim>---</L>
      <L />
      <L>Notes that grow over time, linked to each other.</L>
      <L>
        Start with <Link>[[Wikilinks]]</Link>, then embed an image:
      </L>
      <L>
        <Link>![[diagram.svg]]</Link>
      </L>
      <L />
      <L>
        <span style={{ color: C.editorMuted }}>&gt; </span>
        <span style={{ color: C.editorCallout }}>[!tip]</span> Callouts become styled blocks
      </L>
      <L />
      <L>
        {highlightLinks(typed)}
        <span
          style={{
            display: 'inline-block',
            width: 3,
            height: 40,
            marginLeft: 2,
            verticalAlign: -8,
            background: caret ? C.editorText : 'transparent'
          }}
        />
      </L>
      {suggest > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 96 + 372,
            top: 64 + 58 + 48 * 11 + 8,
            width: 420,
            opacity: suggest,
            transform: `translateY(${(1 - suggest) * 8}px)`,
            background: '#2d2d2d',
            border: '1px solid #3d3d3d',
            borderRadius: 8,
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            fontFamily: F.sans,
            fontSize: 24,
            padding: 8
          }}
        >
          {['Callouts', 'Wikilinks', 'Digital garden'].map((name, i) => (
            <div
              key={name}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                color: i === 0 ? '#fff' : C.editorMuted,
                background: i === 0 ? (picked ? '#5b4bb7' : '#3f3f3f') : 'transparent'
              }}
            >
              {name}
              <span style={{ marginLeft: 12, fontSize: 18, color: '#8a8a8a' }}>{i === 2 ? 'Ideas' : 'Guides'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
