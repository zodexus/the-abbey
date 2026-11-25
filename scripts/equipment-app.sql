-- Inventory mini app: private roles, date reservations, loans and verified stocktakes.
-- Apply AFTER scripts/inventory.sql in the existing Abbey database. Safe to rerun.
begin;
set local lock_timeout='5s';
alter table public.abbey_inventory_items add column if not exists loanable boolean not null default false;
alter table public.abbey_loans add column if not exists committee text not null default 'No';
alter table public.abbey_loans add column if not exists borrower_handle text;
alter table public.abbey_loans add column if not exists terms_version text;
alter table public.abbey_loans add column if not exists terms_accepted_at timestamptz;
alter table public.abbey_notifications add column if not exists source_key text;
alter table public.abbey_notifications add column if not exists attempts integer not null default 0;
alter table public.abbey_notifications add column if not exists next_attempt_at timestamptz default now();
create or replace function public.abbey_take_notifications()
returns setof public.abbey_notifications language sql security invoker set search_path='' as $$
  update public.abbey_notifications set locked_until=now()+interval '2 minutes',attempts=attempts+1
  where id in (select id from public.abbey_notifications where sent_at is null
    and (next_attempt_at is null or next_attempt_at<=now()) and (locked_until is null or locked_until<now())
    order by next_attempt_at nulls first,id for update skip locked limit 10) returning *;
$$;
revoke all on function public.abbey_take_notifications() from public,anon,authenticated;
grant execute on function public.abbey_take_notifications() to service_role;
create index if not exists abbey_notifications_due_idx on public.abbey_notifications(next_attempt_at,id) where sent_at is null;
create unique index if not exists abbey_notifications_source_uq on public.abbey_notifications(source_key);
create table if not exists public.abbey_tech_admins (
  handle text primary key check(handle=lower(handle) and handle !~ '^@'),
  telegram_user_id bigint unique check(telegram_user_id>0), active boolean not null default true
);
alter table public.abbey_tech_admins enable row level security;
revoke all on public.abbey_tech_admins from public,anon,authenticated;
grant select,insert,update on public.abbey_tech_admins to service_role;
insert into public.abbey_tech_admins(handle) values('nickel_tang'),('chengchonglinglongg'),('pharieeee') on conflict do nothing;

create or replace function public.abbey_claim_tech_admin(p_user bigint,p_handle text)
returns boolean language plpgsql set search_path='' as $$
declare ok boolean; begin
  select active into ok from public.abbey_tech_admins where telegram_user_id=p_user;
  if found then return ok; end if;
  update public.abbey_tech_admins set telegram_user_id=p_user
    where handle=lower(p_handle) and telegram_user_id is null and active returning true into ok;
  return coalesce(ok,(select active from public.abbey_tech_admins where telegram_user_id=p_user),false);
end $$;
create or replace function public.abbey_equipment_staff(p_actor bigint,p_qm bigint)
returns boolean language sql stable set search_path='' as $$
  select p_actor=p_qm or exists(select 1 from public.abbey_tech_admins where telegram_user_id=p_actor and active);
$$;

-- Capacity includes working items currently on loan; reservations account for their promised return.
-- An overdue unreturned loan blocks future availability until staff records its actual return.
create or replace function public.abbey_equipment_available(p_item uuid,p_start timestamptz,p_end timestamptz,p_exclude uuid default null)
returns integer language sql stable set search_path='' as $$
with movements as (
  select loan_item_id, coalesce(sum(case when movement_type='checkout' then quantity else -quantity end),0) as outstanding,
    coalesce(sum(quantity) filter(where movement_type in ('return','lost')),0) as resolved
  from public.abbey_loan_movements where item_id=p_item group by loan_item_id
), capacity as (
  select (select coalesce(sum(quantity),0) from public.abbey_inventory_balances where item_id=p_item and condition='working')
    +(select count(*) from public.abbey_inventory_assets where item_id=p_item and condition='working' and whereabouts='on_site' and verified_at is not null)
    +(select coalesce(sum(outstanding),0) from movements) as qty
), reservations as (
  select coalesce(sum(case when l.due_at<=now() then greatest(0,coalesce(m.outstanding,0)) else greatest(0,li.approved_qty-coalesce(m.resolved,0)) end),0) as qty
  from public.abbey_loan_items li join public.abbey_loans l on l.id=li.loan_id left join movements m on m.loan_item_id=li.id
  where li.item_id=p_item and l.status in ('approved','active') and (p_exclude is null or l.id<>p_exclude)
    and ((l.starts_at<p_end and l.due_at>p_start) or (coalesce(m.outstanding,0)>0 and l.due_at<=now()))
)
select greatest(0,capacity.qty-reservations.qty)::integer from capacity,reservations;
$$;

