# RepoView — Architecture & Product Specification

**Application:** RepoView  
**Production domain:** `code.thrn.im`  
**Purpose:** Secure, read-only sharing of selected private GitHub repositories with polished source/Markdown rendering, revocable links, meaningful-view analytics, and owner email notifications.  
**Primary host:** Vercel  
**Framework:** Next.js 16.3.3 App Router  
**Database/Auth:** Supabase JavaScript SDK  
**UI:** Provided `design-system/` folder — authoritative source for components, tokens, typography, themes, spacing, surfaces, and interaction patterns  
**Source integration:** GitHub App  
**Email:** Provider-backed transactional email (`smtp`, `resend`, or `postmark`)

---

## 1. Product summary

RepoView is a private source-code showcase. It allows the owner to select repositories already stored on GitHub, create recipient-specific read-only share links, and let a recruiter/interviewer/customer browse the repository without receiving GitHub access.

GitHub stays the source of truth. RepoView does not clone repositories into a new Git forge, provide editing, host Git remotes, or accept pushes.

The primary UX goals are:

1. A recipient should feel that they are using a polished developer product, not a hacked-together file dump.
2. Source files must be readable and accurately syntax-highlighted.
3. `README.md` and all other Markdown documents must render as real GitHub-flavored documents.
4. Relative README links and private-repo images must work.
5. The owner must be able to create, expire, revoke, and rotate recipient-specific links.
6. The owner should receive a notification when a real browser meaningfully views a share, while avoiding common email/security scanner false positives.
7. Private GitHub credentials, Supabase service-role credentials, SMTP credentials, and share secrets must never reach the recipient browser.

---

## 2. Current platform decisions

### Next.js 16.3.3

Pin `next` to `16.3.3`.

Next.js 16.x is in Active LTS as of this specification, and 16.3.3 was published as the August 2026 security release. Use the App Router and React Server Components by default.

Why:
- server-side GitHub access fits Server Components well;
- sensitive integrations stay off the client;
- route handlers cover share exchange, tracking, and protected assets;
- Vercel is the natural deployment target.

Do not copy old middleware/auth patterns blindly. Follow Next.js 16 conventions and current docs.

### Supabase

Use:
- `@supabase/supabase-js`
- `@supabase/ssr`

No ORM. SQL migrations define the schema, and Supabase SDK handles application access.

Admin auth uses Supabase Auth with cookie-based SSR sessions.

A server-only service-role client is used only where a public viewer cannot authenticate directly to Supabase, such as:
- validating a hashed share token;
- creating/updating viewer sessions;
- inserting view events;
- updating notification delivery status.

The service-role key must never be exposed client-side.

### Provided `design-system/`

A complete `design-system/` folder will be provided in the repository. It is the **authoritative UI and visual source of truth for RepoView**.

Before implementing any UI, inspect the folder completely and understand:

- available components and their APIs;
- design tokens / CSS variables;
- typography and font configuration;
- spacing scale;
- colors and semantic surfaces;
- radii, borders, shadows, and elevation;
- light/dark theme implementation;
- responsive patterns;
- navigation primitives;
- forms and form controls;
- dialogs, drawers/sheets, menus, tooltips, tabs, tables, alerts, skeletons, scroll areas, breadcrumbs, sidebars, and toasts if supplied;
- icon conventions;
- loading, empty, error, and disabled states;
- accessibility conventions;
- the styling stack already used by the system.

Rules:

1. **Reuse existing design-system components before creating anything new.**
2. Do not install or initialize shadcn/ui.
3. Do not replace provided components with third-party equivalents merely because they are familiar.
4. Do not create parallel color, spacing, typography, radius, shadow, or theme systems.
5. Do not hard-code arbitrary visual values when a suitable design-system token exists.
6. Preserve component APIs and existing variants unless a genuine defect blocks RepoView.
7. Prefer composition over modifying shared primitives.
8. If RepoView needs a component that does not exist, build an app-specific component using the supplied tokens/primitives and place it in the normal RepoView component area, not inside `design-system/`, unless extending the design system is clearly the correct architectural choice.
9. If a shared primitive must be extended, keep the change backward-compatible and document why.
10. Do not introduce Tailwind, Radix, Base UI, `next-themes`, or another styling/theme dependency solely out of habit. Use whatever the provided design system already uses. Add a dependency only when the existing system genuinely cannot satisfy a required behavior.
11. The finished admin and viewer interfaces must visually belong to the provided design system. Do not produce a separate “developer-tool theme” that ignores it.

The design system controls presentation. `docs.md` controls RepoView product behavior, security, data flow, routes, and feature requirements. If there is a visual conflict, follow the provided design system while preserving RepoView's functional/security requirements.

### Shiki

Use Shiki for source and fenced-code syntax highlighting.

Prefer server-side highlighting in React Server Components. Shiki's Next.js guidance recommends serverless/server rendering over Edge runtime for its lazy language/theme loading.

This avoids shipping an editor/highlighter runtime to every recipient and produces accurate VS Code/TextMate-style highlighting.

### Markdown

Use a safe unified/React Markdown pipeline:

```text
Markdown text
    ↓
react-markdown / remark
    ↓
remark-gfm
    ↓
remark/rehype transforms
    ↓
optional rehype-raw
    ↓
rehype-sanitize
    ↓
custom React components
    ↓
Shiki code blocks
```

`react-markdown` is safe by default and supports component overrides. `remark-gfm` adds GitHub-flavored tables, task lists, strikethrough, autolinks, etc. If raw HTML support is enabled, sanitization must happen after raw HTML parsing.

### Gmail SMTP

Use Nodemailer against Google's SMTP server.

Recommended v1 configuration:

```text
host: smtp.gmail.com
port: 465
secure: true
auth.user: SMTP_USER
auth.pass: SMTP_APP_PASSWORD
```

Google also supports TLS/STARTTLS on port 587.

Use a Google App Password. Never use or store the normal Google account password in the repo.

This application generates a low volume of transactional owner notifications, which is a reasonable fit for Gmail SMTP. It is not intended for bulk email.

### Vercel

Deploy the Next.js application to Vercel.

Production hostname:

`code.thrn.im`

Environment secrets live in Vercel project environment variables.

---

## 3. High-level architecture

