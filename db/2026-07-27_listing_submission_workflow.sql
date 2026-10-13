begin;

alter table public.listings
  add column if not exists submitted_at timestamptz;

update public.listings
set publication_status =
  case when is_published then 'active' else 'draft' end
where publication_status is null;

alter table public.listings
  alter column publication_status set default 'draft',
  alter column publication_status set not null;

alter table public.listings
  drop constraint if exists listings_publication_status_check;

alter table public.listings
  add constraint listings_publication_status_check
  check (
    publication_status in (
      'draft',
      'submitted',
      'needs_changes',
      'rejected',
      'active',
      'expiring',
      'expired',
      'suspended'
    )
  );

alter table public.listings
  drop constraint if exists listings_submission_workflow_check;

alter table public.listings
  add constraint listings_submission_workflow_check
  check (
    publication_status not in ('submitted', 'needs_changes', 'rejected')
    or (
      is_published = false
      and submitted_at is not null
    )
  );

comment on column public.listings.submitted_at is
  'Timestamp of the latest owner submission for editorial review.';

drop policy if exists "Anon read images"
  on public.listing_images;

drop policy if exists "Anon read published listing images"
  on public.listing_images;

create policy "Anon read published listing images"
  on public.listing_images
  for select
  to anon
  using (
    exists (
      select 1
      from public.listings l
      where l.id = listing_images.listing_id
        and l.is_published = true
    )
  );

drop policy if exists "Anon read listing_facilities"
  on public.listing_facilities;

drop policy if exists "Anon read published listing facilities"
  on public.listing_facilities;

create policy "Anon read published listing facilities"
  on public.listing_facilities
  for select
  to anon
  using (
    exists (
      select 1
      from public.listings l
      where l.id = listing_facilities.listing_id
        and l.is_published = true
    )
  );

revoke insert, update, delete, truncate, references, trigger
  on table public.listings, public.listing_images, public.listing_facilities
  from anon, authenticated;

revoke select, insert, update, delete, truncate, references, trigger
  on table public.listing_geo_zone
  from anon, authenticated;

commit;
