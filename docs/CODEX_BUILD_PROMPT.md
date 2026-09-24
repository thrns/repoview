# RepoView — Codex Build Prompt

You are Codex acting as the lead full-stack engineer for **RepoView**.

Build the application completely, not a mockup. Work autonomously: inspect the repository first, create a plan, implement in coherent phases, run the app, run typecheck/lint/tests/build, inspect failures, fix them, and continue until the acceptance criteria are met. Do not stop after scaffolding. Do not leave core flows as TODOs.

Before coding, read `docs.md` in full and treat it as the architecture/product specification. If the repository already contains code, preserve good existing patterns and make the smallest clean migration necessary.

## Product

**RepoView** is a private, read-only GitHub repository sharing application hosted at:

`https://code.thrn.im`

It lets the owner create expiring/revocable private links to selected GitHub repositories. A recipient can browse source code and Markdown without a GitHub account. The owner can see meaningful view activity in a private dashboard and receives a Gmail SMTP notification when a real browser meaningfully views a share.

This is not a Git host and not a code editor. GitHub remains the source of truth.

## Hard technical constraints

Use these exact/high-level choices:

- **Next.js 16.3.3**, App Router, TypeScript, React Server Components by default.
- Pin `next` to exactly `16.3.3` in `package.json`.
- Use a currently supported Node.js version compatible with Next.js 16; target Node 20+ for local/Vercel.
- **Tailwind CSS** and **shadcn/ui** for the design system.
- **Supabase** using the official JavaScript SDK:
  - `@supabase/supabase-js`
  - `@supabase/ssr`
- Do **not** introduce Prisma, Drizzle, Firebase, Clerk, Auth0, NextAuth/Auth.js, or another database/auth abstraction.
- **GitHub App** for private GitHub access. Do not use a broad personal access token.
- GitHub App repository permission: **Contents: Read-only** and only the minimum metadata needed.
- **Nodemailer + Gmail SMTP** for notification email.
  - `smtp.gmail.com`
  - TLS/STARTTLS using Google-supported SMTP configuration.
  - Credentials only from server-side environment variables.
- **Vercel** is the production host.
- Production custom domain: **`code.thrn.im`**.
- **Shiki** for syntax highlighting. Prefer server-side highlighting. Do not use Monaco for the read-only viewer.
- Markdown:
  - `react-markdown`
  - `remark-gfm`
  - `rehype-raw` only if necessary for GitHub-style README compatibility
  - `rehype-sanitize` after any raw-HTML processing
  - `rehype-slug`
  - Shiki-backed fenced code blocks
- `lucide-react` for icons.
- `next-themes` for light/dark/system theme.
- Prefer pnpm.

## Version-aware Next.js rules

This is a Next.js **16.3.3** application. Do not copy stale Next.js 13/14/15 patterns blindly.

- Use the App Router.
- Prefer Server Components for repo/file/Markdown rendering and server data fetching.
- Keep secrets and GitHub/Supabase service-role/SMTP code in server-only modules.
- Use Client Components only for interactivity: tree expansion/search, copy buttons, dialogs, toasts, theme switcher, view-confirmation beacon, etc.
- Follow current Next.js 16 conventions, including `proxy.ts` where request interception is appropriate.
- Do not put sensitive data into `NEXT_PUBLIC_*` variables.

## Required architecture

### 1. Workspace authentication and authorization

Use Supabase Auth only to establish identity. Every account receives a personal workspace and owner membership.

- `/dashboard/**` is private.
- authorization resolves `user → workspace_members → workspace resources`;
- use `requireUser()`, `requireWorkspaceMember()`, `requireWorkspaceRole()`, `requireRepositoryAccess()`, and `requireShareAccess()`;
- do not use an email environment variable as customer authorization;
- unauthenticated users are redirected to `/login`.