```text
                              ┌───────────────────────────┐
                              │         GitHub            │
                              │ selected private repos    │
                              └────────────┬──────────────┘
                                           │
                                 GitHub App installation
                                 Contents: read-only
                                           │
                                           ▼
┌──────────────────────┐        ┌───────────────────────────┐
│ Owner / Admin        │        │ RepoView / Next.js 16.3.3│
│ code.thrn.im/dashboard├──────►│ Vercel                   │
└──────────────────────┘        │                           │
         │                       │ Server Components         │
         │ Supabase Auth         │ Route Handlers            │
         │                       │ GitHub service layer      │
         ▼                       │ Markdown renderer         │
┌──────────────────────┐        │ Shiki renderer            │
│ Supabase             │◄──────►│ Share/session security    │
│ Auth + Postgres      │        │ Notification service      │
└──────────────────────┘        └───────────┬───────────────┘
                                            │
                                            │ Gmail SMTP
                                            ▼
                                  ┌───────────────────────┐
                                  │ Owner email inbox     │
                                  └───────────────────────┘

Recipient:
https://code.thrn.im/s/<secret>
          │
          ▼
token validation + viewer session cookie
          │
          ▼
/view/<share-id>/...
          │
          ├── file tree
          ├── code / Shiki
          └── Markdown / README
```

---

## 4. Trust boundaries

RepoView has four important trust boundaries.

### A. Browser ↔ RepoView

The recipient browser is untrusted.

Never send:
- GitHub App private key;
- GitHub installation access token;
- Supabase service-role key;
- SMTP credentials;
- raw stored share-token hashes;
- viewer-session hashes;
- unrestricted private GitHub download URLs.

Every viewer request must be authorized server-side.

### B. RepoView ↔ GitHub

GitHub App credentials exist only on the server.

The GitHub App should be installed only on repositories that can be shared. Repository contents permission should be read-only.

### C. RepoView ↔ Supabase

The public viewer does not directly get privileged database access.

The browser receives only the public Supabase project information needed for admin-auth client operations. The service-role key is server-only.

### D. RepoView ↔ Gmail

SMTP credentials are server-only. Email failure must never prevent a valid recipient from viewing source.

---

## 5. Main application flows

### 5.1 Admin login

```text
Admin opens /dashboard
        ↓
No valid Supabase session?
        ↓ yes
redirect /login
        ↓
Supabase email/password auth
        ↓
server verifies authenticated user
        ↓
server resolves the user's workspace membership and role
        ↓
dashboard
```

No public signup page.

Create the owner account manually in Supabase.

### 5.2 Repository enablement

```text
Admin → Repositories
        ↓
RepoView authenticates GitHub App installation
        ↓
list installation-accessible repositories
        ↓
Admin enables a repository
        ↓
repositories row upserted in Supabase
```

A local repository row does not grant access on its own. GitHub App installation access is still required.

### 5.3 Share creation

```text
Admin chooses repository
        ↓
recipient/company label
        ↓
branch/ref
        ↓
expiry
        ↓
notify toggle
        ↓
download toggle
        ↓
visibility rules
        ↓
crypto.randomBytes(32+)
        ↓
raw token ───────────────► shown once in URL
        │
        └─ SHA-256/HMAC ─► stored in Supabase
```

Example URL:

`https://code.thrn.im/s/3GC5...high-entropy-token...`

The application cannot reconstruct the link later because only its hash is stored. The owner can rotate/regenerate it.

### 5.4 Share-token exchange

Do not keep the secret token in normal browsing URLs.

```text
GET /s/<token>
        ↓
normalize + hash token
        ↓
find shares.token_hash
        ↓
validate:
- repository enabled
- not revoked
- not expired
- ref present
        ↓
generate random viewer session token
        ↓
store session TOKEN HASH
        ↓
set raw viewer-session token as HttpOnly cookie
        ↓
record link_opened
        ↓
303 redirect
        ↓
/view/<shareId>
```

Cookie properties:

```text
HttpOnly
Secure (production)
SameSite=Lax
Path=/view/<shareId> or suitable protected scope
Expires <= share expiry
```

The URL's `shareId` is not an access credential. The server always validates the viewer-session cookie too.

### 5.5 Meaningful view confirmation

Link scanners often fetch URLs but do not execute normal page JavaScript. Therefore a GET is insufficient evidence of a real view.

```text
share link GET
     ↓
link_opened event
     ↓
viewer HTML rendered
     ↓
client ViewTracker mounts
     ↓
document visible
     ↓
5 seconds visible OR real interaction
     ↓
POST /api/view/confirm
     ↓
validate viewer cookie
     ↓
confirmed_at set once
     ↓
view_confirmed event
     ↓
if notification enabled and notified_at IS NULL:
     ↓
send Gmail SMTP email
     ↓
store delivery result
```

A heartbeat can update `last_seen_at` every ~30 seconds while the page remains visible.

Do not send email on every file navigation.

### 5.6 File browsing

```text
/view/<shareId>/blob/src/example.ts
        ↓
validate viewer session
        ↓
load share + repository + ref
        ↓
visibility policy check
        ↓
GitHub Contents API
        ↓
binary/text detection
        ↓
language detection
        ↓
Shiki highlight
        ↓
render
```

Authorization is checked before fetching/displaying the file.

### 5.7 Markdown

```text
README.md
    ↓
authorize path
    ↓
GitHub fetch
    ↓
Markdown parse
    ↓
GFM
    ↓
safe HTML/AST transforms
    ↓
URL resolver
    │
    ├── relative file → RepoView route
    ├── relative image → protected RepoView asset route
    └── external HTTPS → safe external link
    ↓
sanitize
    ↓
custom components
    ↓
Shiki fenced blocks
    ↓
render
```

---

## 5.8 Design-system integration rule

The repository will contain a `design-system/` folder. Treat it as an input dependency and design authority, not as disposable starter code.

UI implementation flow:

```text
feature requirement
      ↓
inspect design-system/
      ↓
existing component/variant/token available?
      ├── yes → reuse it
      └── no  → compose existing primitives
                   ↓
             still impossible?
                   ↓
             create RepoView-specific component
             using design-system tokens/patterns
```

Before building `/login`, the admin shell, share forms, tables, repository browser, dialogs, mobile navigation, code-viewer chrome, Markdown surfaces, loading states, or error states, inspect the relevant supplied components first.

Do not modify shared design-system primitives merely to make one screen easier. Prefer wrapper/composition components under `components/`. Shared-system modifications are justified only when the primitive itself needs a reusable extension or contains a genuine defect.

## 6. Route map

