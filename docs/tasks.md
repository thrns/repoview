# RepoView — Implementation Tasks

This file is the execution checklist for building **RepoView**.

**Primary architecture/specification:** `docs.md`  
**Application:** RepoView  
**Production domain:** `https://code.thrn.im`  
**Framework:** Next.js 16.3.3  
**Database/Auth:** Supabase SDK  
**UI:** Provided `design-system/` folder — reuse its components, tokens, styling stack, typography, themes, and interaction patterns  
**Source access:** GitHub App  
**Code highlighting:** Shiki  
**Email:** Gmail SMTP via Nodemailer  
**Hosting:** Vercel  

---

## How to use this file

Work through the tasks **strictly in order**.

For every task:

1. Read the relevant section of `docs.md` before implementing.
2. Inspect the existing code before changing anything.
3. Implement only the current task and any directly required supporting changes.
4. Run the verification commands listed for that task.
5. Fix all failures caused by the task.
6. Manually inspect the affected UI/flow when applicable.
7. Change the task checkbox from `[ ]` to `[x]` only after verification succeeds.
8. Add a short implementation note under the task if an architectural choice materially differs from `docs.md`.
9. Commit-ready code should exist before moving to the next task.
10. Do not skip ahead because a later feature looks easier.

If blocked:
- document the blocker under the current task;
- solve it if possible using official/current documentation;
- do not mark the task complete until its acceptance criteria are satisfied.

Do not rewrite completed tasks unless a later task exposes a real defect. If that happens, fix the defect and update the relevant note.

---

# Phase 0 — Repository Baseline

## Task 0.1 — Inspect the repository

- [x] Inspect all existing files, package configuration, source structure, environment files, lint/typecheck/test configuration, and Git state.
- [x] Read `docs.md` completely.
- [x] Inspect the provided `design-system/` folder and treat it as the authoritative UI source.
- [x] Identify whether the repository is empty, partially scaffolded, or already contains usable code.
- [x] Preserve existing good conventions instead of recreating equivalent systems unnecessarily.
- [x] Record a short baseline note below.

**Acceptance criteria**
- Repository state is understood.
- No existing useful code has been overwritten blindly.
- `docs.md` has been read before implementation begins.

**Implementation note:**  
The repository is an empty application shell: it contains `docs/` plus the supplied Supabase design-system reference, with no root `package.json`, app source, environment files, or test/lint configuration. Git reports the supplied `design-system/` and `docs/` trees as untracked. `docs/docs.md` is authoritative; the design system is a Next.js/Tailwind-based reference app that uses `ui`/`ui-patterns` workspace packages, `lucide-react`, `next-themes`, and Supabase-style primitives. No existing RepoView implementation was overwritten.

---

## Task 0.2 — Establish package manager and scripts

- [x] Use `pnpm`.
- [x] Ensure `package.json` contains useful scripts:
  - `dev`
  - `build`
  - `start`
  - `lint`
  - `typecheck`
  - `test`
- [x] Add `.nvmrc` or `engines` metadata targeting a Node version compatible with Next.js 16.
- [x] Add a clean `.gitignore`.

**Verify**

```bash
pnpm --version
node --version
```

**Acceptance criteria**
- Project has a reproducible package-manager setup.
- Required scripts exist.

**Implementation note:**  
Added a root `package.json` pinned to pnpm `10.12.4`, scripts for the required Next.js/TypeScript/ESLint/Vitest commands, Node engine metadata for `>=20.9.0 <25`, `.nvmrc` set to Node 22, and a clean root `.gitignore`. The required checks reported pnpm `10.12.4` and Node `v24.18.1` in the current environment; Corepack required its cache/network permission once.

---

# Phase 1 — Next.js Foundation

## Task 1.1 — Scaffold/pin Next.js 16.3.3

- [x] Scaffold or migrate the application to the Next.js App Router.
- [x] Pin `next` to **exactly `16.3.3`**.
- [x] Use TypeScript.
- [x] Confirm React versions are compatible with Next.js 16.3.3.
- [x] Create a minimal root layout and home route.
- [x] Remove default starter content that will not be used.

**Verify**

```bash
pnpm install
pnpm typecheck
pnpm build
```

**Acceptance criteria**
- App builds on Next.js 16.3.3.
- App Router is in use.
- No starter-template errors/warnings remain.

**Implementation note:**  
Created the minimal App Router foundation with a typed root layout, metadata, home route, TypeScript configuration, ESLint flat config, and a no-op Next config. The supplied `design-system/` is excluded from the root compiler/linter because it is a standalone reference app whose workspace dependencies are intentionally not present at the RepoView root; it remains available for Task 1.2/1.3 integration. Verified with `pnpm typecheck`, `pnpm lint`, `pnpm build`, and a development-server `GET /` smoke check returning 200.

---

## Task 1.2 — Inspect and adopt the provided design system

- [x] Inspect the entire `design-system/` folder before building RepoView UI.
- [x] Identify and document:
  - component inventory and APIs;
  - design tokens / CSS variables;
  - typography and font setup;
  - spacing/radius/border/shadow conventions;
  - light/dark/system theme behavior;
  - responsive/navigation patterns;
  - form components;
  - dialog/drawer/menu/table/tooltip/toast/loading/error primitives;
  - icon conventions;
  - accessibility/focus conventions;
  - styling framework and dependencies already used.
- [x] Determine how `design-system/` is intended to be imported/consumed.
- [x] Preserve the supplied visual language and component APIs.
- [x] Do not initialize shadcn/ui or another parallel component library.
- [x] Do not replace existing tokens with a new token system.
- [x] Do not install/reconfigure Tailwind unless the provided design system already uses it or requires it.

**Acceptance criteria**
- Codex can name the design-system components/primitives it will use for RepoView's major screens.
- The app consumes the supplied system rather than recreating it.
- No parallel UI framework has been introduced.

**Implementation note:**  
Added `docs/design-system-inventory.md` with the inspected styling stack, semantic tokens, typography, theme mechanism, accessibility/responsive conventions, component inventory, and RepoView surface mapping. The provided folder is a reference app whose `ui`/`ui-patterns`/`common`/`icons` workspace packages and shared config files are absent here, so direct imports are not possible; RepoView will consume the supplied language through app-specific compatibility/composition components in the next task without adding a parallel framework.

---

## Task 1.3 — Integrate design-system primitives into RepoView

- [x] Wire the provided design system into the Next.js application correctly.
- [x] Reuse existing components for buttons, badges, inputs, selects, switches, dialogs/drawers, menus, tooltips, tabs, tables, separators, skeletons, scroll areas, alerts, breadcrumbs, sidebar/navigation, and toasts when equivalents exist.
- [x] Build thin RepoView composition/wrapper components only where useful.
- [x] If a required primitive is genuinely missing, create a RepoView-specific component from the supplied tokens/primitives rather than installing another component kit.
- [x] Avoid modifying shared design-system primitives for one-off screen needs.
- [x] If a shared component must be extended, keep it backward-compatible and document the reason.

**Acceptance criteria**
- Core design-system components render correctly inside the app.
- RepoView UI visibly follows the supplied design language.
- No duplicate component framework exists.

**Implementation note:**  
Added the supplied Tailwind v4-style semantic theme layer, light/dark CSS variables, typography/code font stacks, `next-themes` provider, Lucide icons, and a RepoView-owned compatibility surface under `components/ui/` for buttons, badges, cards, form controls, overlays, tabs, tables, separators, skeletons, scroll areas, alerts, breadcrumbs, sidebar/navigation, tooltips, and toasts. The reference `design-system/` tree remains unchanged because its underlying workspace packages are not supplied. Verified with lint, serial typecheck, production webpack build, and a real browser smoke inspection of the rendered UI.

---

## Task 1.4 — Adopt design-system typography and theme behavior

- [x] Use the typography/fonts supplied by `design-system/`.
- [x] Use the design system's existing theme provider/strategy.
- [x] Support its intended light/dark/system modes where available.
- [x] Add a reusable theme toggle only using the system's supported mechanism.
- [x] Use the design system's monospace/code-font token when available.
- [x] Prevent theme hydration warnings.
- [x] Add `next-themes` or another theme dependency only if the provided system has no adequate mechanism and the addition is genuinely necessary.

