-- Insert the share and optional recipient details in a single transaction.
-- The application performs user/workspace/repository validation and resource
-- quota reservation before calling this service-role-only function.

create or replace function public.create_share_with_recipient(
  target_workspace_id uuid,
  target_repository_id uuid,
  target_share_code text,
  target_share_type text,
  target_token_hash text,
  target_recipient_label text,
  target_commit_sha text,
  target_ref text,
  target_expires_at timestamptz,
  target_notify_on_view boolean,
  target_allow_download boolean,
  target_rules jsonb,
  target_note text,
  target_created_by uuid,
  target_create_recipient boolean,
  target_recipient_name text,
  target_company text,
  target_email text,
  target_role_notes text
)
returns table (id uuid, share_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_share_id uuid;
begin
  insert into public.shares as inserted_share (
    workspace_id,
    repository_id,
    share_code,
    share_type,
    token_hash,
    recipient_label,
    commit_sha,
    ref,
    expires_at,
    notify_on_view,
    allow_download,
    rules,
    note,
    created_by
  ) values (
    target_workspace_id,
    target_repository_id,
    target_share_code,
    target_share_type,
    target_token_hash,
    target_recipient_label,
    target_commit_sha,
    target_ref,
    target_expires_at,
    target_notify_on_view,
    target_allow_download,
    target_rules,
    target_note,
    target_created_by
  )
  returning inserted_share.id into created_share_id;

  if target_create_recipient then
    insert into public.share_recipients (
      workspace_id,
      share_id,
      recipient_name,
      company,
      email,
      role_notes
    ) values (
      target_workspace_id,
      created_share_id,
      target_recipient_name,
      target_company,
      target_email,
      target_role_notes
    );
  end if;

  return query select created_share_id, target_share_code;
end;
$$;

revoke all on function public.create_share_with_recipient(uuid, uuid, text, text, text, text, text, text, timestamptz, boolean, boolean, jsonb, text, uuid, boolean, text, text, text, text) from PUBLIC;
revoke all on function public.create_share_with_recipient(uuid, uuid, text, text, text, text, text, text, timestamptz, boolean, boolean, jsonb, text, uuid, boolean, text, text, text, text) from anon;
revoke all on function public.create_share_with_recipient(uuid, uuid, text, text, text, text, text, text, timestamptz, boolean, boolean, jsonb, text, uuid, boolean, text, text, text, text) from authenticated;
grant execute on function public.create_share_with_recipient(uuid, uuid, text, text, text, text, text, text, timestamptz, boolean, boolean, jsonb, text, uuid, boolean, text, text, text, text) to service_role;
