import React from 'react';

import { C, F } from './theme';

/** `[[ ]]` mark: the same geometry as the logo on manuelcerezo.com/projects. */
export const Mark: React.FC<{ size: number; bg?: string; fg?: string }> = ({ size, bg = C.ink, fg = C.paper }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" style={{ display: 'block' }}>
    <rect width="512" height="512" rx="112" fill={bg} />
    <g fill="none" stroke={fg} strokeWidth="28" strokeLinecap="square">
      <path d="M156 146 H116 V366 H156" />
      <path d="M230 146 H190 V366 H230" />
      <path d="M282 146 H322 V366 H282" />
      <path d="M356 146 H396 V366 H356" />
    </g>
  </svg>
);

export const Wordmark: React.FC<{ size: number; color?: string }> = ({ size, color = C.ink }) => (
  <div style={{ fontFamily: F.sans, fontSize: size, fontWeight: 650, letterSpacing: '-0.035em', color, lineHeight: 1 }}>
    astro-vault
  </div>
);

export const Lockup: React.FC<{ size: number; color?: string }> = ({ size, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.32 }}>
    <Mark size={size * 1.15} />
    <Wordmark size={size} color={color} />
  </div>
);
