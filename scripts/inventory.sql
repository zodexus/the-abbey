-- Inventory and lending schema for the single Abbey bandroom.
-- Run through the existing Supabase project's SQL editor. No old portal tables are recreated.
begin;
set local lock_timeout = '5s';

create table if not exists public.abbey_inventory_items (
  id uuid primary key default gen_random_uuid(),
  item_code text unique not null check (length(trim(item_code)) > 0),
  name text not null check (length(trim(name)) > 0),
  category text,
  subtype text,
  tracking_mode text check (tracking_mode in ('individual','bulk')),
  unit text check (unit in ('each','pair','pack','set')),
  brand text,
  model text,
  specifications jsonb not null default '{}' check (jsonb_typeof(specifications) = 'object'),
  photo_path text,
  notes text,
  verification_status text not null default 'needs_stocktake' check (verification_status in ('needs_stocktake','verified')),
  legacy_code text,
  source_key text unique,
  source_data jsonb not null default '{}' check (jsonb_typeof(source_data) = 'object'),
  review_flags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check (verification_status <> 'verified' or (tracking_mode is not null and unit is not null))
);

create table if not exists public.abbey_inventory_assets (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.abbey_inventory_items(id) on delete restrict,
  asset_tag text unique not null check (length(trim(asset_tag)) > 0),
  serial_number text,
  condition text not null default 'untested' check (condition in ('working','limited','faulty','untested')),
  whereabouts text not null default 'on_site' check (whereabouts in ('on_site','off_site','missing','retired')),
  condition_notes text,
  photo_path text,
  last_tested_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,item_id)
);

-- On-site bulk stock only. Outstanding loan quantities are derived from loan movements.
create table if not exists public.abbey_inventory_balances (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.abbey_inventory_items(id) on delete restrict,
  condition text not null check (condition in ('working','limited','faulty','untested')),
  quantity integer not null check (quantity >= 0),
  verified_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique(item_id,condition)
);

create table if not exists public.abbey_stocktakes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  status text not null default 'draft' check (status in ('draft','in_progress','finalized','cancelled')),
  source_key text unique,
  scope jsonb not null default '{}',
  notes text,
  started_by bigint check (started_by > 0),
  started_at timestamptz not null default now(),
  finalized_by bigint check (finalized_by > 0),
  finalized_at timestamptz,
  check (status <> 'finalized' or (finalized_at is not null and finalized_by is not null))
);

create table if not exists public.abbey_stocktake_lines (
  id uuid primary key default gen_random_uuid(),
  stocktake_id uuid not null references public.abbey_stocktakes(id) on delete restrict,
  item_id uuid not null references public.abbey_inventory_items(id) on delete restrict,
  asset_id uuid,
  expected_snapshot jsonb not null default '{}' check (jsonb_typeof(expected_snapshot) = 'object'),
  counted_working integer check (counted_working >= 0),
  counted_limited integer check (counted_limited >= 0),
  counted_faulty integer check (counted_faulty >= 0),
  counted_untested integer check (counted_untested >= 0),
  review_status text not null default 'not_checked' check (review_status in ('not_checked','needs_review','checked')),
  notes text,
  source_key text unique,
  source_data jsonb not null default '{}',
  checked_by bigint check (checked_by > 0),
  checked_at timestamptz,
  foreign key(asset_id,item_id) references public.abbey_inventory_assets(id,item_id) on delete restrict,
  check (review_status <> 'checked' or (checked_at is not null and checked_by is not null
    and counted_working is not null and counted_limited is not null and counted_faulty is not null and counted_untested is not null)),
  check (asset_id is null or coalesce(counted_working,0)+coalesce(counted_limited,0)+coalesce(counted_faulty,0)+coalesce(counted_untested,0) <= 1)
);
create unique index if not exists abbey_stocktake_lines_asset_uq on public.abbey_stocktake_lines(stocktake_id,asset_id) where asset_id is not null;
create unique index if not exists abbey_stocktake_lines_bulk_uq on public.abbey_stocktake_lines(stocktake_id,item_id) where asset_id is null;