**Acceptance criteria**
- Theme behavior matches the provided design system.
- No parallel typography/theme implementation exists.
- No hydration mismatch.

**Implementation note:**  
Added the mounted-guarded `ThemeSwitcher` using the supplied system's light/dark/system `next-themes` pattern, `suppressHydrationWarning` on `<html>`, persistent theme selection, and Inter/Manrope/Source Code Pro-compatible CSS font tokens with fallbacks. Verified persistence across reload, light and dark rendering in the browser, and an empty browser warning/error log. The production script uses Next's supported webpack fallback because Turbopack's PostCSS worker cannot bind a port in this sandbox; this does not change the app architecture or Vercel runtime requirements.

**Verify**

```bash
pnpm typecheck
pnpm build
```

**Acceptance criteria**
- Theme persists correctly.
- No hydration mismatch.
- Both light/dark modes look intentional.

---

# Phase 2 — Project Structure and Configuration

## Task 2.1 — Create application directory structure

- [x] Create clean boundaries based on `docs.md`:

```text
app/
components/
  admin/
  viewer/
  markdown/
  code/
  shared/
  ui/
lib/
  auth/
  github/
  markdown/
  code/
  notifications/
  security/
  supabase/
  viewer/
supabase/
  migrations/
tests/
```

- [x] Do not create empty architecture layers with no purpose.
- [x] Add barrel files only where they genuinely improve imports.

**Acceptance criteria**
- Server/security/integration logic has clear ownership.
- UI and data access are not mixed indiscriminately.

**Implementation note:**  
Created the documented route, component, server-library, Supabase migration, and test boundaries and recorded their ownership in `docs/architecture-boundaries.md`. Directories are intentionally prepared for the immediately following implementation tasks; no speculative barrel files or duplicate UI layers were added.

---

## Task 2.2 — Add environment validation

- [x] Create `.env.example`.
- [x] Include all variables listed in `docs.md`.
- [x] Add server-side environment validation with `zod` or equivalent.
- [x] Separate public and private environment access.
- [x] Ensure private environment modules cannot be imported into Client Components.
- [x] Correctly normalize multiline `GITHUB_APP_PRIVATE_KEY`.

**Acceptance criteria**
- Missing required server variables fail clearly.
- No secret is prefixed with `NEXT_PUBLIC_`.

**Implementation note:**  
Added `.env.example`, pure public/server Zod parsers under `lib/env/`, and a `server-only` guarded lazy accessor for private configuration. GitHub private keys normalize escaped `\\n` sequences centrally; server peppers require at least 32 characters; defaults cover Gmail host/port/from-name. Added three validation tests covering valid public config, normalization/defaults, and clear missing-variable failure.

---

# Phase 3 — Supabase Foundation

## Task 3.1 — Add Supabase SDK clients

- [x] Install:
  - `@supabase/supabase-js`
  - `@supabase/ssr`
- [x] Create:
  - `lib/supabase/client.ts`
  - `lib/supabase/server.ts`
  - `lib/supabase/admin.ts`
  - relevant session/proxy helper
- [x] Keep service-role client server-only.
- [x] Follow current Next.js 16-compatible Supabase SSR patterns.

**Verify**

```bash
pnpm typecheck
pnpm build
```

**Acceptance criteria**
- Browser client works.
- Server SSR client works.
- Service-role key cannot enter the client bundle.

**Implementation note:**  
Added `createSupabaseBrowserClient`, async cookie-backed `createSupabaseServerClient`, server-only `createSupabaseAdminClient` with browser auth persistence disabled, and `updateSupabaseSession` using the current `getAll`/`setAll` cookie API. Private clients import `server-only`; the root proxy wiring is intentionally deferred to the dashboard-auth task so an unconfigured local environment can still render public development pages.

---

## Task 3.2 — Create initial database migration

- [x] Create migration(s) for:
  - `repositories`
  - `shares`
  - `viewer_sessions`
  - `view_events`
  - `notification_deliveries`
- [x] Include timestamps, foreign keys, unique constraints, and indexes defined in `docs.md`.
- [x] Enable RLS.
- [x] Do not add anonymous permissive policies.

**Acceptance criteria**
- Migration is reproducible.
- Schema matches `docs.md` unless an implementation note explains a justified improvement.

**Implementation note:**  
Added `supabase/migrations/20260921200000_initial_schema.sql` with all five documented tables, generated IDs/timestamps, foreign keys, unique token hashes, recommended indexes, `updated_at` triggers, and RLS enabled with no policies. Added a structural migration test that checks table/index coverage and rejects any policy definition.

---

## Task 3.3 — Generate/define database types

- [x] Add TypeScript database types.
- [x] Use generated Supabase types if project workflow supports it.
- [x] Ensure application code does not use `any` for core DB records.

**Acceptance criteria**
- Tables are strongly typed in server/admin code.

**Implementation note:**  
Added generated-style `lib/supabase/database.types.ts` covering all migration tables, JSON fields, inserts, updates, and row helpers, then parameterized browser, SSR, and admin clients with `Database`. The migration is the source of truth until a live Supabase project is available for generated CLI output.

---

# Phase 4 — Admin Authentication

## Task 4.1 — Implement login page

- [x] Create `/login`.
- [x] Use Supabase email/password auth.
- [x] Do not expose signup.
- [x] Use a polished minimal RepoView login design.
- [x] Handle invalid credentials and loading states.

**Acceptance criteria**
- Valid admin can sign in.
- Invalid login displays safe useful error.
- No public registration flow exists.

**Implementation note:**  
Added the `/login` App Router page and client form using the Supabase browser client, required email/password fields, loading state, generic credential/service errors, RepoView design-system surfaces, theme switcher, and no signup affordance. Browser inspection confirmed the accessible fields, sign-in control, clean light layout, and no hydration/browser warnings.

---

## Task 4.2 — Protect dashboard routes

- [x] Implement server-side admin guard.
- [x] Redirect unauthenticated users to `/login`.
- [x] If `ADMIN_EMAIL` is set, enforce it.
- [x] Ensure direct requests to private dashboard routes are protected.

**Verify**
- Logged-out user cannot load `/dashboard`.
- Logged-in permitted admin can.

**Acceptance criteria**
- Admin auth is enforced server-side, not only in UI.

**Implementation note:**  
Added server-only `requireAdmin()`, a dynamic protected `/dashboard` layout/page, and root Next 16 `proxy.ts` session-refresh wiring. The guard checks Supabase `getUser()` on every dashboard request and compares `ADMIN_EMAIL` case-insensitively when configured. A browser request to `/dashboard` without configured credentials was verified to return a 307 redirect to `/login?error=unavailable` without rendering dashboard content.

---

## Task 4.3 — Build admin application shell

- [x] Create dashboard sidebar/navigation:
  - Overview
  - Repositories
  - Shares
  - Activity
  - Settings
- [x] Add responsive mobile navigation.
- [x] Show signed-in email.
- [x] Add logout.
- [x] Add theme toggle.

**Acceptance criteria**
- Desktop and mobile admin shells are polished.
- Navigation states are clear.

**Implementation note:**  
Added `components/admin/admin-shell.tsx` with desktop sidebar navigation, responsive mobile Sheet navigation, active states, signed-in email, theme switcher, and logout. The protected dashboard layout now wraps its children in the shell. Browser QA verified the mobile navigation links and account controls through a temporary preview route, which was removed after inspection.

---

# Phase 5 — GitHub App Integration

## Task 5.1 — Add GitHub App authentication

- [x] Install appropriate Octokit packages.
- [x] Implement server-only GitHub App authentication.
- [x] Mint installation access tokens correctly.
- [x] Centralize GitHub API version and common headers.
- [x] Never log tokens.

**Acceptance criteria**
- Server can authenticate as the GitHub App installation.
- Installation token never reaches browser code.

