# Plan 004: Add paste syntax highlighting and owner-scoped search

> **Executor instructions**: Follow this plan step by step and run every
> verification gate. Stop and report on any STOP condition. When complete,
> update this plan's status in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat d125c71..HEAD -- package.json bun.lock src/components/highlighted-code.tsx src/components/highlighted-code.test.tsx src/components/paste-list.tsx src/lib/paste-search.ts src/lib/paste-search.test.ts src/routes/paste/index.tsx src/routes/paste/\$id.tsx src/routes/api/paste.ts src/server/pastes.ts src/server/pastes.test.ts`
> Repeat without the commit range to detect uncommitted overlap, then compare
> current code with the excerpts below.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED — highlighting handles untrusted text and search must preserve
  owner isolation
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `d125c71`, 2026-07-12

## Why this matters

Pastes already store language and tags, but language is only displayed as text
and the owner list cannot be filtered. Safe token rendering makes code pastes
readable, while server-side owner-scoped search remains correct beyond the
current 100-row list cap. Search intentionally covers metadata and exact tags,
not full paste contents, avoiding an unindexed content scan and accidental
snippet exposure.

## Current state

- `src/routes/paste/index.tsx:38-51` defines supported languages and the create
  form sends `language` and normalized tag strings.
- The owner list fetches `/api/paste` without filters at lines 144-150, then
  renders name, up to three tags, visibility, and date at lines 340-380.
- `src/routes/paste/$id.tsx:151-156` renders untrusted content safely as React
  text but without highlighting:

```tsx
<pre className="min-w-0 p-4 font-mono text-sm leading-relaxed">
	{paste.content}
</pre>
```

- `src/server/pastes.ts:9-23` stores `tags JSONB` and `language TEXT`, with an
  index only on `(user_id, created_at DESC)`.
- `src/server/pastes.ts:111-123` lists the newest 100 owner rows:

```ts
"SELECT * FROM paste WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100"
```

- `src/routes/api/paste.ts:6-12` authenticates GET requests and passes only
  `user.id` to `listPastes`. Preserve that server-side ownership boundary.
- Product constraint from `VISION.md:49-50`: accounts exist only where needed
  and there is no telemetry or public listing.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Add dependency | `bun add prism-react-renderer` | exit 0; manifest and lockfile updated |
| Typecheck | `bunx tsc --noEmit` | exit 0 |
| Targeted tests | `bun run test -- src/components/highlighted-code.test.tsx src/lib/paste-search.test.ts src/server/pastes.test.ts` | all pass |
| Check | `bun run check` | exit 0 |
| Full tests | `bun run test` | all pass |
| Build | `bun run build` | exit 0 |

## Suggested executor toolkit

- If available, use `vercel-react-best-practices` to keep the highlighter out
  of the initial bundle through a deliberate lazy/dynamic boundary.

## Scope

**In scope**:

- `package.json`
- `bun.lock`
- `src/components/highlighted-code.tsx` (create)
- `src/components/highlighted-code.test.tsx` (create)
- `src/components/paste-list.tsx` (create)
- `src/lib/paste-search.ts` (create)
- `src/lib/paste-search.test.ts` (create)
- `src/routes/paste/index.tsx`
- `src/routes/paste/$id.tsx`
- `src/routes/api/paste.ts`
- `src/server/pastes.ts`
- `src/server/pastes.test.ts` (create)
- `plans/README.md` (status only)

**Out of scope**:

- Public paste discovery, searching another user's pastes, full-content search,
  editing pastes, pagination, or changing visibility rules.
- Markdown rendering, HTML preview, executable code, line comments, or raw HTML
  injection.
- Adding languages beyond the existing `LANGUAGES` list except aliases needed
  to map those names to Prism grammars.

## Git workflow

- Branch: `feat/paste-search-highlighting`
- Conventional commit example: `feat(paste): add highlighting and search`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add a safe React-token highlighter component

Run `bun add prism-react-renderer`. Create
`src/components/highlighted-code.tsx`. Use the renderer's token-array/React
element API; never use `dangerouslySetInnerHTML`. Map the existing language
values to supported Prism language identifiers and fall back to plain text for
unknown or `text` values.

Requirements:

- preserve whitespace and horizontal scrolling;
- render optional line numbers with `aria-hidden="true"` without changing the
  copied/raw content;
- select an existing light/dark-compatible theme or map token colors to CSS
  variables without adding global raw HTML styles;
- lazy-load the highlighter dependency or component so paste creation/list
  views do not pay the syntax engine cost;
- show the same safe plain `<pre>` structure while the lazy component loads.

Replace only the content `<pre>` in `src/routes/paste/$id.tsx`. Copy and Raw
continue using the original `paste.content`.

