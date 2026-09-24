# RepoView application boundaries

RepoView keeps browser presentation, server integrations, and security policy
separate. The provided `design-system/` reference app remains outside the root
application compilation scope; its adopted visual surface lives in
`components/ui/` and `app/globals.css`.

## App routes

- `app/(auth)/` contains public authentication pages only.
- `app/(admin)/` contains server-guarded owner dashboard pages and its shell.
- `app/s/` contains the one-time secret-token exchange route. It must redirect
  to token-free viewer routes after setting the HttpOnly viewer cookie.
- `app/view/` contains token-free, session-authorized viewer pages.
- `app/api/view/` contains confirmation and heartbeat handlers.
- `app/api/assets/` contains authorized, narrowly scoped private asset delivery.

## Components

- `components/ui/` is the RepoView compatibility surface for the supplied
  design-system primitives and tokens.
- `components/admin/` owns dashboard shell and owner-only compositions.
- `components/viewer/` owns recipient shell, tree, and file navigation.
- `components/markdown/` owns safe document presentation.
- `components/code/` owns source presentation and Shiki chrome.
- `components/shared/` owns cross-surface controls such as theme switching.

## Server libraries

- `lib/auth/` owns admin guards and viewer-session cookie validation.
- `lib/github/` owns GitHub App auth, API wrappers, refs, trees, and contents.
- `lib/markdown/` owns parsing, sanitization, and relative URL resolution.
- `lib/code/` owns language mapping, binary detection, and highlighting.
- `lib/notifications/` separates email templates, provider adapters (`smtp`, `resend`, and `postmark`), and the durable notification delivery queue.
- `lib/security/` owns token hashing, path normalization, visibility, and bot
  signals, plus the database-backed application rate limiter and tenant-scoped
  cost quotas. Rate limiting protects request frequency; quotas separately cap
  durable resources, daily work, analytics events, downloads, and notification
  email. Both are enforced after viewer/workspace context is known where
  possible; Vercel or another edge firewall can add coarse volumetric limits
  without replacing these application checks.
- `lib/supabase/` owns browser, SSR, and server-only admin clients.
- `lib/viewer/` owns share loading, authorization, and view event operations.

## Data and tests

- `supabase/migrations/` is the reproducible SQL schema source.
- `tests/` contains unit, integration, and browser-smoke coverage grouped by
  behavior rather than implementation file.

Server-only modules that can access private keys, service-role credentials,
installation tokens, viewer secrets, or transactional email provider credentials must remain outside
Client Components and use `server-only` where appropriate.