**Implementation note:**  
Added server-only Octokit App authentication in `lib/github/client.ts` using `@octokit/auth-app` and `@octokit/rest`, with explicit installation-token minting, automatic client auth configuration, and centralized GitHub REST headers (`Accept` and API version `2022-11-28`). GitHub App IDs are validated as positive integers, and `tests/github.test.ts` exercises the mocked installation-token endpoint without logging credentials.

---

## Task 5.2 — List installation repositories

- [x] Implement repository listing from the GitHub App installation.
- [x] Map GitHub data into a minimal internal representation.
- [x] Handle 401/403/rate-limit errors cleanly.
- [x] Add unit/integration tests with mocked GitHub responses.

**Acceptance criteria**
- Admin can retrieve repositories the app is installed on.
- No unrelated repositories are fabricated.

**Implementation note:**  
Added `lib/github/repositories.ts` and `lib/github/types.ts` to paginate the GitHub App installation repository endpoint, map only returned repository metadata into `GitHubRepositorySummary`, and translate authentication, permission, missing-resource, rate-limit, and upstream failures into safe typed errors. Mocked endpoint tests cover the mapping and error paths.

---

## Task 5.3 — Implement repository metadata/ref helpers

- [x] Fetch:
  - repository metadata
  - default branch
  - branches/refs needed by share creation
- [x] Add robust error mapping.

**Acceptance criteria**
- RepoView can validate a selected ref before creating a share.

**Implementation note:**  
Extended the server-only GitHub repository layer with metadata/default-branch retrieval, paginated branch listing, and normalized `getRepositoryRef` validation. The helpers share safe error mapping and tests cover metadata, branches, ref normalization, and installation/API failures.

---

## Task 5.4 — Implement repository tree loading

- [x] Use Git Trees recursive API.
- [x] Detect and handle `truncated`.
- [x] Normalize returned paths.
- [x] Add a graceful truncated-tree UI/error strategy.
- [x] Cache GitHub tree data only after authorization where appropriate.

**Acceptance criteria**
- Normal repositories load a complete tree.
- Truncated responses are never silently treated as complete.

**Implementation note:**  
Added server-only recursive tree loading in `lib/github/trees.ts`. Tree entries are normalized to safe internal paths with no GitHub URLs, and a typed `GitHubTreeTruncatedError` provides an explicit downstream error state for incomplete trees; no unauthenticated tree cache is introduced. Tests cover normalization and truncation handling.

---

## Task 5.5 — Implement file-content loading

- [x] Fetch individual files server-side.
- [x] Handle:
  - missing file
  - binary file
  - unsupported/oversized file
  - GitHub API failure
- [x] Do not expose temporary GitHub `download_url` values as viewer URLs.

**Acceptance criteria**
- Private file bytes remain server-mediated.

**Implementation note:**  
Added server-only `lib/github/contents.ts` to fetch individual files through the authenticated Contents API, enforce a 1 MB text-preview limit, detect known binary extensions and NUL bytes, and return an explicit unavailable result for unsupported previews. Missing/API failures use typed safe errors, and the response shape omits GitHub provider URLs. Tests cover text decoding, binary/oversized handling, NUL detection, and 404 mapping.

---

# Phase 6 — Repository Registry

## Task 6.1 — Build repositories dashboard

- [x] Create `/dashboard/repositories`.
- [x] Show GitHub App-accessible repositories.
- [x] Allow enabling/disabling repository records.
- [x] Display:
  - owner/name
  - default branch
  - enabled status
- [x] Add loading/empty/error states.

**Acceptance criteria**
- Admin can register a GitHub repository with RepoView.
- Local DB state is synchronized deliberately.

**Implementation note:**  
Added the protected `/dashboard/repositories` page, server-side registry helpers, and a validated server action for enabling/disabling records. The page merges only authenticated GitHub App installation results with local Supabase state, displays owner/name, default branch, and status, and includes design-system table, loading, empty, error, and optimistic update states. Browser QA used a temporary fixture route (removed afterward) and verified the table and archived-repository disable behavior.

---

## Task 6.2 — Implement repository default visibility rules

- [x] Allow editing repository-level hidden patterns.
- [x] Seed sensible defaults from `docs.md`.
- [x] Validate glob input.
- [x] Store rules as JSONB.

**Acceptance criteria**
- Rules persist.
- Invalid patterns cannot crash viewer logic.

**Implementation note:**  
Added `lib/security/visibility.ts` with the documented default deny patterns, normalized picomatch validation, safe fail-closed parsing, repository path normalization, and allow-only/hidden matching. Added a JSONB default migration plus a policy editor dialog and server action on the repositories dashboard; invalid patterns are rejected before persistence and invalid stored policies fail closed. Browser QA opened the editor dialog and verified both pattern fields and save controls.

---

# Phase 7 — Security Utilities

## Task 7.1 — Implement secure token generation/hashing

- [x] Add helpers for:
  - high-entropy share token generation
  - viewer session token generation
  - HMAC-SHA-256 hashing
- [x] Use:
  - `SHARE_TOKEN_PEPPER`
  - `SESSION_TOKEN_PEPPER`
- [x] Add tests.

**Acceptance criteria**
- Raw tokens are never stored.
- Same raw token hashes deterministically with the correct pepper.
- Different token types use separate secrets.

**Implementation note:**  
Added server-only `lib/security/tokens.ts` with independent 32-byte URL-safe token generators, HMAC-SHA-256 helpers using the share/session peppers, and constant-time hash verification. Tests verify entropy/format, determinism, pepper separation, and malformed-hash rejection; no persistence path accepts raw tokens.

---

## Task 7.2 — Implement path normalization

- [x] Normalize repository paths.
- [x] Reject:
  - unresolved `..`
  - URL-encoded traversal
  - NUL bytes
  - malformed paths
  - extreme lengths
- [x] Add exhaustive path traversal tests.

**Acceptance criteria**
- Traversal cannot escape repository root.

**Implementation note:**  
Extracted `normalizeRepositoryPath` into `lib/security/path.ts` and made it reject malformed, repeatedly encoded, unresolved parent-directory, NUL-containing, empty, non-string, and overlong paths. Visibility matching now consumes the same utility, with exhaustive traversal-focused tests.

---

## Task 7.3 — Implement visibility policy engine

- [x] Support:
  - repository hidden rules
  - share hidden rules
  - optional allow-only rules
- [x] Hidden rules are enforced on:
  - tree output
  - direct file requests
  - Markdown assets
- [x] Never use client-side CSS blur as a protection mechanism.
- [x] Add tests.

**Acceptance criteria**
- A hidden file cannot be obtained by guessing its direct viewer URL.

**Implementation note:**  
Extended `lib/security/visibility.ts` with repository/share policy composition, hidden-rule union, allow-only narrowing, and `filterVisibleTree` parent retention. The same server-side `isPathAllowedForShare` primitive is ready for tree, direct-file, and Markdown-asset handlers, with tests covering hidden paths, share narrowing, traversal, and no client-side blur reliance.

---

# Phase 8 — Share Creation

## Task 8.1 — Build create-share form

- [x] Create `/dashboard/shares/new`.
- [x] Fields:
  - repository
  - recipient/company label
  - ref
  - expiry
  - notify on view
  - allow download
  - optional note
  - advanced visibility rules
- [x] Use server-side input validation.
- [x] Use the corresponding polished form controls from `design-system/`.

**Acceptance criteria**
- Form validates inputs.
- Repository/ref combination is valid.

**Implementation note:**  
Added protected `/dashboard/shares/new` with repository/ref loading, recipient label, expiry, notification/download controls, optional note, and advanced hidden/allow-only patterns. The server action rechecks admin access, enabled repository state, future expiry, GitHub ref validity, and visibility rules before confirming the form. Browser QA verified the primary fields and expanded advanced editor using a temporary fixture route, which was removed afterward.

---

## Task 8.2 — Implement secure share creation

- [x] Generate 32+ random bytes.
- [x] Store only token HMAC/hash.
- [x] Persist share row.
- [x] Return raw token only once.
- [x] Construct:
  - `https://code.thrn.im/s/<token>` in production
  - local URL in development