**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 2: Define a small search-filter contract

Create `src/lib/paste-search.ts` with `PasteSearchFilters` and a parser for URL
search params:

- `q`: optional trimmed string, maximum 100 characters, used only against name
  and description;
- `tag`: optional trimmed lowercase exact tag, maximum 24 characters;
- blank values become absent;
- over-limit or malformed values produce a user-safe 400 result rather than
  silent truncation.

Keep this module independent of React and Postgres.

**Verify**: `bun run test -- src/lib/paste-search.test.ts` → parser tests pass.

### Step 3: Add owner-scoped filtered queries

Change `listPastes(userId, filters)` in `src/server/pastes.ts`. Build one of the
small finite set of parameterized SQL statements; do not interpolate values.
Every branch must start with `user_id = $1` and retain expiry sweeping,
descending creation order, content omission, and `LIMIT 100`.

- `q` filters `name` or `description` case-insensitively.
- `tag` uses the JSONB exact-string membership operator.
- when both exist, both constraints apply.
- Add `CREATE INDEX IF NOT EXISTS paste_tags_gin ON paste USING GIN (tags)` in
  `init()` for exact tag membership. Do not add an index for `ILIKE` at this
  scale.

The API GET handler parses `request.url`, rejects invalid filters with status
400, authenticates exactly as today, and passes `user.id` plus filters. Never
accept a user ID from query parameters.

**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 4: Add search controls to “Your pastes”

Extract the existing “Your pastes” card into `src/components/paste-list.tsx` so
the already-large route does not approach 500 lines. The component owns a small
search input and tag filter state. Debounce text requests using the existing
`src/hooks/use-debounced.ts`; do not issue a request on every keystroke. Clicking
a rendered tag selects that exact tag, and a visible clear action removes it.

Update `loadMine` to request `/api/paste?q=...&tag=...` with `URLSearchParams`.
Prevent stale responses from overwriting newer results with `AbortController`
or a request sequence. Show a compact empty state when filters return no rows;
do not hide the entire owner-list card. Deletion must reload with current
filters.

Keep the creation form and sign-in behavior unchanged. Pass only the minimum
delete/reload data between the route and `PasteList`; do not move authentication
or paste creation into the list component.

**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 5: Add security and behavior tests

Add tests that prove:

- highlighted content containing HTML-like text renders as text and no injected
  element appears;
- unknown language falls back to plain text;
- known language produces token spans without changing text content;
- filter parsing handles blank, valid, over-limit, and normalized tag values;
- mocked database calls for no filter, `q`, `tag`, and both use placeholders;
- every list query includes owner ID as parameter 1 and `user_id = $1`;
- tag search uses exact JSONB membership and the list result omits content.

Mock `getPool` rather than requiring a real database. Reset modules between
cases because `schemaReady` is module state. Do not put credentials or a live
`DATABASE_URL` in tests. Put `// @vitest-environment jsdom` at the top of the
component test so Testing Library has a DOM without changing global test
configuration.

**Verify**: `bun run test -- src/components/highlighted-code.test.tsx src/lib/paste-search.test.ts src/server/pastes.test.ts`
→ all tests pass.

### Step 6: Run repository gates

**Verify**: `bun run check && bun run test && bun run build` → all exit 0.

## Test plan

- Component test: safe rendering, plain fallback, tokenized known language.
- Pure parser test: filter boundaries and normalization.
- Mocked database test: owner constraint, parameterization, filter combinations,
  content omission.
- No live OAuth, Postgres, or browser session is required.

## Done criteria

- [ ] Existing supported languages render with safe syntax highlighting.
- [ ] Unknown/text pastes remain readable plain text.
- [ ] No `dangerouslySetInnerHTML` is introduced.
- [ ] Owners can filter by metadata text and exact tag.
- [ ] Search remains server-side, owner-scoped, parameterized, and capped at
  100 results.
- [ ] Empty and stale-request states are handled.
- [ ] Typecheck, check, all tests, and build pass.
- [ ] Only in-scope files are modified and index status is updated.

## STOP conditions

Stop and report if:

- The renderer requires raw HTML injection for highlighting.
- Search cannot keep `user_id = $1` in every SQL branch.
- Implementing useful search requires full-content indexing or pagination.
- The database schema no longer stores tags as a JSONB string array.
- The highlighter materially enters non-paste bundles despite the lazy boundary.
- A verification fails twice or an out-of-scope file is required.

## Maintenance notes

- Review owner scoping and SQL placeholders before visual polish; an attractive
  search UI is not acceptable if it can cross users.
- Keep content search deferred until there is evidence it is needed and a
  deliberate indexed design exists.
- If more languages are added, update the creation options, language mapping,
  and fallback tests together.