A clean target route structure:

```text
app/
├── (auth)/
│   └── login/
│       └── page.tsx
│
├── (admin)/
│   └── dashboard/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── repositories/
│       │   └── page.tsx
│       ├── shares/
│       │   ├── page.tsx
│       │   ├── new/
│       │   │   └── page.tsx
│       │   └── [id]/
│       │       └── page.tsx
│       ├── activity/
│       │   └── page.tsx
│       └── settings/
│           └── page.tsx
│
├── s/
│   └── [token]/
│       └── route.ts
│
├── view/
│   └── [shareId]/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── tree/
│       │   └── [...path]/
│       │       └── page.tsx
│       └── blob/
│           └── [...path]/
│               └── page.tsx
│
└── api/
    ├── view/
    │   ├── confirm/
    │   │   └── route.ts
    │   └── heartbeat/
    │       └── route.ts
    └── assets/
        └── [shareId]/
            └── [...path]/
                └── route.ts
```

Route naming can change slightly if implementation quality improves, but preserve the token-exchange and token-free-viewer concepts.

---

## 7. Server module boundaries

Implemented boundary map:

```text
lib/
├── auth/                  # workspace.ts, system-admin.ts, viewer-session.ts
├── dashboard/              # overview.ts, activity.ts
├── env/                    # public/server schemas and accessors
├── github/                 # client, repositories, trees, contents, types
├── notifications/          # smtp.ts, view-email.ts, notify-view.ts
├── repositories/            # registered-repository persistence
├── security/               # tokens, path, visibility, user-agent
├── shares/                 # exchange, dashboard, detail, open metadata
├── supabase/               # browser, SSR, admin, proxy clients
└── viewer/                 # language, Markdown links, page/tree/root loaders,
                             # session events, tracking, and view models

components/viewer owns the Markdown and Shiki compositions because they are
server-rendered presentation components; there are no separate lib/markdown or
lib/code packages in the current implementation.
```

Any module importing a private key, service-role key, or SMTP password should use `server-only` or otherwise be impossible to import into client code.

---

## 8. Database design

### `repositories`

```sql
create table public.repositories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  github_installation_id uuid not null references public.github_installations(id),
  github_repository_id bigint not null,
  github_node_id text not null,
  github_owner text not null,
  github_repo text not null,
  default_branch text not null,
  enabled boolean not null default true,
  default_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, github_repository_id)
);
```

`github_repository_id` is GitHub's stable external identity. `github_owner` and
`github_repo` are mutable display/location metadata and are refreshed during
repository synchronization. The identity migration temporarily allows the two
GitHub identity columns to be null while the one-time backfill fetches current
metadata; it updates rows in place so existing repository UUIDs and share
references remain unchanged.

`default_rules` example:

```json
{
  "hidden": [
    ".env*",
    "**/.env*",
    "**/secrets/**",
    "**/credentials/**",
    "**/*.pem",
    "**/*.key",
    ".git/**",
    "node_modules/**"
  ],
  "allowOnly": []
}
```

### `shares`

