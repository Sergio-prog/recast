# Roadmap

The unified workbench on the main page stays — it is the product. Everything below
builds around it.

## Next

- **Dedicated converter pages** — separate pages for image, video and audio
  conversion (`/images`, `/video`, `/audio`) with category-tuned options
  (resize for images, trim for video, bitrate for audio) and shareable
  pair routes like `/images/jpg-to-png`. The main page keeps the universal
  drop-anything workbench.
- **Batch save** — download all converted results as a single ZIP.
- **Conversion progress** — stream FFmpeg progress over SSE and show real
  progress bars instead of spinners for long video jobs.
- **Downloader options** — resolution/bitrate picker, playlist support and
  download progress.

## Later

- **PDF tools** — images → PDF, PDF → images, merge and split.
- **Archive inspector** — list archive contents, extract single files, create
  an archive from multiple dropped files.
- **Image transforms** — resize, crop, rotate, strip metadata.
- **Video/audio editing** — trim clips, normalize loudness.
- **Job queue** — persistent queue with concurrency limits so heavy jobs
  survive a page reload.
- **Docker image** — bundle FFmpeg, yt-dlp and a libheif-enabled sharp so the
  app runs anywhere, removing the macOS-only `sips` HEIC fallback.
- **Public hosting hardening** — upload size limits, rate limiting, job
  timeouts surfaced in the UI.
- **Tests & CI** — unit tests for the format matrix, Playwright e2e for the
  workbench, GitHub Actions.
- **i18n** — English and Ukrainian.

## Done

- Unified conversion workbench (images, video, audio, GIFs, archives) with
  per-file targets, quality knobs and parallel conversion
- Compression via same-format + quality
- Media downloader (yt-dlp) with MP4/MP3 modes
- Currency converter with 160+ currencies and server-side caching
- Dark theme, format-pair ticker, favicon set
- Production server (`bun start`)
