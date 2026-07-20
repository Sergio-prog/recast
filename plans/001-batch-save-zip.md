# Plan 001: Save all converted results as one ZIP

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update this plan's row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 1cc4389..HEAD -- package.json bun.lock src/components/workbench.tsx src/hooks/use-workbench.ts src/lib/download-zip.ts src/lib/download-zip.test.ts`
> Then run the same command without `1cc4389..HEAD` to detect uncommitted
> overlap. If an in-scope file changed, compare the excerpts below with live
> code; a semantic mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — large batches can create browser memory pressure
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `1cc4389`, refreshed 2026-07-20

## Why this matters

The workbench already accepts and converts many files, but users must save each
result separately. A single ZIP completes the batch workflow promised by the
product without re-uploading or re-converting successful output. The ZIP must
be assembled from existing result blobs with a streaming-capable browser
library so large batches do not create an avoidable second full-size buffer.

## Current state

- `src/components/workbench.tsx` owns the `Job` shape and renders batch and
  per-file actions. It currently exposes only `Convert all` and per-row `Save`:

```tsx
// src/components/workbench.tsx:20-30
export type Job = {
	id: string;
	file: File;
	// ...
	outUrl?: string;
	outName?: string;
	outSize?: number;
};

// src/components/workbench.tsx:61-64
{readyCount > 1 && (
	<Button size="sm" onClick={onConvertAll}>Convert all</Button>
)}
```

- `src/hooks/use-workbench.ts:71-84` receives the converted `Blob`, creates an
  object URL, then discards the blob reference:

```ts
const blob = await res.blob();
update(job.id, {
	status: "done",
	outUrl: URL.createObjectURL(blob),
	outName: encoded ? decodeURIComponent(encoded) : replaceExt(...),
	outSize: blob.size,
});
```

- `src/server/archive.ts:8-28` has a server-side `createZip`, but sending
  already-downloaded results back to the server would duplicate network work.
- UI uses existing `Button`, icon, and Sonner patterns. Match the local
  workbench styling and use short end-user errors; log technical detail only
  when needed.
- Product constraint from `VISION.md:44-46`: user files must remain processed
  by the self-hosted app; no third-party ZIP service is allowed.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Add dependency | `bun add client-zip` | exit 0; manifest and lockfile updated |
| Typecheck | `bunx tsc --noEmit` | exit 0, no errors |
| Targeted tests | `bun run test -- src/lib/download-zip.test.ts` | all tests pass |
| Check | `bun run check` | exit 0 |
| Full tests | `bun run test` | all tests pass |
| Build | `bun run build` | exit 0 |

## Scope

**In scope** (the only source/config files to modify):

- `package.json`
- `bun.lock`
- `src/components/workbench.tsx`
- `src/hooks/use-workbench.ts`
- `src/lib/download-zip.ts` (create)
- `src/lib/download-zip.test.ts` (create)
- `plans/README.md` (status only)

**Out of scope**:

- `src/server/archive.ts` and all API routes — do not upload output blobs again.
- Changing conversion concurrency, retry behavior, or output formats.
- Automatically downloading after conversion; saving remains an explicit user
  action.
- Persisting result blobs across page reloads.

## Git workflow

- Branch: `feat/batch-save-zip`
- Use conventional commits, for example `feat(workbench): add batch zip save`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add a streaming ZIP dependency and isolated helper

Run `bun add client-zip`. Create `src/lib/download-zip.ts` and keep library API
details out of the component. Export functions that:

1. Accept `{ name: string; blob: Blob }[]`.
2. Produce deterministic unique archive names, preserving extensions:
   `photo.png`, `photo (2).png`, `photo (3).png`.
3. Convert entries to named `File` objects and use `client-zip`'s streaming ZIP
   response, returning a final `Blob` with MIME `application/zip`.
4. Reject an empty input with a user-safe error.

Do not use `zipSync`, concatenate all file buffers, or convert blobs to base64.
Read the installed package's type declarations and use its public typed API.

**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 2: Retain successful output blobs in job state

Add `outBlob?: Blob` to `Job`. In `useWorkbench.convertOne`, store the same blob
used to create `outUrl`. Clear `outBlob` anywhere stale output fields are
cleared after a target change or pair selection. Removal and clearing still
revoke object URLs as today; no extra blob cleanup API is required.

Do not fetch object URLs to reconstruct blobs. The original response blob is
the source of truth.

**Verify**: `rg -n "outBlob" src/components/workbench.tsx src/hooks/use-workbench.ts`
→ matches the type, successful conversion update, and stale-result resets.

### Step 3: Add the explicit “Save all” workbench action

In `Workbench`, derive the successfully converted jobs that have both
`outBlob` and `outName`. When at least two exist, show `Save all` beside the
existing header actions. Keep ZIP-building busy state local to `Workbench`.

On click:

1. Disable the action and show the existing `Spinner`.
2. Call the helper with successful results only; errored/ready jobs are not
   included.
3. Create a temporary object URL, trigger download as
   `recast-conversions.zip`, remove the temporary anchor, and revoke the URL in
   `finally`.
4. On failure, show `Could not package the converted files` via Sonner. Do not
   expose stack traces or library errors.

Keep the existing per-file Save buttons.

**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 4: Add focused ZIP tests

Create `src/lib/download-zip.test.ts`. Cover:

- duplicate names receive deterministic suffixes while extensions remain
  intact;
- names without extensions are deduplicated;
- empty input rejects;
- two small text blobs produce a non-empty ZIP blob with
  `application/zip` MIME and a ZIP local-header signature.

Do not test by downloading files through DOM click behavior; keep tests on the
pure helper boundary.

**Verify**: `bun run test -- src/lib/download-zip.test.ts` → all new tests pass.

### Step 5: Run repository gates

Run the full gates and inspect `git status --short` for scope.

**Verify**: `bun run check && bun run test && bun run build` → all exit 0.

## Test plan

- New file: `src/lib/download-zip.test.ts`.
- Cases: normal two-entry ZIP, duplicate extension names, extensionless names,
  empty input, correct ZIP MIME/signature.
- There are no existing project tests to copy; follow Vitest's standard
  `describe`/`it`/`expect` structure and keep the test environment Node-safe.

## Done criteria

- [ ] Two or more completed jobs expose an explicit `Save all` action.
- [ ] The downloaded archive is named `recast-conversions.zip` and contains
  every successful result once with unique names.
- [ ] Individual Save actions still work.
- [ ] No output blob is sent back to the server.
- [ ] `bunx tsc --noEmit`, `bun run check`, `bun run test`, and
  `bun run build` all exit 0.
- [ ] Only in-scope files are modified.
- [ ] `plans/README.md` status is updated.

## STOP conditions

Stop and report if:

- `client-zip` does not expose a typed streaming API accepting Blob/File input.
- Supporting the feature requires re-uploading converted results or changing
  an API route.
- The live `Job` lifecycle no longer retains browser object URLs as shown.
- A verification command fails twice after a reasonable correction.
- An out-of-scope file must be changed.

## Maintenance notes

- Any future persistent job model must decide whether output blobs remain in
  browser memory or are represented by server result IDs.
- Review memory behavior with several large outputs; the selected ZIP library
  must not eagerly materialize every entry as an `ArrayBuffer`.
- Plan 002 also changes the `Job` model and should be rebased after this plan.