```sql
create table public.shares (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories(id) on delete cascade,
  token_hash text not null unique,
  recipient_label text not null,
  ref text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  notify_on_view boolean not null default true,
  allow_download boolean not null default false,
  rules jsonb not null default '{}'::jsonb,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Share-specific rules extend or narrow repository defaults. A share should not be able to override a hard repository deny unless the design explicitly supports that and the admin understands it. Safer v1 behavior: effective hidden paths are the union of repository + share hidden rules.

### `viewer_sessions`

```sql
create table public.viewer_sessions (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.shares(id) on delete cascade,
  session_token_hash text not null unique,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  confirmed_at timestamptz,
  notified_at timestamptz,
  browser text,
  os text,
  device_type text,
  country text,
  region text,
  city text,
  referrer_host text,
  ip_hash text,
  is_probable_bot boolean not null default false
);
```

Viewer sessions store only a salted IP hash for security and bounded parsed
browser/OS/device/country/region/city fields for optional owner analytics. Raw
user-agent and IP values are not stored. The minimization migration removes
fingerprint-like device, network, location-precision, idle-time, and focus/
visibility columns from earlier deployments.

### `view_events`

```sql
create table public.view_events (
  id bigint generated always as identity primary key,
  share_id uuid not null references public.shares(id) on delete cascade,
  session_id uuid not null references public.viewer_sessions(id) on delete cascade,
  event_type text not null,
  path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

Event examples:
- `link_opened`
- `view_confirmed`
- `file_viewed`
- `markdown_viewed`
- `share_denied` only if useful and safe

Heartbeats update `viewer_sessions.last_seen_at` and do not insert event rows.
Do not emit high-volume mouse-move telemetry.

### `notification_deliveries`

```sql
create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.shares(id) on delete cascade,
  session_id uuid not null references public.viewer_sessions(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel text not null default 'email',
  recipient text not null,
  notification_kind text not null,
  status text not null,
  attempt_count integer not null default 0,
  provider_message_id text,
  last_error text,
  next_retry_at timestamptz,
  idempotency_key text unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
```

The current migration adds a unique event key so view and session-summary emails
are idempotent. Notification decisions and composition happen before enqueue;
provider delivery is dispatched after the viewer response and retried through
the trusted dispatcher route. Do not put provider credentials or full provider
response bodies in `last_error`.

### Recommended indexes

```sql
create index shares_repository_idx
  on public.shares(repository_id);

create index shares_active_idx
  on public.shares(expires_at, revoked_at);

create index viewer_sessions_share_last_seen_idx
  on public.viewer_sessions(share_id, last_seen_at desc);

create index view_events_share_created_idx
  on public.view_events(share_id, created_at desc);

create index view_events_session_created_idx
  on public.view_events(session_id, created_at desc);
```

`token_hash` and `session_token_hash` already receive unique indexes through unique constraints.

### RLS strategy

Enable RLS on all public tables.

Do not add anonymous browser policies for share access.

The public viewer talks to Next.js route/server code, which validates the share session and then uses server-side DB access.

For authenticated workspace users:
- use Supabase SSR Auth to verify the user;
- resolve workspace membership and role separately;
- use resource helpers such as `requireRepositoryAccess()` and `requireShareAccess()` before accepting browser-supplied IDs;
- use the authenticated Supabase SSR server client for ordinary dashboard reads and writes so database RLS remains an independent isolation boundary;
- if a server-only service client is needed for viewer analytics, pass only workspace IDs derived from an authorized share/session and keep that path out of dashboard loaders and mutations.

The direct cross-tenant policy suite is `supabase/tests/rls_workspace.test.sql`; run it with `pnpm test:db` in an environment with the Supabase CLI.

---

## 9. Cryptographic token model

### Share token

Generate:

```ts
randomBytes(32).toString("base64url")
```

Never store it.

Store a deterministic server-side digest such as:

```text
HMAC-SHA-256(SHARE_TOKEN_PEPPER, rawToken)
```

Why HMAC instead of bare SHA-256:
- raw tokens are already high entropy, so SHA-256 is acceptable;
- a secret pepper gives defense in depth if the DB alone is exposed.

Use constant-time comparisons where direct comparison occurs.

### Viewer session token

Generate independently, also 32+ random bytes.

Store only:

```text
HMAC-SHA-256(SESSION_TOKEN_PEPPER, rawSessionToken)
```

Cookie stores the raw session token.

A viewer session is valid only when:
- session hash exists;
- session belongs to route share;
- share isn't revoked;
- share isn't expired;
- repository is enabled.

### IP dedupe

If an IP signal is used:

```text
HMAC-SHA-256(IP_HASH_SALT, normalizedIP)
```

Do not store the raw address.

IP hashing is for rough abuse/deduplication only, not identity.

---

## 10. Visibility-policy engine

Visibility must be enforced before content leaves the server.

A good rule object:

```ts
type VisibilityRules = {
  hidden?: string[];
  allowOnly?: string[];
};
```

Use a maintained glob matcher such as `picomatch`/`minimatch`, but validate patterns and normalize paths first.

### Path normalization

All repo paths:
- use forward slashes;
- strip a leading `/`;
- collapse `.` segments;
- reject any unresolved `..`;
- reject NUL bytes;
- reject encoded traversal after URL decoding;
- have a sensible maximum path length.

Never trust a catch-all route parameter directly as a GitHub path.

### Effective policy

Recommended:

```text
repo hidden rules
UNION
share hidden rules
```

If any `allowOnly` rules exist:
- file must match at least one allow pattern;
- and must not match a hidden pattern.

Directory tree filtering must retain parent directories necessary to reach allowed descendants.

### Never use blur as security

CSS blur only hides pixels, not data. If private bytes are sent to the browser, the recipient can inspect them.

Therefore:
- hidden = not fetched/not delivered;
- optional masked mode = redact on server;
- never advertise visual blur as protection.

---

## 11. GitHub integration

### GitHub App permissions

Keep permissions minimal.

Repository:
- Contents: Read-only
- Metadata: whatever GitHub inherently supplies/needs

Do not request:
- Administration
- Actions write
- Issues write
- Pull requests write
- Secrets
- Deployments write

Install the app on **selected repositories only**.

### Authentication

Server holds:
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`

Installation IDs and GitHub account metadata are workspace-owned rows in
`github_installations`. Every `repositories` row references one installation
row, and server code verifies that the installation row belongs to the current
workspace before creating an Octokit client. A legacy `GITHUB_APP_INSTALLATION_ID`
may be supplied only to the one-time migration command; it is not a runtime
environment variable.

Use GitHub App JWT auth to create installation access tokens through a maintained Octokit auth package or a correct implementation. Installation tokens are short-lived; GitHub's docs state they expire after one hour.

Do not assume a fixed token length.

### REST versioning

Set GitHub headers explicitly, including:
- `Accept: application/vnd.github+json`
- the current documented `X-GitHub-Api-Version`

Keep the API version in one server constant so it can be updated centrally.

### Tree loading

Use Git Trees recursive endpoint for fast whole-tree loading:

```text
GET /repos/{owner}/{repo}/git/trees/{ref}?recursive=1
```

GitHub documents a recursive-tree maximum of 100,000 entries / 7 MB. Check the `truncated` field.

For normal portfolio repositories this should usually be sufficient.

If `truncated=true`, do not silently present an incomplete tree.

### File loading

Use repository contents/raw APIs.

Important GitHub constraints:
- Contents directory responses have a 1,000-item limit.
- files <=1 MB support the full endpoint behavior;
- 1–100 MB require raw/object media handling;
- >100 MB is unsupported by the Contents API.

RepoView imposes a 1 MB text preview cap and a 5 MB protected-image cap for UX and security.

### No private GitHub URL leakage

GitHub temporary `download_url` values expire and are intended for temporary use.

RepoView should fetch needed private file content server-side and serve its own rendered/proxied output.

---

## 12. Repository tree UX

The tree is not just a list.

Required behaviors:
- folders sort before files;
- stable alphabetical sorting;
- folder open/closed state;
- current file highlighted;
- search/filter;
- icons by file type;
- long names truncate with tooltip;
- hidden paths never appear;
- file count/large repo states handled gracefully.

Desktop:
- ~280px left rail;
- independent scroll area;
- resizable rail is optional, not required.

Mobile:
- file tree in the design system's mobile drawer/sheet/overlay-navigation primitive (or the closest provided equivalent).

To reduce network chatter, fetch the authorized filtered tree once per repo/ref/share state when reasonable, then let a small Client Component manage expansion/search.

---

## 13. Code rendering

### Language detection

Maintain a filename/extension mapping.

Examples:

```text
.ts, .tsx → typescript / tsx
.js, .jsx → javascript / jsx
.py → python
.go → go
.rs → rust
.java → java
.kt → kotlin
.swift → swift
.rb → ruby
.php → php
.cs → csharp
.cpp/.cc/.hpp/.h → cpp/c
.css → css
.scss → scss
.html → html
.vue → vue
.svelte → svelte
.sql → sql
.sh/.bash/.zsh → bash/shell
.yml/.yaml → yaml
.json → json
.toml → toml
.xml → xml
.md → markdown document renderer
Dockerfile → docker
Makefile → make
.env/example config → dotenv/plaintext depending safety
```

Use basename rules before extension where necessary.

Unknown languages fall back to `text`.

### Shiki

Run Shiki on the server.

Recommended theme pair:
- light: a restrained GitHub/light-like theme
- dark: a restrained GitHub/dark-like theme

Do not create a giant client-side editor.

### Line numbers

Line numbers:
- separate visual gutter;
- not copied when selecting code;
- aligned with wrapped behavior. Prefer no soft wrap for source by default.

Code:
- `white-space: pre`;
- horizontal overflow;
- tab-size 2 or 4 consistently;
- preserve exact source whitespace.

### File size / binary detection

Before text rendering:
- inspect GitHub metadata/content;
- check for NUL bytes in a prefix where needed;
- use extension/MIME hints.

For unsupported/binary:
- show filename, size, and “Preview unavailable.”
- image files can use the authenticated asset route.

---

## 14. Markdown rendering details

Markdown quality is a defining feature of RepoView.

### Core plugins

Suggested:
- `react-markdown`
- `remark-gfm`
- `rehype-slug`
- optional `rehype-raw`
- `rehype-sanitize`

Add a frontmatter parser only if it improves normal repository docs. Frontmatter can be hidden or presented as metadata rather than rendered as a paragraph.

### Raw HTML

GitHub README files sometimes contain HTML for alignment, `<details>`, images, etc.

There are two acceptable v1 modes:

**Safer/simple**
- do not process raw HTML;
- Markdown remains safe but some advanced README formatting will not match GitHub.

**Higher fidelity**
- parse raw HTML via `rehype-raw`;
- immediately sanitize with a deliberately extended `rehype-sanitize` schema.

For RepoView, prefer the higher-fidelity path if it can be tested securely.

Never pass repository HTML directly to `dangerouslySetInnerHTML` unsanitized.

### Relative link resolver

Suppose:

```text
docs/setup/README.md
```

contains:

```md
[Architecture](../architecture.md)
![Diagram](./diagram.png)
```

Resolve relative paths from:

```text
docs/setup/
```

Result:
- `../architecture.md` → `docs/architecture.md`
- `./diagram.png` → `docs/setup/diagram.png`

Then normalize and verify that the result remains in repository root.

#### Internal Markdown links

Open inside RepoView:

```text
/view/<shareId>/blob/docs/architecture.md
```

#### Internal directories

Open inside RepoView tree:

```text
/view/<shareId>/tree/src/components
```

#### Internal images

Use an authenticated RepoView route:

```text
/api/assets/<shareId>/docs/setup/diagram.png
```

That route:
1. validates viewer session;
2. validates path;
3. applies visibility policy;
4. fetches from GitHub server-side;
5. emits an allowlisted image MIME type;
6. sends safe cache headers.

### External links

Allow:
- `https:`
- optionally `http:` if desired, though HTTPS-only is preferable;
- `mailto:` if desired.

Reject/strip:
- `javascript:`
- `vbscript:`
- dangerous `data:` hrefs.

Use:

```html
target="_blank"
rel="noopener noreferrer"
```

for external links.

### External images

External HTTPS images can be allowed directly for README compatibility, but note:
- the recipient browser may contact third-party hosts;
- external images can be tracking pixels.

A future hardening option is an allowlisted image proxy, but avoid introducing an SSRF-prone arbitrary proxy in v1.

At minimum:
- allow only `https://` for external image URLs;
- do not build a generic server fetch endpoint for arbitrary user-supplied URLs.

### Tables

Wrap Markdown tables in an overflow container so wide tables remain usable on mobile.

### Code blocks

Fenced code blocks pass through Shiki.

Unknown fence language falls back to plaintext.

Add:
- copy button;
- language label where known;
- horizontal scrolling.

---

## 15. Private asset route

Relative README images in a private GitHub repo cannot rely on a browser-authenticated GitHub raw URL.

Authenticated asset route must:
- authorize viewer session;
- authorize share status;
- normalize path;
- enforce hidden rules;
- fetch server-side;
- restrict to a safe set of preview MIME types;
- cap file size;
- set `X-Content-Type-Options: nosniff`;
- set private caching;
- avoid `Content-Disposition: attachment` unless downloads are explicitly permitted.

Safe v1 types might include:
- `image/png`
- `image/jpeg`
- `image/gif`
- `image/webp`
- `image/svg+xml` with careful headers/usage

Do not use this route as a generic raw-source bypass.

---

## 16. Viewer session and analytics

### What RepoView can claim

RepoView can accurately say:
- this unique share link was opened;
- a browser executed the RepoView confirmation code;
- this viewer session viewed these RepoView paths;
- the session remained active for approximately this long.

RepoView cannot prove:
- the exact human identity;
- that the label “Stripe recruiter” means a Stripe employee definitely opened it;
- that a person read every line.

UI language should use:
- “share viewed”
- “confirmed session”
- “link activity”
not:
- “John definitely read your code.”

### Client tracking

Keep tracking small, transparent, and choice-aware. Every new share session starts in necessary-only mode. Necessary processing covers share authentication, session security, ordinary request IP handling, abuse/rate limiting, bot detection, and security logging. It must not create a persistent cross-session viewer identifier or write detailed engagement analytics.

The public viewer exposes a visible **Privacy / Analytics Settings** control. A viewer may enable optional engagement analytics, which permits the pseudonymous cross-session viewer identifier, returning-viewer recognition, file order and duration, search/copy/download events, and coarse browser/device/location context. Search text, raw IPs, raw user-agents, and fingerprint-like device fields are not stored. The preference is stored server-side behind a secure first-party preference cookie, and it can be changed later without affecting repository access. A `Sec-GPC: 1` request always takes the necessary-only path, even if an older optional preference exists.

`ViewTracker`:
- no third-party fingerprint library;
- no canvas/audio fingerprinting;
- no mouse-movement stream;
- no keystroke capture.

Client activity signals:
- confirmation;
- file/route view;
- heartbeat.

Client event payloads and server-side page events are accepted only for sessions in optional mode. Confirmation and heartbeat remain available in necessary-only mode for session security, but optional fields are discarded server-side.

### Confirmation

Confirm once when:
- `document.visibilityState === "visible"`;
- and either:
  - 5 seconds elapsed visibly; or
  - an interaction occurs.

Interactions can be:
- pointerdown;
- keydown;
- scroll.

Use passive listeners where appropriate and remove them once confirmed.

### Heartbeat

Every 30 seconds while visible:
- POST authenticated heartbeat;
- server updates `last_seen_at`;
- do not insert an event every second.

Session duration displayed in admin can be:

```text
last_seen_at - confirmed_at
```

with language such as “~6m active”.

---

## 17. Notification architecture

### Trigger

Only first `view_confirmed` per session should attempt the initial notification.

Make confirmation idempotent:
- transaction/update condition checks `confirmed_at is null`;
- notification checks `notified_at is null`.

Concurrent confirmation requests must not create duplicate email.

### SMTP

Use Nodemailer transporter.

Pseudo-configuration:

```ts
createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: Number(process.env.SMTP_PORT ?? 465) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_APP_PASSWORD,
  },
});
```

Do not create a new connection needlessly on every module import if current Vercel runtime allows safe reuse; however correctness is more important than micro-optimization.

### Email content

Subject:

```text
RepoView: Stripe viewed thrns/tracebox
```

Body:

```text
RepoView

A confirmed browser session viewed your private source share.

Share: Stripe — Tracebox interview
Repository: thrns/tracebox
Branch: main
Viewed: Sep 21, 2026, 7:42 PM PDT
Browser: Chrome
Device: Desktop
Country: Canada

View activity
https://code.thrn.im/dashboard/shares/<share-id>
```

Never put:
- secret share token;
- viewer-session token;
- GitHub token;
- raw IP.

### Failure behavior

If SMTP fails:
- catch;
- insert failed notification delivery;
- leave the share usable;
- surface failure in admin dashboard;
- optionally allow “send test email” from Settings.

---

## 18. Admin dashboard product design

### Global shell

Desktop sidebar:
- RepoView logo
- Overview
- Repositories
- Shares
- Activity
- Settings

Bottom:
- theme
- signed-in email
- logout

Mobile:
- compact top bar + sheet.

### Overview

Metrics:
- Active shares
- Confirmed views (last 30d)
- Unique confirmed sessions (last 30d)
- Repositories enabled

Recent activity:
- time
- recipient label
- repo
- action
- approximate session details

### Repositories

Each repository row:
- owner/name
- private/public badge from GitHub if relevant
- default branch
- enabled
- default hidden rules summary
- share count

Actions:
- enable/disable
- edit policy
- create share

### Shares

Columns:
- Recipient
- Repository
- Ref
- Status
- Views
- Last viewed
- Expires
- Created
- menu

Statuses:
- Active
- Expiring soon
- Expired
- Revoked
- Repository disabled

Do not rank recipient behavior.

### Create share

Primary fields:
- Repository
- Recipient/company label
- Ref
- Expiry
- Notify on view

Advanced:
- download
- hidden patterns
- allow-only patterns
- note

After creation:
- one-time secret URL display;
- copy button;
- explicit “This exact URL cannot be recovered because RepoView stores only its hash.”
- optional “Create another”.

### Share detail

Header:
- label
- repo
- active/revoked/expired badge
- revoke
- rotate
- extend expiry

Details:
- created
- expiry
- ref
- downloads
- notifications
- policy rules

Activity:
- confirmed sessions
- last seen
- browser/OS/device
- country
- paths viewed
- approximate duration
- notification status

---

## 19. Recipient UI design

### Visual character

RepoView should feel:
- quiet;
- technical;
- premium;
- fast;
- trustworthy.

Avoid:
- neon gradients;
- oversized marketing headings inside the viewer;
- excessive card nesting;
- glassmorphism;
- decorative animations;
- GitHub logo imitation.

### Typography

Use the typography defined by `design-system/` for UI and document surfaces.

For source code, use the design system's monospace font/token if one exists. Only fall back to Geist Mono or another appropriate monospace stack if the provided system has no code-font definition.

Markdown content:
- readable 16px-ish base;
- strong hierarchy;
- max width around 820–900px for prose;
- code/table/image content may exceed prose width when necessary.

### Viewer top bar

Left:
- RepoView
- owner / repository

Middle/flexible:
- breadcrumbs/current path where useful

Right:
- branch/ref badge/select if share policy allows;
- private preview badge;
- theme toggle.

No admin controls appear to recipient.

### Root repository page

```text
Top bar
─────────────────────────────────────────────────────────
File tree / root listing
─────────────────────────────────────────────────────────
README.md
rendered document
```

On desktop, left persistent navigation tree can coexist with the root content.

### Code file page

```text
Top bar
┌──────────────┬────────────────────────────────────────┐
│ file tree    │ src / agents / voice.ts               │
│              ├────────────────────────────────────────┤
│              │ 1 │ import ...                         │
│              │ 2 │                                    │
│              │ 3 │ export function ...               │
│              │ … │                                    │
└──────────────┴────────────────────────────────────────┘
```

---

## 20. Theming

Use the theme mechanism already supplied by `design-system/`.

Expected modes, if supported by the design system:
- light
- dark
- system

Do not introduce `next-themes` if the design system already has its own theme provider or CSS strategy. If the supplied system has no theme mechanism and RepoView still requires one, add the smallest compatible solution and document it.

Root layout must avoid theme hydration warnings.

Shiki theme output must follow the active design-system theme cleanly. Prefer dual-theme CSS variables/data attributes rather than rerunning highlighting in the browser.

---

## 21. Supabase SDK setup

Expected modules:

### Browser client

`lib/supabase/client.ts`

Uses:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### SSR/server client

`lib/supabase/server.ts`

Uses cookies through `@supabase/ssr`.

### Service-role client

`lib/supabase/admin.ts`

Server-only.

Uses:
- Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY`

Disable automatic browser-style auth persistence on the service client where appropriate.

### Session proxy

Current Supabase/Next.js guidance uses SSR cookie refresh patterns. Implement with current Next.js 16-compatible `proxy.ts` conventions rather than obsolete middleware code.

---

## 22. Environment configuration

`.env.example`:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# GitHub App
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=

# Token hashing
SHARE_TOKEN_PEPPER=
SESSION_TOKEN_PEPPER=
IP_HASH_SALT=

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_APP_PASSWORD=
SMTP_FROM_NAME=RepoView
```

The GitHub private key may require newline restoration depending on how it is entered into Vercel. Centralize parsing rather than scattering `.replace(/\\n/g, "\n")`.

Do not prefix any private value with `NEXT_PUBLIC_`.

---

## 23. Security headers

Set a sensible baseline.

Examples:
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin` or stricter for viewer
- `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`
- Content Security Policy tailored to Next.js and the actual dependencies used by the provided design system
- `Permissions-Policy` disabling unneeded browser capabilities

Viewer/share pages should be:
- `noindex`
- `nofollow`
- excluded from sitemap.

Use metadata/robots headers and optionally response headers.

Do not rely on `robots.txt` as access control.

---

## 24. Cache policy

Authorization:
- never cached across viewers.

Viewer HTML/private content:
- prefer `Cache-Control: private, no-store` unless a proven private caching model exists.

GitHub data inside server:
- can be memoized/cached briefly by `{repo, ref, sha/path}` to reduce API calls.
- cache is an implementation optimization, not an authorization mechanism.

Critical sequence:

```text
request
  ↓
authorize share/session NOW
  ↓
then use/fetch cached repo data
```

A revoked share should fail before cached source is returned.

---

## 25. GitHub API resilience

Handle:
- 401/403: app/install access invalid;
- 404: repo/ref/path removed;
- rate limit;
- transient 5xx;
- tree truncated;
- file too large;
- unsupported binary.

Admin should get enough diagnostic detail to fix configuration. Recipient receives a minimal non-sensitive error.

Do not retry indefinitely.

---

## 26. Vercel deployment

### Project

Import the Git repository into Vercel.

Build command usually:

```text
pnpm build
```

Framework preset:
- Next.js

### Environment variables

Add all production values in Vercel settings.

Make sure:
- `NEXT_PUBLIC_APP_URL=https://code.thrn.im`
- secrets are Production-scoped appropriately.

### Domain

In the Vercel project:
1. Settings → Domains.
2. Add `code.thrn.im`.
3. Vercel will show the exact required DNS record.
4. Add that record in the DNS provider for `thrn.im`.
5. Verify HTTPS provisioning.

Do not hardcode a guessed DNS target in documentation; use the value Vercel currently supplies.

### Function/runtime

Shiki recommends a serverless runtime rather than Edge for its normal bundled highlighter/lazy imports.

Keep GitHub, SMTP, and Shiki server operations on the normal Node/serverless runtime unless tested otherwise.

---

## 27. Gmail setup

For Gmail/Google Workspace:

1. Enable two-step verification where required for App Passwords.
2. Create a Google App Password for RepoView.
3. Store that 16-character/generated value as `SMTP_APP_PASSWORD`.
4. Configure:
   - host `smtp.gmail.com`;
   - port 465 SSL, or 587 TLS;
   - username = full Gmail/Workspace email;
   - password = App Password.
5. Keep `SMTP_USER` as the operator/system mailbox. Customer notification destinations belong to workspace-scoped `notification_settings` rows and are used only when verified.
6. Keep SMTP test delivery operator-only; it must never act as a customer notification fallback.

Gmail has sending limits. RepoView sends low-volume transactional alerts, so notification dedupe matters both for signal quality and quota hygiene.

For production SaaS delivery, prefer Resend, Postmark, SES, or another
transactional provider. RepoView's provider adapter keeps this choice outside
notification decision logic; SMTP remains useful for local development and
operator testing.

---

## 28. GitHub App setup

Create a GitHub App under the GitHub account/org.

Suggested:
- Name: RepoView
- Homepage URL: `https://code.thrn.im`
- Webhook: not required for v1 unless used for cache invalidation
- OAuth callback: optional; any callback/webhook must persist installation metadata server-side

Repository permissions:
- Contents: Read-only

Install:
- Only on selected repositories.

Collect per connected workspace:
- Installation ID
- GitHub account ID, login, and type
- Repository selection and granted permissions

Keep only the App ID and private key in Vercel secrets. Store installation
metadata in `github_installations`; link every repository to its installation
row. Run the one-time legacy migration command with the old installation ID
before removing that value from deployment secrets.

The client accepts an installation ID only after server-side workspace and
repository authorization. Multiple workspaces can therefore connect separate
GitHub users or organizations without sharing installation access.

---

## 29. Performance

Priorities:
1. authorization correctness;
2. fast tree/file navigation;
3. low client JS;
4. no unnecessary GitHub API calls.

Strategies:
- Server Components for source/Markdown.
- Client only for tree interaction/tracking.
- One recursive tree fetch instead of one request per folder for normal repos.
- Shiki server-side.
- lazy render expensive document pieces if needed.
- skeletons for navigation transitions.
- Next.js 16 instant-navigation capabilities can be adopted where stable and useful, but do not make them a prerequisite for v1 correctness.

---

## 30. Accessibility

Required:
- semantic `<nav>`, `<main>`, heading structure;
- accessible tree interactions;
- the provided design system's focus-management/accessibility conventions;
- labels on icon-only buttons;
- keyboard access to file search/tree;
- visible focus ring;
- adequate contrast;
- `aria-current` for selected file where useful;
- tables with proper semantics;
- reduced motion.

Source line numbers should not pollute screen-reader reading excessively. RepoView keeps the gutter as CSS-generated presentation outside the code text DOM.

---

## 31. Testing strategy

### Unit

Security:
- token hashing;
- token format;
- expiry;
- revoke;
- visibility globs;
- path normalization;
- traversal attacks;
- dangerous Markdown URLs.

Code:
- language detection;
- binary detection.

Markdown:
- relative URL resolution;
- nested path resolution;
- encoded filenames;
- GFM table/task list smoke output;
- unsafe HTML/script stripping.

Analytics:
- confirm idempotency;
- notification dedupe;
- heartbeat update behavior.

### Integration

Mock GitHub:
- tree;
- file;
- 404;
- truncated tree;
- oversized file.

Mock SMTP:
- success;
- auth failure;
- timeout.

### Browser smoke

At least, using Playwright or an equivalent browser harness where test auth/data are available:
1. login -> dashboard;
2. create share;
3. exchange share token;
4. load root;
5. README renders;
6. open code file;
7. confirm event;
8. revoke link;
9. viewer denied after revoke.

The current local verification uses the Codex in-app browser for these surfaces
and fixture-backed happy-path screens, plus the live invalid-token denial path.
It intentionally does not create persistent production test shares or send real
email when no dedicated test account is provided.

---

## 32. Observability

Use structured server logs without secrets.

Useful fields:
- request area (`github`, `share`, `smtp`, `supabase`);
- share ID;
- repo ID;
- GitHub status code;
- notification delivery ID;
- error code/class.

Never log:
- raw share token;
- raw viewer session token;
- private key;
- installation token;
- SMTP password;
- service-role key.

Vercel logs are enough for v1. A dedicated observability product can be added later.

---

## 33. Explicit non-goals for v1

Do not build:
- Git push/pull hosting;
- repository editing;
- code comments/review threads;
- pull request UI;
- issue tracker;
- CI/CD UI;
- full commit-history explorer;
- Git LFS implementation;
- OAuth for recipients;
- public user signup;
- team/organization RBAC;
- billing;
- bulk repository downloads by default;
- invasive visitor fingerprinting;
- “who exactly viewed” identity claims;
- AI code analysis.

These can distract from the core portfolio-sharing experience.

---

## 34. Acceptance criteria

### Security

- [ ] GitHub private key is never client-visible.
- [ ] GitHub installation token is never client-visible.
- [ ] Supabase service-role key is never client-visible.
- [ ] SMTP credentials are never client-visible.
- [ ] Raw share token is never stored.
- [ ] Raw viewer-session token is never stored.
- [ ] Token disappears from URL after exchange.
- [ ] Every viewer page validates the HttpOnly session.
- [ ] Hidden path direct requests fail.
- [ ] Revoked shares fail immediately.
- [ ] Expired shares fail.
- [x] No raw IP stored; only a salted workspace-scoped hash is retained for security.
- [ ] Viewer pages are noindex/nofollow.
- [ ] Markdown dangerous schemes/HTML are sanitized.

### Source viewer

- [ ] Tree renders and navigates correctly.
- [ ] Directories and files are visually distinct.
- [ ] Source whitespace is preserved.
- [ ] Code has line numbers.
- [ ] Shiki highlights known languages.
- [ ] Unknown files fall back to text.
- [ ] Binary files do not render as mojibake.
- [ ] Copy file works.
- [ ] Dark/light themes both work.

### Markdown

- [ ] README renders under root listing.
- [ ] Normal `.md` files render as documents.
- [ ] GFM tables work.
- [ ] Task lists work.
- [ ] Strikethrough works.
- [ ] Fenced code works and is highlighted.
- [ ] Relative Markdown links work.
- [ ] Relative private-repo images work.
- [ ] Nested relative paths work.
- [ ] Heading anchors work.
- [ ] External links are safe.
- [ ] Sanitization tests pass.

### Sharing

- [ ] Create share.
- [ ] Label recipient/company.
- [ ] Select ref.
- [ ] Expiry.
- [ ] Revoke.
- [ ] Rotate.
- [ ] Notification toggle.
- [ ] Download toggle.
- [ ] Visibility rules.

### Notifications

- [ ] GET/link scanner does not count as confirmed view.
- [ ] Visible real browser confirms.
- [ ] Only first confirmation sends initial email.
- [ ] Email includes share/repo/time/device/country when available.
- [ ] Email links to admin activity.
- [ ] SMTP failure does not break viewer.
- [ ] SMTP failure is visible to admin.

### Deployment

- [ ] Next.js exactly 16.3.3.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] tests pass.
- [ ] `pnpm build` passes.
- [ ] deploys on Vercel.
- [ ] `code.thrn.im` attached.
- [ ] HTTPS works.

