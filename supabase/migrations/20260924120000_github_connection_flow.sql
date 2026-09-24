-- Short-lived server-only state for the GitHub App installation flow.
--
-- The browser receives only the opaque state value. The state hash, PKCE
-- verifier, RepoView user/workspace binding, and claimed installation id stay
-- in this table and are readable only by the service role.

create table public.github_connection_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state_hash text not null unique,
  code_verifier text not null,
  claimed_installation_id bigint,
  status text not null default 'pending_installation'
    check (status in ('pending_installation', 'awaiting_authorization', 'pending_approval', 'consumed', 'cancelled', 'failed')),
  return_path text not null default '/dashboard/settings',
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (claimed_installation_id is null or claimed_installation_id > 0)
);

create index github_connection_transactions_expiry_idx
  on public.github_connection_transactions(expires_at);

create index github_connection_transactions_user_idx
  on public.github_connection_transactions(user_id, created_at desc);

alter table public.github_connection_transactions enable row level security;

drop trigger if exists github_connection_transactions_prevent_workspace_change
  on public.github_connection_transactions;
create trigger github_connection_transactions_prevent_workspace_change
before update on public.github_connection_transactions
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists github_connection_transactions_set_updated_at
  on public.github_connection_transactions;
create trigger github_connection_transactions_set_updated_at
before update on public.github_connection_transactions
for each row execute function public.set_profile_updated_at();

comment on table public.github_connection_transactions is
  'Short-lived server-only GitHub App state and PKCE verifiers; never expose rows to authenticated clients.';

comment on column public.github_connection_transactions.code_verifier is
  'One-time PKCE verifier; delete or consume the transaction after the callback.';

create or replace function public.claim_github_connection_installation(
  target_state_hash text,
  target_user_id uuid,
  target_installation_id bigint
)
returns setof public.github_connection_transactions
language sql
security definer
set search_path = public
as $$
  update public.github_connection_transactions
  set claimed_installation_id = target_installation_id,
      status = 'awaiting_authorization',
      updated_at = now()
  where state_hash = target_state_hash
    and user_id = target_user_id
    and status = 'pending_installation'
    and expires_at > now()
    and target_installation_id > 0
  returning *;
$$;

create or replace function public.consume_github_connection_transaction(
  target_state_hash text,
  target_user_id uuid
)
returns setof public.github_connection_transactions
language sql
security definer
set search_path = public
as $$
  update public.github_connection_transactions
  set status = 'consumed',
      consumed_at = now(),
      updated_at = now()
  where state_hash = target_state_hash
    and user_id = target_user_id
    and status = 'awaiting_authorization'
    and expires_at > now()
  returning *;
$$;

revoke all on function public.claim_github_connection_installation(text, uuid, bigint) from public, anon, authenticated;
revoke all on function public.consume_github_connection_transaction(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_github_connection_installation(text, uuid, bigint) to service_role;
grant execute on function public.consume_github_connection_transaction(text, uuid) to service_role;
