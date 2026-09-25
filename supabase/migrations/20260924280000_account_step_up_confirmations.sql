-- Short-lived, one-time confirmations issued only after explicit account
-- reauthentication. Raw confirmation values never reach the database.

create table if not exists public.account_step_up_confirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (operation in ('account-delete', 'account-export')),
  token_hash text not null unique,
  assurance_level text not null check (assurance_level in ('aal1', 'aal2')),
  authentication_method text not null check (authentication_method in ('password', 'google')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  check (expires_at > issued_at)
);

create index if not exists account_step_up_confirmations_user_expiry_idx
  on public.account_step_up_confirmations(user_id, expires_at);

alter table public.account_step_up_confirmations enable row level security;
revoke all on table public.account_step_up_confirmations from anon, authenticated;
grant all on table public.account_step_up_confirmations to service_role;

comment on table public.account_step_up_confirmations is
  'Service-only, short-lived, one-time confirmations for sensitive account operations.';