create or replace function public.abbey_equipment_request(p_actor bigint,p_qm bigint,p_request uuid,p_name text,p_handle text,
 p_purpose text,p_committee text,p_start timestamptz,p_end timestamptz,p_items jsonb,p_terms text)
returns uuid language plpgsql set search_path='' as $$
declare result uuid; line jsonb; item public.abbey_inventory_items; qty integer; summary text;
begin
  perform pg_advisory_xact_lock(2627,1);
  select id into result from public.abbey_loans where request_id=p_request and borrower_telegram_id=p_actor;
  if found then return result; end if;
  if p_actor<>p_qm and not exists(select 1 from public.abbey_licenses where telegram_user_id=p_actor and active) then raise exception 'Loan access denied'; end if;
  if p_start<now()+interval '7 days' or p_start>now()+interval '366 days' or p_end<=p_start or p_end>p_start+interval '72 hours' then raise exception 'Request at least 7 days ahead, for no more than 3 days'; end if;
  if length(trim(p_name)) not between 1 and 80 or length(trim(p_purpose)) not between 1 and 1000 or length(p_committee)>120 or p_terms is distinct from 'abbey-loan-2026-11' then raise exception 'Complete the loan details and accept the terms'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Choose 1 to 30 equipment types'; end if;
  if (select count(*) from public.abbey_loans where borrower_telegram_id=p_actor and status in ('pending','approved','active') and (due_at>now() or status='active'))>=10 then raise exception 'You already have 10 open loan requests'; end if;
  insert into public.abbey_loans(request_id,borrower_telegram_id,borrower_name,borrower_handle,purpose,committee,starts_at,due_at,terms_version,terms_accepted_at)
    values(p_request,p_actor,trim(p_name),nullif(p_handle,''),trim(p_purpose),p_committee,p_start,p_end,p_terms,now()) returning id into result;
  for line in select value from jsonb_array_elements(p_items) loop
    select * into item from public.abbey_inventory_items where id=(line->>'item_id')::uuid for update;
    qty:=(line->>'quantity')::integer;
    if not found or item.archived_at is not null or item.verification_status<>'verified' or not item.loanable then raise exception 'Choose verified, loanable equipment'; end if;
    if qty is null or qty<1 or qty>100 or public.abbey_equipment_available(item.id,p_start,p_end)<qty then raise exception 'Insufficient equipment for the selected dates'; end if;
    insert into public.abbey_loan_items(loan_id,item_id,requested_qty) values(result,item.id,qty);
  end loop;
  select string_agg(li.requested_qty||' × '||i.name,chr(10) order by i.name) into summary
    from public.abbey_loan_items li join public.abbey_inventory_items i on i.id=li.item_id where li.loan_id=result;
  insert into public.abbey_notifications(chat_id,body,source_key,markup)
    select recipient,'Abbey equipment loan request'||chr(10)||p_name||chr(10)||
      to_char(p_start at time zone 'Asia/Singapore','DD Mon YYYY HH24:MI')||' → '||to_char(p_end at time zone 'Asia/Singapore','DD Mon YYYY HH24:MI')||' SGT'||chr(10)||left(summary,1200)||chr(10)||left(p_purpose,300)||chr(10)||'Open Equipment → Loans in the mini app. Only the quartermaster can approve.',
      'loan:'||result||':request:'||recipient, jsonb_build_object('inline_keyboard',jsonb_build_array(jsonb_build_array(jsonb_build_object('text','View equipment loans','web_app',jsonb_build_object('url','https://the-abbey.vercel.app/equipment')))))
    from (select p_qm recipient union select telegram_user_id from public.abbey_tech_admins where active and telegram_user_id is not null) recipients
    on conflict(source_key) do nothing;
  insert into public.abbey_notifications(chat_id,body,source_key,markup) values(p_actor,
    'Your Abbey equipment loan request is pending quartermaster approval.'||chr(10)||
      to_char(p_start at time zone 'Asia/Singapore','DD Mon YYYY HH24:MI')||' → '||to_char(p_end at time zone 'Asia/Singapore','DD Mon YYYY HH24:MI')||' SGT'||chr(10)||left(summary,1200)||chr(10)||'Equipment is reserved only after approval. View or cancel your request in Equipment → Loans.',
    'loan:'||result||':receipt',jsonb_build_object('inline_keyboard',jsonb_build_array(jsonb_build_array(jsonb_build_object('text','View my equipment loan','web_app',jsonb_build_object('url','https://the-abbey.vercel.app/equipment'))))))
    on conflict(source_key) do nothing;
  return result;