create table if not exists public.abbey_loans (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique not null,
  borrower_telegram_id bigint not null check (borrower_telegram_id > 0),
  borrower_name text not null check (length(trim(borrower_name)) > 0),
  purpose text not null check (length(trim(purpose)) > 0),
  starts_at timestamptz not null,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','active','closed')),
  approved_by bigint check (approved_by > 0),
  approved_at timestamptz,
  closed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_at > starts_at),
  check (status not in ('approved','active','closed') or (approved_by is not null and approved_at is not null)),
  check (status <> 'closed' or closed_at is not null)
);

create table if not exists public.abbey_loan_items (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.abbey_loans(id) on delete restrict,
  item_id uuid not null references public.abbey_inventory_items(id) on delete restrict,
  requested_qty integer not null check (requested_qty > 0),
  approved_qty integer check (approved_qty >= 0 and approved_qty <= requested_qty),
  notes text,
  unique(loan_id,item_id),
  unique(id,item_id)
);

create table if not exists public.abbey_loan_movements (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique not null,
  loan_item_id uuid not null,
  item_id uuid not null,
  asset_id uuid,
  movement_type text not null check (movement_type in ('checkout','return','lost')),
  quantity integer not null check (quantity > 0),
  condition text not null check (condition in ('working','limited','faulty','untested')),
  actor_telegram_id bigint not null check (actor_telegram_id > 0),
  occurred_at timestamptz not null default now(),
  notes text,
  foreign key(loan_item_id,item_id) references public.abbey_loan_items(id,item_id) on delete restrict,
  foreign key(asset_id,item_id) references public.abbey_inventory_assets(id,item_id) on delete restrict,
  check (asset_id is null or quantity = 1)
);

create table if not exists public.abbey_inventory_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.abbey_inventory_items(id) on delete restrict,
  asset_id uuid,
  loan_movement_id uuid unique references public.abbey_loan_movements(id) on delete restrict,
  stocktake_id uuid references public.abbey_stocktakes(id) on delete restrict,
  event_type text not null check (event_type in ('import','metadata_edit','stocktake','receive','consume','condition_change','missing','found','retire','checkout','return','lost')),
  quantity integer check (quantity > 0),
  before_data jsonb not null default '{}',
  after_data jsonb not null default '{}',
  reason text,
  actor_telegram_id bigint check (actor_telegram_id > 0),
  source_key text unique,
  created_at timestamptz not null default now(),
  foreign key(asset_id,item_id) references public.abbey_inventory_assets(id,item_id) on delete restrict
);

-- Ordinary invoker functions: no SECURITY DEFINER / privileged RPC surface.
create or replace function public.abbey_inventory_validate_tracking()
returns trigger language plpgsql set search_path = '' as $$
declare mode text;
begin
  select tracking_mode into mode from public.abbey_inventory_items where id = new.item_id for update;
  if (tg_table_name = 'abbey_inventory_assets' and mode is distinct from 'individual')
     or (tg_table_name = 'abbey_inventory_balances' and mode is distinct from 'bulk') then
    raise exception 'Confirm the correct tracking mode before adding verified stock';
  end if;
  new.updated_at := now();
  return new;
end $$;
create or replace function public.abbey_inventory_item_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.tracking_mode is distinct from old.tracking_mode or new.unit is distinct from old.unit)
     and (exists(select 1 from public.abbey_inventory_assets where item_id=old.id)
       or exists(select 1 from public.abbey_inventory_balances where item_id=old.id)
       or exists(select 1 from public.abbey_loan_items where item_id=old.id)) then
    raise exception 'Cannot change counting unit or tracking mode after stock or loan records exist';
  end if;
  new.updated_at := now();
  return new;
