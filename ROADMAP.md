# Roadmap

See [VISION.md](VISION.md) for where this is going. The unified workbench on
the main page stays — it is the product. Everything below builds around it.

## Next

- **Batch save** — download all converted results as a single ZIP.
- **Conversion progress** — stream FFmpeg progress over SSE and show real
  progress bars instead of spinners for long video jobs.
- **Downloader options** — resolution/bitrate picker, playlist support and
  download progress.
- **Paste syntax highlighting** — render pastes with their language, plus
  search across your own pastes by tag.

## Later

- **Pair landing routes** — shareable per-conversion pages like
  `/images/jpg-to-png` on top of the category pages.
- **Archive inspector** — list archive contents, extract single files, create
  an archive from multiple dropped files.
- **Image transforms** — resize, crop, rotate, strip metadata.
- **Video/audio editing** — trim clips, normalize loudness.
- **Job queue** — persistent queue with concurrency limits so heavy jobs
  survive a page reload.
- **Stronger SSRF guarding** — DNS-resolution pinning for the downloader and
  screenshot tools (hostname blocking is in place today).
- **Tests & CI** — unit tests for the format matrix, Playwright e2e for the
  workbench, GitHub Actions.
- **i18n** — English and Ukrainian.

## Done

- Studio tools: demotivator editor (in-canvas text editing + nested loops),
  Word Art and burning-text GIF generator, in-browser AI background remover
- Grouped navigation and tool directory (Convert / Files / Studio / Web / Text)
- DNS dig with four-resolver propagation check and RDAP registrar summary
- IP inspector (public address, ISP, geo, reverse DNS, browser fingerprint)
- Speed test (ping/download/upload against your own server)
- Supabase Postgres storage for auth and pastes (replaced local SQLite)
- Unified conversion workbench (images, video, audio, GIFs, archives) with
  per-file targets, quality knobs and parallel conversion
- Dedicated converter pages: `/images`, `/video`, `/audio`
- PDF tools: merge, split (pages/ranges), images → PDF, PDF ↔ images
- Pastebin with Google sign-in (better-auth + bun:sqlite): link-only/private
  visibility, tags, description, expiry
- Website screenshots: viewport presets, delay, full-page, dark mode, retina
- Media downloader (yt-dlp) with MP4/MP3 modes
- Currency converter with 160+ currencies and server-side caching
- Public hosting hardening: per-IP rate limits, size caps, private-host blocking
- Docker image with all engines bundled
- Dark theme, format-pair ticker, favicon set, production server (`bun start`)