end $$;

create or replace function public.abbey_equipment_decide(p_actor bigint,p_qm bigint,p_loan uuid,p_action text)
returns void language plpgsql set search_path='' as $$
declare loan public.abbey_loans; line record; outstanding bigint;
begin
  perform pg_advisory_xact_lock(2627,1);
  select * into loan from public.abbey_loans where id=p_loan for update;
  if not found then raise exception 'Loan not found'; end if;
  if p_action in ('approved','rejected') then
    if p_actor<>p_qm then raise exception 'Only the quartermaster can approve or reject loans'; end if;
    if loan.status=p_action then return; end if;
    if loan.status<>'pending' then raise exception 'This request has already been handled'; end if;
    if p_action='approved' and loan.starts_at<=now() then raise exception 'This loan period has already started'; end if;
    if p_action='approved' then
      if loan.borrower_telegram_id<>p_qm and not exists(select 1 from public.abbey_licenses where telegram_user_id=loan.borrower_telegram_id and active) then raise exception 'Borrower access revoked'; end if;
      for line in select li.*,i.loanable,i.verification_status,i.archived_at from public.abbey_loan_items li join public.abbey_inventory_items i on i.id=li.item_id where li.loan_id=p_loan loop
        if not line.loanable or line.verification_status<>'verified' or line.archived_at is not null or public.abbey_equipment_available(line.item_id,loan.starts_at,loan.due_at,p_loan)<line.requested_qty then raise exception 'Insufficient verified equipment for these dates'; end if;
      end loop;
      update public.abbey_loan_items set approved_qty=requested_qty where loan_id=p_loan;
    end if;
    update public.abbey_loans set status=p_action,approved_by=case when p_action='approved' then p_actor else null end,approved_at=case when p_action='approved' then now() else null end where id=p_loan;
  elsif p_action='cancelled' then
    if p_actor<>p_qm and p_actor<>loan.borrower_telegram_id then raise exception 'You can only cancel your own loan'; end if;
    if loan.status='cancelled' then return; end if;
    if loan.status not in ('pending','approved') then raise exception 'Only uncollected loans can be cancelled'; end if;
    update public.abbey_loans set status='cancelled' where id=p_loan;
  elsif p_action='closed' then
    if not public.abbey_equipment_staff(p_actor,p_qm) then raise exception 'Staff access required'; end if;
    if loan.status='closed' then return; end if;
    if loan.status<>'active' and not(p_actor=p_qm and loan.status='approved') then raise exception 'Only collected loans can be closed by Tech Admins'; end if;
    select coalesce(sum(case when movement_type='checkout' then quantity else -quantity end),0) into outstanding
      from public.abbey_loan_movements m join public.abbey_loan_items li on li.id=m.loan_item_id where li.loan_id=p_loan;
    if outstanding<>0 then raise exception 'Record all returns before closing the loan'; end if;
    update public.abbey_loans set status='closed',closed_at=now() where id=p_loan;
  else raise exception 'Unknown loan action'; end if;
  insert into public.abbey_notifications(chat_id,body,source_key) values(loan.borrower_telegram_id,
    'Your Abbey equipment loan was '||case p_action when 'closed' then 'closed — all equipment accounted for' else p_action end||'.'||chr(10)||
      to_char(loan.starts_at at time zone 'Asia/Singapore','DD Mon YYYY HH24:MI')||' → '||to_char(loan.due_at at time zone 'Asia/Singapore','DD Mon YYYY HH24:MI')||' SGT'||chr(10)||'Open Equipment → Loans for details.',
    'loan:'||p_loan||':'||p_action) on conflict(source_key) do nothing;
