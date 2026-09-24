-- GitHub App webhook delivery ledger.
--
-- Delivery ids are supplied by GitHub and are globally unique for a webhook
-- endpoint. Keeping them in a server-only table lets retries be acknowledged
-- without repeating state transitions or share revocations.

create table public.github_webhook_deliveries (
  delivery_id text primary key,
  event text not null,
  action text not null default '',
  installation_id bigint,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'ignored', 'failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  check (installation_id is null or installation_id > 0)
);

create index github_webhook_deliveries_received_idx
  on public.github_webhook_deliveries(received_at desc);

create index github_webhook_deliveries_installation_idx
  on public.github_webhook_deliveries(installation_id, received_at desc);

alter table public.github_webhook_deliveries enable row level security;

comment on table public.github_webhook_deliveries is
  'Server-only GitHub webhook idempotency ledger; no authenticated client policies are defined.';

comment on column public.github_webhook_deliveries.delivery_id is
  'The X-GitHub-Delivery value used as the idempotency key.';
