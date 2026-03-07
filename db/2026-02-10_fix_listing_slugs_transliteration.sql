-- Regenerate listing slugs from title with a strict, URL-safe format:
-- - no diacritics
-- - lowercase
-- - "-" separator
-- - no spaces/special chars
--
-- NOTE:
-- This updates existing slugs, so old URLs may change.
-- If those URLs are already indexed/shared, add redirects in app logic.

begin;

create extension if not exists unaccent;

create temporary table tmp_listing_slug_targets (
  id text primary key,
  new_slug text not null unique
) on commit drop;

insert into tmp_listing_slug_targets (id, new_slug)
with normalized as (
  select
    l.id,
    l.created_at,
    case
      when base_slug = '' then 'cazare'
      else base_slug
    end as base_slug
  from (
    select
      id::text as id,
      created_at,
      trim(both '-' from regexp_replace(lower(unaccent(coalesce(title, ''))), '[^a-z0-9]+', '-', 'g')) as base_slug
    from public.listings
  ) as l
),
ranked as (
  select
    id,
    base_slug,
    row_number() over (partition by base_slug order by created_at nulls last, id) as slug_rank
  from normalized
),
candidates as (
  select
    id,
    case
      when slug_rank = 1 then base_slug
      else base_slug || '-' || slug_rank::text
    end as candidate_slug
  from ranked
),
collision_rank as (
  select
    id,
    candidate_slug,
    row_number() over (partition by candidate_slug order by id) as candidate_rank
  from candidates
)
select
  id,
  case
    when candidate_rank = 1 then candidate_slug
    else candidate_slug || '-' || replace(id::text, '-', '')
  end as new_slug
from collision_rank;

delete from tmp_listing_slug_targets t
using public.listings l
where l.id::text = t.id
  and l.slug is not distinct from t.new_slug;

-- Move every slug to a guaranteed-unique temporary value first so the final
-- rewrite cannot hit transient unique-index conflicts.
update public.listings
set slug = 'tmp-' || replace(id::text, '-', '')
where id::text in (select id from tmp_listing_slug_targets);

update public.listings as l
set slug = t.new_slug
from tmp_listing_slug_targets as t
where l.id::text = t.id
  and l.slug is distinct from t.new_slug;

commit;