end $$;

create or replace function public.abbey_equipment_movement(p_actor bigint,p_qm bigint,p_request uuid,p_line uuid,p_type text,p_quantity integer,p_asset uuid,p_condition text,p_notes text)
returns uuid language plpgsql set search_path='' as $$
declare line public.abbey_loan_items; loan public.abbey_loans; result uuid;
begin
  perform pg_advisory_xact_lock(2627,1);
  if not public.abbey_equipment_staff(p_actor,p_qm) then raise exception 'Staff access required'; end if;
  select id into result from public.abbey_loan_movements where request_id=p_request;
  if found then return result; end if;
  select * into line from public.abbey_loan_items where id=p_line for update;
  if not found then raise exception 'Loan line not found'; end if;
  select * into loan from public.abbey_loans where id=line.loan_id for update;
  if p_type not in ('checkout','return') then raise exception 'Choose collection or return'; end if;
  if p_type='checkout' and (now()<loan.starts_at or now()>=loan.due_at) then raise exception 'Collection must be within the approved loan period'; end if;
  if p_type='checkout' and not exists(select 1 from public.abbey_inventory_items where id=line.item_id and loanable) then raise exception 'This equipment is no longer loanable'; end if;
  if p_type='checkout' and p_condition<>'working' then raise exception 'Only working equipment can be collected'; end if;
  if length(coalesce(p_notes,''))>1000 then raise exception 'Keep notes under 1000 characters'; end if;
  insert into public.abbey_loan_movements(request_id,loan_item_id,item_id,asset_id,movement_type,quantity,condition,actor_telegram_id,notes)
    values(p_request,p_line,line.item_id,p_asset,p_type,p_quantity,p_condition,p_actor,p_notes) returning id into result;
  if p_type='checkout' then update public.abbey_loans set status='active' where id=loan.id; end if;
  insert into public.abbey_notifications(chat_id,body,source_key) values(loan.borrower_telegram_id,
    'Abbey equipment '||case p_type when 'checkout' then 'collection' else 'return' end||' recorded: '||p_quantity||' × '||(select name from public.abbey_inventory_items where id=line.item_id)||'.'||chr(10)||'Open Equipment → Loans for the remaining quantities.',
    'movement:'||result) on conflict(source_key) do nothing;
  return result;
end $$;

-- Only the owner can edit inventory or finalise physical counts. Existing loan history is retained.
create or replace function public.abbey_equipment_save(p_actor bigint,p_qm bigint,p_item uuid,p_data jsonb,p_stocktake boolean default false)
returns uuid language plpgsql set search_path='' as $$
declare result uuid:=coalesce(p_item,gen_random_uuid()); old_item public.abbey_inventory_items;
  mode text; units text; asset jsonb; asset_row public.abbey_inventory_assets; tag text; ids uuid[]:='{}';
  count_working integer; count_limited integer; count_faulty integer; count_untested integer; session_id uuid;
