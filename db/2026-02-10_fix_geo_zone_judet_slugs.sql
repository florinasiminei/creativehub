-- Normalize county slugs in geo_zones:
-- - removes legacy "judet-" prefix
-- - regenerates slug from county name (with unaccent transliteration)
-- - updates optional path/url columns to canonical "/judet/<slug>"
--
-- Safe guards:
-- - uses temporary slugs first (avoids transient unique collisions)
-- - skips rows whose target slug already exists on a different id

begin;

create extension if not exists unaccent;

create temporary table tmp_geo_zone_judet_targets (
  id uuid primary key,
  new_slug text not null,
  new_path text not null
) on commit drop;

insert into tmp_geo_zone_judet_targets (id, new_slug, new_path)
select
  g.id,
  trim(
    both '-'
    from regexp_replace(lower(unaccent(coalesce(g.name, ''))), '[^a-z0-9]+', '-', 'g')
  ) as new_slug,
  '/judet/' ||
  trim(
    both '-'
    from regexp_replace(lower(unaccent(coalesce(g.name, ''))), '[^a-z0-9]+', '-', 'g')
  ) as new_path
from public.geo_zones g
where g.type = 'judet';

-- Ignore invalid targets.
delete from tmp_geo_zone_judet_targets
where new_slug = '';

-- Ignore rows already correct.
delete from tmp_geo_zone_judet_targets t
using public.geo_zones g
where g.id = t.id
  and lower(coalesce(g.slug, '')) = lower(t.new_slug);

-- If canonical county slug is already used by another geo_zone (ex: regiune "maramures"),
-- use a deterministic fallback for county record.
update tmp_geo_zone_judet_targets t
set new_slug = t.new_slug || '-judet',
    new_path = '/judet/' || t.new_slug
where exists (
  select 1
  from public.geo_zones g
  where lower(g.slug) = lower(t.new_slug)
    and g.id <> t.id
);

-- Rare safety net: if fallback still collides, append a short id suffix.
update tmp_geo_zone_judet_targets t
set new_slug = t.new_slug || '-' || left(replace(t.id::text, '-', ''), 8),
    new_path = t.new_path
where exists (
  select 1
  from public.geo_zones g
  where lower(g.slug) = lower(t.new_slug)
    and g.id <> t.id
);

-- Any unresolved conflict is skipped (very unlikely).
delete from tmp_geo_zone_judet_targets t
using public.geo_zones g
where lower(g.slug) = lower(t.new_slug)
  and g.id <> t.id;

-- Temporary unique value to avoid unique index conflicts during rewrite.
update public.geo_zones g
set slug = 'tmp-judet-' || replace(g.id::text, '-', '')
from tmp_geo_zone_judet_targets t
where g.id = t.id;

-- Final canonical slug.
update public.geo_zones g
set slug = t.new_slug
from tmp_geo_zone_judet_targets t
where g.id = t.id;

-- If these columns exist, keep canonical county route in sync.
do $$
declare
  col text;
begin
  foreach col in array array['path', 'url', 'canonical_path', 'page_path'] loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'geo_zones'
        and column_name = col
    ) then
      execute format(
        'update public.geo_zones g
           set %I = t.new_path
          from tmp_geo_zone_judet_targets t
         where g.id = t.id
           and g.type = ''judet''',
        col
      );
    end if;
  end loop;
end
$$;

commit;

-- Validation (run after migration):
-- select id, name, slug, type
-- from public.geo_zones
-- where type = 'judet'
--   and (slug like 'judet-%' or slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
-- order by name;