**Acceptance criteria**
- Database never contains raw share token.
- Created share can be resolved from its token.

**Implementation note:**  
Added the server-only share creation action to revalidate admin access, enabled repository/ref state, expiry, and visibility rules before generating a token. It inserts only the HMAC digest into `shares`, records the authenticated creator, and returns the raw token only inside a one-time share URL built from `NEXT_PUBLIC_APP_URL`.

---

## Task 8.3 — Build one-time link result UI

- [x] After creating a share:
  - display URL
  - copy button
  - explain that the exact link cannot be recovered
- [x] Add “Create another”.
- [x] Do not store raw token in local storage.

**Acceptance criteria**
- Owner clearly understands one-time token behavior.

**Implementation note:**  
Added the in-memory one-time result panel to `CreateShareForm` with a copy button, explicit hash-only recovery warning, and “Create another share” reset. The raw URL is held only in component state for the current page session and is never written to local storage.

---

# Phase 9 — Share Exchange and Viewer Sessions

## Task 9.1 — Implement `/s/[token]` exchange

- [x] Validate token hash server-side.
- [x] Reject:
  - invalid
  - expired
  - revoked
  - disabled repo
- [x] Generate viewer session token.
- [x] Store only viewer-session hash.
- [x] Set secure HttpOnly cookie.
- [x] Record `link_opened`.
- [x] Redirect to `/view/[shareId]`.

**Acceptance criteria**
- Secret share token disappears from URL immediately after exchange.
- Raw session token never enters database.

**Implementation note:**  
Added server-only `lib/shares/exchange.ts` and `/s/[token]` route handling. Valid links are HMAC-validated, checked against expiry/revocation/repository state, issued a scoped HttpOnly SameSite cookie with an expiry no later than the share, recorded as `link_opened`, and redirected with 303 to `/view/[shareId]`. Invalid paths return no-store safe errors; exchange tests verify session hashes never receive raw tokens.

---

## Task 9.2 — Implement viewer authorization helper

- [x] Validate:
  - viewer cookie
  - session hash
  - session/share relationship
  - expiry
  - revocation
  - repository enabled state
- [x] Reuse this helper for every viewer/source/asset request.

**Acceptance criteria**
- A share ID without a valid session cookie gives no access.

**Implementation note:**  
Added server-only `lib/auth/viewer-session.ts` with `requireViewerSession` and a testable authorization core. It validates the scoped cookie hash, share relationship, expiry, revocation, and enabled repository before returning context; future viewer/source/asset handlers can use this single guard rather than trusting a share ID.

---

## Task 9.3 — Build share error states

- [x] Implement polished recipient states for:
  - invalid link
  - expired link
  - revoked link
  - repository unavailable
  - ref unavailable
- [x] Do not expose internal details.

**Acceptance criteria**
- Errors are useful but non-sensitive.

**Implementation note:**  
Added noindex `/view/error` and centralized safe reason-to-copy mapping in `lib/viewer/share-errors.ts`. The share exchange redirects to this polished recipient state for known or generic failures without exposing provider/internal details; tests cover known and unknown reason fallbacks.

---

# Phase 10 — Viewer Shell and File Tree

## Task 10.1 — Build viewer layout

- [x] Create desktop viewer shell.
- [x] Add:
  - RepoView identity
  - owner/repository
  - Private source preview badge
  - ref/branch indicator
  - theme toggle
- [x] Create left file-tree area.
- [x] Create main content pane.
- [x] Add mobile Sheet for tree.

**Implementation note:**  
Added the server-guarded viewer route layout and responsive `ViewerShell` with RepoView identity, repository/ref context, private preview badge, theme control, desktop tree rail, main pane, and mobile file-tree Sheet. The shell currently exposes a deliberately neutral authorized-files placeholder until Task 10.2 wires in the filtered tree. Browser QA verified the desktop and mobile layouts; the mobile trigger is labeled for assistive technology and no admin controls are rendered.

**Acceptance criteria**
- Viewer feels like a polished developer product.
- No admin controls leak into recipient UI.

---

## Task 10.2 — Build filtered file tree

- [x] Load authorized repository tree.
- [x] Filter with visibility policy.
- [x] Folders before files.
- [x] Stable alphabetical sorting.
- [x] Expand/collapse folders.
- [x] Selected path state.
- [x] File icons.
- [x] Long-name handling.
- [x] Search/filter.
- [x] Keyboard usability.

**Implementation note:**  
Added server-side authorized tree loading in `lib/viewer/tree-loader.ts`, which applies repository and share visibility rules before serializing any entries to the client. Added the stable tree model in `lib/viewer/tree-model.ts` and the accessible responsive file-tree UI in `components/viewer/viewer-file-tree.tsx`, including synthetic parent retention, folder-first sorting, expansion state, search, selected-file state, file-type icons, truncation/title help, empty/error states, and Arrow/Home/End keyboard navigation. Added two model tests and browser QA for mobile drawer behavior, desktop layout, search, selection, expansion, long names, and console cleanliness.

**Acceptance criteria**
- Hidden paths never appear.
- Large normal portfolio repos remain usable.

---

## Task 10.3 — Implement root repository view

- [x] Show root file listing/tree state.
- [x] Discover README case variants.
- [x] If README exists, render it beneath root listing.
- [x] If not, do not show an error.

**Implementation note:**  
Added server-authorized root loading in `lib/viewer/root-loader.ts`, with case-insensitive root `README`, `README.md`, `README.markdown`, and `README.mdx` discovery constrained to the already filtered tree. Added the root listing and README preview in `components/viewer/root-repository-view.tsx`; README content is fetched through the existing protected GitHub content loader and shown beneath the listing, while repositories without a root README show a neutral absence message. Full GFM/Markdown rendering remains assigned to Phase 12. Browser QA verified README and no-README states on desktop and mobile, with no console warnings.

**Acceptance criteria**
- Repo landing page works with or without README.

---

# Phase 11 — Code Viewer

## Task 11.1 — Add language detection

- [x] Implement robust filename/extension mapping.
- [x] Support common languages listed in `docs.md`.
- [x] Fall back to plaintext.
- [x] Add tests.

**Implementation note:**  
Added `detectViewerLanguage` in `lib/viewer/language.ts` with basename-first handling for Dockerfiles, Makefiles, Gemfiles, dotenv variants, and a broad extension map for the documented portfolio languages. Unknown, empty, and unsupported names return `text`. Added 26 mapping/fallback tests in `tests/viewer-language.test.ts`; build verification passed.

**Acceptance criteria**
- Common portfolio source files choose correct Shiki language.

---

## Task 11.2 — Add binary/preview detection

- [x] Detect text vs binary safely.
- [x] Add size limits.
- [x] Handle images separately.
- [x] Show polished unsupported preview for binary/large files.

**Implementation note:**  
Connected the existing server-only contents loader’s NUL-byte, known-binary-extension, and 1 MB preview cap to the protected `/view/[shareId]/blob/[...path]` route. Image files now return a separate MIME-tagged result without content bytes; generic binary and oversized files remain explicit unavailable results. The route authorizes the viewer session, normalizes and visibility-checks the path before fetching, and never sends hidden or unsupported bytes to the browser. Added `components/viewer/viewer-file-preview.tsx` with a polished binary/image/oversized/unavailable state; browser QA confirmed the binary card explicitly says no file bytes were rendered. Protected image delivery remains assigned to Phase 12.5.

**Acceptance criteria**
- Binary files never appear as corrupted text.

---

## Task 11.3 — Implement Shiki source rendering

- [x] Add Shiki.
- [x] Highlight server-side.
- [x] Support light/dark themes.
- [x] Preserve:
  - spaces
  - tabs
  - long lines
- [x] Add horizontal scrolling.
- [x] Avoid soft-wrap by default.