Use the Supabase SSR pattern with:
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/admin.ts` (service-role, server-only)
- `lib/supabase/proxy.ts` as appropriate for session refresh/protection.

### 2. GitHub App integration

Create server-only GitHub modules under `lib/github/`.

Required capabilities:
- mint/use GitHub App installation access tokens server-side.
- list the installation's repositories for the admin.
- fetch repo metadata.
- fetch branches when needed.
- fetch a recursive repository tree using Git Trees API.
- fetch an individual file through GitHub Contents/raw APIs.
- never return GitHub credentials or installation tokens to the browser.
- never expose GitHub's temporary private download URL as the public viewer URL.
- viewer content must flow through RepoView server code.

Use current versioned GitHub REST headers.

Support repository trees large enough for normal portfolio repositories. If GitHub returns a truncated recursive tree, handle it gracefully:
- display an explicit UI state instead of silently losing files;
- preferably fall back to walking required subtrees non-recursively where practical.

### 3. Repository registry

Admin can enable selected GitHub repositories in RepoView.

Persist a local repository record containing at least:
- id
- GitHub owner
- GitHub repo name
- default branch
- enabled
- created_at
- updated_at
- default visibility rules

The GitHub App installation, not the local table, remains the authority for actual access.

### 4. Secure share links

Admin can create a share with:
- repository
- recipient/company label
- branch/ref
- expiry
- notify-on-view toggle
- allow-download toggle, default OFF
- optional path visibility rules
- optional note

Public link format:

`https://code.thrn.im/s/<high-entropy-token>`

Security requirements:
- generate at least 32 random bytes of entropy.
- store only a cryptographic hash of the share token in Supabase, never the raw token.
- the raw token is shown to the owner only when created.
- on `/s/<token>`, hash and validate it server-side.
- reject expired/revoked/disabled shares.
- create a random viewer session token.
- store only the viewer-session token hash in Supabase.
- set the raw viewer-session token in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- redirect immediately to a token-free viewer URL.
- the share token must not remain in normal browsing URLs, analytics URLs, referrers, or page HTML.
- a UUID/share id in the viewer URL is an identifier, not authorization. Every viewer request still validates the HttpOnly session.
- revocation must stop future access immediately.

Suggested viewer routes:

- `/view/[shareId]`
- `/view/[shareId]/tree/[[...path]]`
- `/view/[shareId]/blob/[...path]`

### 5. Visibility rules

Protect sensitive paths server-side.

Support rules such as:
- hidden globs
- optional allow-only globs

Examples:
- `.env*`
- `**/.env*`
- `**/secrets/**`
- `**/credentials/**`
- `**/*.pem`
- `**/*.key`
- `node_modules/**`
- `.git/**`

Rules MUST be checked:
1. before a path is shown in a tree;
2. again before file content is fetched.

Never implement sensitive-content protection as CSS blur. If a file is sensitive, do not deliver its bytes to the browser.

If you implement a “masked” mode, redaction must happen server-side before the response is produced.

### 6. Code viewer

This is a core quality bar.

All normal source files must:
- render as text, not a textarea/editor;
- preserve whitespace and tabs correctly;
- use Shiki syntax highlighting;
- detect language primarily from file extension/file name;
- fall back cleanly to plaintext;
- use a readable monospace font;
- support horizontal scrolling;
- show line numbers;
- have a copy-file button;
- preserve long lines without corrupt wrapping;
- avoid hydration mismatch;
- work in dark and light mode.

Use Shiki on the server wherever possible. Do not ship the full syntax-highlighting engine to every browser if it can be avoided.

Binary files should have a clear unsupported/preview state instead of garbage text.

Provide good preview handling at minimum for:
- common images;
- JSON;
- YAML;
- Markdown;
- plaintext/log/config files;
- common programming languages.

### 7. Markdown / README rendering

README quality is a hard acceptance criterion.

Render `.md` / `.markdown` as a polished document, not plain text.

