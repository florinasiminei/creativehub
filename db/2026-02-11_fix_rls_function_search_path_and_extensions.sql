alter table if exists public.attractions
  enable row level security;

do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('slugify_geo', 'set_updated_at', 'set_updated_at_geo_zones')
  loop
    execute format(
      'alter function %s set search_path = public, extensions, pg_temp',
      fn
    );
  end loop;
end
$$;

create schema if not exists extensions;

do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm'
      and n.nspname = 'public'
  ) then
    alter extension pg_trgm set schema extensions;
  end if;

  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'unaccent'
      and n.nspname = 'public'
  ) then
    alter extension unaccent set schema extensions;
  end if;
end
$$;
