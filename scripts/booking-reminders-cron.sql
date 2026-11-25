-- Apply after the deployed /api/reminders endpoint is ready.
-- Existing Supabase project only. This job runs as postgres; never expose it to API roles.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create or replace function abbey_private.dispatch_booking_reminders()
returns bigint language plpgsql set search_path = '' as $$
declare ticket text := replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
  request_id bigint;
begin
  delete from abbey_private.reminder_runs where expires_at <= now();
  insert into abbey_private.reminder_runs(token_hash,expires_at)
    values(sha256(convert_to(ticket,'UTF8')),now() + interval '2 minutes');
  select net.http_post(
    url := 'https://the-abbey.vercel.app/api/reminders',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || ticket),
    body := '{}'::jsonb, timeout_milliseconds := 60000
  ) into request_id;
  return request_id;
end $$;
revoke all on function abbey_private.dispatch_booking_reminders() from public, anon, authenticated, service_role;
select cron.schedule('abbey-booking-reminders','* * * * *','select abbey_private.dispatch_booking_reminders()');
commit;