Must support:
- headings;
- paragraphs;
- emphasis;
- blockquotes;
- ordered/unordered lists;
- nested lists;
- GFM tables;
- task lists;
- strikethrough;
- inline code;
- fenced code blocks;
- links;
- images;
- horizontal rules;
- heading anchors;
- GitHub-flavored Markdown via `remark-gfm`.

Security:
- Markdown is untrusted display content.
- Do not use unsafe `dangerouslySetInnerHTML` with unsanitized repo content.
- If raw HTML is supported, parse it and sanitize after raw HTML processing using a carefully defined `rehype-sanitize` schema.

Relative-path correctness:
- relative Markdown links must resolve relative to the Markdown file's directory/ref.
- relative links to another Markdown file should open the corresponding RepoView file.
- relative links to files/directories should stay inside the authorized RepoView share.
- relative images from the private repository must render through an authenticated RepoView asset route; do not expose private GitHub credentials or raw temporary GitHub URLs.
- URL-encode paths correctly.
- prevent `../` traversal outside the repository root.
- external `https://` links can open in a new tab with safe `rel` attributes.
- do not permit `javascript:` or equivalent dangerous URLs.

README discovery:
- on repo root, discover common README case variants (`README.md`, `README.MD`, etc.) and render the README under the root file list.
- if no README exists, show the file list without an error.

Fenced Markdown code blocks must use the same high-quality Shiki presentation as normal code files.

### 8. Repo browser UI

Create a modern, restrained, premium developer UI. Think GitHub/Linear/Vercel quality, but do not clone any brand.

Use shadcn components and shared design tokens. Avoid a “template” look.

Viewer desktop layout:
- compact top navigation;
- RepoView identity;
- repository owner/name;
- “Private source preview” status;
- current branch/ref;
- optional share recipient label only if appropriate for the recipient;
- left file tree around 280px;
- main content panel;
- breadcrumbs;
- filename, metadata, copy control;
- README/document view uses a comfortable reading width while source files can use full width.

Responsive:
- on smaller displays the file tree becomes a sheet/drawer.
- keyboard accessible.
- strong focus states.
- sensible loading/skeleton/error/empty states.

Visual direction:
- neutral/slate palette;
- subtle borders;
- minimal shadows;
- no gratuitous gradients;
- `Geist` / `Geist Mono` or an equivalent native Next/Vercel-friendly stack;
- light/dark/system modes;
- 8px-ish spacing rhythm;
- rounded corners used consistently, not excessively.

### 9. Admin dashboard UI

Routes:
- `/dashboard`
- `/dashboard/repositories`
- `/dashboard/shares`
- `/dashboard/shares/new`
- `/dashboard/shares/[id]`
- `/dashboard/activity`
- `/dashboard/settings`

Dashboard should show:
- active shares;
- total meaningful views;
- engaged sessions;
- recently viewed shares;
- recent activity;
- repositories enabled.

Shares table:
- recipient label;
- repository;
- branch;
- status;
- created;
- expiry;
- meaningful views;
- last viewed;
- actions.

Share detail:
- status;
- copy share URL where possible (raw token is not stored, so after creation explain that it cannot be recovered; optionally allow regenerating/rotating the link);
- revoke;
- extend expiry;
- notification toggle;
- download toggle;
- activity timeline;
- viewed paths;
- session durations/last seen;
- coarse device/browser metadata;
- coarse country when available.

Do not pretend you can identify a human merely from a link open. Label the data accurately as share-link/session activity.

### 10. Meaningful view tracking and scanner filtering

A server GET alone does not count as a confirmed human view.

Flow:
1. `/s/<token>` creates the viewer session and records `link_opened`.
2. viewer page loads.
3. a tiny Client Component waits until the page is visible.
4. after ~5 seconds of visible browser execution OR after a genuine interaction such as scroll/pointer/key activity, POST `/api/view/confirm`.
5. server validates the viewer session cookie.
6. mark the session `confirmed_at` once.
7. record `view_confirmed`.
8. only then trigger the notification email if enabled.

