# RepoView

RepoView is a private, read-only source-sharing app. A workspace member signs in, registers a GitHub App-backed repository, creates a scoped share link, and receives a deduplicated email when a recipient meaningfully views the source.

Recipients receive a short-lived session cookie after the secret-link exchange. The viewer exposes only the authorized repository tree, Markdown, source code, and protected image assets. Downloads remain disabled by default and are available only when the owner explicitly enables them.

## Architecture

- `app/(auth)/login` provides Supabase email/password sign-in.
- `app/(admin)/dashboard` is server-guarded workspace UI for repositories, shares, activity, and SMTP settings.
- `app/s/[token]` exchanges a one-time URL token for an HttpOnly viewer session, then redirects to a token-free viewer URL.
- `app/view/[shareId]` renders the session-authorized repository root, tree, Markdown, code, and safe error states.
- `app/api/view` confirms meaningful views, batches semantic engagement, updates heartbeats, and serves explicitly allowed downloads; `app/api/assets` serves authorized image bytes.
- `app/privacy` discloses anonymous viewer analytics, approximate location/network context, recipient-label semantics, and the non-use of raw keylogging or browser permissions.
- `lib/github` owns GitHub App authentication and server-side repository/tree/file access.
- `lib/security` owns token hashing, path normalization, visibility rules, coarse bot/context signals, and safe boundaries.
- `lib/supabase` owns browser, SSR, and server-only clients; `lib/notifications` owns Gmail SMTP and delivery dedupe.
- `supabase/migrations` is the schema source of truth; `tests` contains unit and integration coverage.

## Prerequisites

- Node.js 22.x (the repository pins Node 22 in `.nvmrc` and `package.json`).
- pnpm 10.12.4.
- A Supabase project with email/password Auth enabled.
- A public GitHub App with read-only Contents permission and OAuth authorization enabled through a callback URL.
- A Gmail or Google Workspace App Password for notifications.

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

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=owner@example.com
SMTP_APP_PASSWORD=your-google-app-password
SMTP_FROM_NAME=RepoView
NOTIFICATION_TO_EMAIL=owner@example.com
```

`NEXT_PUBLIC_*` values are browser-visible. The service-role key, GitHub App client secret, private key, token peppers, SMTP credentials, OAuth user tokens, and installation tokens remain server-only.

## Supabase setup and migrations

1. Create a Supabase project and enable email/password authentication.
2. Create the initial account in **Authentication → Users** (or use the sign-up flow).
3. Apply the SQL files in `supabase/migrations/` in filename order using the Supabase SQL editor or the Supabase CLI:

```bash
supabase db push
```

The initial migration creates repositories, shares, viewer sessions, view events, notification deliveries, indexes, timestamps, and RLS-enabled tables. The follow-up migrations add generic/recipient share metadata, persistent anonymous viewers, repository events, file engagement, location/network/device/security fields, invalid/valid access attempts, and notification summaries. The tenancy migrations add profiles, workspaces, memberships, workspace-owned settings/installations, audit logs, explicit role policies, immutable tenant ownership, and backfill the existing owner data into one workspace. The repository identity migration adds GitHub's stable repository and node IDs and replaces owner/name uniqueness with workspace-scoped repository identity. Authenticated dashboard flows use the cookie-authenticated Supabase server client so RLS applies; the service-role client is reserved for server-side viewer/session analytics and other explicitly scoped system operations.

Database policy tests live in `supabase/tests/rls_workspace.test.sql` and run with:

```bash
pnpm test:db
```

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

## Gmail App Password setup

1. Enable two-step verification for the Gmail/Workspace account where required.
2. Create a Google App Password for RepoView.
3. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, the full account address as `SMTP_USER`, and the generated value as `SMTP_APP_PASSWORD`.
4. Set `NOTIFICATION_TO_EMAIL` to the owner inbox.
5. Use **Dashboard → Settings → Send test email** after deployment.

RepoView sends only low-volume, deduplicated first-meaningful-view notifications. SMTP failures are recorded safely and never deny an otherwise authorized viewer.

## Security model

- Raw share and viewer tokens are generated with cryptographic randomness and stored only as peppered HMAC digests.
- Secret-link exchange sets a scoped HttpOnly, SameSite cookie and redirects to a token-free viewer route.
- Every viewer page, confirmation, heartbeat, and asset request revalidates the session, share, expiry, revocation, repository, and visibility rules.
- Hidden files are denied server-side; CSS masking is not used as an access control.
- Markdown is sanitized and dangerous URLs are rendered inert. Relative links and images resolve only within the authorized tree.
- Viewer/admin/private API responses are `private, no-store`; security headers, `noindex`, and `robots.txt` rules prevent intentional indexing but never replace authorization.
- First-party anonymous viewer IDs are stored as peppered digests server-side; browser fingerprinting is not used as identity.
- Prompt-free browser/device context, server/CDN-derived location, and nullable network intelligence fields may be stored for owner analytics. These values are labeled approximate/observed/inferred in the dashboard and notification emails; they are never used to claim a real identity.
- Raw viewer tokens, installation tokens, private keys, and SMTP passwords are not sent to the browser or email. Public IP and user-agent fields are restricted to the owner analytics surface and are omitted from emails.
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