---

## 35. Suggested package set

Use exact/current compatible versions resolved at implementation time while keeping Next.js pinned to 16.3.3.

Likely packages:

```text
next@16.3.3
react
react-dom
typescript

@supabase/supabase-js
@supabase/ssr

shiki
@shikijs/rehype (optional depending renderer design)

react-markdown
remark-gfm
remark-frontmatter (optional)
rehype-raw (if enabling raw HTML)
rehype-sanitize
rehype-slug

nodemailer
@types/nodemailer

@octokit/rest
@octokit/auth-app

picomatch or minimatch
ua-parser-js or a small maintained parser

# Theme/icon packages should come from the provided design system.
# Add next-themes/lucide-react only if the design system already uses them
# or they are genuinely required after inspection.

zod
```

Do not install a second component framework. The supplied `design-system/` folder determines the UI dependencies and styling stack. Reuse those dependencies and components as provided. Add a new UI dependency only when a required RepoView behavior cannot reasonably be implemented with the existing system, and document the reason.

Use `zod` for:
- environment validation;
- action/route inputs;
- share creation.

Avoid dependency inflation.

---

## 36. Source references used for this specification

These are the primary/current references to consult during implementation.

### Next.js

Next.js docs  
https://nextjs.org/docs

Next.js release/news page — includes the August 25, 2026 security release and Next.js 16.3.3  
https://nextjs.org/blog

