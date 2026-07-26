# Plan 008: Rebuild the /encode page around one mode selector and a swap

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before continuing. Touch
> only the files listed as in scope. Honor the STOP conditions; do not
> improvise. This is a **UI rework of an existing page** — no new behavior, no
> new dependencies, no server code.
>
> **Drift check (run first)**:
> `git diff --stat 473ed3b..HEAD -- src/routes/encode.tsx src/lib/encode.ts src/lib/encode.test.ts`
> Then the same without `473ed3b..HEAD` for uncommitted overlap. If
> `src/routes/encode.tsx` differs from the excerpt below, STOP and report.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW — presentation-layer rework of one route; pure helpers unchanged
- **Depends on**: 007 (this rebuilds the page 007 shipped)
- **Category**: DX / direction
- **Planned at**: commit `473ed3b` on branch `feat/encode-tool`, 2026-07-26
- **Branch**: continue on `feat/encode-tool` — this updates open PR #3

## Why this matters

The maintainer's verdict on the page 007 shipped: *"having Transform, Hashing,
Method select and Encode/decode select is a bad UX. It's just hard to use,
especially these two selects in one row."*

That is correct, and the failure is specific. The current page asks the user to
answer **three** questions to perform **one** action:

1. Which section applies to me — Transform or Hash? (Both are always open.)
2. Which codec? (Toggle group A.)
3. Which direction? (Toggle group B.)

Groups A and B are rendered as **visually identical unlabelled `ToggleGroup`s
sitting adjacent in a card header**. Nothing distinguishes them at a glance, so
the user learns which is which by clicking one and watching what changes. That
is the core defect. Compounding it, Transform and Hash are presented as
co-equal permanently-visible cards, so the page never commits to the one thing
the user came to do.

There is direct precedent in this repo for the fix. Commit `50cdb23`
(*"refactor(pdf): present the three tools as tabs instead of step-like cards"*)
solved the same shape on `/pdf`: one tab row selects the mode, each mode gets
one panel. This plan applies that same resolution to `/encode`.

## Design direction (follow this exactly)

Collapse three decisions into one, and lay the page out along the metaphor this
audience already holds for the task — a shell pipe, `echo -n hi | base64`.

1. **One tab row names the output representation**: `Base64 · URL · Hex · SHA`.
   This absorbs the codec select *and* the Transform/Hash split. Hashing becomes
   a peer mode rather than a second always-open card — which is honest, because
   hashing is one-way and never belonged under the same "direction" concept.
2. **Direction becomes a swap, not a second select.** A pipeline header reading
   `TEXT ⇄ BASE64`, where `⇄` is a single icon button that flips the direction.
   One control, always states its current direction in words, no ambiguous twin.
   On the SHA tab the swap is **not rendered at all** — the absence teaches
   one-wayness better than a sentence would.
3. **Two panes — source and result** — side by side from `sm:` up, stacked
   below, each with its own small mono label. The panes are what make the swap
   legible: it visually flips which side is the source.
4. **Signature element — byte counts with the delta** under the panes:
   `23 bytes → 32 bytes (+39%)`. Genuinely useful to this audience (Base64's
   +33% overhead is *why* a payload grew) and absent from generic encoders.
   Information, not decoration.

Explicitly **removed** (do not carry over): the `CardTitle` text "Transform" and
"Hash" — the active tab already names the mode. No new accent color, no new
animation, no new dependency.

### Wireframe

```
  ENCODE & HASH                                    (eyebrow, unchanged)
  Base64, URL, hex — and hashes.                   (h1, unchanged)
  Paste text, transform or hash it. …              (lede, unchanged)

  ┌──────────┬─────┬─────┬─────┐
  │ Base64   │ URL │ Hex │ SHA │                   ← the only mode control
  └──────────┴─────┴─────┴─────┘

   TEXT              [⇄]              BASE64       ← pipeline header; ⇄ = swap
   ┌─────────────────────┐  ┌─────────────────────┐
   │ textarea            │  │ output       [copy] │
   │                     │  │                     │
   └─────────────────────┘  └─────────────────────┘
    23 bytes                 32 bytes (+39%)

  — SHA tab instead shows: the textarea full width, no swap, then four
    digest rows (SHA-1 / SHA-256 / SHA-384 / SHA-512), each with a copy button.
```

