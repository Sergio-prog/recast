# Plan 007: Add one client-side developer utility (spike — Encode & Hash)

> **Executor instructions**: This is a **spike**: ship exactly ONE small tool,
> fully client-side, and stop. Do not build a suite. Follow the steps, run every
> verification command, and honor the "STOP conditions". When done, update this
> plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 6bfe2ba..HEAD -- src/routes/__root.tsx src/components/tool-directory.tsx src/routes/tokenizer.tsx`
> Then the same without `6bfe2ba..HEAD` for uncommitted overlap. If an in-scope
> file changed, compare the excerpts below with live code before proceeding.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW — new self-contained route; no server, no dependencies
- **Depends on**: none (do 005 first if you want CI to cover it)
- **Category**: direction
- **Planned at**: commit `6bfe2ba`, 2026-07-20

## Why this matters

Recast's tools skew toward a developer/technical audience — tokenizer, DNS dig,
IP inspector — and the tokenizer itself was absorbed from a separate project
(`git log`: `feat(tokenizer): merge ultra-tokenizer as a client-side tool`). The
obvious daily-driver gap for that audience is a small **encode / decode / hash**
utility (Base64, URL, hex, and SHA hashing) — the kind of thing developers
currently bounce to a random ad-filled website for, pasting text they'd rather
not hand to a stranger's server.

This fits the product exactly: it can run **100% in the browser** with **zero new
dependencies** (`btoa`/`atob`, `TextEncoder`, and the Web Crypto `crypto.subtle`
API already available), so it honors `VISION.md:44-46` ("every tool must work
fully self-hosted… never [send] user files [for] processing") more literally than
any server tool.

**This is a spike, on purpose.** `VISION.md:47-48` says "a tool earns its place by
being used… not a feature checklist." So: build the one tool, live with it, and
only expand (JSON formatter, JWT decode, diff, …) if you actually reach for more.
Do not pre-build a suite.

## Current state

- Standalone client-side tools are TanStack Start file routes that mark
  themselves `component`-only with a page `<title>`. Pattern to copy —
  `src/routes/tokenizer.tsx:15-18`:

```tsx
export const Route = createFileRoute("/tokenizer")({
	head: () => ({ meta: [{ title: "Tokenizer — Recast" }] }),
	component: TokenizerPage,
});
```

  The tokenizer persists UI state to `localStorage` under the `recast:` prefix
  (`tokenizer.tsx:35-46`) — reuse that convention if you persist anything.
- The route is discoverable from two places, both of which the new tool must be
  added to:
  1. Home directory grid — `src/components/tool-directory.tsx`. The `TOOLS`
     array (lines 37–97) holds `{ to, label, blurb, icon }` entries rendered as
     cards. Icons come from `@phosphor-icons/react` (imported at the top,
     lines 1–17). Add one entry.
  2. Top nav — `src/routes/__root.tsx`. Simple links live in `NAV`
     (`__root.tsx:117-124`) and `TAIL_NAV` (`__root.tsx:133-137`, currently
     Download / Currency / Tokenizer). Add the tool to `TAIL_NAV`.
- Available shadcn UI components (`src/components/ui/`): `button`, `card`,
  `input`, `label`, `select`, `tabs`, `toggle-group`, `badge`, `separator`,
  `tooltip`, `sonner` (toasts). There is **no** `textarea` component — use a
  native `<textarea>` styled with the repo's Tailwind classes (mirror the
  `Input` component's border/background/rounded classes for consistency).
- Import alias: `@/*` → `./src/*` (`tsconfig.json:7-10`).
- Copy/error tone (`AGENTS.md`): plain, user-facing; no stack traces. A failed
  Base64 decode should show a short inline message, not throw.

## Concrete tool to build: "Encode & Hash"

A single page at `/encode` with two sections:

1. **Transform** — a text input, a mode selector (`toggle-group` or `tabs`), and
   a live output box. Modes:
   - Base64 encode / decode (UTF-8 safe: encode via
     `btoa(String.fromCharCode(...new TextEncoder().encode(text)))` or
     equivalent; decode with the inverse; on malformed input show
     "Not valid Base64" inline).
   - URL encode / decode (`encodeURIComponent` / `decodeURIComponent`).
   - Hex encode / decode (bytes ↔ lowercase hex).
2. **Hash** — the same input text hashed with Web Crypto
   `crypto.subtle.digest`, shown as hex, for `SHA-1`, `SHA-256`, `SHA-384`,
   `SHA-512` (all supported by `crypto.subtle`; **do not** add MD5 — it is not in
   the Web Crypto API and would require a dependency, which is out of scope).

Everything runs in the browser on input change (debounce if you like — a
`use-debounced` hook exists at `src/hooks/use-debounced.ts`). No network call, no
server route. Put the pure transform/hash-hex helpers in
`src/lib/encode.ts` so they are unit-testable without the DOM.

> **Escape hatch**: if you (the operator) would rather this first spike be a JSON
> formatter/validator instead of Encode & Hash, the scaffold (route + nav +
> directory entry + a `src/lib/*.ts` helper + its test) is identical — swap the
> page body and helpers. Decide before Step 2; do not build both.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `bunx tsc --noEmit` | exit 0 |
| Generate routes | `bun run generate-routes` | regenerates the route tree, exit 0 |
| Check (biome) | `bun run check` | exit 0 |
| Targeted tests | `bun run test -- src/lib/encode.test.ts` | all pass |
| Full tests | `bun run test` | all pass |
| Dev server | `bun run dev` | serves on :3000 |
| Build | `bun run build` | exit 0 |

## Scope

**In scope** (create/modify):

- `src/routes/encode.tsx` (create) — the page + route
- `src/lib/encode.ts` (create) — pure transform + hash-hex helpers
- `src/lib/encode.test.ts` (create) — unit tests for the helpers
- `src/components/tool-directory.tsx` — add one `TOOLS` entry (+ its icon import)
- `src/routes/__root.tsx` — add to `TAIL_NAV`
- The generated route tree (`src/routeTree.gen.ts` or similar) — via
  `bun run generate-routes`, not hand-edited
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- Any server route or `src/server/*` — this tool has no backend.
- Adding npm/bun dependencies (no crypto-hash, no clipboard, no JSON libs). Use
  Web platform APIs only.
- A second/third utility. One tool, then stop (this is a spike).
- Hashing algorithms outside `crypto.subtle`'s set (no MD5).
- README / VISION / ROADMAP doc edits (do those separately if the tool sticks).

## Git workflow

- Branch: `feat/encode-tool`
- Conventional commit, e.g. `feat(encode): client-side base64/url/hex + hashing`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Pure helpers + tests

Create `src/lib/encode.ts` exporting pure functions: `base64Encode`/
`base64Decode` (UTF-8 safe), `hexEncode`/`hexDecode`, and `sha(algo, text)`
returning a lowercase hex string via `crypto.subtle.digest`. Decoders return a
discriminated result (e.g. `{ ok: true, value } | { ok: false }`) rather than
throwing, so the UI can render a plain inline error.

Create `src/lib/encode.test.ts` (Vitest, no jsdom needed for the string
transforms; `crypto.subtle` is available in the Vitest/Node environment for the
SHA test — if it is not, mark the SHA test `it.skip` and note it). Cover:
round-trips (`decode(encode(x)) === x`) for Base64/hex including a
non-ASCII string (e.g. "café 🚀"); malformed Base64/hex → `{ ok: false }`;
`sha("SHA-256","abc")` equals the known digest
`ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`.

**Verify**: `bun run test -- src/lib/encode.test.ts` → all pass;
`bunx tsc --noEmit` → exit 0.

### Step 2: The route/page

Create `src/routes/encode.tsx` following the `tokenizer.tsx` route shape (a
`head` with `{ title: "Encode & Hash — Recast" }` and a `component`). Build the
Transform + Hash UI described above using existing shadcn components and a native
styled `<textarea>`. Match the visual language of an existing tool page (spacing,
`font-mono` labels, `text-muted-foreground`) — open `src/routes/tokenizer.tsx`
or `src/routes/ip.tsx` and mirror the container/heading structure. Run
`bun run generate-routes` so the route is registered.

**Verify**: `bun run generate-routes` → exit 0; `bunx tsc --noEmit` → exit 0.
Then `bun run dev`, open `/encode`, and confirm: typing updates all outputs live;
a bad Base64 input shows the inline error, not a crash; the four SHA digests
render.

### Step 3: Make it discoverable

Add an entry to the `TOOLS` array in `src/components/tool-directory.tsx`
(`{ to: "/encode", label: "Encode & Hash", blurb: "Base64, URL and hex encode/decode, plus SHA hashing — all in your browser.", icon: … }`)
and import a fitting Phosphor icon (e.g. `HashIcon` or `CodeIcon`) alongside the
existing icon imports. Add `{ to: "/encode", label: "Encode" }` to `TAIL_NAV` in
`src/routes/__root.tsx`.

**Verify**: `bunx tsc --noEmit` → exit 0; in `bun run dev`, the home page shows
the new card and the top nav shows the link, both routing to `/encode`.

### Step 4: Full gates

**Verify**: `bun run check && bun run test && bun run build` → all exit 0;
`git status --short` shows only in-scope files (plus the generated route tree).

## Test plan

- New file `src/lib/encode.test.ts` (model after
  `src/components/speedometer.test.tsx`, minus jsdom for the string transforms).
- Cases: Base64 and hex round-trips incl. non-ASCII; malformed decode →
  `{ ok: false }`; known SHA-256 vector for `"abc"`.
- The page itself is verified manually via the dev-server checks (no component
  test required for this spike).
- Verification: `bun run test` → all pass including the new `encode` suite.

## Done criteria

ALL must hold:

- [ ] `/encode` route exists and renders; state updates live; bad input shows a
      plain inline error (no crash, no stack trace).
- [ ] All transforms and hashes run client-side — no network request fires on
      use (confirm via the browser Network tab).
- [ ] No new dependency added (`git diff package.json bun.lock` shows no change).
- [ ] The tool appears in the home directory grid AND the top nav.
- [ ] `bunx tsc --noEmit`, `bun run check`, `bun run test`, `bun run build` all
      exit 0; new `encode` tests pass.
- [ ] Only in-scope files changed; `plans/README.md` status updated.

## STOP conditions

Stop and report back (do not improvise) if:

- `bun run generate-routes` is not how routes are registered in the live repo
  (the drift check or `tsr.config.json` disagrees) — report the actual method.
- `crypto.subtle` is unavailable in the target runtime and hashing cannot be done
  without a dependency (report; consider shipping encode/decode only).
- Delivering the tool seems to require a server route or a new dependency
  (it should not — if it does, the scope is wrong; report).
- Any verification fails twice after a reasonable correction.
- You feel the urge to add a second utility — stop; that is a follow-up decision
  for the operator, not this spike.

## Maintenance notes

- This is deliberately minimal. Whether to grow it (JSON format/validate, JWT
  decode, text diff, timestamp converter) is an **operator decision based on
  actual use**, per `VISION.md:47-48` — not an automatic next step. If it grows,
  keep every transform client-side and each pure helper in `src/lib/` with a test.
- A reviewer should confirm zero network activity on the page and that no
  dependency crept in.
- If a shared `textarea` shadcn component is later added, migrate this page's raw
  `<textarea>` to it for consistency.
