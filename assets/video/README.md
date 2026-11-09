# astro-vault launch video

The overview video and the promo stills, built with [Remotion](https://www.remotion.dev/). The camera moves use [launch-video-kit](https://github.com/borjaperfra/launch-video-kit) by Borja Pérez (MIT), copied into `src/kit/` as its README suggests. The project's Claude Code skill for it lives in `.claude/skills/launch-video-kit/`.

```sh
npm install
npm run studio   # preview and edit
npm run render   # ../astro-vault-promo.mp4
npm run stills   # ../banner.png, ../social.png, ../poster.png, ../logo.png
```

The site shots in `public/` are real screenshots of `examples/pages` at 1920 × 1080 and device scale 2, light and dark. Retake them when the theme changes.

The music is original: `music/compose.py` synthesises it with numpy (no samples, nothing to license) and writes `public/music.mp3`. Social networks often play video muted, so a text column beside the product explains each step. launch-video-kit also covers voice-over (an OpenAI-compatible TTS endpoint) and music with ducking, if a version with sound is needed.
