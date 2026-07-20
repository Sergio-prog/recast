# Plan 005: Establish a verification baseline — format-matrix tests + GitHub Actions CI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update this plan's row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 6bfe2ba..HEAD -- src/lib/formats.ts src/lib/formats.test.ts .github/workflows package.json`
> Then run the same command without `6bfe2ba..HEAD` to detect uncommitted
> overlap. If an in-scope file changed, compare the excerpts below with live
> code; a semantic mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW — adds tests and CI only; touches no runtime code paths
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `6bfe2ba`, 2026-07-20

## Why this matters

The whole repository has exactly one test file (`src/components/speedometer.test.tsx`)
and **no CI** (`.github/` contains only screenshots — no `workflows/`). This is
a publicly deployed app (`recast.serhiifotex.dev`, used by people other than the
owner per `AGENTS.md`) whose stated trajectory is to be "shared publicly as an
open-source, self-hostable alternative" (`VISION.md:34`). Two things follow:
every other plan in this directory (001–004, 006, 007) currently executes with
no automated safety net, and a would-be contributor has no green check to trust.

This plan installs the missing gate cheaply. `src/lib/formats.ts` is the pure,
deterministic core of the conversion product (which target formats are offered
for each source, how extensions normalize, quality-knob rules) and needs **no
external engine** to test — it is the highest-value, lowest-cost place to start.
CI then runs the existing `biome check`, `tsc`, `vitest`, and `build` scripts on
every push and PR.

## Current state

- `package.json` scripts already define every gate this plan wires into CI:

```json
// package.json:8-19
"scripts": {
	"dev": "vite dev --port 3000",
	"build": "vite build",
	"start": "bun server.mjs",
	"test": "vitest run",
	"format": "biome format",
	"lint": "biome lint",
	"check": "biome check"
}
```

- The runtime is **Bun**; the lockfile is `bun.lock`. There is no `pnpm-lock.yaml`
  despite a `pnpm` block in `package.json` — CI must use Bun.
- `src/lib/formats.ts` is pure and exports the functions to test. Key behaviors to
  pin (read the file to confirm before asserting):
  - `normalizeExt(filename)` — lowercases, resolves multi-extensions
    (`.tar.gz`), applies `ALIASES` (`jpeg→jpg`, `heif→heic`, `mpeg→mpg`,
    `tif→tiff`, …), returns `""` for unknown types (`formats.ts:73-81`).
  - `replaceExt(filename, target)` — preserves multi-extension stems, e.g.
    `replaceExt("a.tar.gz","zip")` → `"a.zip"` (`formats.ts:83-91`).
  - `targetsFor(src)` — per-category target lists; `gif` additionally offers
    `mp4`/`webm`/`pdf`; archives exclude the source format itself; `pdf`
    (document) offers only `png`/`jpg` (`formats.ts:98-115`).
  - `defaultTargetFor(src)` — from the `DEFAULT_TARGET` map, falling back to the
    first target (`formats.ts:155-157`).
  - `hasQualityKnob(target)` — false for archive, document, and the `LOSSLESS`
    set (`wav`, `flac`) (`formats.ts:159-169`).
  - `formatBytes(n)` — `1023`→`"1023 B"`, `1024`→`"1.0 KB"`, rounds ≥100
    (`formats.ts:225-235`).
- Test style to match — `src/components/speedometer.test.tsx`:

```tsx
// src/components/speedometer.test.tsx:1-9
// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
```

  `formats.ts` is pure logic, so its test needs **no** `jsdom` pragma — import
  `{ describe, expect, it }` from `vitest` and the functions from `@/lib/formats`.
- Import alias: `@/*` maps to `./src/*` (`tsconfig.json:7-10`).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `bunx tsc --noEmit` | exit 0, no errors |
| Targeted tests | `bun run test -- src/lib/formats.test.ts` | all tests pass |
| Check (biome) | `bun run check` | exit 0 |
| Full tests | `bun run test` | all tests pass |
| Build | `bun run build` | exit 0 |
| YAML sanity | `bunx --yes js-yaml .github/workflows/ci.yml` | prints parsed YAML, exit 0 |

## Scope

**In scope** (the only files to create/modify):

- `src/lib/formats.test.ts` (create)
- `.github/workflows/ci.yml` (create)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch):

- `src/lib/formats.ts` — this plan tests it, it does not change it. If a test
  reveals a genuine bug, that is a STOP-and-report condition, not a fix to make
  here.
- Any conversion engine code (`src/server/*`), routes, or components.
- Adding tests that shell out to `ffmpeg`, `sharp`, `bsdtar`, `yt-dlp`, or
  `playwright` — engine-dependent tests are explicitly deferred (see
  Maintenance notes) so CI stays fast and hermetic.
- Adding new npm/bun dependencies. `vitest` and `@testing-library` are already
  present.

## Git workflow

- Branch: `test/formats-and-ci`
- Conventional commits, e.g. `test(formats): cover format matrix logic` and
  `ci: add bun test/lint/build workflow`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Write pure unit tests for the format matrix

Create `src/lib/formats.test.ts`. No `jsdom` pragma. Import the functions under
test from `@/lib/formats`. Cover at least these cases (read `formats.ts` first
and assert against its actual behavior — the list below is the intent, confirm
exact values):