Also send a low-frequency heartbeat (for example every 30 seconds while visible) so duration can be approximated.

Do not collect invasive fingerprints.
- do not store raw IP addresses.
- if deduplication needs an IP signal, store only an HMAC/hash using a server-side salt.
- store coarse country only where the hosting platform exposes it.
- parse user agent only for coarse browser/device/OS labels.
- mark obvious bots/scanners from User-Agent heuristics, but the primary defense against mail-link scanners is the JS confirmation step.

Notification deduplication:
- send at most one initial “viewed” email per viewer session.
- do not email on every file click.
- optionally allow a later “returned” notification only after a clearly defined cooldown, but this is not required for v1.

### 11. Gmail SMTP notifications

Use `nodemailer`.

Environment:
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=465` with secure TLS, or supported port 587 STARTTLS
- `SMTP_USER`
- `SMTP_APP_PASSWORD`
- `NOTIFICATION_TO_EMAIL`
- optional `SMTP_FROM_NAME=RepoView`

Use a Google App Password, never the normal Google account password.

Email subject example:
`RepoView: <recipient label> viewed <owner/repo>`

Email body must contain:
- recipient/share label;
- repository;
- branch;
- first meaningful-view time;
- coarse browser/device;
- coarse country if known;
- button/link to the private admin share activity page.

Await the SMTP send inside the server-side operation or otherwise use a Vercel-supported post-response mechanism that is guaranteed to run. Do not fire-and-forget a Promise that may be killed with the serverless invocation.

If email fails:
- viewing must still succeed;
- log a notification failure row;
- surface the failure in admin activity/settings;
- do not leak SMTP error details publicly.

### 12. Supabase database

Create SQL migrations in `supabase/migrations/`.

At minimum implement these logical tables (names can be refined if justified):

`repositories`
- id uuid pk
- github_owner text
- github_repo text
- default_branch text
- enabled boolean
- default_rules jsonb
- created_at timestamptz
- updated_at timestamptz
- unique(owner, repo)

`shares`
- id uuid pk
- repository_id uuid fk
- token_hash text unique
- recipient_label text
- ref text
- expires_at timestamptz nullable
- revoked_at timestamptz nullable
- notify_on_view boolean
- allow_download boolean
- rules jsonb
- note text nullable
- created_by uuid -> auth.users if practical
- created_at
- updated_at

`viewer_sessions`
- id uuid pk
- share_id uuid fk
- session_token_hash text unique
- first_seen_at
- last_seen_at
- confirmed_at nullable
- notified_at nullable
- user_agent nullable
- browser nullable
- os nullable
- device_type nullable
- country nullable
- referrer_host nullable
- ip_hash nullable
- is_probable_bot boolean default false

`view_events`
- id bigint identity pk
- share_id uuid
- session_id uuid
- event_type text
- path text nullable
- metadata jsonb
- created_at timestamptz

`notification_deliveries`
- id uuid pk
- share_id uuid
- session_id uuid
- channel text
- status text
- error_code/text sanitized nullable
- created_at
- sent_at nullable

Add useful indexes for:
- token hashes;
- share status/expiry;
- share events ordered by time;
- sessions by share and last_seen;
- repositories by GitHub owner/repo.

Security:
- enable RLS on application tables.
- do not create permissive anonymous policies.
- browser clients must never receive the Supabase service-role key.
- public share operations occur through validated Next.js server endpoints using server-only credentials.
- admin operations must verify the authenticated Supabase user server-side.

Generate TypeScript database types if practical and keep them in source control.

### 13. Environment variables

Create `.env.example` with names only, never secrets.

Expected variables:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=

SHARE_TOKEN_PEPPER=
SESSION_TOKEN_PEPPER=
IP_HASH_SALT=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_APP_PASSWORD=
SMTP_FROM_NAME=RepoView
NOTIFICATION_TO_EMAIL=
```

If newer Supabase naming uses publishable keys, prefer current official naming over deprecated anon-key terminology while still supporting the project you actually configure.

