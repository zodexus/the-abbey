-- Run once in the SQL editor of your EXISTING Supabase project.
-- New tables keep the old booking history intact. No data is deleted.
begin;
create extension if not exists btree_gist;

create table if not exists public.abbey_licenses (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique check (handle = lower(handle) and handle !~ '^@'),
  name text not null default '',
  telegram_user_id bigint unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.abbey_bookings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  telegram_user_id bigint not null,
  resident_name text not null check (length(resident_name) between 1 and 80),
  purpose text not null check (length(purpose) between 1 and 400),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected','cancelled')),
  created_at timestamptz not null default now(),
  unique (telegram_user_id, request_id),
  check (ends_at > starts_at and ends_at <= starts_at + interval '24 hours'),
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&) where (status = 'confirmed')
);
create table if not exists public.abbey_notifications (
  id bigint generated always as identity primary key,
  chat_id bigint not null,
  body text not null,
  markup jsonb,
  sent_at timestamptz,
  locked_until timestamptz
);
alter table public.abbey_licenses enable row level security;
alter table public.abbey_bookings enable row level security;
alter table public.abbey_notifications enable row level security;
revoke all on public.abbey_licenses, public.abbey_bookings, public.abbey_notifications from anon, authenticated;
grant all on public.abbey_licenses, public.abbey_bookings, public.abbey_notifications to service_role;
grant usage, select on sequence public.abbey_notifications_id_seq to service_role;

-- Carry forward genuine existing license records. Binding happens at first login.
do $$ begin
  if to_regclass('public.licensed_users') is not null then
    insert into public.abbey_licenses(handle, name, active)
    select distinct on (lower(ltrim(trim(telegram_handle), '@')))
      lower(ltrim(trim(telegram_handle), '@')), name, status = 'active'
    from public.licensed_users
    where lower(ltrim(trim(telegram_handle), '@')) ~ '^[a-z][a-z0-9_]{3,31}$'
    on conflict (handle) do nothing;
  end if;
end $$;

-- Retire access from the former public website without deleting its records.
do $$ declare t text; begin
  foreach t in array array['bookings','licensed_users','inventory','equipment_loans','loan_items','room_checkouts','recurring_slots'] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

create or replace function public.abbey_claim_license(p_user_id bigint, p_handle text)
returns setof public.abbey_licenses language plpgsql security definer set search_path = public as $$
begin
  -- A bound account cannot reclaim a revoked license by changing its username.
  if exists(select 1 from abbey_licenses where telegram_user_id = p_user_id) then
    return query select * from abbey_licenses where telegram_user_id = p_user_id and active;
    return;
  end if;
  return query update abbey_licenses set telegram_user_id = p_user_id
    where handle = lower(p_handle) and telegram_user_id is null and active returning *;
end $$;

create or replace function public.abbey_request(
  p_user_id bigint, p_request_id uuid, p_name text, p_purpose text,
  p_start timestamptz, p_end timestamptz, p_qm bigint)
returns public.abbey_bookings language plpgsql security definer set search_path = public as $$
declare b abbey_bookings; begin
  perform pg_advisory_xact_lock(p_user_id);
  select * into b from abbey_bookings where telegram_user_id = p_user_id and request_id = p_request_id;
  if found then return b; end if;
  if p_start <= now() or p_start > now() + interval '366 days' then raise exception 'invalid start'; end if;
  if (select count(*) from abbey_bookings where telegram_user_id = p_user_id and status = 'pending' and ends_at > now()) >= 10 then
    raise exception 'pending limit';
  end if;
  if exists(select 1 from abbey_bookings where status = 'confirmed' and starts_at < p_end and ends_at > p_start) then raise exception 'slot booked'; end if;
  insert into abbey_bookings(telegram_user_id, request_id, resident_name, purpose, starts_at, ends_at)
    values(p_user_id, p_request_id, p_name, p_purpose, p_start, p_end) returning * into b;
  insert into abbey_notifications(chat_id, body, markup) values(p_qm,
    'Abbey booking request' || chr(10) || p_name || chr(10) ||
    to_char(p_start at time zone 'Asia/Singapore', 'DD Mon YYYY HH24:MI') || ' → ' ||
    to_char(p_end at time zone 'Asia/Singapore', 'DD Mon YYYY HH24:MI') || ' SGT' || chr(10) || p_purpose,
    jsonb_build_object('inline_keyboard', jsonb_build_array(jsonb_build_array(
      jsonb_build_object('text','Approve','callback_data','approve:' || b.id),
      jsonb_build_object('text','Reject','callback_data','reject:' || b.id)))));
  return b;
end $$;

create or replace function public.abbey_decide(p_id uuid, p_status text, p_actor bigint, p_qm bigint)
returns public.abbey_bookings language plpgsql security definer set search_path = public as $$
declare b abbey_bookings; begin
  select * into b from abbey_bookings where id = p_id for update;
  if not found then raise exception 'not found'; end if;
  if p_status not in ('confirmed','rejected','cancelled') then raise exception 'invalid status'; end if;
  if p_actor <> p_qm and (p_status <> 'cancelled' or p_actor <> b.telegram_user_id) then raise exception 'not allowed'; end if;
  if b.status = p_status then return b; end if;
  if (p_status in ('confirmed','rejected') and b.status <> 'pending') or
     (p_status = 'cancelled' and b.status not in ('pending','confirmed')) then raise exception 'already handled'; end if;
  if b.starts_at <= now() then raise exception 'booking has started'; end if;
  if p_status = 'confirmed' and b.telegram_user_id <> p_qm and not exists
    (select 1 from abbey_licenses where telegram_user_id = b.telegram_user_id and active) then raise exception 'license revoked'; end if;
  update abbey_bookings set status = p_status where id = p_id returning * into b;
  insert into abbey_notifications(chat_id, body) values(b.telegram_user_id,
    'Abbey booking ' || p_status || chr(10) ||
    to_char(b.starts_at at time zone 'Asia/Singapore', 'DD Mon YYYY HH24:MI') || ' → ' ||
    to_char(b.ends_at at time zone 'Asia/Singapore', 'DD Mon YYYY HH24:MI') || ' SGT' || chr(10) || b.purpose);
  if p_status = 'cancelled' and p_actor <> p_qm then
    insert into abbey_notifications(chat_id, body) values(p_qm, b.resident_name || ' cancelled their Abbey booking.' || chr(10) || to_char(b.starts_at at time zone 'Asia/Singapore', 'DD Mon YYYY HH24:MI') || ' SGT');
  end if;
  return b;
end $$;

create or replace function public.abbey_take_notifications()
returns setof public.abbey_notifications language sql security definer set search_path = public as $$
  update abbey_notifications set locked_until = now() + interval '2 minutes'
  where id in (select id from abbey_notifications where sent_at is null and (locked_until is null or locked_until < now())
    order by id for update skip locked limit 10) returning *;
$$;
revoke all on function public.abbey_claim_license(bigint,text), public.abbey_request(bigint,uuid,text,text,timestamptz,timestamptz,bigint), public.abbey_decide(uuid,text,bigint,bigint), public.abbey_take_notifications() from public, anon, authenticated;
grant execute on function public.abbey_claim_license(bigint,text), public.abbey_request(bigint,uuid,text,text,timestamptz,timestamptz,bigint), public.abbey_decide(uuid,text,bigint,bigint), public.abbey_take_notifications() to service_role;
commit;
