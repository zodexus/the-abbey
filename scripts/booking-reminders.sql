-- Apply to the existing Abbey database before deploying the reminder worker.
-- Separate from the booking/notification setup; safe to rerun without resending messages.
begin;
create schema if not exists abbey_private;
revoke all on schema abbey_private from public, anon, authenticated;
grant usage on schema abbey_private to service_role;

create table if not exists public.abbey_booking_reminders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.abbey_bookings(id),
  kind text not null check (kind in ('before', 'reset')),
  due_at timestamptz not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  recipient bigint not null check (recipient > 0),
  sent_at timestamptz,
  skipped_at timestamptz,
  locked_until timestamptz,
  lease_id uuid,
  attempts integer not null default 0,
  last_error text,
  unique (booking_id, kind)
);
alter table public.abbey_booking_reminders enable row level security;
revoke all on public.abbey_booking_reminders from public, anon, authenticated;
grant select, insert, update on public.abbey_booking_reminders to service_role;
create index if not exists abbey_booking_reminders_due on public.abbey_booking_reminders(due_at)
  where sent_at is null and skipped_at is null;

-- One-use, two-minute scheduler tickets; no shared cron secret or bot token in SQL.
create table if not exists abbey_private.reminder_runs (
  token_hash bytea primary key,
  expires_at timestamptz not null
);
alter table abbey_private.reminder_runs enable row level security;
revoke all on abbey_private.reminder_runs from public, anon, authenticated;
grant select, delete on abbey_private.reminder_runs to service_role;

create or replace function public.abbey_reminder_time(p_start timestamptz)
returns timestamptz language sql immutable set search_path = '' as $$
  select case when (p_start - interval '12 hours') at time zone 'Asia/Singapore' <
    date_trunc('day', (p_start - interval '12 hours') at time zone 'Asia/Singapore') + interval '8 hours'
  then (date_trunc('day', (p_start - interval '12 hours') at time zone 'Asia/Singapore') + interval '8 hours') at time zone 'Asia/Singapore'
  else p_start - interval '12 hours' end;
$$;

create or replace function public.abbey_schedule_booking_reminders()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status <> 'confirmed' or new.telegram_user_id <= 0 then
    update public.abbey_booking_reminders set skipped_at = now(), locked_until = null, lease_id = null
      where booking_id = new.id and sent_at is null and skipped_at is null;
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.status = new.status and old.starts_at = new.starts_at and old.ends_at = new.ends_at
      and old.telegram_user_id = new.telegram_user_id then return new; end if;
  end if;
  if new.ends_at <= now() then return new; end if;
  insert into public.abbey_booking_reminders(booking_id,kind,due_at,starts_at,ends_at,recipient)
  values (new.id,'before',public.abbey_reminder_time(new.starts_at),new.starts_at,new.ends_at,new.telegram_user_id),
    (new.id,'reset',new.ends_at,new.starts_at,new.ends_at,new.telegram_user_id)
  on conflict (booking_id,kind) do update set due_at = excluded.due_at,
    starts_at = excluded.starts_at, ends_at = excluded.ends_at, recipient = excluded.recipient,
    skipped_at = null, locked_until = null, lease_id = null, attempts = 0, last_error = null
    where public.abbey_booking_reminders.sent_at is null;
  return new;
end $$;
drop trigger if exists abbey_schedule_booking_reminders on public.abbey_bookings;
create trigger abbey_schedule_booking_reminders after insert or update of status, starts_at, ends_at, telegram_user_id
  on public.abbey_bookings for each row execute function public.abbey_schedule_booking_reminders();

-- Include existing future/in-progress approved sessions, but never old completed sessions.
insert into public.abbey_booking_reminders(booking_id,kind,due_at,starts_at,ends_at,recipient)
select b.id,k.kind,case when k.kind = 'before' then public.abbey_reminder_time(b.starts_at) else b.ends_at end,
  b.starts_at,b.ends_at,b.telegram_user_id
from public.abbey_bookings b cross join (values ('before'),('reset')) k(kind)
where b.status = 'confirmed' and b.telegram_user_id > 0 and b.ends_at > now()
on conflict (booking_id,kind) do nothing;

create or replace function public.abbey_take_booking_reminders(p_now timestamptz default now())
returns setof public.abbey_booking_reminders language plpgsql set search_path = '' as $$
begin
  -- Cancelled/rejected/unlinked sessions and expired messages cannot re-enter the queue.
  update public.abbey_booking_reminders r set skipped_at = p_now, lease_id = null, locked_until = null
    from public.abbey_bookings b where r.booking_id = b.id and r.sent_at is null and r.skipped_at is null
    and (b.status <> 'confirmed' or b.telegram_user_id <= 0 or
      (r.kind = 'before' and b.starts_at <= p_now) or (r.kind = 'reset' and b.ends_at + interval '24 hours' <= p_now));
  return query update public.abbey_booking_reminders set locked_until = p_now + interval '2 minutes',
    lease_id = gen_random_uuid(), attempts = attempts + 1
  where id in (
    select r.id from public.abbey_booking_reminders r join public.abbey_bookings b on b.id = r.booking_id
    where r.sent_at is null and r.skipped_at is null and r.due_at <= p_now
      and (r.locked_until is null or r.locked_until <= p_now)
      and b.status = 'confirmed' and b.telegram_user_id = r.recipient
      and b.starts_at = r.starts_at and b.ends_at = r.ends_at
      and (r.kind = 'reset' or (p_now at time zone 'Asia/Singapore')::time >= time '08:00')
    order by r.due_at limit 10 for update of r skip locked
  ) returning *;
end $$;

create or replace function public.abbey_claim_reminder_run(p_token text)
returns boolean language plpgsql set search_path = '' as $$
declare claimed boolean; begin
  delete from abbey_private.reminder_runs where token_hash = sha256(convert_to(p_token,'UTF8'))
    and expires_at > now() returning true into claimed;
  return coalesce(claimed,false);
end $$;

revoke all on function public.abbey_reminder_time(timestamptz), public.abbey_schedule_booking_reminders(),
  public.abbey_take_booking_reminders(timestamptz), public.abbey_claim_reminder_run(text) from public, anon, authenticated;
grant execute on function public.abbey_reminder_time(timestamptz), public.abbey_schedule_booking_reminders(),
  public.abbey_take_booking_reminders(timestamptz), public.abbey_claim_reminder_run(text) to service_role;
commit;
