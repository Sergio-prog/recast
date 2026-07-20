# Plan 002: Add image resize, rotation, and metadata controls

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before continuing. Stop
> on any condition listed below; do not improvise. When complete, update this
> plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat d125c71..HEAD -- src/components/workbench.tsx src/components/image-transform-controls.tsx src/hooks/use-workbench.ts src/lib/image-transforms.ts src/lib/image-transforms.test.ts src/routes/api/convert.ts src/server/convert.ts src/server/image.ts src/server/image.test.ts`
> Also run the same command without `d125c71..HEAD` for uncommitted overlap.
> Compare live code against the excerpts below before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — transform ordering can change orientation or dimensions
- **Depends on**: none; execute after plan 001 to reduce conflicts
- **Category**: direction
- **Planned at**: commit `d125c71`, 2026-07-12

## Why this matters

The image tool changes containers and quality but cannot perform the common
pre-export operations users still need elsewhere. Resize, quarter-turn
rotation, and explicit metadata removal fit the existing Sharp pipeline with a
small API extension. Cropping is deliberately deferred because it requires a
preview and focal-area UX rather than another numeric field.

## Current state

- `src/components/workbench.tsx:20-31` stores format and quality only in each
  job. `JobRow` already has a second-row-friendly wrapped layout.
- `src/hooks/use-workbench.ts:64-70` sends only file, target, and quality:

```ts
const form = new FormData();
form.append("file", job.file);
form.append("target", job.target);
form.append("quality", String(job.quality));
```

- `src/routes/api/convert.ts:15-45` validates the format pair and calls
  `convert(input, name, src, target, quality)`.
- `src/server/convert.ts:45-56` routes image-to-image work through
  `convertImage`.
- `src/server/image.ts:22-25` currently starts every image pipeline with:

```ts
const img = sharp(buffer, {
	animated,
	limitInputPixels: 1_000_000_000,
}).rotate();
```

  The no-argument rotation auto-orients from EXIF. Sharp strips most metadata
  by default unless metadata-retention APIs are called.
- Reuse existing `Input`, `Toggle`, and `Button` primitives. Keep transform UI
  outside `workbench.tsx` in a dedicated component.
- Product constraint from `VISION.md:17-19`: processing stays on the owner’s
  machine/self-hosted server; no external image API.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `bunx tsc --noEmit` | exit 0, no errors |
| Unit tests | `bun run test -- src/lib/image-transforms.test.ts src/server/image.test.ts` | all pass |
| Check | `bun run check` | exit 0 |
| Full tests | `bun run test` | all pass |
| Build | `bun run build` | exit 0 |

## Scope

**In scope**:

- `src/components/workbench.tsx`
- `src/components/image-transform-controls.tsx` (create)
- `src/hooks/use-workbench.ts`
- `src/lib/image-transforms.ts` (create)
- `src/lib/image-transforms.test.ts` (create)
- `src/routes/api/convert.ts`
- `src/server/convert.ts`
- `src/server/image.ts`
- `src/server/image.test.ts` (create)
- `plans/README.md` (status only)

**Out of scope**:

- Cropping, focal-point selection, image previews, filters, watermarking, and
  batch presets.
- Transforming video frames, PDFs, or image-to-PDF jobs.
- Changing supported formats or quality mappings.
- Editing `src/components/category-page.tsx`, `src/routes/images.tsx`, or
  `src/lib/formats.ts`; these had unrelated work in progress when planned.

## Git workflow

- Branch: `feat/image-transforms`
- Conventional commit example: `feat(images): add resize and rotation controls`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Define and validate the transform contract

Create `src/lib/image-transforms.ts` with:

- `ImageTransformOptions`: optional integer `width` and `height`, `rotation`
  restricted to `0 | 90 | 180 | 270`, and `stripMetadata: boolean`.
- `DEFAULT_IMAGE_TRANSFORMS` with no dimensions, rotation 0, and metadata
  stripping enabled (matching current Sharp output behavior).
- A parser for `FormData`/unknown scalar values that returns either validated
  options or a user-safe validation error. Width and height must be blank or an
  integer from 1 through 10000. Reject invalid values; do not clamp silently.
- A predicate that reports whether any non-default transform is selected.

Do not add a schema dependency for four fields.

**Verify**: `bun run test -- src/lib/image-transforms.test.ts` → parser tests
pass after Step 5 creates them; until then `bunx tsc --noEmit` must exit 0.

### Step 2: Extend image jobs without bloating the workbench

Add `imageTransforms: ImageTransformOptions` to `Job` and initialize it from a
fresh copy of the defaults in `useWorkbench.addFiles`. Add
`src/components/image-transform-controls.tsx` for controlled inputs; the
component receives options and an `onChange` callback.

Render controls in `JobRow` only when both source and target categories are
`image`. Use a compact expandable section labelled `Transform` so ordinary
format conversion remains visually unchanged. Provide:

- optional width and height numeric inputs, labelled in pixels;
- rotation buttons for 0°, 90°, 180°, 270°;
- a `Strip metadata` toggle, on by default;
- helper copy: one dimension preserves aspect ratio; two dimensions fit inside
  the box without cropping or enlargement.

Changing transforms after completion must reset the job to `ready` and clear
all stale output fields, including the plan-001 `outBlob` if present. Revoke a
stale `outUrl` before replacing it.

**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 3: Send and validate transform fields at the API boundary

Append transform fields in `useWorkbench.convertOne` only for image-to-image
jobs. In `src/routes/api/convert.ts`, parse them through the shared validator.
Return status 400 with a short end-user message for invalid dimensions or
rotation. Pass validated options through `convert` to `convertImage`; keep the
parameter optional/defaulted so non-image callers and tests remain simple.

The server must be authoritative. Do not trust input types or the client-side
numeric input constraints.

**Verify**: `bunx tsc --noEmit` → exit 0; `rg -n "ImageTransformOptions|imageTransforms" src/routes/api/convert.ts src/server/convert.ts src/hooks/use-workbench.ts`
→ all three layers use the shared contract.

### Step 4: Apply transforms in a documented Sharp order

In `src/server/image.ts`, apply operations in this order:

1. Decode HEIC fallback if necessary.
2. Auto-orient using existing EXIF behavior.
3. Apply explicit quarter-turn rotation.
4. Resize using `fit: "inside"` and `withoutEnlargement: true`; if only one
   dimension exists, preserve aspect ratio. Never crop.
5. Encode using existing target/quality settings.
6. Retain metadata only when `stripMetadata` is false; default behavior must
   remain stripped.

Check Sharp 0.35's installed types for the correct metadata-retention method.
Do not call multiple rotation operations if Sharp collapses or overrides them;
verify the resulting dimensions in tests rather than assuming chaining order.

Animated GIF/WebP behavior must remain unchanged when all options are default.
If transformed animation semantics are not supported safely, reject a
non-default transform on animated inputs with a user-safe error rather than
silently flattening animation.

**Verify**: `bun run test -- src/server/image.test.ts` → all image tests pass.

### Step 5: Add contract and image-pipeline tests

Create parser tests covering blank dimensions, each valid rotation, zero,
negative, fractional, over-10000, and invalid rotation values. Create Sharp
pipeline tests using generated in-memory fixtures; do not commit binary
fixtures. Cover:

- width-only resize preserving aspect ratio;
- two-dimension inside-fit without enlargement;
- 90° rotation swapping dimensions;
- defaults preserving current dimensions;
- metadata stripped by default and retained only when requested, if Sharp can
  generate a reliable metadata fixture;
- invalid options rejected before conversion.

**Verify**: `bun run test -- src/lib/image-transforms.test.ts src/server/image.test.ts`
→ all new tests pass.

### Step 6: Run repository gates

**Verify**: `bun run check && bun run test && bun run build` → all exit 0.

## Test plan

- `src/lib/image-transforms.test.ts`: exhaustive boundary validation.
- `src/server/image.test.ts`: generated-image integration tests for resize,
  rotation, metadata, and unchanged defaults.
- No browser screenshot test is required, but controls must have visible labels
  and keyboard-operable buttons/toggles.

## Done criteria

- [ ] Image-to-image jobs offer resize, rotation, and metadata controls.
- [ ] One dimension preserves aspect ratio; two fit inside without crop or
  enlargement.
- [ ] Default options reproduce current output behavior.
- [ ] Server rejects malformed transform input with status 400.
- [ ] Non-image conversion UI and requests are unchanged.
- [ ] `workbench.tsx` remains focused; controls live in their own component.
- [ ] Typecheck, check, tests, and build all pass.
- [ ] Only in-scope files are modified and index status is updated.

## STOP conditions

Stop and report if:

- Plan 001 changed `Job` or stale-output cleanup in a way not reflected here.
- Correct explicit rotation requires disabling current EXIF auto-orientation.
- Sharp cannot retain metadata selectively with its installed public API.
- Animated inputs would be silently flattened by default behavior.
- Cropping or preview UI becomes necessary to meet the stated scope.
- A verification fails twice or an out-of-scope file is required.

## Maintenance notes

- Review transform ordering carefully; EXIF orientation plus explicit rotation
  is the highest regression risk.
- Future crop support should add a preview/focal-area model rather than
  overloading width and height semantics.
- Future batch presets can reuse `ImageTransformOptions`; keep it serializable
  and independent of React.

