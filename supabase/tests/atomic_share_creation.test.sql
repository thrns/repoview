-- Verify that share and recipient rows are committed or rolled back together.

begin;

select no_plan();

select tests.create_supabase_user('atomic-share@example.com');
select tests.authenticate_as_service_role();

create temporary table atomic_share_fixture (
  user_id uuid not null,
  workspace_id uuid not null,
  installation_id uuid not null,
  repository_id uuid not null
) on commit drop;

insert into atomic_share_fixture
select users.id,
       workspaces.id,
       '10000000-0000-4000-8000-000000000011'::uuid,
       '20000000-0000-4000-8000-000000000011'::uuid
from auth.users as users
join public.workspaces as workspaces on workspaces.owner_id = users.id and workspaces.is_personal
where users.email = 'atomic-share@example.com';

insert into public.github_installations (
  id, workspace_id, github_installation_id, github_account_id,
  github_account_login, github_account_type, repository_selection, status
)
select installation_id, workspace_id, 993001, 993011, 'atomic-share', 'Organization', 'selected', 'active'
from atomic_share_fixture;

insert into public.repositories (
  id, workspace_id, github_installation_id, github_repository_id,
  github_node_id, github_owner, github_repo, default_branch, enabled
)
select repository_id, workspace_id, installation_id, 993021, 'R_atomic_share', 'atomic-share', 'repo', 'main', true
from atomic_share_fixture;

create function public.test_fail_share_recipient_insert()
returns trigger
language plpgsql
as $$
begin
  if new.email = 'force-failure@example.com' then
    raise exception 'forced recipient failure';
  end if;
  return new;
end;
$$;

create trigger test_fail_share_recipient_insert
before insert on public.share_recipients
for each row execute function public.test_fail_share_recipient_insert();

select is(
  (select count(*) from public.create_share_with_recipient(
    workspace_id,
    repository_id,
    'Atomic001',
    'generic',
    'atomic-share-token-no-recipient',
    null,
    'commit-no-recipient',
    'refs/heads/main',
    null,
    true,
    false,
    '{}'::jsonb,
    null,
    user_id,
    false,
    null,
    null,
    null,
    null
  )),
  1::bigint,
  'share without a recipient is durable'
) from atomic_share_fixture;
select is(
  (select count(*) from public.shares where token_hash = 'atomic-share-token-no-recipient'),
  1::bigint,
  'share without recipient creates its share row'
);
select is(
  (select count(*) from public.share_recipients where share_id = (select id from public.shares where token_hash = 'atomic-share-token-no-recipient')),
  0::bigint,
  'generic share does not create recipient details'
);

select is(
  (select count(*) from public.create_share_with_recipient(
    workspace_id,
    repository_id,
    'Atomic002',
    'recipient',
    'atomic-share-token-recipient',
    'Ada Lovelace',
    'commit-recipient',
    'refs/heads/main',
    null,
    true,
    false,
    '{}'::jsonb,
    null,
    user_id,
    true,
    'Ada Lovelace',
    'Analytical Engines',
    'ada@example.com',
    'Reviewer'
  )),
  1::bigint,
  'share with recipient is durable'
) from atomic_share_fixture;
select is(
  (select count(*) from public.share_recipients
   join public.shares on shares.id = share_recipients.share_id
   where shares.token_hash = 'atomic-share-token-recipient'
     and recipient_name = 'Ada Lovelace'
     and company = 'Analytical Engines'
     and email = 'ada@example.com'
     and role_notes = 'Reviewer'),
  1::bigint,
  'recipient metadata is persisted with the share'
);

select throws_ok(
  $$select * from public.create_share_with_recipient(
    (select workspace_id from atomic_share_fixture),
    (select repository_id from atomic_share_fixture),
    'Atomic003',
    'recipient',
    'atomic-share-token-failure',
    'Failure Case',
    'commit-failure',
    'refs/heads/main',
    null,
    true,
    false,
    '{}'::jsonb,
    null,
    (select user_id from atomic_share_fixture),
    true,
    'Failure Case',
    null,
    'force-failure@example.com',
    null
  )$$,
  'P0001',
  'forced recipient failure',
  'recipient insert failure aborts the transaction'
);
select is(
  (select count(*) from public.shares where token_hash = 'atomic-share-token-failure'),
  0::bigint,
  'forced recipient failure leaves no share'
);

select ok(not has_function_privilege('anon', 'public.create_share_with_recipient(uuid,uuid,text,text,text,text,text,text,timestamptz,boolean,boolean,jsonb,text,uuid,boolean,text,text,text,text)', 'EXECUTE'), 'anon and authenticated cannot execute atomic share creation');
select ok(not has_function_privilege('authenticated', 'public.create_share_with_recipient(uuid,uuid,text,text,text,text,text,text,timestamptz,boolean,boolean,jsonb,text,uuid,boolean,text,text,text,text)', 'EXECUTE'), 'authenticated is explicitly denied atomic share creation');
select ok(has_function_privilege('service_role', 'public.create_share_with_recipient(uuid,uuid,text,text,text,text,text,text,timestamptz,boolean,boolean,jsonb,text,uuid,boolean,text,text,text,text)', 'EXECUTE'), 'service_role can execute atomic share creation');

drop trigger test_fail_share_recipient_insert on public.share_recipients;
drop function public.test_fail_share_recipient_insert();

select * from finish();
rollback;