begin
  perform pg_advisory_xact_lock(2627,1);
  if p_actor<>p_qm then raise exception 'Only the quartermaster can edit inventory or finalise stocktakes'; end if;
  select * into old_item from public.abbey_inventory_items where id=result for update;
  if p_item is not null and not found then raise exception 'Item not found'; end if;
  if length(trim(coalesce(p_data->>'name',''))) not between 1 and 160 then raise exception 'Enter an equipment name'; end if;
  mode:=nullif(p_data->>'tracking_mode',''); units:=nullif(p_data->>'unit','');
  insert into public.abbey_inventory_items(id,item_code,name,category,subtype,unit,tracking_mode,loanable,notes,photo_path)
    values(result,coalesce(old_item.item_code,'ABY-I-'||left(replace(result::text,'-',''),10)),trim(p_data->>'name'),nullif(p_data->>'category',''),nullif(p_data->>'subtype',''),units,mode,coalesce((p_data->>'loanable')::boolean,false),nullif(p_data->>'notes',''),nullif(p_data->>'photo_path',''))
    on conflict(id) do update set name=excluded.name,category=excluded.category,subtype=excluded.subtype,unit=excluded.unit,tracking_mode=excluded.tracking_mode,loanable=excluded.loanable,notes=excluded.notes,photo_path=excluded.photo_path;
  if p_stocktake then
    if mode is null or units is null then raise exception 'Choose tracking and counting unit before stocktake'; end if;
    count_working:=(p_data->>'working')::integer; count_limited:=(p_data->>'limited')::integer;
    count_faulty:=(p_data->>'faulty')::integer; count_untested:=(p_data->>'untested')::integer;
    if count_working is null or count_limited is null or count_faulty is null or count_untested is null or least(count_working,count_limited,count_faulty,count_untested)<0 then raise exception 'Enter all four nonnegative physical counts'; end if;
    insert into public.abbey_stocktakes(name,status,started_by,finalized_by,finalized_at)
      values('Equipment stocktake: '||(p_data->>'name'),'finalized',p_actor,p_actor,now()) returning id into session_id;
    if mode='bulk' then
      insert into public.abbey_inventory_balances(item_id,condition,quantity,verified_at)
        values(result,'working',count_working,now()),(result,'limited',count_limited,now()),(result,'faulty',count_faulty,now()),(result,'untested',count_untested,now())
        on conflict(item_id,condition) do update set quantity=excluded.quantity,verified_at=now(),updated_at=now();
    else
      if jsonb_typeof(p_data->'assets') is distinct from 'array' then raise exception 'Add the physical asset labels'; end if;
      if jsonb_array_length(p_data->'assets')<>count_working+count_limited+count_faulty+count_untested then raise exception 'Asset labels must match the physical counts'; end if;
      for asset in select value from jsonb_array_elements(p_data->'assets') loop
        tag:=trim(coalesce(asset->>'asset_tag',''));
        if tag='' or length(tag)>80 then raise exception 'Every physical asset needs a unique tag'; end if;
        select * into asset_row from public.abbey_inventory_assets where asset_tag=tag for update;
        if found and (asset_row.item_id<>result or asset_row.whereabouts='off_site') then raise exception 'Asset belongs to another item or is still on loan'; end if;
        insert into public.abbey_inventory_assets(item_id,asset_tag,serial_number,condition,whereabouts,condition_notes,verified_at,last_tested_at)
          values(result,tag,nullif(asset->>'serial_number',''),asset->>'condition','on_site',nullif(asset->>'notes',''),now(),case when asset->>'condition'<>'untested' then now() else null end)
          on conflict(asset_tag) do update set serial_number=excluded.serial_number,condition=excluded.condition,whereabouts='on_site',condition_notes=excluded.condition_notes,verified_at=now()
          returning * into asset_row;
        if asset_row.id=any(ids) then raise exception 'Asset tags must be unique'; end if;
        ids:=array_append(ids,asset_row.id);
      end loop;
      if (select count(*) from public.abbey_inventory_assets where id=any(ids) and condition='working')<>count_working
        or (select count(*) from public.abbey_inventory_assets where id=any(ids) and condition='limited')<>count_limited
        or (select count(*) from public.abbey_inventory_assets where id=any(ids) and condition='faulty')<>count_faulty
        or (select count(*) from public.abbey_inventory_assets where id=any(ids) and condition='untested')<>count_untested then raise exception 'Asset conditions must match the counts'; end if;
      update public.abbey_inventory_assets set whereabouts='missing',updated_at=now() where item_id=result and whereabouts='on_site' and not(id=any(ids));
    end if;
    insert into public.abbey_stocktake_lines(stocktake_id,item_id,counted_working,counted_limited,counted_faulty,counted_untested,review_status,checked_by,checked_at,expected_snapshot)
      values(session_id,result,count_working,count_limited,count_faulty,count_untested,'checked',p_actor,now(),to_jsonb(old_item));
    update public.abbey_inventory_items set verification_status='verified',review_flags='{}' where id=result;
  end if;
  insert into public.abbey_inventory_events(item_id,stocktake_id,event_type,before_data,after_data,actor_telegram_id)
    values(result,session_id,case when p_stocktake then 'stocktake' else 'metadata_edit' end,coalesce(to_jsonb(old_item),'{}'),p_data,p_actor);
  return result;
