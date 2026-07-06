<p align="center">
  <img src="public/favicon.svg" width="72" alt="ultra.convert logo" />
</p>

<h1 align="center">ultra.convert</h1>

<p align="center">
  <strong>Every format you need.</strong><br />
  A self-hosted file conversion workbench — images, video, audio, GIFs, archives,
  a media downloader and a currency converter. Your files never leave your machine.
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

## Features

- **Images** — JPG, PNG, WebP, AVIF, GIF, TIFF, BMP, plus HEIC and SVG input
- **Video** — MP4, WebM, MOV, MKV, AVI, video → GIF (two-pass palette), GIF → video
- **Audio** — MP3, WAV, OGG, Opus, FLAC, AAC, M4A, plus audio extraction from video
- **Archives** — ZIP ↔ TAR / TAR.GZ / TAR.BZ2 / TAR.XZ / 7Z
- **Compression** — keep the format, lower the quality knob; images, video and audio
- **Downloader** — save video (MP4) or audio (MP3) from YouTube, SoundCloud and 1,800+ sites
- **Currency** — 160+ currencies with daily rates, cached server-side

Drop any mix of files on the workbench, pick a target and quality per file, convert
everything in parallel and save the results with size deltas.

## How it works

| Engine | Used for |
| --- | --- |
| [sharp](https://sharp.pixelplumbing.com) | raster images (HEIC decodes via macOS `sips` fallback) |
| [FFmpeg](https://ffmpeg.org) | video, audio, GIF, BMP bridging |
| `bsdtar` | archive ↔ archive rewrites |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | media downloads |
| [open.er-api.com](https://www.exchangerate-api.com) | daily exchange rates |

Everything runs through [TanStack Start](https://tanstack.com/start) server routes —
there is no separate backend and no third-party upload.

## Requirements

- [bun](https://bun.sh) ≥ 1.3
- [FFmpeg](https://ffmpeg.org) on `PATH` — `brew install ffmpeg`
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) on `PATH` — `brew install yt-dlp` (only for the downloader)
- `bsdtar` — preinstalled on macOS; `apt install libarchive-tools` on Debian/Ubuntu

> [!NOTE]
> HEIC input uses `sips` as a decoder fallback, which is macOS-only. Everything else
> is portable; see the [roadmap](ROADMAP.md) for the Docker plan.

## Getting started

```sh
bun install
bun run dev
```

Open http://localhost:3000.

## Production

```sh
bun run build
bun start
```

`bun start` runs [`server.mjs`](server.mjs) — a small Bun server that serves the
built client assets with immutable caching and hands everything else to the
TanStack Start handler. Set `PORT` to change the port.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | production server port |
| `FFMPEG_PATH` | `ffmpeg` | FFmpeg binary |
| `YTDLP_PATH` | `yt-dlp` | yt-dlp binary |
| `BSDTAR_PATH` | `bsdtar` | bsdtar binary |

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## License

[MIT](LICENSE)