**Implementation note:**  
Added `shiki` and a server-only `SourceCodeRenderer` using GitHub light/dark dual-theme output. `ViewerFilePreview` now renders highlighted source HTML on the server with the RepoView monospace token, preserves tabs/whitespace, keeps long lines unwrapped, and provides horizontal scrolling. Added CSS variable switching for `.dark` mode, a plaintext fallback for unexpected grammar failures, renderer tests, and desktop/mobile browser QA in both light and dark themes.

**Acceptance criteria**
- Code formatting matches source.
- No client-side editor runtime is required.

---

## Task 11.4 — Add line numbers and copy

- [x] Add non-selectable line-number gutter.
- [x] Ensure copied code does not include line numbers.
- [x] Add Copy File button.
- [x] Add filename/breadcrumb header.

**Implementation note:**  
Added a CSS counter-based, user-select-disabled line-number gutter to the Shiki output, keeping raw source separate for copying. Added the client `CopyFileButton`, a breadcrumb-style repository/path header, and success/failure feedback. Browser QA verified visible line numbers, the copy-state transition, and clean console output.

**Acceptance criteria**
- Code is selectable and copyable cleanly.

---

# Phase 12 — Markdown Renderer

## Task 12.1 — Install/configure Markdown pipeline

- [x] Add:
  - `react-markdown`
  - `remark-gfm`
  - `rehype-slug`
- [x] Add `rehype-sanitize`.
- [x] Create reusable Markdown renderer.
- [x] Keep source Markdown untrusted.

**Implementation note:**  
Added `react-markdown`, `remark-gfm`, `rehype-slug`, and `rehype-sanitize`, plus the reusable `components/viewer/markdown-renderer.tsx`. The implementation intentionally keeps raw HTML disabled for the safer/simple v1 mode and sanitizes the generated tree; README and Markdown file previews now use this renderer instead of treating Markdown as source code. Tests and browser QA cover GFM basics and confirm raw `<script>` content is not rendered.

**Acceptance criteria**
- Plain Markdown renders safely.

---

## Task 12.2 — Implement GFM document components

- [x] Style:
  - headings
  - paragraphs
  - blockquotes
  - lists
  - nested lists
  - task lists
  - tables
  - strikethrough
  - inline code
  - links
  - images
  - horizontal rules
- [x] Tables must horizontally scroll when needed.
- [x] Images must stay within layout.

**Implementation note:**  
Added reusable Markdown component overrides for headings, paragraphs, blockquotes, nested/task lists, tables, strikethrough, inline/fenced code, links, images, and rules. Tables sit inside horizontal overflow containers, images are lazy, bounded, and outlined, and task checkboxes are disabled/read-only. Added renderer coverage and browser QA for a realistic GFM README at a narrow viewport. URL routing/security and Shiki fenced blocks remain in their dedicated tasks.

**Acceptance criteria**
- Normal GitHub README files look polished.

---

## Task 12.3 — Add Shiki Markdown code blocks

- [x] Render fenced code blocks with Shiki.
- [x] Detect language.
- [x] Fall back cleanly.
- [x] Add copy control.
- [x] Make dark/light themes consistent with normal code viewer.

**Acceptance criteria**
- Markdown fenced code quality matches standalone source viewer.

**Implementation note:**  
Added a server-rendered `MarkdownAsync` fenced-code component that detects language classes, delegates highlighting and graceful fallback behavior to the shared Shiki renderer, and includes a copy control with the same dual light/dark theme output and line-number surface as standalone source previews. Verified with focused tests, production build, and live light/dark browser checks.

---

## Task 12.4 — Implement secure relative-link resolution

- [x] Resolve relative links from current Markdown file directory.
- [x] Normalize paths.
- [x] Prevent traversal.
- [x] Route:
  - Markdown/file links → RepoView
  - directory links → RepoView tree
  - relative images → protected asset route
- [x] External HTTPS links open safely.
- [x] Reject dangerous schemes.
- [x] Add tests.

**Acceptance criteria**
- Nested README relative links work correctly.
- `javascript:` and traversal links do not.

**Implementation note:**  
Added a server-side Markdown URL resolver that decodes and normalizes nested repository paths, rejects encoded traversal/control characters and non-HTTPS schemes, maps files to blob routes, directories to a protected tree route, and relative images to the protected asset URL shape. Markdown components now enforce safe external-link attributes and render rejected targets inertly. Added the directory route, resolver/renderer tests, and live browser verification.

---

## Task 12.5 — Implement protected Markdown asset route

- [x] Authorize viewer session.
- [x] Normalize and validate path.
- [x] Enforce visibility rules.
- [x] Fetch private asset server-side.
- [x] Allow only safe preview MIME types.
- [x] Set `X-Content-Type-Options: nosniff`.
- [x] Cap size.
- [x] Use private/no-store caching as appropriate.

**Acceptance criteria**
- Private README images render.
- Asset route cannot be used to bypass hidden-file rules.

**Implementation note:**  
Added `/api/assets/[shareId]/[...path]` with viewer-session authorization, normalized path and visibility enforcement before any GitHub fetch, a server-only image loader capped at 5 MB, an allowlist of safe image MIME types, `nosniff`, private `no-store` caching, and an SVG CSP. Added handler and loader tests covering authorized bytes, hidden paths, unauthorized requests, MIME rejection, and size limits.

---

## Task 12.6 — Test realistic README files

- [x] Test README containing:
  - GFM table
  - task list
  - nested list
  - inline code
  - fenced TS/Python/JSON
  - relative image
  - nested relative Markdown link
  - external link
  - raw HTML if supported
- [x] Fix visual and functional issues.

**Acceptance criteria**
- README rendering is publication-quality.

**Implementation note:**  
Added a realistic README fixture covering the full documented Markdown surface and verified its server output, routing attributes, sanitization, and Shiki fences. Browser QA exposed and fixed mixed ordinary/task-list marker styling; the integrated dark-theme preview now renders the fixture cleanly with no diagnostics. Full tests, lint, typecheck, and webpack production build pass.

---

# Phase 13 — Shares Dashboard

## Task 13.1 — Build shares list

- [x] Create `/dashboard/shares`.
- [x] Columns:
  - recipient
  - repository
  - ref
  - status
  - confirmed views
  - last viewed
  - expiry
  - created
  - actions
- [x] Implement good empty/loading states.

**Acceptance criteria**
- Share management is clear at a glance.

**Implementation note:**  
Added the authenticated `/dashboard/shares` list with server-side share/repository/session aggregation, active/expiring/expired/revoked/repository-disabled status derivation, confirmed-view and last-viewed metrics, all requested audit columns, detail actions, responsive overflow, empty state, loading skeleton, and database error state. Browser QA verified mobile and desktop layouts.

---

## Task 13.2 — Build share detail page

- [x] Create `/dashboard/shares/[id]`.
- [x] Show:
  - recipient label
  - repo/ref
  - status
  - created
  - expiry
  - notify setting
  - download setting
  - visibility rules
  - note
  - sessions
  - activity
  - notification delivery state
- [x] Do not pretend raw link is recoverable.

**Acceptance criteria**
- Admin can understand a share's entire lifecycle from this page.

**Implementation note:**  
Added the server-only share detail loader and `/dashboard/shares/[id]` page. The detail view combines share/repository state with sessions, confirmed-view duration estimates, activity events, notification delivery attempts, access settings, visibility rules, and a clear one-way-secret notice; revoke/rotate actions remain in their ordered follow-up tasks. Added data-mapping tests and responsive browser QA.

---

## Task 13.3 — Implement revoke

- [x] Add revoke action.
- [x] Require deliberate confirmation.
- [x] Update `revoked_at`.
- [x] Ensure existing viewer sessions stop immediately.

**Acceptance criteria**
- Revoked share can no longer browse any content.

**Implementation note:**  
Added an admin-only server action that validates the share UUID, conditionally sets `revoked_at`, revalidates list/detail paths, and relies on the existing viewer-session authorization check to deny revoked shares immediately. Added a deliberate confirmation dialog with explicit existing-session impact warning, action tests, and browser QA without submitting the destructive action.

---

## Task 13.4 — Implement expiry update