## Current state

`src/routes/encode.tsx` (at `473ed3b`) — the two adjacent toggle groups that
must go, currently nested inside a `CardTitle`:

```tsx
<CardTitle className="flex flex-wrap items-center justify-between gap-3 font-mono text-sm uppercase tracking-widest">
	Transform
	<div className="flex flex-wrap gap-2 normal-case tracking-normal">
		<ToggleGroup variant="outline" value={[codec]} … aria-label="Codec">
			{CODECS.map((c) => (
				<ToggleGroupItem key={c.value} value={c.value}>{c.label}</ToggleGroupItem>
			))}
		</ToggleGroup>
		<ToggleGroup variant="outline" value={[direction]} … aria-label="Direction">
			{DIRECTIONS.map((d) => (
				<ToggleGroupItem key={d.value} value={d.value}>{d.label}</ToggleGroupItem>
			))}
		</ToggleGroup>
	</div>
</CardTitle>
```

State already lives at page level and is **kept as-is** (`text`, `codec`,
`direction`, `hashes`, `copied`), as do the `useDebounced(text, 120)` call, both
`localStorage` effects under the `recast:encode:*` prefix, the `transform()`
helper, and the SHA `Promise.all` effect with its `cancelled` guard. This plan
changes **presentation only**.

The tab pattern to copy — `src/routes/pdf.tsx:40-54`:

```tsx
<Tabs defaultValue="merge" className="mt-8">
	<TabsList className="w-full sm:w-fit">
		<TabsTrigger value="merge" className="px-4">
			<StackSimpleIcon />
			Merge
		</TabsTrigger>
		…
	</TabsList>
	<TabsContent value="merge" keepMounted>
		<PdfTool op="merge" description="…" … />
	</TabsContent>
```

Note `pdf.tsx` factors the repeated panel body into a single `<PdfTool>`
component parameterized by `op`. Do the same here so the pane pair is written
once, not three times.

`Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` come from
`@/components/ui/tabs` (base-ui). `TabsList` accepts `variant="line"`; the
default is fine. `Tabs` takes `value` + `onValueChange` for controlled use.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install deps (fresh worktree only) | `bun install` | exit 0 |
| Typecheck | `bunx tsc --noEmit` | exit 0 |
| Check (biome) | `bun run check` | exit 0 |
| Tests | `bun run test` | all pass |
| Build | `bun run build` | exit 0 |

## Scope

**In scope**:

- `src/routes/encode.tsx` — the rework (the bulk of the change)
- `src/lib/encode.ts` — add **one** helper: `byteLength(text: string): number`
- `src/lib/encode.test.ts` — add cases for `byteLength`

**Out of scope** (do NOT touch):

- The existing helpers `base64Encode/Decode`, `urlEncode/Decode`,
  `hexEncode/Decode`, `sha` — their behavior is correct and tested; do not
  change signatures or logic.
- `src/components/tool-directory.tsx`, `src/routes/__root.tsx` — the tool is
  already listed in both; the label stays "Encode & Hash".
- Any server route, `src/server/*`, or new npm/bun dependency.
- `src/components/ui/*` — do not add a `textarea` component or modify `tabs`.
- Adding a second utility, more codecs, or more hash algorithms.
- `plans/**` — the reviewer maintains the index.
- README / VISION / ROADMAP.

## Git workflow

- Stay on the existing branch `feat/encode-tool` (the worktree is already on
  it). Do **not** create a new branch and do **not** rebase or amend `3b94857`.
- One new conventional commit, e.g.
  `refactor(encode): one mode selector and a swap instead of stacked selects`.
- Do not push and do not touch the PR — the reviewer handles that.

## Steps

### Step 1: `byteLength` helper + tests

