# RepoView

RepoView is a private, read-only source-sharing app. A workspace member signs in, registers a GitHub App-backed repository, creates a scoped share link, and receives a deduplicated email when a recipient meaningfully views the source.

Recipients receive a short-lived session cookie after the secret-link exchange. The viewer exposes only the authorized repository tree, Markdown, source code, and protected image assets. Downloads remain disabled by default and are available only when the owner explicitly enables them.

## Architecture

- `app/(auth)/login` provides Supabase email/password sign-in.
- `app/(admin)/dashboard` is server-guarded workspace UI for repositories, shares, activity, and notification settings.
- `app/s/[token]` exchanges a one-time URL token for an HttpOnly viewer session, then redirects to a token-free viewer URL.
- `app/view/[shareId]` renders the session-authorized repository root, tree, Markdown, code, and safe error states.
- `app/api/view` confirms secure sessions, accepts optional engagement analytics only after the viewer's choice, updates necessary heartbeats, and serves explicitly allowed downloads; `app/api/assets` serves authorized image bytes.
- `app/privacy` and the public viewer's Privacy / Analytics Settings control explain necessary security processing, optional engagement analytics, GPC handling, approximate location/network context, recipient-label semantics, and the non-use of raw keylogging or browser permissions.
- `lib/github` owns GitHub App authentication and server-side repository/tree/file access.
- `lib/security` owns token hashing, path normalization, visibility rules, coarse bot/context signals, and safe boundaries.
- `lib/supabase` owns browser, SSR, and server-only clients; `lib/notifications` owns composition, provider adapters, and durable delivery dedupe.
- `supabase/migrations` is the schema source of truth; `tests` contains unit and integration coverage.

## Prerequisites

- Node.js 22.x (the repository pins Node 22 in `.nvmrc` and `package.json`).
- pnpm 10.12.4.
- A Supabase project with email/password Auth enabled.
- A public GitHub App with read-only Contents permission and OAuth authorization enabled through a callback URL.
- A transactional email provider. SMTP is supported for development; Resend and Postmark are supported for production delivery.

## Local setup

```bash
corepack enable
pnpm install
cp .env.example .env
```

Fill in `.env` using the configuration below, apply the migrations, then start the app:

```bash
pnpm dev
```

