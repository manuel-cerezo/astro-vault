import React from 'react';
import { Composition, Still } from 'remotion';

import { Promo, PROMO_FRAMES } from './Promo';
import { Banner, Logo, Poster, Social } from './Stills';
import { FPS } from './theme';

export const Root: React.FC = () => (
  <>
    <Composition id="Promo" component={Promo} durationInFrames={PROMO_FRAMES} fps={FPS} width={1920} height={1080} />
    <Still id="Banner" component={Banner} width={1280} height={640} />
    <Still id="Social" component={Social} width={1200} height={675} />
    <Still id="Poster" component={Poster} width={1920} height={1080} />
    <Still id="Logo" component={Logo} width={512} height={512} />
  </>
);
