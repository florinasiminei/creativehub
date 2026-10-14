-- Prepared for manual review/application. This file does not activate publishing.
-- Prerequisite: existing CABN listings, listing_images, listing_facilities and owner portal.
begin;

create table public.social_promotions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  listing_reference uuid not null,
  owner_id uuid not null,
  platform text not null default 'instagram' check (platform = 'instagram'),
  caption text not null check (char_length(caption) between 1 and 2200),
  images jsonb not null check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) between 1 and 5),
  rendered_images jsonb not null check (jsonb_typeof(rendered_images) = 'array' and jsonb_array_length(rendered_images) between 1 and 5),
  source_hash text not null,
  content_hash text not null,
  revision integer not null default 1 check (revision > 0),
  status text not null default 'draft' check (status in ('draft','approved','paused','scheduled','published','cancelled','error')),
  approved_at timestamptz,
  consent_version text,
  consent_text text,
  needs_reapproval boolean not null default false,
  scheduled_for timestamptz,
  scheduled_week date,
  preferred_date date check (preferred_date is null or extract(isodow from preferred_date) = 4),
  published_at timestamptz,
  buffer_post_id text unique,
  external_url text,
  last_error text,
  last_actor text not null,
  lock_token uuid,
  lock_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_reference, platform),
  check (jsonb_array_length(images) = jsonb_array_length(rendered_images)),
  check (status not in ('approved','scheduled') or approved_at is not null)
);

create index social_promotions_owner_idx on public.social_promotions(owner_id);
create index social_promotions_listing_idx on public.social_promotions(listing_id);
create index social_promotions_queue_idx on public.social_promotions(approved_at)
  where status = 'approved';
-- A publication keeps its week occupied even after it has been sent.
create unique index social_promotions_week_idx on public.social_promotions(platform, scheduled_week)
  where scheduled_week is not null and status in ('approved','scheduled','published','error');

create table public.social_promotion_events (
  id bigint generated always as identity primary key,
  promotion_id uuid not null references public.social_promotions(id) on delete cascade,
  actor text not null,
  event text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index social_promotion_events_promotion_idx on public.social_promotion_events(promotion_id, created_at);

create table public.social_promotion_worker (
  id text primary key check (id = 'instagram'),
  lock_token uuid,
  lock_until timestamptz
);
insert into public.social_promotion_worker(id) values ('instagram');

-- All access goes through existing authenticated CABN server routes.
-- There are deliberately no browser write policies for consent/provider state.
alter table public.social_promotions enable row level security;
alter table public.social_promotion_events enable row level security;
alter table public.social_promotion_worker enable row level security;
revoke all on public.social_promotions, public.social_promotion_events, public.social_promotion_worker from public, anon, authenticated;
grant all on public.social_promotions, public.social_promotion_events, public.social_promotion_worker to service_role;
grant usage, select on sequence public.social_promotion_events_id_seq to service_role;

create function public.touch_social_promotion() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function public.record_social_promotion_event() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare event_name text;
begin
  if tg_op = 'INSERT' then event_name := 'draft_saved';
  elsif new.revision is distinct from old.revision then event_name := 'draft_saved';
  elsif new.approved_at is distinct from old.approved_at and new.approved_at is not null then event_name := 'owner_approved';
  elsif new.needs_reapproval is distinct from old.needs_reapproval and new.needs_reapproval then event_name := 'source_changed';
  elsif new.status is distinct from old.status then event_name := new.status;
  elsif new.scheduled_for is distinct from old.scheduled_for or new.preferred_date is distinct from old.preferred_date then event_name := 'rescheduled';
  end if;
  if event_name is not null then
    insert into public.social_promotion_events(promotion_id, actor, event, snapshot)
    values (new.id, new.last_actor, event_name,
      to_jsonb(new) - 'lock_token' - 'lock_until');
  end if;
  return new;
end;
$$;
create trigger social_promotions_updated before insert or update on public.social_promotions
for each row execute function public.touch_social_promotion();
create trigger social_promotions_audit after insert or update on public.social_promotions
for each row execute function public.record_social_promotion_event();

create function public.invalidate_social_promotion_source() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare target_id uuid;
begin
  if tg_table_name = 'listings' then
    if row(new.title,new.type,new.judet,new.city,new.sat,new.capacity,new.price,new.description,new.camere,new.paturi,new.bai,new.owner_id)
      is not distinct from row(old.title,old.type,old.judet,old.city,old.sat,old.capacity,old.price,old.description,old.camere,old.paturi,old.bai,old.owner_id) then
      return null;
    end if;
    target_id := new.id;
  else
    if tg_op = 'UPDATE' and to_jsonb(new) is not distinct from to_jsonb(old) then return null; end if;
    target_id := case when tg_op = 'DELETE' then old.listing_id else new.listing_id end;
  end if;
  update public.social_promotions set needs_reapproval = true, last_actor = 'system'
  where listing_id = target_id and approved_at is not null and status <> 'published';
  return null;
end;
$$;
create trigger listings_invalidate_social_promotion after update on public.listings
for each row execute function public.invalidate_social_promotion_source();
create trigger listing_images_invalidate_social_promotion after insert or update or delete on public.listing_images
for each row execute function public.invalidate_social_promotion_source();
create trigger listing_facilities_invalidate_social_promotion after insert or update or delete on public.listing_facilities
for each row execute function public.invalidate_social_promotion_source();

revoke all on function public.touch_social_promotion(), public.record_social_promotion_event(), public.invalidate_social_promotion_source() from public, anon, authenticated;
grant execute on function public.touch_social_promotion(), public.record_social_promotion_event(), public.invalidate_social_promotion_source() to service_role;
notify pgrst, 'reload schema';
commit;