Open [http://localhost:3000/login](http://localhost:3000/login). Each new Supabase Auth account receives a personal RepoView workspace automatically.

## Environment configuration

Copy `.env.example` and replace every required blank value. Never commit `.env` or paste its values into logs, issues, or browser code.

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# GitHub App
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=repoview
GITHUB_APP_CLIENT_ID=Iv1...
GITHUB_APP_CLIENT_SECRET=your-github-app-client-secret
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=replace-with-a-random-value-at-least-32-characters

# Token hashing; use independent random values of at least 32 characters
SHARE_TOKEN_PEPPER=replace-with-random-value
SESSION_TOKEN_PEPPER=replace-with-random-value
IP_HASH_SALT=replace-with-random-value

# Transactional email: smtp, resend, or postmark
EMAIL_PROVIDER=resend
EMAIL_FROM=notifications@example.com
OPERATOR_EMAIL=operator@example.com

# Resend (when EMAIL_PROVIDER=resend)
RESEND_API_KEY=your-resend-api-key

# Postmark (when EMAIL_PROVIDER=postmark)
POSTMARK_SERVER_TOKEN=your-postmark-server-token
POSTMARK_MESSAGE_STREAM=outbound

# Optional secret for a trusted scheduler to dispatch retries
NOTIFICATION_DISPATCH_SECRET=replace-with-random-value-at-least-32-characters

# SMTP fallback/development (when EMAIL_PROVIDER=smtp)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=owner@example.com
SMTP_APP_PASSWORD=your-google-app-password
SMTP_FROM_NAME=RepoView
```

`NEXT_PUBLIC_*` values are browser-visible. The service-role key, GitHub App client secret, private key, token peppers, transactional provider credentials, OAuth user tokens, and installation tokens remain server-only.

## Supabase setup and migrations

1. Create a Supabase project and enable email/password authentication.
2. Create the initial account in **Authentication → Users** (or use the sign-up flow).
3. Apply the SQL files in `supabase/migrations/` in filename order using the Supabase SQL editor or the Supabase CLI:

```bash
supabase db push
```

The initial migration creates repositories, shares, viewer sessions, view events, notification deliveries, indexes, timestamps, and RLS-enabled tables. The follow-up migrations add generic/recipient share metadata, workspace-scoped anonymous viewers, repository events, file engagement, location/network/device/security fields, invalid/valid access attempts, notification summaries, and viewer privacy preferences. New viewer sessions default to necessary-only analytics; the optional cross-session viewer identity is created only after an explicit choice and is suppressed by GPC. The tenancy migrations add profiles, workspaces, memberships, workspace-owned settings/installations, audit logs, explicit role policies, immutable tenant ownership, and backfill the existing owner data into one workspace. The repository identity migration adds GitHub's stable repository and node IDs and replaces owner/name uniqueness with workspace-scoped repository identity. Authenticated dashboard flows use the cookie-authenticated Supabase server client so RLS applies; the service-role client is reserved for server-side viewer/session analytics and other explicitly scoped system operations. When an account belongs to multiple active workspaces, RepoView requires an explicit selection at `/workspace/select`; the server validates the HttpOnly active-workspace cookie against current memberships on every dashboard request, and switching redirects through a fresh dashboard request.

Database policy tests live in `supabase/tests/rls_workspace.test.sql` and run with:

```bash
pnpm test:db
```

## Production pre-launch gate

Run these steps in this exact order before deploying or opening public signup:

```text
database migrations
→ legacy installation migration if needed
→ repository identity migration if needed
→ prelaunch check
→ deploy/open signup
```

The concrete commands are:

```bash
npx supabase db push

# Only when a legacy github_installations row is still pending migration:
GITHUB_APP_INSTALLATION_ID=... pnpm migrate:github-installation

# Run when existing repository rows still need stable GitHub identities:
pnpm migrate:github-repository-identities

pnpm prelaunch:check
```

`pnpm prelaunch:check` uses `NEXT_PUBLIC_SUPABASE_URL` and the server-only
`SUPABASE_SERVICE_ROLE_KEY` to run a read-only database verification. It fails
with actionable errors for missing migrations, incomplete GitHub installation or
repository identity migrations, broken workspace boundaries, orphaned shares or
memberships, and incomplete personal-workspace/settings provisioning. It never
repairs, deletes, reassigns, or rewrites production data. Do not deploy or open
signup until it passes.

## GitHub App setup

Create a public GitHub App and configure both its **Setup URL** (`/api/github/setup`) and **Callback URL** (`/api/github/callback`) using the production `NEXT_PUBLIC_APP_URL`. Leave “Request user authorization (OAuth) during installation” disabled so the setup URL can hand off to RepoView’s PKCE authorization step. Installations can be made on personal accounts or organizations; organization requests may wait for owner approval. RepoView stores each verified installation and its GitHub account metadata in `github_installations`; each repository record points to exactly one installation row.

RepoView identifies a repository by GitHub's stable numeric repository ID. The owner/name pair is retained as current display and API location metadata, so a rename or transfer updates the existing RepoView row and keeps its UUID and share URLs.

- Contents: **Read-only**.
- Configure the App webhook URL as `/api/github/webhook`, set a high-entropy `GITHUB_WEBHOOK_SECRET`, and subscribe to the installation and installation repository events. RepoView verifies every delivery against the raw request body with `X-Hub-Signature-256` before parsing it, and deduplicates retries with `X-GitHub-Delivery`.
- Installation deletion closes all repository access and revokes active shares. Suspension blocks GitHub-backed access until an unsuspended event arrives; repository additions refresh registered metadata, while removals disable the repository and revoke its active shares.
- Keep the App ID, App slug, OAuth client ID/secret, and PEM private key in server environment configuration. The client secret and private key are never sent to the browser.
- Connect from **Dashboard → Settings → GitHub** or the first-run dashboard card. RepoView generates one-time state and PKCE values, verifies the authenticated GitHub user can see the returned installation, and only then saves installation metadata.
- The callback never trusts `installation_id` from the GitHub setup URL by itself. A missing user-visible installation is treated as pending/failed and is never attached to a workspace.
- GitHub user access tokens are held in memory only for the callback exchange and repository verification; installation tokens remain short-lived server-side Octokit credentials.
- The existing single-owner installation is migrated once with `GITHUB_APP_INSTALLATION_ID=... pnpm migrate:github-installation`; this variable is not part of RepoView runtime configuration.
- Existing repository rows are then backfilled in place with `pnpm migrate:github-repository-identities`; this preserves repository UUIDs and all share references while capturing the current GitHub owner/name, repository ID, node ID, and default branch.
- Keep the repository selected in each installation when least-privilege access is desired; RepoView lists repositories returned by that specific installation.

The app fetches refs, recursive trees, and file contents on the server through Octokit. Visibility rules are applied before tree entries or file bytes are returned, and paths are checked again before direct file or asset fetches.

## Transactional email setup

For production, set `EMAIL_PROVIDER=resend` or `EMAIL_PROVIDER=postmark`, the provider credential, and a verified `EMAIL_FROM`. For local development, set `EMAIL_PROVIDER=smtp` with a Gmail/Workspace App Password. `OPERATOR_EMAIL` is used only by the protected operator test-email action. Customer notification destinations are configured and verified per workspace in **Dashboard → Settings → Notifications**.

RepoView operator access is separate from customer workspaces. Do not use an
email equality check or a workspace owner/admin role for platform operations.
After the operator has an Auth account, grant access explicitly from a trusted
Supabase SQL session:

```sql
insert into public.system_admins (user_id, granted_by)
values ('operator-auth-user-uuid', 'grantor-auth-user-uuid');
```

The internal surface is available at `/system-admin`. It shows aggregate
health and failure metadata only; it does not load private repository source,
share tokens, or workspace content. `system_admin_audit_logs` records sensitive
operator activity separately from tenant `audit_logs`.

RepoView composes low-volume, deduplicated first-meaningful-view and session-summary notifications into the workspace-scoped `notification_deliveries` ledger. The viewer request only queues a message; an after-response dispatch revalidates workspace/share/session/settings authorization immediately before contacting the provider. Revoked shares, disabled destinations/preferences, and deleting workspaces cancel queued work. Each delivery has one durable outbound attempt key; Resend receives it as `Idempotency-Key`, while SMTP/Postmark transport ambiguity is recorded as `provider_result_unknown` and is never blindly resent. Permanent, cancelled, and unknown outcomes remain visible to operators without exposing provider credentials or response bodies.

## Security model

- Raw share and viewer tokens are generated with cryptographic randomness and stored only as peppered HMAC digests.
- Secret-link exchange sets a scoped HttpOnly, SameSite cookie and redirects to a token-free viewer route.
- Every viewer page, confirmation, heartbeat, and asset request revalidates the session, share, expiry, revocation, repository, and visibility rules.
- Hidden files are denied server-side; CSS masking is not used as an access control.
- Markdown is sanitized and dangerous URLs are rendered inert. Relative links and images resolve only within the authorized tree.
- Viewer/admin/private API responses are `private, no-store`; security headers, `noindex`, and `robots.txt` rules prevent intentional indexing but never replace authorization.
- Necessary-only sessions retain the minimum request, salted-IP-hash, bot, abuse, and security signals needed to operate a protected share. First-party anonymous viewer IDs and coarse browser/device/location and engagement analytics are stored only after the viewer enables optional engagement analytics; browser fingerprinting is not used as identity.
- Coarse browser/device labels and provider-supplied location labels may be stored for owner analytics only when optional engagement analytics is enabled. These values are labeled approximate/observed/inferred in the dashboard and notification emails; they are never used to claim a real identity. Global Privacy Control keeps optional analytics off.
- Raw viewer tokens, installation tokens, private keys, raw IPs, raw user-agents, and transactional provider credentials are not sent to the browser or email. Security uses compact indicators and salted hashes rather than raw network or device profiles.
- Download events are recorded only when the owner explicitly enables protected text downloads.

## Deployment to Vercel

1. Import the repository into Vercel with the **Next.js** framework preset.
2. Use the default build command, `pnpm build`.
3. Add all `.env` values in the appropriate Vercel environment scopes.
4. Set `NEXT_PUBLIC_APP_URL=https://code.thrn.im` for production.
5. Keep GitHub, SMTP, Supabase service-role, and Shiki work on the normal Node/serverless runtime; do not move them to Edge without validating the dependencies.

## `code.thrn.im` domain

In Vercel, open **Settings → Domains**, add `code.thrn.im`, and publish the exact DNS record Vercel provides for the current project. Do not guess or hardcode a DNS target. Confirm Vercel has issued HTTPS, then update `NEXT_PUBLIC_APP_URL` and create new share links from the canonical domain.

## Development commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For restricted environments where Corepack cannot write its default cache, use:

```bash
COREPACK_HOME=/private/tmp/repoview-corepack pnpm install
```

See [`docs/tasks.md`](docs/tasks.md), [`docs/docs.md`](docs/docs.md), and [`docs/architecture-boundaries.md`](docs/architecture-boundaries.md) for the implementation checklist, product contract, and boundary rules.