In `src/lib/encode.ts`, add alongside the existing exports:

```ts
export function byteLength(text: string): number {
	return utf8Encoder.encode(text).length;
}
```

Reuse the module-level `utf8Encoder` that already exists — do not create a
second `TextEncoder`.

In `src/lib/encode.test.ts` add a `describe("byteLength")` block covering: `""`
→ `0`; `"hello"` → `5`; and a multi-byte case — `"café 🚀"` → `11` (4 ASCII + 2
for `é` + 1 space + 4 for the emoji). Verify that number by running the test
rather than trusting the arithmetic; if it differs, the assertion follows the
real UTF-8 length.

**Verify**: `bun run test` → all pass; `bunx tsc --noEmit` → exit 0.

### Step 2: Mode tabs replace both toggle groups

In `src/routes/encode.tsx`:

- Add `type Mode = Codec | "sha"` and a `MODES` array
  (`[{value:"base64",label:"Base64"}, {value:"url",label:"URL"},
  {value:"hex",label:"Hex"}, {value:"sha",label:"SHA"}]`).
- Replace the `codec` state with `mode` state (persist it to
  `localStorage` under the **existing** key `recast:encode:codec`, validating
  the stored value against `MODES` — a previously stored `"base64"` must still
  load, and any unrecognized value falls back to `"base64"`).
- Render a controlled `<Tabs value={mode} onValueChange={…}>` with a `TabsList`
  directly under the lede (`className="mt-8"`), mirroring `pdf.tsx`. Tab
  triggers are text-only — **no icons** (four short labels read cleanly and
  icons would add noise the pdf page needs but this one does not).
- Delete both `ToggleGroup` blocks, the `CODECS`/`DIRECTIONS` arrays they fed,
  and the now-unused `ToggleGroup`/`ToggleGroupItem` imports.
- Keep `transform(codec, direction, text)` unchanged; when `mode !== "sha"` it
  is called with `mode` as the codec.

**Verify**: `bunx tsc --noEmit` → exit 0 (no unused-import or missing-symbol
errors); `bun run check` → exit 0.

### Step 3: The pipeline header and the two panes

Factor the codec panel into one component used by all three codec tabs, e.g.
`function TransformPanel({ codec, text, onTextChange, direction, onSwap })`.

Pipeline header, above the panes:

- Left label: the source name — `TEXT` when `direction === "encode"`, else the
  codec name (`BASE64` / `URL` / `HEX`).
- Right label: the target name — the inverse of the left.
- Between them, a swap `<button type="button">` with the Phosphor
  `ArrowsLeftRightIcon`, `aria-label={"Swap to " + <the other direction>}`
  (e.g. "Swap to decode"), that toggles `direction`.
- Set both labels in the page's established utility style:
  `font-mono text-xs uppercase tracking-widest text-muted-foreground`.

Panes: a `grid gap-3 sm:grid-cols-2` (stacked on mobile, side by side from `sm`
up).

- **Source pane** — the existing `<textarea>`, unchanged in behavior. Keep its
  current classes, `spellCheck={false}`, `suppressHydrationWarning`, and give it
  an `aria-label` matching the current source name.
- **Result pane** — the existing `<pre>` output with the existing copy button
  positioned inside it, unchanged in behavior. On a decode failure render the
  existing inline error message **inside the result pane** (keeping the pane and
  its label in place) rather than replacing the whole card body as it does now —
  the layout must not jump when input becomes invalid.

Under each pane, a byte readout in
`font-mono text-xs text-muted-foreground`: source shows
`${byteLength(input)} bytes`; result shows `${byteLength(output)} bytes` plus a
percent delta in parentheses when both are non-zero, e.g. `32 bytes (+39%)`.
Compute the delta as `Math.round((out / inBytes - 1) * 100)` and prefix `+` when
positive. Show no delta when either side is `0`. On a decode error the result
readout shows nothing.

