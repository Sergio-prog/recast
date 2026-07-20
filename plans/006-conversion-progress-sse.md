# Plan 006: Stream real conversion progress for video/audio jobs (design + first slice)

> **Executor instructions**: This is a **design + first-slice** plan. Phase 0 is
> a spike you MUST complete and report before building Phase 1+. Follow each
> phase in order, run every verification command, and honor the "STOP
> conditions". Do not build the full feature blind. When done (or when you stop
> at a decision gate), update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 6bfe2ba..HEAD -- src/routes/api/convert.ts src/server/convert.ts src/server/media.ts src/server/proc.ts src/hooks/use-workbench.ts src/components/workbench.tsx`
> Then the same without `6bfe2ba..HEAD` for uncommitted overlap. If an in-scope
> file changed, compare the excerpts below with live code; a semantic mismatch
> is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED — introduces server-side ephemeral job state and a new
  request/response shape for conversion
- **Depends on**: 005 (a verification baseline should exist before reshaping the
  convert path; not strictly required, but strongly recommended)
- **Category**: direction
- **Planned at**: commit `6bfe2ba`, 2026-07-20

## Why this matters

`ROADMAP.md` lists this under **Next**: "stream FFmpeg progress over SSE and show
real progress bars instead of spinners for long video jobs." It is the only
"Next" item never turned into a plan. Today a video transcode gives the user a
bare `<Spinner/>` (`workbench.tsx:173`) for its entire duration — a two-minute
1080p job looks indistinguishable from a hang, and the user cannot tell whether
to wait or reload. Real percent progress is the single biggest perceived-quality
win for the exact jobs that feel slow.

The current conversion flow is a one-shot request: the client POSTs a file and
awaits the full binary blob (`use-workbench.ts:71-84`), and the server runs
FFmpeg to completion with a fully-buffered child process (`proc.ts:13-46`) before
returning bytes (`api/convert.ts:39-51`). Nothing about that flow can surface
intermediate progress. This plan reshapes it — carefully, and only for the media
conversions where progress is meaningful (image/archive/PDF conversions are
near-instant and keep the spinner).

## Current state

- `src/routes/api/convert.ts` — single POST: validates, calls `convert(...)`,
  returns `new Response(bytes, { content-type, content-disposition })`
  (`api/convert.ts:36-51`). No progress channel.
- `src/server/convert.ts` — dispatches by category; media (video/audio and some
  image cases) go through `convertMedia(...)` (`convert.ts:58`).
- `src/server/media.ts` — writes input to a temp dir, runs
  `ffmpeg -hide_banner -y -i in.<src> <args> out.<dst>` via `run(...)`, reads the
  output file back (`media.ts:189-240`). The FFmpeg arg builder is `argsFor`
  (`media.ts:10-187`).
- `src/server/proc.ts` — `run(cmd, args, timeoutMs=600_000)` spawns a child,
  **buffers all of stdout/stderr into strings**, resolves the buffered stdout on
  exit 0 (`proc.ts:13-46`). This is the exact reason no progress is available: it
  is buffer-to-completion by design.
- `src/hooks/use-workbench.ts:64-92` — `convertOne` POSTs the form and awaits
  `res.blob()`; the `Job` status goes `working` → `done`/`error`. There is no
  progress field.
- `src/components/workbench.tsx:17,173` — imports and renders `<Spinner/>` from
  `@/components/ui/spinner` while a job is `working`.
- A `Progress` component already exists at `src/components/ui/progress.tsx` —
  reuse it; do not add a progress-bar dependency.
- Engine override convention: `media.ts:6` reads `process.env.FFMPEG_PATH ??
  "ffmpeg"`. A duration probe needs the same pattern for `ffprobe` — add
  `FFPROBE_PATH ?? "ffprobe"`. `ffprobe` ships with the FFmpeg install already
  required by `AGENTS.md` and the Docker image.
- Error-message rule (`AGENTS.md`): user-facing responses/toasts must be short,
  plain, no stack traces or internal paths; operator detail goes to
  `console.error`. Existing pattern: `api/convert.ts:52-55`, `media.ts:209-234`.

## Recommended architecture (decide in Phase 0, confirm before Phase 1)

A single HTTP response cannot cleanly carry both a live progress stream and the
final binary. Use a **two-phase, jobId-based** flow, with progress kept in an
**ephemeral in-memory registry** (no database — this is not the deferred
persistent job queue; progress state is disposable and dies with the process):

1. `POST /api/convert` (unchanged URL) — accepts the file as today, but instead
   of blocking to completion it: creates a `jobId` (`crypto.randomUUID()`),
   starts the conversion in the background, stores
   `{ status, percent, result?, error? }` in a module-level `Map`, and returns
   `{ jobId }` as JSON immediately. **Non-media conversions may still run
   synchronously and return the blob directly** — keep a fast path (see Phase 2).
2. `GET /api/convert/progress?id=<jobId>` — an SSE endpoint (`text/event-stream`)
   that emits `percent` events as FFmpeg advances, then a terminal `done` or
   `error` event, then closes.
3. `GET /api/convert/result?id=<jobId>` — returns the finished binary with the
   existing `content-type` + `content-disposition` headers, then evicts the job
   from the registry.

Registry entries must self-evict: on completion start a `setTimeout` (e.g. 60s)
to delete the entry even if the client never fetches the result, so a crashed or
navigated-away client cannot leak buffers. Cap total concurrent in-flight jobs
and reject with a plain 503 ("Server is busy, try again shortly") past the cap.

Progress percent for FFmpeg: probe input duration first with
`ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 <in>`, then
run FFmpeg with `-progress pipe:1 -nostats` and parse the `out_time_us=` (or
`out_time_ms=`) lines from stdout; `percent = min(99, out_time / duration * 100)`.
Some inputs report no duration — in that case emit an **indeterminate** progress
signal and let the UI fall back to the spinner for that job.

> If, during Phase 0, you find a materially simpler approach that still delivers
> real percent progress (e.g. the TanStack Start server handler can stream a
> multipart response the client can parse incrementally), STOP and report it as a
> design alternative before building — do not silently switch architectures.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `bunx tsc --noEmit` | exit 0, no errors |
| Check (biome) | `bun run check` | exit 0 |
| Tests | `bun run test` | all pass |
| Dev server | `bun run dev` | serves on :3000 |
| Build | `bun run build` | exit 0 |
| ffprobe present | `ffprobe -version` | prints version |

## Scope

**In scope** (expected to change/create):

- `src/routes/api/convert.ts` — return jobId / keep sync fast path
- `src/routes/api/convert.progress.ts` (create) — SSE endpoint
- `src/routes/api/convert.result.ts` (create) — result fetch
- `src/server/convert-jobs.ts` (create) — the in-memory registry + eviction
- `src/server/media.ts` — add a progress-emitting variant of `convertMedia`
- `src/server/proc.ts` — add a streaming runner (do not break existing `run`)
- `src/hooks/use-workbench.ts` — drive the three-step flow, track `percent`
- `src/components/workbench.tsx` — render `Progress` when percent is known
- Test files for the new pure logic (progress parsing, duration parsing)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- Persistent/queued jobs surviving a reload — that is a separate deferred
  roadmap item; this registry is ephemeral only.
- Non-media conversions' behavior beyond keeping them working (image/archive/PDF
  may remain synchronous).
- Rate-limit / size-cap logic in `src/server/limits.ts` (call it as today).
- The downloader, screenshot, or any tool other than the file converter.

## Git workflow

- Branch: `feat/conversion-progress`
- Conventional commits, e.g. `feat(convert): stream ffmpeg progress over SSE`.
  Commit per phase so the spike is reviewable independently.
- Do not push or open a PR unless instructed.

## Phases

### Phase 0 — Spike: prove FFmpeg progress parsing (REPORT BEFORE CONTINUING)

Goal: confirm the mechanism works before touching request plumbing.

1. In a throwaway script (or a `*.spike.ts` you delete before finishing), spawn
   `ffprobe` to read a sample video's duration, then spawn `ffmpeg` with
   `-progress pipe:1 -nostats` on a real transcode and log parsed percent values
   as they arrive.
2. Confirm: duration parses; `out_time_us`/`out_time_ms` lines arrive
   incrementally; percent climbs 0→~100; and an input with no duration is
   detectable.

**Verify / report**: paste 5–10 sample parsed percent lines and the chosen
architecture decision (the recommended two-phase flow, or a justified
alternative) into your status update. **STOP here and report** — do not begin
Phase 1 until the mechanism is confirmed. If `-progress` output differs from the
assumptions above, that is expected feedback, not a failure.

### Phase 1 — Streaming runner + progress-emitting media conversion

Add to `src/server/proc.ts` a new exported function (leave `run` untouched) that
spawns a child and invokes an `onLine(line: string)` callback for each stdout
line, still rejecting with `ProcError` on non-zero exit. In `src/server/media.ts`
add `convertMediaWithProgress(input, src, dst, quality, onPercent)` that probes
duration (via `FFPROBE_PATH ?? "ffprobe"`), runs FFmpeg with `-progress pipe:1
-nostats`, translates progress lines to percent, and calls `onPercent`. Keep the
existing `convertMedia` for callers that don't need progress. Put the pure
line→percent parsing in a small exported helper so it is unit-testable without
spawning a process.

**Verify**: `bunx tsc --noEmit` → exit 0; unit test for the parser passes
(`bun run test`).

### Phase 2 — Job registry + endpoints

Create `src/server/convert-jobs.ts` (the `Map`, create/get/complete/evict, TTL
timeout, concurrency cap). Rework `src/routes/api/convert.ts`: media targets go
async and return `{ jobId }`; keep a synchronous fast path returning the blob
directly for instant conversions (image/archive/pdf) so those need no polling.
Add `convert.progress.ts` (SSE: `text/event-stream`, emit `percent`/`done`/
`error`, close on terminal) and `convert.result.ts` (stream the buffered result,
then evict). All error responses stay short and user-facing per `AGENTS.md`.

**Verify**: `bunx tsc --noEmit` → 0; `bun run check` → 0. With `bun run dev`,
convert a video and confirm (browser Network tab) the POST returns a jobId and
the SSE stream emits rising percents ending in `done`.

### Phase 3 — Client flow + progress UI

Add `percent?: number` to `Job` in `workbench.tsx`. In `use-workbench.ts`,
`convertOne` for media: POST → read `{ jobId }` → open `EventSource` on
`/api/convert/progress?id=…`, update `percent` on each event, on `done` GET the
result blob and set `outUrl/outName/outSize` as today, on `error` set the job to
`error` with a short message. Preserve the synchronous fast path for non-media
(unchanged behavior). In `workbench.tsx`, render the existing `Progress`
component when `percent` is a number; fall back to `<Spinner/>` when it is
undefined (instant jobs, or media with unknown duration). Always revoke
`EventSource`/object URLs on job removal/clear (extend the existing revoke logic
at `use-workbench.ts:49-62`).

**Verify**: `bunx tsc --noEmit && bun run check && bun run test && bun run build`
→ all exit 0. Manual: in `bun run dev`, a video conversion shows a moving
progress bar; an image conversion still shows the spinner and completes; removing
a job mid-conversion closes its stream (no console errors).

## Test plan

- New unit tests (pure, no process spawn):
  - progress line → percent parser: parses `out_time_us`/`out_time_ms`, clamps
    at 99 pre-completion, handles missing/zero duration (indeterminate).
  - `ffprobe` duration-output parser: valid float, empty/`N/A` → null.
- Model structure after `src/components/speedometer.test.tsx` (Vitest
  `describe`/`it`/`expect`); parser tests need no jsdom.
- Endpoint/registry behavior is validated manually in Phases 2–3 (the dev-server
  checks above). Do not attempt to spawn real FFmpeg in unit tests.
- Verification: `bun run test` → all pass including new parser tests.

## Done criteria

ALL must hold:

- [ ] Phase 0 spike results and the architecture decision were reported.
- [ ] Video/audio conversions display a real, rising percent progress bar in the
      workbench.
- [ ] Image/archive/PDF conversions still work and still show the spinner (no
      regression, no polling added to the instant path).
- [ ] Media with no probable duration falls back to the spinner rather than a
      stuck 0%.
- [ ] Job registry entries self-evict after completion/timeout; no unbounded
      growth (verify eviction logic exists and a concurrency cap rejects with a
      plain 503).
- [ ] All error responses/toasts are short and user-facing (no stack traces /
      paths); operator detail is in `console.error`.
- [ ] `bunx tsc --noEmit`, `bun run check`, `bun run test`, `bun run build` all
      exit 0.
- [ ] Only in-scope files modified; `plans/README.md` status updated.

## STOP conditions

Stop and report back (do not improvise) if:

- Phase 0 shows FFmpeg `-progress` does not emit incrementally in this
  environment, or `ffprobe` is unavailable (`ffprobe -version` fails).
- You find a materially simpler architecture than the two-phase flow (report it
  as a design alternative before building).
- The TanStack Start server-route API cannot express an SSE (`text/event-stream`)
  response or a JSON-then-binary two-step cleanly — report the constraint.
- Reshaping `/api/convert` would break the existing rate-limit/size-cap calls or
  the synchronous non-media path.
- Any verification fails twice after a reasonable correction, or the change would
  require an out-of-scope file.

## Maintenance notes

- The in-memory registry ties progress state to a single server process. If
  Recast is ever run multi-process/replicated behind a load balancer, the SSE
  request and the result fetch must land on the same instance (sticky routing) or
  the registry must move to shared storage — call this out in any deploy/scaling
  work. This is also the natural seam where the deferred **persistent job queue**
  roadmap item would later plug in.
- A reviewer should scrutinize: buffer lifetime (results must be evicted even if
  the client disappears), the concurrency cap, and that no operator-facing FFmpeg
  stderr leaks into a user response.
- If Plan 001 (batch ZIP save) lands first, note it also touches
  `use-workbench.ts` and the `Job` shape — rebase around its `outBlob` field.
