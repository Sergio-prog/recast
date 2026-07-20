# Plan 003: Add downloader resolution and bitrate controls

> **Executor instructions**: Follow this plan exactly and run every verification
> gate. Stop and report on a STOP condition rather than expanding scope. Update
> this plan's row in `plans/README.md` when complete.
>
> **Drift check (run first)**:
> `git diff --stat d125c71..HEAD -- src/lib/download-options.ts src/lib/download-options.test.ts src/routes/download.tsx src/routes/api/download.ts src/server/download.ts src/server/download.test.ts`
> Repeat without `d125c71..HEAD` to detect uncommitted overlap and compare the
> excerpts below with current code.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — yt-dlp selector changes can reduce site compatibility
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `d125c71`, 2026-07-12

## Why this matters

The downloader currently chooses one best-video recipe and maximum-quality MP3,
leaving users unable to trade quality for size. Curated “up to” resolution and
audio bitrate presets add the useful part of downloader options without
exposing raw yt-dlp format syntax. Progress and playlist support remain separate
projects because they require long-running or multi-result job semantics.

## Current state

- `src/routes/download.tsx:24-28` stores only URL, mode, metadata, and loading
  state. Its selector offers only MP4 video or MP3 audio at lines 106-132.
- `src/routes/api/download.ts:19-22` normalizes mode, then calls
  `downloadToResponse(url, mode)`.
- `src/server/download.ts:67-75` hardcodes output arguments:

```ts
const modeArgs = mode === "audio"
	? ["-x", "--audio-format", "mp3", "--audio-quality", "0"]
	: ["-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b",
		"--merge-output-format", "mp4"];
```

- Both info and file commands include `--no-playlist` (`src/server/download.ts`
  lines 46 and 85). Preserve that behavior.
- Commands are safely passed as argument arrays through `run`; never construct a
  shell string.
- Public errors must remain short and actionable; operator detail goes to
  `console.error`, per `AGENTS.md`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `bunx tsc --noEmit` | exit 0 |
| Unit tests | `bun run test -- src/lib/download-options.test.ts src/server/download.test.ts` | all pass; no network/process spawn |
| Check | `bun run check` | exit 0 |
| Full tests | `bun run test` | all pass |
| Build | `bun run build` | exit 0 |

## Scope

**In scope**:

- `src/lib/download-options.ts` (create)
- `src/lib/download-options.test.ts` (create)
- `src/routes/download.tsx`
- `src/routes/api/download.ts`
- `src/server/download.ts`
- `src/server/download.test.ts` (create)
- `plans/README.md` (status only)

**Out of scope**:

- Playlists, progress/SSE, persistent jobs, cancellation, subtitles,
  thumbnails, cookies UI, and arbitrary format IDs.
- Changing lookup metadata or making an additional yt-dlp request for format
  discovery.
- Supporting containers other than MP4 video and MP3 audio.

## Git workflow

- Branch: `feat/downloader-quality-controls`
- Conventional commit example:
  `feat(download): add resolution and bitrate presets`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Define a closed downloader-options contract

Create `src/lib/download-options.ts` with readonly presets and types:

- video: `best`, `1080`, `720`, `480`, `360`, displayed as `Best`, `Up to
  1080p`, etc.;
- audio: `320`, `192`, `128`, displayed as `320 kbps`, etc.;
- defaults that preserve current behavior: video `best`, audio `320`;
- a parser accepting URL/search-param scalar values and returning only known
  presets, falling back to defaults for missing values and rejecting unknown
  values with a user-safe validation result.

Do not use unconstrained numbers or pass user-provided strings directly to
yt-dlp.

**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 2: Add mode-specific controls to the downloader UI

In `src/routes/download.tsx`, add state for the video resolution and audio
bitrate. Reuse the existing `Select` primitives. Show only the control relevant
to the selected mode, adjacent to the MP4/MP3 mode selector. Labels must say
“Maximum resolution” and “Audio bitrate” so a lower-resolution source does not
appear to promise upscaling.

Append the selected option to the file URL as `resolution` for video or
`bitrate` for audio. Preserve the lookup request and current metadata card.

**Verify**: `bunx tsc --noEmit` → exit 0; inspect the generated link to confirm
it contains exactly one mode-relevant option.

### Step 3: Validate options at the route boundary

In `src/routes/api/download.ts`, use the shared parser before calling the server
helper. Unknown values return status 400 with `Choose a supported download
quality`. Pass a typed options object to `downloadToResponse`.

Do not relax URL blocking, rate limits, size limits, or the existing default to
video when mode is absent.

**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 4: Build safe yt-dlp argument arrays

Refactor only the option-building portion of `src/server/download.ts` into an
exported pure helper testable without spawning yt-dlp.

- Audio uses MP3 extraction and maps the selected bitrate to an explicit
  yt-dlp/FFmpeg bitrate setting. Confirm against installed yt-dlp behavior;
  `--audio-quality` must receive the correct bitrate form rather than an
  assumed numeric quality scale.
- `best` video preserves the current selector exactly.
- Bounded video selectors prefer MP4 video plus M4A audio up to the chosen
  height, then fall back to a compatible single MP4 or other best stream up to
  that height. They must never select above the requested height.
- Keep `--merge-output-format mp4`, `--no-playlist`, cookie arguments, maximum
  size, and timeouts unchanged.

All dynamic values reaching the process arguments must originate from the
closed preset types.

**Verify**: `bun run test -- src/server/download.test.ts` → pure argument tests
pass without executing yt-dlp.

### Step 5: Add validation and selector tests

Create tests for:

- every accepted preset and defaults;
- unknown, blank, and repeated/array-like values rejected or normalized as
  explicitly defined;
- current best-video arguments unchanged;
- every bounded selector includes the requested height in all fallbacks and no
  larger height;
- 128/192/320 mappings produce the intended audio arguments;
- every mode retains `--no-playlist` at the final command assembly boundary.

If testing final command assembly requires process mocking, extract another
pure `buildDownloadArgs` helper instead of mocking `child_process`.

**Verify**: `bun run test -- src/lib/download-options.test.ts src/server/download.test.ts`
→ all tests pass.

### Step 6: Run repository gates

**Verify**: `bun run check && bun run test && bun run build` → all exit 0.

## Test plan

- `src/lib/download-options.test.ts`: accepted presets, defaults, rejection.
- `src/server/download.test.ts`: exact argument-array behavior and regressions.
- Tests must not access the network or spawn yt-dlp.

## Done criteria

- [ ] Video users can choose Best or an “Up to” resolution preset.
- [ ] Audio users can choose 128, 192, or 320 kbps.
- [ ] Missing options preserve current maximum-quality behavior.
- [ ] Unknown options receive a user-safe 400 response.
- [ ] Raw user values never reach process arguments.
- [ ] Playlist behavior remains disabled and progress is not added.
- [ ] Typecheck, check, all tests, and build pass.
- [ ] Only in-scope files are modified and index status is updated.

## STOP conditions

Stop and report if:

- yt-dlp does not support a reliable explicit MP3 bitrate through the existing
  download/FFmpeg flow.
- A bounded selector cannot guarantee it stays at or below the selected height.
- Implementing controls requires format-discovery requests or raw format IDs.
- The work expands into playlists, progress, or persistent jobs.
- A verification fails twice or an out-of-scope file is required.

## Maintenance notes

- yt-dlp selector syntax is the primary review hotspot; keep its behavior
  covered with exact pure tests.
- If format discovery is added later, these presets should remain fallback
  policy rather than being replaced by unstable site-specific format IDs.
- Progress needs a job/progress transport design; do not bolt it onto the file
  response URL.

