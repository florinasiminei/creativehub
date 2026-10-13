-- CABN security hardening. No listing, claim, payment or booking data is changed.
-- Public reads remain opt-in; server-side service_role access is preserved.
begin;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, public;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, public;
-- Function EXECUTE for PUBLIC is a global PostgreSQL default, so revoke it globally.
alter default privileges for role postgres
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, public;
alter default privileges for role postgres in schema public
  grant all on tables to service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to service_role;

revoke all on public.attractions, public.attraction_images, public.geo_zones, public.seo_pageviews
  from anon, authenticated, public;
revoke all on all sequences in schema public from anon, authenticated, public;
revoke execute on all functions in schema public from anon, authenticated, public;
grant execute on all functions in schema public to service_role;

revoke select (created_by_actor, published_at, renewal_due_at, submitted_at)
  on public.listings from anon, authenticated, public;

revoke all on public.listing_seo, public.listing_slug_history from anon, authenticated, public;
grant select on public.listing_seo, public.listing_slug_history to anon, authenticated;
drop policy if exists "Anon read SEO" on public.listing_seo;
drop policy if exists "Anon read slug history" on public.listing_slug_history;
drop policy if exists "Public read active listing SEO" on public.listing_seo;
create policy "Public read active listing SEO" on public.listing_seo
  for select to anon, authenticated using (
    exists (
      select 1 from public.listings listing
      where listing.id = listing_seo.listing_id
        and listing.is_published = true
        and listing.publication_status in ('active', 'expiring')
        and (listing.publication_expires_at is null or listing.publication_expires_at > now())
    )
  );
drop policy if exists "Public read active listing slug history" on public.listing_slug_history;
create policy "Public read active listing slug history" on public.listing_slug_history
  for select to anon, authenticated using (
    exists (
      select 1 from public.listings listing
      where listing.id = listing_slug_history.listing_id
        and listing.is_published = true
        and listing.publication_status in ('active', 'expiring')
        and (listing.publication_expires_at is null or listing.publication_expires_at > now())
    )
  );

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'listing-images';

commit;
