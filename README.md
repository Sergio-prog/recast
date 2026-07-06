<p align="center">
  <img src="public/favicon.svg" width="72" alt="ultra.convert logo" />
</p>

<h1 align="center">ultra.convert</h1>

<p align="center">
  <strong>Every format you need.</strong><br />
  A self-hosted toolbench — file conversion, PDF tools, a media downloader,
  website screenshots, a private pastebin and a currency converter.
  Your files never leave your machine.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/runtime-bun-f9f1e1.svg" alt="bun" />
  <img src="https://img.shields.io/badge/framework-TanStack%20Start-10b981.svg" alt="TanStack Start" />
</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/screenshot-dark.png" />
  <img src=".github/screenshot-light.png" alt="ultra.convert workbench" />
</picture>

## Tools

- **Convert** — the universal workbench: drop any mix of files, pick a target and
  quality per file, convert in parallel. Dedicated pages for
  [images](/images), [video](/video) and [audio](/audio).
  - Images: JPG, PNG, WebP, AVIF, GIF, TIFF, BMP, plus HEIC and SVG input
  - Video: MP4, WebM, MOV, MKV, AVI, video → GIF (two-pass palette), GIF → video
  - Audio: MP3, WAV, OGG, Opus, FLAC, AAC, M4A, plus extraction from video
  - Archives: ZIP ↔ TAR / TAR.GZ / TAR.BZ2 / TAR.XZ / 7Z
  - Compression: keep the format, lower the quality knob
- **PDF** — merge, split by pages or ranges, images → one PDF, PDF ↔ images
- **Paste** — link-only or private pastes with tags, description and expiry;
  Google sign-in required to create
- **Screenshot** — capture any URL as PNG/JPG with viewport presets, delay,
  full-page, dark mode and 2× retina
- **Download** — video (MP4) or audio (MP3) from YouTube, SoundCloud and 1,800+ sites
- **Currency** — 160+ currencies with daily rates, cached server-side

## How it works

| Engine | Used for |
| --- | --- |
| [sharp](https://sharp.pixelplumbing.com) | raster images (HEIC via `sips` on macOS, `heif-convert` on Linux) |
| [FFmpeg](https://ffmpeg.org) | video, audio, GIF, BMP bridging |
| `bsdtar` | archive rewrites and ZIP packaging |
| [pdf-lib](https://pdf-lib.js.org) + [pdf.js](https://mozilla.github.io/pdf.js/) | PDF assembly and rendering |
| [playwright-core](https://playwright.dev) | website screenshots |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | media downloads |
| [better-auth](https://better-auth.com) + `bun:sqlite` | Google sign-in and paste storage |
| [open.er-api.com](https://www.exchangerate-api.com) | daily exchange rates |

Everything runs through [TanStack Start](https://tanstack.com/start) server routes —
no separate backend, no third-party upload.

## Getting started

```sh
bun install
bun run dev
```

Open http://localhost:3000.

Local requirements: [bun](https://bun.sh) ≥ 1.3, `ffmpeg` and `yt-dlp` on `PATH`
(`brew install ffmpeg yt-dlp`), and `bsdtar` (preinstalled on macOS). For the
screenshot tool, install a headless Chromium once:

```sh
bunx playwright-core install chromium-headless-shell
```

### Google sign-in (pastebin)

Pastes require a Google account. Create an OAuth client in the
[Google Cloud console](https://console.cloud.google.com/apis/credentials) with
redirect URI `http://localhost:3000/api/auth/callback/google`, then copy
[.env.example](.env.example) to `.env` and fill in `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET` and a long random `BETTER_AUTH_SECRET`. Apply the auth
schema once:

```sh
bunx --bun @better-auth/cli migrate --config src/server/auth.ts -y
```

## Production

```sh
bun run build
bun start
```

`bun start` runs [`server.mjs`](server.mjs) — a small Bun server that serves
built client assets with immutable caching and hands everything else to the
TanStack Start handler.

### Docker

```sh
docker compose up --build
```

The image bundles FFmpeg, yt-dlp, bsdtar, libheif and Chromium, and persists
the SQLite database in the `ultra-data` volume. Configure via `.env` (picked up
by compose) — see [.env.example](.env.example).

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | server port |
| `DATA_DIR` | `data` | SQLite database location |
| `BETTER_AUTH_SECRET` | dev-only fallback | session signing secret — set a long random value |
| `BETTER_AUTH_URL` | `http://localhost:3000` | public base URL for OAuth callbacks |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | unset | Google OAuth credentials (pastebin) |
| `MAX_UPLOAD_MB` | `512` | request size limit for conversions |
| `MAX_DOWNLOAD_MB` | `0` (off) | yt-dlp max file size |
| `PASTE_MAX_KB` | `256` | paste content size limit |
| `TRUST_PROXY` | `0` | set `1` behind a reverse proxy so rate limits use `x-forwarded-for` |
| `FFMPEG_PATH` / `YTDLP_PATH` / `BSDTAR_PATH` | binary names | binary overrides |
| `CHROMIUM_PATH` | playwright default | Chromium binary for screenshots |
| `CHROMIUM_NO_SANDBOX` | `0` | set `1` when running Chromium as root (Docker) |

Public-hosting hardening is built in: per-IP rate limits on every API route,
upload/download/paste size caps, and private-network host blocking for the
downloader and screenshot tools.

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## License

[MIT](LICENSE)
