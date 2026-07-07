# Recast — agent notes

Bun + TanStack Start. All tools run through server routes in `src/routes/api/` —
no separate backend. UI is shadcn/ui, styles in `src/styles.css`.

## This is a deployed, public app

Recast runs at https://recast.serhiifotex.dev and is used by people other than
the owner. Error responses and toasts must be written for end users: no stack
traces, no file paths, no install/setup instructions ("run bunx …", "set
CHROMIUM_PATH …"), no internal process names. Put the operator-facing detail in
`console.error` (it lands in server logs) and return a short, plain sentence
about what failed and what the user can do. `src/server/proc.ts` and
`src/server/screenshot.ts` show the pattern.

## Commands

```sh
bun run dev      # vite dev server on :3000
bun run vocabs   # fetch tokenizer vocabularies into public/vocabs (once)
bun run build    # production build to dist/
bun start        # serve the build via server.mjs
bun run test     # vitest
bun run lint     # biome
```

## Engines

sharp (raster images, HEIC via `sips`/`heif-convert`), FFmpeg (video/audio/GIF),
`bsdtar` (archives), pdf-lib + pdf.js (PDF), yt-dlp (downloads),
better-auth + Supabase Postgres (`DATABASE_URL`, pastebin + Google sign-in),
playwright-core (website screenshots). `ffmpeg`, `yt-dlp` and `bsdtar` must be
on `PATH`; overridable via `FFMPEG_PATH` / `YTDLP_PATH` / `BSDTAR_PATH`.

The tokenizer (`/tokenizer`) is fully client-side: `src/lib/tokenizers/` holds
a byte-level BPE engine plus transformers.js loaders; vocabularies come from
`bun run vocabs` (gitignored `public/vocabs/*.bin`, gzipped, decompressed in
the browser).

## Playwright

The screenshot tool drives headless Chromium through playwright-core. Install
the browser once per machine:

```sh
bunx playwright-core install chromium-headless-shell
```

Alternatively point `CHROMIUM_PATH` at any Chrome/Chromium binary. Set
`CHROMIUM_NO_SANDBOX=1` when Chromium runs as root (Docker does this).
Without a browser installed the `/screenshot` tool returns a clear error;
everything else works.