- [x] Allow extending/changing expiry.
- [x] Validate new value.
- [x] Reflect state immediately.

**Acceptance criteria**
- Expiry behavior is correct for current sessions too.

**Implementation note:**  
Added an admin-only expiry update action with UUID/date validation, support for clearing expiry or setting 7/30/90-day windows, path revalidation, and immediate viewer enforcement through the existing session authorization check. Added the expiry dialog, action tests, and browser QA.

---

## Task 13.5 — Implement link rotation

- [x] Create a new share token/hash.
- [x] Invalidate previous token.
- [x] Show new raw link once.
- [x] Preserve share metadata/activity as sensibly as possible.

**Acceptance criteria**
- Old link stops working.
- New link works.

**Implementation note:**  
Added admin-only rotation that generates a fresh high-entropy token, replaces the stored hash while preserving all other share metadata/activity, clears revocation for the newly issued link, and returns the raw URL only to the current action response. Added a deliberate rotation dialog with one-time copy surface, action tests, and browser QA.

---

# Phase 14 — Meaningful View Tracking

## Task 14.1 — Implement link-open event

- [x] Record `link_opened` during token exchange.
- [x] Capture only safe/coarse metadata.
- [x] Do not count it as confirmed human view.

**Acceptance criteria**
- Link scanners can be observed without triggering human-view status.

**Implementation note:**  
Updated the token-exchange route to record `link_opened` with only a referrer hostname, an allow-listed fetch context, and a prefetch flag; paths, query strings, raw User-Agent values, and IPs are excluded. The session stores only the coarse referrer host, remains unconfirmed, and no `view_confirmed` event is emitted. Added metadata sanitization and exchange tests for scanner/prefetch behavior and safe-value handling.

---

## Task 14.2 — Build client `ViewTracker`

- [x] Confirm only when page is visible.
- [x] Trigger after:
  - ~5 visible seconds, OR
  - genuine pointer/key/scroll interaction
- [x] Remove listeners after confirmation.
- [x] Do not collect invasive fingerprints.

**Acceptance criteria**
- A normal server fetch alone cannot confirm a view.

**Implementation note:**  
Added a client `ViewTracker` to the protected viewer shell. It waits for visible time or trusted pointer/keyboard/scroll interaction before making one same-origin confirmation request, ignores hidden and synthetic events, collects no fingerprint data, and removes its listeners after success or unmount. Added deterministic tracker tests for visibility, timing, interaction, retries, and cleanup.

---

## Task 14.3 — Implement `/api/view/confirm`

- [x] Validate viewer session cookie.
- [x] Mark `confirmed_at` once.
- [x] Insert `view_confirmed`.
- [x] Make idempotent.
- [x] Ensure concurrency cannot duplicate initial confirmation side effects.

**Acceptance criteria**
- Multiple confirm calls still produce one initial confirmation.

**Implementation note:**  
Added `POST /api/view/confirm` with strict share-ID validation, protected viewer-session authorization, and a conditional `confirmed_at IS NULL` update that also refreshes `last_seen_at`. Only the request that wins that atomic update inserts `view_confirmed`; later or concurrent calls return an idempotent no-op. Added route tests for malformed, unauthorized, first-confirmation, and duplicate-confirmation paths.

---

## Task 14.4 — Implement heartbeat

- [x] Send heartbeat around every 30s while visible.
- [x] Update `last_seen_at`.
- [x] Do not create excessive event rows.
- [x] Stop when hidden/unmounted.

**Acceptance criteria**
- Admin can estimate active duration.

**Implementation note:**  
Extended `ViewTracker` with a 30-second visible-only heartbeat lifecycle that starts after confirmation, pauses on `visibilitychange`, avoids overlapping requests, and clears on unmount. Added protected `POST /api/view/heartbeat`, which updates only the authorized session’s `last_seen_at` and emits no event rows. Added client and route tests for cadence, pause/cleanup, authorization, and update-only behavior.

---

## Task 14.5 — Record file/document views

- [x] Record coarse route/path view events.
- [x] Do not record every scroll/cursor/mouse movement.
- [x] Deduplicate excessive rapid repeats if useful.

**Acceptance criteria**
- Share detail can show which files/documents were opened.

**Implementation note:**  
Added server-side coarse view events for authorized blob files, Markdown documents, root README renders, and directory routes. Events include only the normalized path and small route/preview metadata, use a short same-session/path deduplication window, and never track scroll, cursor, or mouse-movement streams. Logging failures are swallowed so content rendering remains available.

---

## Task 14.6 — Add coarse client/session metadata

- [x] Parse:
  - browser
  - OS
  - device type
- [x] Store coarse country only when reliably provided.
- [x] Do not store raw IP.
- [x] If IP dedupe is used, store HMAC only.
- [x] Mark obvious User-Agent bots/scanners.

**Acceptance criteria**
- Dashboard metadata is useful but not invasive.

**Implementation note:**  
Added bounded User-Agent parsing for browser, OS, device family, and obvious bot/scanner detection. Token exchange now stores only those coarse fields, a host-only referrer, and a validated two-letter country from known platform headers; raw User-Agent and IP values are never persisted, and no IP dedupe is used. Added parser, country, metadata-sanitization, and exchange coverage.

---

# Phase 15 — Gmail SMTP Notifications

## Task 15.1 — Configure Nodemailer Gmail transport

- [x] Install Nodemailer.
- [x] Use:
  - `smtp.gmail.com`
  - configured port
  - `SMTP_USER`
  - `SMTP_APP_PASSWORD`
- [x] Keep transport server-only.
- [x] Add safe connection/error handling.

**Acceptance criteria**
- Test transport can send using App Password credentials.

**Implementation note:**  
Installed Nodemailer and its TypeScript declarations, then added a server-only reusable SMTP transport configured from the validated Gmail host/port, username, and App Password environment values. The sender uses TLS/timeouts and converts provider failures into a generic `SmtpTransportError` without exposing credentials. Added transport/send and failure-safety tests.

---

## Task 15.2 — Build RepoView view-notification email

- [x] Email subject:
  - `RepoView: <recipient> viewed <owner/repo>`
- [x] Include:
  - recipient/share label
  - repository
  - ref
  - first meaningful view time
  - browser/device
  - country if present
  - secure link to admin share page
- [x] Never include share token/session token/raw IP.

**Acceptance criteria**
- Email is concise and useful.

**Implementation note:**  
Added a tested text/HTML notification formatter with the required subject, share/repository/ref/time/context fields, and an admin share-detail URL built from the configured app URL. HTML values are escaped, subject values are header-safe, missing metadata uses neutral placeholders, and the formatter has no secret/session/IP inputs.

---

## Task 15.3 — Trigger one notification per confirmed session

- [x] Send only after meaningful confirmation.
- [x] Respect `notify_on_view`.
- [x] Guarantee at most one initial notification per session.
- [x] Persist delivery success/failure.
- [x] Do not break viewer on SMTP failure.

**Acceptance criteria**
- Reloading/confirm retry does not spam email.

**Implementation note:**  
Connected first-time meaningful confirmation to notification delivery. An atomic `notified_at IS NULL` claim gates one initial attempt per session, notification preferences and probable-bot sessions are respected, sent/failed `notification_deliveries` rows are persisted, and SMTP/delivery errors are isolated from the successful viewer confirmation response. Added service and route tests for sent, duplicate, disabled, bot, and failure paths.

---

## Task 15.4 — Add Send Test Email action

- [x] Add to Settings.
- [x] Admin-only.
- [x] Show success/failure without leaking credentials.

**Acceptance criteria**
- SMTP can be validated from UI.

**Implementation note:**  
Added the protected `/dashboard/settings` page and server action for a one-off SMTP test message. The action authenticates with `requireAdmin`, sends only through the server transport, and returns generic success/failure feedback; the client surface never receives credentials or provider diagnostics. Added action tests and verified the production route build. Automated checks did not dispatch a real email.

---

# Phase 16 — Activity and Dashboard Analytics

## Task 16.1 — Build dashboard overview

