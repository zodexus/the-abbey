-- After deploying /equipment, update future loan notification buttons.
-- Previously delivered buttons continue to work through the legacy URL redirect.
begin;
do $$ declare definition text; begin
 select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='abbey_equipment_request';
 if definition is null then raise exception 'Apply equipment-app.sql first'; end if;
 execute replace(definition,'https://the-abbey.vercel.app/?view=equipment','https://the-abbey.vercel.app/equipment');
end $$;
commit;
notify pgrst,'reload schema';
