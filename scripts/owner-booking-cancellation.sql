-- Allow owners to cancel confirmed bookings before start; supersedes the QM-only migration.
-- Safe to rerun. Existing bookings and notifications are not changed.
do $migration$
declare
  definition text;
  new_guard text := 'if p_actor <> p_qm and (p_status <> ''cancelled'' or p_actor <> b.telegram_user_id) then';
  old_guard text := 'if p_actor <> p_qm and (p_status <> ''cancelled'' or p_actor <> b.telegram_user_id or b.status not in (''pending'',''cancelled'')) then';
begin
  select pg_get_functiondef('public.abbey_decide(uuid,text,bigint,bigint)'::regprocedure) into definition;
  if strpos(definition, new_guard) > 0 then return; end if;
  if strpos(definition, old_guard) = 0 then
    raise exception 'Unexpected cancellation function: inspect before applying this migration';
  end if;
  execute replace(definition, old_guard, new_guard);
end $migration$;