end $$;
create or replace function public.abbey_loan_close_guard()
returns trigger language plpgsql set search_path = '' as $$
declare outstanding bigint;
begin
  if new.status in ('closed','cancelled','rejected') then
    select coalesce(sum(case when m.movement_type='checkout' then m.quantity else -m.quantity end),0)
      into outstanding from public.abbey_loan_movements m join public.abbey_loan_items i on m.loan_item_id=i.id
      where i.loan_id=old.id;
    if outstanding <> 0 then raise exception 'Resolve outstanding equipment before closing or cancelling the loan'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create or replace function public.abbey_inventory_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'History is append-only; record a corrective movement instead'; end $$;

create or replace function public.abbey_inventory_apply_loan_movement()
returns trigger language plpgsql set search_path = '' as $$
declare line public.abbey_loan_items; loan public.abbey_loans; item public.abbey_inventory_items;
  asset public.abbey_inventory_assets; issued bigint; resolved bigint; outstanding bigint;
begin
  select * into item from public.abbey_inventory_items where id = new.item_id for update;
  select * into line from public.abbey_loan_items where id = new.loan_item_id for update;
  select * into loan from public.abbey_loans where id = line.loan_id for update;
  if loan.status not in ('approved','active') then raise exception 'Loan must be approved and open'; end if;
  if item.verification_status <> 'verified' or item.archived_at is not null then raise exception 'Item must be verified before lending'; end if;
  select coalesce(sum(quantity) filter(where movement_type='checkout'),0),
    coalesce(sum(quantity) filter(where movement_type in ('return','lost')),0)
    into issued,resolved from public.abbey_loan_movements where loan_item_id = line.id;
  if new.movement_type = 'checkout' then
    if new.condition not in ('working','limited') then raise exception 'Cannot issue faulty or untested stock'; end if;
    if line.approved_qty is null or issued+new.quantity > line.approved_qty then raise exception 'Checkout exceeds approved quantity'; end if;
  elsif new.quantity > issued-resolved then raise exception 'Return/loss exceeds outstanding quantity'; end if;
  if item.tracking_mode = 'individual' then
    if new.asset_id is null then raise exception 'An individually tracked item requires an asset tag'; end if;
    select * into asset from public.abbey_inventory_assets where id=new.asset_id and item_id=new.item_id for update;
    if not found then raise exception 'Asset does not belong to this item'; end if;
    select coalesce(sum(case when movement_type='checkout' then quantity else -quantity end),0)
      into outstanding from public.abbey_loan_movements where asset_id=new.asset_id and loan_item_id=line.id;
    if new.movement_type='checkout' then
      if asset.whereabouts <> 'on_site' or asset.verified_at is null or asset.condition <> new.condition then raise exception 'Asset is not available in the stated condition'; end if;
    elsif outstanding < new.quantity then raise exception 'This asset was not issued on this loan'; end if;
    update public.abbey_inventory_assets set
      whereabouts=case new.movement_type when 'checkout' then 'off_site' when 'return' then 'on_site' else 'missing' end,
      condition=new.condition, updated_at=now() where id=new.asset_id;
  elsif item.tracking_mode = 'bulk' then
    if new.asset_id is not null then raise exception 'Bulk stock must not specify an asset'; end if;
    if new.movement_type='checkout' then
      update public.abbey_inventory_balances set quantity=quantity-new.quantity,updated_at=now()
        where item_id=new.item_id and condition=new.condition and quantity>=new.quantity;
      if not found then raise exception 'Insufficient on-site stock'; end if;
    elsif new.movement_type='return' then
      insert into public.abbey_inventory_balances(item_id,condition,quantity,verified_at)
        values(new.item_id,new.condition,new.quantity,now())
        on conflict(item_id,condition) do update set quantity=public.abbey_inventory_balances.quantity+excluded.quantity,updated_at=now();
    end if;
  else raise exception 'Tracking mode has not been confirmed'; end if;
  return new;
end $$;

do $$ begin
  if not exists(select 1 from pg_trigger where tgname='abbey_inventory_item_guard') then
    create trigger abbey_inventory_item_guard before update on public.abbey_inventory_items for each row execute function public.abbey_inventory_item_guard();
    create trigger abbey_loan_close_guard before update on public.abbey_loans for each row execute function public.abbey_loan_close_guard();
  end if;
