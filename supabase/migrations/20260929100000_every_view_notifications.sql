-- View-opened notifications are per confirmed visit. Keep the historical
-- returning_view column for compatibility with exports and older deployments,
-- but make it explicitly non-gating so it cannot suppress repeat visits.

update public.notification_settings
set returning_view = true,
    updated_at = now()
where returning_view is distinct from true;

alter table public.notification_settings
  alter column returning_view set default true;

comment on column public.notification_settings.returning_view is
  'Deprecated compatibility field. view_opened is the master switch and every confirmed visit may queue one notification.';

-- Older deployments also used returning_view as a cancellation trigger. Keep
-- the column for exports and compatibility, but make changes to it inert so a
-- legacy value cannot cancel a repeat-visit delivery while view_opened is on.
create or replace function public.cancel_notification_deliveries_for_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.destination_email is distinct from new.destination_email
     or old.email_verified is distinct from new.email_verified
     or old.view_opened is distinct from new.view_opened
     or old.session_summary is distinct from new.session_summary then
    perform public.cancel_pending_notification_deliveries(new.workspace_id, null, 'Notification settings changed.');
  end if;
  return new;
end;
$$;

drop trigger if exists notification_settings_cancel_deliveries on public.notification_settings;
create trigger notification_settings_cancel_deliveries
after update of destination_email, email_verified, view_opened, session_summary on public.notification_settings
for each row execute function public.cancel_notification_deliveries_for_settings();
