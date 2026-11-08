# Assets

| File                    | Size        | Use                                                      |
| ----------------------- | ----------- | -------------------------------------------------------- |
| `banner.png`            | 2560 × 1280 | README header and GitHub social preview.                 |
| `how.png`               | 3200 × 1800 | README: the same note in Obsidian and on the built site. |
| `social.png`            | 2400 × 1350 | Image for posts on X, LinkedIn or Bluesky (16:9).        |
| `logo.png`              | 1024 × 1024 | Avatar or icon.                                          |
| `astro-vault-promo.mp4` | 1920 × 1080 | 25-second overview video (H.264, 30 fps, no audio).      |

Everything is generated from [`src/promo.html`](./src/promo.html). Open it in a browser with `?view=banner`, `how`, `social`, `logo` or `video&t=8` to preview one view.

To regenerate, run the script from a folder where `playwright` (with Chromium) and `ffmpeg-static` are installed:

```sh
node path/to/assets/src/render.mjs           # images and video
node path/to/assets/src/render.mjs images    # images only
node path/to/assets/src/render.mjs preview 4 9.5 14   # single video frames
```
