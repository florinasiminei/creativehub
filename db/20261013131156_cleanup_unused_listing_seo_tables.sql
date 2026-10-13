-- SEO uses public.listings.seo_title / seo_description as optional overrides.
-- Empty values use application-generated metadata; JSON-LD is generated in code.
-- Remove only the two empty legacy tables approved for cleanup.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Prevent a concurrent insert between the emptiness check and DROP.
lock table public.listing_seo, public.listing_slug_history in access exclusive mode;

do $$
begin
  if exists (select 1 from public.listing_seo)
     or exists (select 1 from public.listing_slug_history) then
    raise exception 'Cleanup aborted: legacy SEO tables contain data.';
  end if;
end;
$$;

-- RESTRICT refuses to remove dependencies belonging to other objects.
drop table public.listing_seo, public.listing_slug_history restrict;

commit;