Server-only env validation must fail fast with clear messages in server contexts. Do not import server-only env modules into Client Components.

### 14. Download behavior

Default: no repository archive/raw-download feature.

If `allow_download=false`:
- no download button;
- raw asset endpoint must only support safe inline assets needed for document rendering/previews, not arbitrary source exfiltration as a convenience endpoint.

If `allow_download=true`, implement explicit download behavior intentionally and ensure authorization is checked for every request.

Remember: a recipient who is allowed to view source can always manually copy what they can see. “Disable download” means do not provide bulk/raw convenience, not DRM.

### 15. Caching

Never cache authorization decisions publicly.

It is acceptable to cache GitHub metadata/tree/file lookups server-side briefly by:
- repository;
- ref;
- path/SHA.

But:
- share/session authorization must be checked before serving each viewer request;
- revoked/expired links must stop working immediately;
- no private source response may be placed in a public/shared CDN cache;
- use private/no-store headers where needed on viewer responses.

### 16. Error handling

Provide deliberate states for:
- invalid share;
- expired share;
- revoked share;
- repo access removed from GitHub App;
- branch/ref deleted;
- file not found;
- path hidden by policy;
- GitHub rate/availability error;
- binary/oversized unsupported preview;
- truncated repository tree;
- Markdown asset missing;
- notification failure;
- Supabase connectivity error.

Do not expose stack traces, GitHub tokens, SQL details, SMTP credentials, or internal secret values.

### 17. Accessibility

Meet a solid WCAG-style baseline:
- semantic headings;
- keyboard navigation;
- visible focus;
- ARIA labels for icon-only buttons;
- sufficient contrast;
- accessible dialogs/sheets/dropdowns from shadcn primitives;
- no information conveyed by color alone;
- code can be selected/copied;
- reduced-motion friendly.

### 18. Testing

Add focused automated tests. Use the lightest sensible stack that works with Next.js 16.3.3.

Must test:
- share token hashing/validation;
- expiry/revocation;
- session-token validation;
- visibility-rule matching;
- path traversal rejection;
- Markdown relative-link resolution;
- Markdown dangerous URL rejection/sanitization;
- language detection;
- meaningful-view confirmation idempotency;
- one-notification-per-session;
- GitHub API wrapper with mocked responses.

Add at least one browser-level smoke test if feasible:
- admin login can reach dashboard with test auth/mock;
- valid share -> token exchange -> viewer;
- viewer can open README and a code file;
- invalid/revoked share is denied.

### 19. Quality gates

Before declaring success run and fix:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If a `typecheck` script does not exist, add one using `tsc --noEmit`.

Also manually inspect:
- `/login`
- `/dashboard`
- repository page
- create-share flow
- share viewer root
- Markdown/README rendering
- code file rendering
- dark mode
- mobile layout
- expired/revoked error screen

No TypeScript errors, no build errors, no obvious console errors, no hydration warnings.

## Required project structure

Use clean boundaries similar to:

```text
app/
  (auth)/
    login/
  (admin)/
    dashboard/
  s/
    [token]/
      route.ts
  view/
    [shareId]/
      page.tsx
      tree/
      blob/
  api/
    view/
      confirm/
      heartbeat/
    assets/

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
  viewer/
  notifications/
  security/
  supabase/
  utils/

supabase/
  migrations/

tests/
```

Refine if needed, but keep clear server/client/security boundaries.

## Design requirements in more detail

### Public viewer

Top bar:
- RepoView wordmark/logo on left.
- owner/repo.
- private preview badge.
- branch/ref.
- theme control.

Tree:
- fast filtering/search;
- folders before files;
- appropriate file icons;
- selected path state;
- keyboard usable;
- preserve current share authorization.

File header:
- breadcrumbs;
- filename;
- optional size;
- copy button;
- no Edit control;
- no misleading GitHub actions.