Next.js support policy  
https://nextjs.org/support-policy

### Supabase

Next.js quickstart  
https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

Server-side auth  
https://supabase.com/docs/guides/auth/server-side

Create SSR client  
https://supabase.com/docs/guides/auth/server-side/creating-a-client

### RepoView design system

The repository-provided `design-system/` folder is the UI source of truth. Inspect its own documentation, source files, examples, tokens, and dependencies directly before implementing any RepoView UI. Do not substitute an external component library unless the provided system is genuinely missing a required capability.

### GitHub

GitHub App REST endpoints / installation tokens  
https://docs.github.com/en/rest/apps/apps

Repository contents REST API  
https://docs.github.com/en/rest/repos/contents

Git Trees REST API  
https://docs.github.com/en/rest/git/trees

### Markdown

react-markdown  
https://github.com/remarkjs/react-markdown

remark-gfm  
https://github.com/remarkjs/remark-gfm

rehype-sanitize  
https://github.com/rehypejs/rehype-sanitize

### Shiki

Shiki Next.js usage  
https://shiki.style/packages/next

Shiki install/usage  
https://shiki.style/guide/install

Shiki rehype integration  
https://shiki.style/packages/rehype

### Google Gmail SMTP

Google Workspace: send email from an app using Gmail SMTP  
https://support.google.com/a/answer/176600

Gmail sending limits  
https://support.google.com/mail/answer/22839

### Vercel

Vercel project settings/custom domains and environment concepts  
https://vercel.com/docs
https://vercel.com/academy/vercel-foundations/vercel-settings

---

## 37. Final architecture decision summary

RepoView v1 should stay intentionally focused:

```text
GitHub App
(read-only selected repos)
        │
        ▼
Next.js 16.3.3 on Vercel
        │
        ├── Admin UI ─────── Supabase Auth
        │
        ├── Shares ───────── Supabase Postgres
        │
        ├── Viewer sessions ─ Supabase Postgres
        │
        ├── Code ─────────── Shiki
        │
        ├── Markdown ─────── react-markdown + GFM + sanitize
        │
        └── Notifications ── Gmail SMTP
        │
        ▼
code.thrn.im
```

The most important implementation principle is:

> **RepoView must never trade private-source security for UI convenience. Authorization happens before content retrieval/delivery, while the presentation layer makes authorized code and documentation feel as polished as a first-class developer product.**
