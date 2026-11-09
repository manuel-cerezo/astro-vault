# astro-vault launch video

The overview video and the promo stills, built with [Remotion](https://www.remotion.dev/). The camera moves use [launch-video-kit](https://github.com/borjaperfra/launch-video-kit) by Borja Pérez (MIT), copied into `src/kit/` as its README suggests. The project's Claude Code skill for it lives in `.claude/skills/launch-video-kit/`.

```sh
npm install
npm run studio   # preview and edit
npm run render   # ../astro-vault-promo.mp4
npm run stills   # ../banner.png, ../social.png, ../poster.png, ../logo.png
```

The site shots in `public/` are real screenshots of `examples/pages` at 1920 × 1080 and device scale 2, light and dark. Retake them when the theme changes.

The soundtrack comes from `music/compose.py`, which writes `public/music.mp3` and the typing rhythm and beat timings in `src/timing.json`. The music is an upbeat 120 BPM groove synthesised with numpy (no samples, nothing to license), timed so the beat drops as the note dissolves into its published page and lands on one chord under the call to action. The keys are real recordings of a Cherry MX Brown keyboard from [kbsim](https://github.com/tplai/kbsim) by Thomas Lai (MIT), kept in `music/keys/` with their licence. There are no captions: the product, full screen, tells the story.