end $$;

create or replace function public.abbey_equipment_catalogue(p_start timestamptz default null,p_end timestamptz default null,p_staff boolean default false)
returns jsonb language sql stable set search_path='' as $$
select coalesce(jsonb_agg(entry order by entry->>'category',entry->>'name'),'[]'::jsonb) from (
 select jsonb_build_object('id',i.id,'item_code',i.item_code,'name',i.name,'category',i.category,'subtype',i.subtype,
   'unit',i.unit,'tracking_mode',i.tracking_mode,'verification_status',i.verification_status,'loanable',i.loanable,
   'photo_path',i.photo_path,'notes',case when p_staff then i.notes else null end,
   'working',coalesce((select sum(quantity) from public.abbey_inventory_balances where item_id=i.id and condition='working'),0)
      +(select count(*) from public.abbey_inventory_assets where item_id=i.id and whereabouts='on_site' and condition='working' and verified_at is not null),
   'limited',coalesce((select sum(quantity) from public.abbey_inventory_balances where item_id=i.id and condition='limited'),0)
      +(select count(*) from public.abbey_inventory_assets where item_id=i.id and whereabouts='on_site' and condition='limited' and verified_at is not null),
   'faulty',coalesce((select sum(quantity) from public.abbey_inventory_balances where item_id=i.id and condition='faulty'),0)
      +(select count(*) from public.abbey_inventory_assets where item_id=i.id and whereabouts='on_site' and condition='faulty' and verified_at is not null),
   'untested',coalesce((select sum(quantity) from public.abbey_inventory_balances where item_id=i.id and condition='untested'),0)
      +(select count(*) from public.abbey_inventory_assets where item_id=i.id and whereabouts='on_site' and condition='untested' and verified_at is not null),
   'out',coalesce((select sum(case when movement_type='checkout' then quantity else -quantity end) from public.abbey_loan_movements where item_id=i.id),0),
   'available',case when p_start is not null and p_end>p_start and i.loanable and i.verification_status='verified' then public.abbey_equipment_available(i.id,p_start,p_end) else null end,
   'assets',case when p_staff then coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'asset_tag',a.asset_tag,'serial_number',a.serial_number,'condition',a.condition,'whereabouts',a.whereabouts,'notes',a.condition_notes) order by a.asset_tag) from public.abbey_inventory_assets a where a.item_id=i.id),'[]'::jsonb) else '[]'::jsonb end
 ) entry from public.abbey_inventory_items i where i.archived_at is null
) entries;
$$;

-- Revoke default function access, granting only the existing backend service role.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('abbey_claim_tech_admin','abbey_equipment_staff','abbey_equipment_available','abbey_equipment_request','abbey_equipment_decide','abbey_equipment_movement','abbey_equipment_save','abbey_equipment_catalogue') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
commit;

notify pgrst, 'reload schema';
