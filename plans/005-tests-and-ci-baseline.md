# Plan 005: Establish a verification baseline — format-matrix tests + GitHub Actions CI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update this plan's row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 1cc4389..HEAD -- src/lib/formats.ts src/lib/formats.test.ts .github/workflows package.json`
> Then run the same command without `1cc4389..HEAD` to detect uncommitted
> overlap. If an in-scope file changed, compare the excerpts below with live
> code; a semantic mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW-MED — adds tests + CI; also clears pre-existing biome debt so
  the CI `check` step is green (small, mostly auto-fixable code touches)
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `1cc4389`, refreshed 2026-07-20
- **Refined after execution attempt (2026-07-20)**: the first executor run
  completed the tests + workflow correctly but hit a STOP condition — the base
  tree already fails `bun run check` (biome) on 5 out-of-scope files, so a CI
  workflow whose first step is `bun run check` would be red on the first push.
  Scope is now extended to fix that pre-existing debt so CI ships green. See
  Step 2b.

## Why this matters

The committed repository has three focused test files for paste highlighting
and search, but the conversion-format core still has no coverage and there is
**no CI** (`.github/` has no `workflows/`). This is a publicly deployed app
(`recast.serhiifotex.dev`, used by people other than the owner per `AGENTS.md`)
whose stated trajectory is to be "shared publicly as an open-source,
self-hostable alternative" (`VISION.md:34`). The paste tests do not protect the
conversion matrix used by plans 001, 002, and 006, and a contributor still has
no green repository check to trust.

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
- Pure-test style to match — `src/lib/paste-search.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parsePasteSearch } from "./paste-search";
```

  `formats.ts` is also pure logic, so its test needs **no** `jsdom` pragma —
  import `{ describe, expect, it }` from `vitest` and the functions from
  `@/lib/formats`.
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
- Biome-debt fixes ONLY (Step 2b) in these five pre-existing files — the change
  in each is limited strictly to what `bun run check` flags, nothing else:
  - `biome.json` — `$schema` version bump + trailing-newline format
  - `.vscode/settings.json` — reformat (biome's tab indent)
  - `vite.config.ts` — organize imports + format
  - `src/routes/dig.tsx` — one optional-chain lint fix (line ~95)
  - `src/routes/tokenizer.tsx` — one `useSemanticElements` a11y fix (line ~122)

**Out of scope** (do NOT touch):

- `src/lib/formats.ts` — this plan tests it, it does not change it. If a test
  reveals a genuine bug, that is a STOP-and-report condition, not a fix to make
  here.
- Any conversion engine code (`src/server/*`). Do not touch routes/components
  other than the two named above, and in those two make ONLY the specific biome
  fix — no refactors, renames, or drive-by changes.
- Adding tests that shell out to `ffmpeg`, `sharp`, `bsdtar`, `yt-dlp`, or
  `playwright` — engine-dependent tests are explicitly deferred (see
  Maintenance notes) so CI stays fast and hermetic.
- Adding new npm/bun dependencies. `vitest` and `@testing-library` are already
  present.
- Disabling any biome rule globally in `biome.json` or dropping the `check` step
  from CI to "make it pass" — a single documented `// biome-ignore` on one line
  is acceptable where a real fix carries visual/behavioral risk (see Step 2b).

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

### Step 2b: Clear the pre-existing biome debt so `bun run check` passes

The base tree fails `bun run check` on 5 files unrelated to this plan; the CI
`check` step (and the "`check` exits 0" done criterion) cannot pass until they
are clean. Fix ONLY what biome flags, in this order:

1. **`biome.json` `$schema` version** — the URL pins `2.2.4` but the installed
   CLI is `2.4.5` (`@biomejs/biome` in `package.json`). Change the schema URL's
   version segment `2.2.4` → `2.4.5`. (Do not run `biome migrate` — it may
   rewrite unrelated config; make the one-token edit.)
2. **Auto-fixable formatting + imports** — run `bunx biome check --write`. This
   safely reformats `biome.json`, `.vscode/settings.json`, and `vite.config.ts`
   and organizes `vite.config.ts` imports. It applies **safe** fixes only.
3. **`src/routes/dig.tsx:~95` `useOptionalChain`** — biome marks this an *unsafe*
   fix (it changes `result !== null && result.records.every(...)` to
   `result?.records.every(...)`, whose type becomes `boolean | undefined`).
   Apply it, then confirm `bunx tsc --noEmit` still exits 0. If tsc now errors
   because `allEmpty` is consumed as a strict `boolean`, revert to the explicit
   form and add a single-line `// biome-ignore lint/complexity/useOptionalChain:
   keeps allEmpty strictly boolean` above line 95 instead.
4. **`src/routes/tokenizer.tsx:~122` `useSemanticElements`** — biome wants the
   `<div role="group" aria-label="Model">` changed to `<fieldset>`. A naive
   swap risks breaking the surrounding flex layout (`<fieldset>` carries default
   margin/padding/min-width). Preferred: only change it to `<fieldset>` if you
   can keep the exact classes AND the layout is visually unchanged — but you
   cannot verify visuals here, so **default to** adding a single-line
   `// biome-ignore lint/a11y/useSemanticElements: role="group" + aria-label is
   valid ARIA; <fieldset> breaks the flex row layout` above line 122. This is a
   targeted, documented suppression of one stylistic rule — NOT disabling the
   rule globally.

**Verify**: `bun run check` → exit 0 (no errors, no warnings); `bunx tsc
--noEmit` → exit 0; `bun run test` → all pass (confirms the dig.tsx change didn't
break anything).

### Step 3: Run the full local gate set

Confirm nothing regressed and only in-scope files changed.

**Verify**: `bun run check && bunx tsc --noEmit && bun run test && bun run build`
→ all exit 0; `git status --short` lists only the in-scope files:
`src/lib/formats.test.ts`, `.github/workflows/ci.yml`, `biome.json`,
`.vscode/settings.json`, `vite.config.ts`, `src/routes/dig.tsx`, and
`src/routes/tokenizer.tsx` (plus any pre-existing untracked files you did not
create). Nothing else.

## Test plan

- New file: `src/lib/formats.test.ts`, structured with Vitest
  `describe`/`it`/`expect` (model after `src/lib/paste-search.test.ts`).
- Cases: the enumerated matrix in Step 1 — normalization/aliases/multi-ext,
  target lists per category incl. the `gif` and archive special cases, defaults,
  quality-knob rules, byte formatting boundaries.
- Verification: `bun run test` → all pass, including the new `formats` suite
  alongside the existing paste suites.

## Done criteria

ALL must hold:

- [ ] `src/lib/formats.test.ts` exists and covers every function listed in Step 1.
- [ ] `.github/workflows/ci.yml` exists, uses Bun, and runs check + typecheck +
      test + build.
- [ ] `bun run check` exits 0 (biome debt from Step 2b cleared).
- [ ] `bunx tsc --noEmit` exits 0.
- [ ] `bun run test` exits 0 with the new tests passing.
- [ ] `bun run build` exits 0.
- [ ] Every edit to `dig.tsx`/`tokenizer.tsx`/`vite.config.ts`/`biome.json`/
      `.vscode/settings.json` is limited to what biome flagged — no unrelated
      changes (reviewer will read the diff).
- [ ] `git status --short` shows only the in-scope files.
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
