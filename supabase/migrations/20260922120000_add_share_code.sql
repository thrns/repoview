alter table public.shares
  add column if not exists share_code varchar(8);

update public.shares
set share_code = lower(substr(replace(id::text, '-', ''), 1, 8))
where share_code is null;

alter table public.shares
  alter column share_code set default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  alter column share_code set not null;

alter table public.shares
  add constraint shares_share_code_format
  check (share_code ~ '^[A-Za-z0-9_-]{8}$');

create unique index shares_share_code_idx on public.shares(share_code);