end $$;
create or replace function public.abbey_inventory_log_loan_movement()
returns trigger language plpgsql set search_path = '' as $$
begin
  insert into public.abbey_inventory_events(item_id,asset_id,loan_movement_id,event_type,quantity,after_data,reason,actor_telegram_id)
  values(new.item_id,new.asset_id,new.id,new.movement_type,new.quantity,jsonb_build_object('condition',new.condition),new.notes,new.actor_telegram_id);
  return new;
end $$;

do $$ begin
  if not exists(select 1 from pg_trigger where tgname='abbey_assets_tracking') then
    create trigger abbey_assets_tracking before insert or update on public.abbey_inventory_assets for each row execute function public.abbey_inventory_validate_tracking();
    create trigger abbey_balances_tracking before insert or update on public.abbey_inventory_balances for each row execute function public.abbey_inventory_validate_tracking();
    create trigger abbey_apply_loan_movement before insert on public.abbey_loan_movements for each row execute function public.abbey_inventory_apply_loan_movement();
    create trigger abbey_log_loan_movement after insert on public.abbey_loan_movements for each row execute function public.abbey_inventory_log_loan_movement();
    create trigger abbey_movements_immutable before update or delete on public.abbey_loan_movements for each row execute function public.abbey_inventory_immutable();
    create trigger abbey_events_immutable before update or delete on public.abbey_inventory_events for each row execute function public.abbey_inventory_immutable();
  end if;
end $$;

create index if not exists abbey_inventory_assets_item_idx on public.abbey_inventory_assets(item_id);
create index if not exists abbey_inventory_items_category_idx on public.abbey_inventory_items(category);
create index if not exists abbey_stocktake_lines_item_idx on public.abbey_stocktake_lines(item_id);
create index if not exists abbey_stocktake_lines_session_idx on public.abbey_stocktake_lines(stocktake_id);
create index if not exists abbey_stocktake_lines_asset_idx on public.abbey_stocktake_lines(asset_id);
create index if not exists abbey_loans_borrower_idx on public.abbey_loans(borrower_telegram_id);
create index if not exists abbey_loans_dates_idx on public.abbey_loans(starts_at,due_at) where status in ('approved','active');
create index if not exists abbey_loan_items_item_idx on public.abbey_loan_items(item_id);
create index if not exists abbey_loan_movements_item_idx on public.abbey_loan_movements(item_id);
create index if not exists abbey_loan_movements_line_idx on public.abbey_loan_movements(loan_item_id,item_id);
create index if not exists abbey_loan_movements_asset_idx on public.abbey_loan_movements(asset_id);
create index if not exists abbey_inventory_events_item_idx on public.abbey_inventory_events(item_id,created_at);
create index if not exists abbey_inventory_events_asset_idx on public.abbey_inventory_events(asset_id);
create index if not exists abbey_inventory_events_stocktake_idx on public.abbey_inventory_events(stocktake_id);

do $$ declare t text; begin
  foreach t in array array['abbey_inventory_items','abbey_inventory_assets','abbey_inventory_balances',
    'abbey_inventory_events','abbey_stocktakes','abbey_stocktake_lines','abbey_loans','abbey_loan_items','abbey_loan_movements'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role',t);
    execute format('grant select,insert,update on public.%I to service_role',t);
  end loop;
end $$;
revoke update on public.abbey_inventory_events,public.abbey_loan_movements from service_role;
revoke all on function public.abbey_inventory_validate_tracking(),public.abbey_inventory_immutable(),
  public.abbey_inventory_apply_loan_movement(),public.abbey_inventory_log_loan_movement(),
  public.abbey_inventory_item_guard(),public.abbey_loan_close_guard() from public,anon,authenticated;
grant execute on function public.abbey_inventory_validate_tracking(),public.abbey_inventory_immutable(),
  public.abbey_inventory_apply_loan_movement(),public.abbey_inventory_log_loan_movement(),
  public.abbey_inventory_item_guard(),public.abbey_loan_close_guard() to service_role;
commit;