**Verify**: `bunx tsc --noEmit` → exit 0. Then `bun run dev` and check at
`/encode`: switching tabs keeps the typed text; the swap button flips both
labels and the conversion; invalid Base64 in decode mode shows the inline error
without the layout jumping; byte counts update as you type; the panes stack on a
narrow viewport.

### Step 4: The SHA panel

For `mode === "sha"`, render a panel with **no swap and no second pane**: the
textarea full width, then the four digest rows (`SHA-1`, `SHA-256`, `SHA-384`,
`SHA-512`) as they render today, each row gaining its own copy button matching
the transform pane's button (same classes, `aria-label={"Copy " + algo}`).

Keep the existing hashing effect exactly as-is, including the `cancelled` guard
and the empty-input reset. Hashes may keep computing on every mode (the cost is
trivial and it keeps the effect simple) — do not add mode-gating logic.

**Verify**: `bunx tsc --noEmit` → exit 0; in `bun run dev`, the SHA tab shows
four digests, no swap control, and each copy button copies its own digest.

### Step 5: Accessibility and full gates

- Every icon-only button has an `aria-label` (swap + all copy buttons).
- Focus is visible on tabs, the swap button, and copy buttons — the shared
  components already provide `focus-visible:ring`; do not remove it, and match
  it on the raw `<button>`s.
- The textarea keeps an `aria-label`.

**Verify**: `bun run check && bun run test && bun run build` → all exit 0;
`git status --short` shows only the three in-scope files.

## Test plan

- Extend `src/lib/encode.test.ts` with the `byteLength` cases from Step 1.
- No component test is required (the repo has no test for `pdf.tsx` or
  `tokenizer.tsx` either — page behavior here is verified via the dev server).
- The existing helper tests must continue to pass untouched — if any existing
  assertion in `encode.test.ts` needs editing, that is a STOP condition, because
  this plan changes presentation only.
- Verification: `bun run test` → all pass.

## Done criteria

ALL must hold:

- [ ] The page has exactly **one** mode control (the tab row). No `ToggleGroup`
      remains in `src/routes/encode.tsx` (`grep -c ToggleGroup` → 0).
- [ ] Direction is changed only by the swap button, and the header states the
      current direction in words at all times.
- [ ] The SHA tab renders no swap control.
- [ ] Typed text survives switching tabs and swapping direction.
- [ ] A decode failure shows the inline message inside the result pane without
      the layout jumping.
- [ ] Byte counts render under both panes, with a percent delta when both are
      non-zero.
- [ ] Panes are side by side at `sm:` and above, stacked below it.
- [ ] Every icon-only button has an `aria-label`; focus rings are visible.
- [ ] No new dependency (`git diff package.json bun.lock` empty); no server code
      touched; still no `fetch` in the route or lib.
- [ ] `bunx tsc --noEmit`, `bun run check`, `bun run test`, `bun run build` all
      exit 0.
- [ ] Only `src/routes/encode.tsx`, `src/lib/encode.ts`, `src/lib/encode.test.ts`
      changed.

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows `src/routes/encode.tsx` differs from the excerpt above.
- An existing assertion in `encode.test.ts` fails or needs editing — this rework
  must not change helper behavior.
- The base-ui `Tabs` component cannot be driven as a controlled component with
  `value`/`onValueChange` — report what its API actually requires.
- Delivering the layout appears to need a new dependency or a new
  `src/components/ui/*` component — it should not; report instead.
- Any verification fails twice after a reasonable correction.
- You want to add a codec, a hash algorithm, or a second utility — stop; out of
  scope.

## Maintenance notes

- The `recast:encode:codec` localStorage key now stores a **mode**, which may be
  `"sha"`. The read path must tolerate values written by the previous build; a
  future rename of that key needs the same tolerance.
- If a shared `textarea` component is later added to `src/components/ui/`,
  migrate both panels' raw `<textarea>` to it.
- The byte-delta readout is the page's signature affordance — if a future change
  makes it noisy (very large inputs), cap the displayed size rather than
  deleting the readout.
- A reviewer should confirm zero network activity on the page and that the tab
  row remains the only mode control.