Code panel:
- line numbers in a non-selectable gutter;
- code itself remains selectable;
- smooth horizontal overflow;
- no unnecessary card-inside-card clutter;
- dark/light syntax theme pairing.

Markdown:
- excellent typography;
- tables have horizontal overflow;
- images constrained to container;
- code blocks polished;
- anchor links;
- root README visually separated from file listing;
- relative image/link behavior must work in private repos.

### Admin

Use sidebar layout with:
- Overview
- Repositories
- Shares
- Activity
- Settings

New share can use a dialog or page but should feel frictionless:
1. choose repo;
2. label recipient;
3. choose ref;
4. expiry;
5. notify toggle;
6. advanced visibility/download;
7. Create Link.

After creation show the link in a prominent one-time result:
- Copy button.
- Warning: RepoView stores only the token hash; this exact link cannot be reconstructed later.
- “Rotate link” can create a replacement token and invalidate the old one.

## No fake data in production

Seed data is fine for development only.

Do not ship:
- fake view counts;
- fake repositories;
- fake analytics;
- fake recipient names;
- hard-coded demo activity.

Empty production state must look intentional.

## Documentation deliverables

Keep `docs.md` updated if implementation choices change.

Also create/update:
- `README.md` with setup steps;
- `.env.example`;
- Supabase migration(s);
- optional `docs/deployment.md` only if it adds value.

README must explain:
1. prerequisites;
2. Supabase setup;
3. GitHub App creation/install;
4. Gmail App Password setup;
5. local env;
6. migrations;
7. dev command;
8. Vercel deployment;
9. adding `code.thrn.im`;
10. security model.

## Initial implementation sequence

Follow approximately:

1. Inspect repository.
2. Pin/scaffold Next.js 16.3.3 + TypeScript + Tailwind.
3. Initialize shadcn and theme primitives.
4. Create Supabase schema/migrations and SSR clients.
5. Implement admin auth/guard.
6. Implement GitHub App server integration.
7. Implement repository registry/sync.
8. Implement cryptographic share creation/exchange/session.
9. Implement visibility policy engine.
10. Implement repo tree + file APIs/server modules.
11. Implement Shiki code viewer.
12. Implement secure Markdown renderer including relative links/images.
13. Implement viewer UI.
14. Implement admin shares UI.
15. Implement meaningful-view tracking.
16. Implement Gmail SMTP notification.
17. Implement activity dashboard.
18. Add hardening headers/caching/error handling.
19. Add tests.
20. Run all quality gates and fix.
21. Review `docs.md` and README against the finished implementation.

## Definition of done

RepoView is done only when all of the following are true:

- It runs on Next.js **16.3.3**.
- Owner can sign in.
- Owner can enable a GitHub App-accessible private repository.
- Owner can create an expiring share link.
- Raw share token is not stored in the DB.
- Recipient can open the link without a GitHub account.
- Share token is exchanged for an HttpOnly viewer session and disappears from subsequent URLs.
- Recipient sees a polished file tree.
- Code files render with correct formatting and Shiki highlighting.
- README and other Markdown render properly, including GFM tables/tasklists and fenced code.
- Relative private-repo Markdown images and links work without leaking GitHub secrets.
- Hidden paths cannot be reached directly.
- Expired/revoked links stop working.
- A simple HTTP/mail scanner does not trigger a confirmed-view notification.
- A real browser session confirms a meaningful view.
- Owner receives one Gmail SMTP email for that confirmed session.
- Admin dashboard shows the session/activity.
- No raw IP is stored.
- Secrets remain server-side.
- Light/dark and desktop/mobile views are polished.
- `pnpm lint`, `pnpm typecheck`, tests, and `pnpm build` succeed.
- README contains reproducible local + Vercel setup.
- There are no core TODO placeholders.

When a tradeoff is needed, prioritize in this order:

1. security of private source;
2. correctness of authorization;
3. Markdown/code rendering correctness;
4. reliable view notification semantics;
5. UX quality;
6. performance;
7. optional features.