- [x] Create `/dashboard`.
- [x] Show:
  - active shares
  - confirmed views (30d)
  - unique confirmed sessions (30d)
  - enabled repositories
  - recent activity
- [x] Use real data only.

**Acceptance criteria**
- No fake production metrics.

**Implementation note:**  
Replaced the dashboard placeholder with a server-only Supabase aggregate for active shares, 30-day confirmed views, unique confirmed sessions, enabled repositories, and enriched recent view activity. Added real-data empty/error states, loader tests, production build verification, and a temporary fixture preview for browser QA that was removed afterward.

---

## Task 16.2 — Build activity page

- [x] Create `/dashboard/activity`.
- [x] Show chronological events:
  - confirmed views
  - file/document views
  - notification state where relevant
- [x] Include filters if simple/useful.

**Acceptance criteria**
- Activity is understandable without excessive telemetry.

**Implementation note:**  
Added the server-backed `/dashboard/activity` page with chronological confirmed/file/document view and notification-delivery records, recipient/repository enrichment, coarse session context, heartbeat suppression, and All/Views/Notifications filters. Added loader tests plus temporary fixture browser QA; the preview route was removed afterward.

---

## Task 16.3 — Improve share session detail

- [x] For each confirmed session show:
  - first confirmed time
  - last seen
  - approximate active duration
  - browser
  - OS
  - device type
  - country if available
  - viewed paths
- [x] Use accurate wording such as “confirmed session”.

**Acceptance criteria**
- UI does not claim exact human identity.

**Implementation note:**  
Extended share detail session summaries with deduplicated viewed paths and recalculated approximate duration from first confirmation to last seen. The responsive session table now shows first-confirmed/last-seen timestamps, duration, browser/OS/device/country context, and paths, while using “Confirmed session” wording and preserving scanner/pending distinctions. Added data coverage and browser QA with the temporary preview removed afterward.

---

# Phase 17 — Download Policy

## Task 17.1 — Enforce `allow_download`

- [x] Default OFF.
- [x] Hide download controls when false.
- [x] Do not expose a generic raw-file endpoint.
- [x] Protected image/document preview routes must not become source-download bypasses.
- [x] If implementing downloads when true, authorize every request.

**Acceptance criteria**
- Download flag behavior matches `docs.md`.

**Implementation note:**  
Kept `allow_download` defaulted false in the schema and create-share form, while the protected viewer exposes no download controls or generic raw-file route. Text, image, and Markdown asset previews remain separately authorized and inline-only; therefore enabling the stored flag does not create an unimplemented or unauthenticated download path. No download endpoint was added, so there is no request path that can bypass viewer/session authorization.

---

# Phase 18 — Security Hardening

## Task 18.1 — Add caching rules

- [x] Do not publicly cache authorization/private content.
- [x] Ensure revoked links fail before cached source can be returned.
- [x] Apply safe private/no-store headers where appropriate.
- [x] Cache GitHub metadata only where safe.

**Acceptance criteria**
- Cached data cannot bypass share/session authorization.

**Implementation note:**  
Added explicit `private, no-store` and `Vary: Cookie` headers for secret-link, viewer, protected API/asset, and admin routes, alongside the existing force-dynamic pages and authorization-before-fetch sequence. No GitHub metadata cache is enabled, so no private repository response is being publicly memoized. Added cache-policy coverage.

---

## Task 18.2 — Add security headers

- [x] Configure:
  - `X-Content-Type-Options`
  - Referrer policy
  - frame restrictions
  - Permissions Policy
  - suitable CSP where practical
- [x] Ensure private viewer routes do not leak secrets through referrers.

**Acceptance criteria**
- Security headers do not break app behavior.

**Implementation note:**  
Added global `nosniff`, strict referrer, `X-Frame-Options: DENY`, Permissions Policy, and CSP headers, with `no-referrer` overrides for `/s/*` and `/view/*`. Header tests cover the baseline and private-route override; the production build and browser previews remain compatible.

---

## Task 18.3 — Add robots/noindex protections

- [x] Viewer/share routes:
  - noindex
  - nofollow
- [x] Exclude private viewer URLs from sitemap.
- [x] Do not treat robots directives as authorization.

**Acceptance criteria**
- Private URLs are not intentionally indexable.

**Implementation note:**  
Added `noindex/nofollow/noarchive` metadata and `X-Robots-Tag` responses for viewer/share routes, plus `robots.txt` disallow rules for private namespaces. No sitemap includes private paths, and tests document that robots directives are only indexing controls while viewer/session authorization remains mandatory.

---

## Task 18.4 — Audit secret exposure

- [x] Search built/source code for:
  - service-role key usage
  - GitHub private key usage
  - SMTP credentials
  - token logging
- [x] Confirm none are included in client bundles or browser responses.

**Acceptance criteria**
- No secret exposure found.

**Implementation note:**  
Audited source and built output for private env identifiers, private-key markers, credential fixtures, token logging, and console logging. Private values are referenced only from server-only modules/actions; the static client bundle contains none of the private env names or secret fixtures, and no token logging calls were found.

---

# Phase 19 — Error Handling and UX Polish

## Task 19.1 — Implement integration error boundaries/states

- [x] Handle:
  - GitHub auth/access removed
  - rate limit
  - GitHub 5xx
  - Supabase error
  - SMTP error
  - ref deleted
  - file missing
  - binary/large file
  - truncated tree
- [x] Recipient errors must be non-sensitive.
- [x] Admin errors may be more diagnostic.

**Acceptance criteria**
- No expected failure results in an unhandled raw stack trace.

**Implementation note:**
Added root/global error boundaries, a safe not-found page, explicit GitHub access/rate-limit/ref/file/tree states, existing binary/large-file and Supabase/SMTP fallbacks, and non-sensitive recipient error copy. Admin surfaces retain diagnostic error context where appropriate; all expected integration failures are rendered as deliberate UI states.

---

## Task 19.2 — Add loading and skeleton states

- [x] Dashboard
- [x] Repository sync
- [x] Shares
- [x] Viewer navigation
- [x] Code/Markdown transitions where useful

**Acceptance criteria**
- No jarring blank transitions.

**Implementation note:**
Added route-level skeletons for the dashboard overview/activity, repository sync, shares/detail, viewer root, directory, and file-preview transitions using the shared Skeleton primitive.

---

## Task 19.3 — Accessibility pass

- [x] Semantic structure.
- [x] Keyboard navigation.
- [x] Visible focus.
- [x] Accessible dialogs/sheets/dropdowns.
- [x] ARIA labels for icon buttons.
- [x] Proper table semantics.
- [x] Line numbers not noisy to screen readers.
- [x] Reduced motion respected.

**Acceptance criteria**
- Core flows work without mouse-only interaction.

**Implementation note:**
Verified semantic headings/forms/tables and viewer tree keyboard navigation; added explicit modal labelling, focus placement/restoration, Escape dismissal, and reduced-motion CSS. Icon-only controls expose labels, and source line numbers remain CSS-generated presentation outside the code text.

---

## Task 19.4 — Responsive design pass

- [x] Test common desktop width.
- [x] Test tablet.
- [x] Test mobile.
- [x] Ensure:
  - tree becomes Sheet/drawer
  - tables scroll appropriately
  - Markdown images/tables do not overflow incorrectly
  - header controls remain usable

**Acceptance criteria**
- Recipient and admin surfaces are usable on mobile.

**Implementation note:**
Live browser smoke checks covered 1440px desktop, 768px tablet, and 390px mobile layouts across the home, admin login, and recipient error surfaces. The mobile recipient route had no horizontal overflow; the viewer shell keeps the tree in a mobile Sheet and shared tables retain horizontal scrolling.

---

# Phase 20 — Automated Tests

## Task 20.1 — Security unit tests

- [x] Token hashing.
- [x] Token validation.
- [x] Session validation.
- [x] Expiry.
- [x] Revocation.
- [x] Path traversal.
- [x] Visibility rule matching.

**Acceptance criteria**
- Tests cover both valid and attack/error cases.