- `normalizeExt`: `"Photo.JPEG"`→`"jpg"`; `"a.tar.gz"`→`"tar.gz"`;
  `"clip.mpeg"`→`"mpg"`; `"x.heif"`→`"heic"`; `"file.xyz"`→`""`;
  `"noext"`→`""`.
- `replaceExt`: `"a.tar.gz"→"zip"` = `"a.zip"`; `"photo.PNG"→"webp"` =
  `"photo.webp"`.
- `targetsFor`: `"gif"` includes `"mp4"`, `"webm"`, and `"pdf"`; `"png"`
  includes `"pdf"` but not `"mp4"`; `"zip"` excludes `"zip"` itself but
  includes `"tar.gz"`; `"pdf"` equals `["png","jpg"]`; an unknown ext returns
  `[]`.
- `defaultTargetFor`: `"gif"`→`"mp4"`; `"heic"`→`"jpg"`; unknown ext returns
  `""`.
- `hasQualityKnob`: true for `"mp4"` and `"jpg"`; false for `"wav"`, `"flac"`,
  `"zip"`, `"pdf"`, and an unknown target.
- `formatBytes`: `0`→`"0 B"`; `1023`→`"1023 B"`; `1024`→`"1.0 KB"`;
  `1048576`→`"1.0 MB"`; a value ≥100 in a unit is rounded (e.g. `150000` →
  `"146 KB"` — confirm the exact string from the implementation).

**Verify**: `bun run test -- src/lib/formats.test.ts` → all tests pass; then
`bunx tsc --noEmit` → exit 0.

### Step 2: Add the GitHub Actions CI workflow

Create `.github/workflows/ci.yml` that runs on `push` and `pull_request`,
installs Bun, restores dependencies with the committed lockfile, and runs the
existing gates. Target shape:

```yaml
name: CI
on:
  push:
  pull_request:
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run check
      - run: bunx tsc --noEmit
      - run: bun run test
      - run: bun run build
```

Notes for the executor:
- Do **not** invent versions for the third-party actions beyond those shown;
  `actions/checkout@v4` and `oven-sh/setup-bun@v2` are the current majors.
- Keep it a single job — the build step depends on the same install.
- If `bun install --frozen-lockfile` is the wrong flag name for the installed
  Bun, use `bun install` (the lockfile is committed either way). Do not switch
  to npm/pnpm.

**Verify**: `bunx --yes js-yaml .github/workflows/ci.yml` → parses without error
(prints the document). This checks YAML validity locally; the workflow itself
runs on GitHub after push.

### Step 3: Run the full local gate set

Confirm nothing regressed and only in-scope files changed.

**Verify**: `bun run check && bunx tsc --noEmit && bun run test && bun run build`
→ all exit 0; `git status --short` lists only `src/lib/formats.test.ts`,
`.github/workflows/ci.yml`, and `plans/README.md`.

## Test plan

- New file: `src/lib/formats.test.ts`, structured with Vitest
  `describe`/`it`/`expect` (model after `src/components/speedometer.test.tsx`,
  minus the jsdom pragma since this is pure logic).
- Cases: the enumerated matrix in Step 1 — normalization/aliases/multi-ext,
  target lists per category incl. the `gif` and archive special cases, defaults,
  quality-knob rules, byte formatting boundaries.
- Verification: `bun run test` → all pass, including the new `formats` suite
  alongside the existing `Speedometer` suite.

## Done criteria

ALL must hold:

- [ ] `src/lib/formats.test.ts` exists and covers every function listed in Step 1.
- [ ] `.github/workflows/ci.yml` exists, uses Bun, and runs check + typecheck +
      test + build.
- [ ] `bun run check` exits 0.
- [ ] `bunx tsc --noEmit` exits 0.
- [ ] `bun run test` exits 0 with the new tests passing.
- [ ] `bun run build` exits 0.
- [ ] `git status --short` shows only the three in-scope files.
- [ ] `plans/README.md` status row for 005 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- A `formats.ts` test reveals behavior that looks like a genuine bug (the fix
  belongs in a separate plan, not here).
- `bun run build` fails for reasons unrelated to this change (e.g. it needs a
  native engine or network at build time) — report the exact error; do not
  weaken the workflow to make it pass.
- The live `formats.ts` API differs from the excerpts above (drift).
- Any verification command fails twice after a reasonable correction.
- Making CI pass would require touching an out-of-scope file.

## Maintenance notes

- **Deferred deliberately**: engine-dependent conversion tests (real
  `ffmpeg`/`sharp`/`bsdtar` round-trips) and Playwright e2e for the workbench.
  Those need engines installed in the runner and belong in a follow-up once this
  hermetic baseline is green — see `ROADMAP.md` "Tests & CI".
- When engine tests are added later, give them a **separate CI job** with the
  engines installed (`apt-get install ffmpeg`, etc.) so the fast logic job still
  gates most PRs quickly.
- A reviewer should confirm CI is actually required on the default branch's
  protection rules (a GitHub setting, not a repo file) so the check can't be
  bypassed.
- If `formats.ts` gains formats or changes `targetsFor` logic, the matrix tests
  here must be updated in the same PR.
</content>
</invoke>