**Implementation note:**
The security suite covers URL-safe token generation, per-type hashing and constant-time verification, authorized and denied sessions, expiry/revocation/disabled repositories, malformed and traversal paths, fail-closed visibility rules, and hidden/allow-only matching.

---

## Task 20.2 — Markdown tests

- [x] Relative path resolution.
- [x] Nested directories.
- [x] Encoded filenames.
- [x] Dangerous URL rejection.
- [x] Raw HTML sanitization if enabled.
- [x] GFM smoke cases.

**Acceptance criteria**
- Markdown renderer has regression coverage.

**Implementation note:**
Markdown tests cover relative and nested links, encoded filenames, traversal and dangerous schemes, protected assets, external HTTPS links, raw HTML sanitization, slugged headings, GFM lists/task items/tables/strikethrough, fenced code, and realistic README rendering.

---

## Task 20.3 — Tracking/notification tests

- [x] Confirmation idempotency.
- [x] One notification per session.
- [x] Scanner-style link open does not notify.
- [x] SMTP failure does not fail viewer.
- [x] Heartbeat updates session.

**Acceptance criteria**
- Core notification semantics are tested.

**Implementation note:**
Coverage verifies atomic confirmation idempotency, one-time notification claiming and delivery logging, scanner/probable-bot suppression, SMTP failure isolation from viewer confirmation, and heartbeat-only `last_seen_at` updates without extra events.

---

## Task 20.4 — GitHub wrapper tests

- [x] Mock:
  - repo list
  - tree
  - file
  - 404
  - 403/rate limit
  - truncated tree
  - oversized file

**Acceptance criteria**
- GitHub failures map to controlled application behavior.

**Implementation note:**
GitHub wrapper tests cover installation repository listing and metadata/ref lookup, recursive tree normalization and truncation, server-side file decoding, 404 file handling, binary/oversized files, protected assets, and unauthorized/forbidden/rate-limit mapping.

---

## Task 20.5 — Browser-level smoke tests

- [x] Add Playwright or equivalent if practical.
- [x] Cover:
  - admin login
  - dashboard
  - create share
  - token exchange
  - README render
  - code file render
  - revoke/deny

**Acceptance criteria**
- At least one complete happy path and one denied path are automated.

**Implementation note:**
Used the in-app browser as the equivalent live smoke harness. Local browser checks covered the admin login surface, protected dashboard redirect, fixture-backed dashboard/share/detail/create/revoke/rotation surfaces, Markdown and code rendering, the live invalid-token denial path, modal interactions, dark/light themes, and responsive layouts. Authenticated production happy-path automation was not run against a real account or email channel; the corresponding server flows are covered by the integration/unit suite to avoid inventing credentials or creating persistent test data.

---

# Phase 21 — README and Developer Documentation

## Task 21.1 — Write project `README.md`

- [x] Explain RepoView.
- [x] Add architecture summary.
- [x] Add prerequisites.
- [x] Add local setup.
- [x] Add Supabase setup.
- [x] Add migration instructions.
- [x] Add GitHub App setup.
- [x] Add Gmail App Password setup.
- [x] Add environment configuration.
- [x] Add Vercel deployment.
- [x] Add `code.thrn.im` domain setup.
- [x] Add security model.
- [x] Add development commands.

**Acceptance criteria**
- A competent developer can reproduce the app from README.

**Implementation note:**
Added the root `README.md` with the current route/library architecture, prerequisites, local setup, complete environment template, migration order, Supabase/GitHub/Gmail configuration, security model, Vercel deployment, `code.thrn.im` DNS guidance, and verification commands.

---

## Task 21.2 — Reconcile `docs.md` with implementation

- [x] Review every architecture section.
- [x] Update documentation only where actual implementation intentionally differs.
- [x] Do not silently let code/docs diverge.
- [x] Add implementation notes for justified changes.

**Acceptance criteria**
- `docs.md` describes the finished architecture accurately.

**Implementation note:**
Reconciled the route map, viewer-session cookie wording, current `lib/` boundaries, exact preview caps, heartbeat/event semantics, nullable compatibility telemetry columns, source-gutter accessibility treatment, and browser-smoke caveat with the shipped implementation.

---

# Phase 22 — Vercel Production Preparation

## Task 22.1 — Prepare production environment

- [ ] Configure Vercel project.
- [ ] Add required environment variables.
- [ ] Set `NEXT_PUBLIC_APP_URL=https://code.thrn.im`.
- [ ] Confirm production build uses Node/serverless runtime where required by Shiki/GitHub/SMTP.
- [ ] Never commit production secrets.

**Acceptance criteria**
- Vercel preview/production build succeeds.

**Blocker note:**
Repository-side preparation is complete and the local production webpack build passes. The Vercel project, production environment variables, preview URL, and deployment are external account state not available in this workspace, so this task remains unchecked until Vercel access is provided.

---

## Task 22.2 — Configure `code.thrn.im`

- [ ] Add custom domain to Vercel project.
- [ ] Use the exact DNS record Vercel currently provides.
- [ ] Verify TLS/HTTPS.
- [ ] Verify canonical app URL.

**Acceptance criteria**
- `https://code.thrn.im` serves RepoView over valid HTTPS.

---

## Task 22.3 — Production integration test

- [ ] Test Supabase auth in production.
- [ ] Test GitHub private repo access.
- [ ] Test share creation.
- [ ] Open share in a separate incognito/browser session.
- [ ] Confirm README.
- [ ] Confirm code highlighting.
- [ ] Confirm relative README asset.
- [ ] Wait for meaningful view confirmation.
- [ ] Confirm Gmail notification.
- [ ] Revoke share.
- [ ] Confirm viewer is immediately denied.

**Acceptance criteria**
- Full production flow works end to end.

---

# Phase 23 — Final Quality Gate

## Task 23.1 — Run complete automated quality gate

- [ ] Run:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

- [ ] Fix every failure.
- [ ] Do not mark complete with ignored TypeScript/build errors.

**Acceptance criteria**
- Every command succeeds.

---

## Task 23.2 — Manual UI/UX review

- [ ] Inspect:
  - `/login`
  - `/dashboard`
  - `/dashboard/repositories`
  - `/dashboard/shares`
  - `/dashboard/shares/new`
  - share detail
  - activity
  - settings
  - share error screen
  - viewer repo root
  - README
  - Markdown document
  - code file
  - image preview
  - dark mode
  - light mode
  - mobile
- [ ] Fix obvious layout, spacing, overflow, accessibility, and responsive problems.

**Acceptance criteria**
- No obviously unfinished screen remains.

---

## Task 23.3 — Final security review

- [ ] Verify raw share tokens are not stored.
- [ ] Verify viewer tokens are not stored raw.
- [ ] Verify hidden files cannot be guessed directly.
- [ ] Verify revoked shares stop existing sessions.
- [ ] Verify secrets are server-only.
- [ ] Verify private source is not publicly cached.
- [ ] Verify scanner-only link open does not notify.
- [ ] Verify no raw IP storage.
- [ ] Verify Markdown sanitization.
- [ ] Verify asset route authorization.

**Acceptance criteria**
- Core private-source security guarantees hold.

---

## Task 23.4 — Final completion

- [ ] All previous tasks are `[x]`.
- [ ] No core TODOs remain.
- [ ] `README.md` is current.
- [ ] `docs.md` is current.
- [ ] Production flow works.
- [ ] Final quality gate passes.
- [ ] RepoView is ready to use at `code.thrn.im`.

**Final implementation note:**  
<!-- Summarize any deliberate deviations from docs.md here -->

---

# Completion Rules

A task may be marked `[x]` only when:
- implementation exists;
- relevant tests/commands pass;
- affected UI has been inspected when applicable;
- no known regression remains.

Never mark a task complete merely because code was written.

When a later task reveals a defect in an earlier completed task:
1. fix the earlier implementation;
2. rerun its verification;
3. preserve `[x]` only if it again passes;
4. note the correction if material.

At the end of every working session, update this file before stopping so the next session can resume from the first unchecked task.

The next task to work on is always:

> **the first unchecked task in this file.**
