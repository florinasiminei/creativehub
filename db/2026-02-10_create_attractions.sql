create extension if not exists pgcrypto;

create table if not exists public.attractions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  location_name text not null,
  price numeric(10,2) null,
  judet text null,
  city text null,
  sat text null,
  lat double precision null,
  lng double precision null,
  description text null,
  is_published boolean not null default false,
  created_by_actor text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_attractions_slug_unique
  on public.attractions (lower(slug));

create index if not exists idx_attractions_created_at
  on public.attractions (created_at desc);

create index if not exists idx_attractions_is_published
  on public.attractions (is_published);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attractions_created_by_actor_check'
  ) then
    alter table public.attractions
      add constraint attractions_created_by_actor_check
      check (created_by_actor in ('admin', 'georgiana', 'client'));
  end if;
end
$$;

create table if not exists public.attraction_images (
  id uuid primary key default gen_random_uuid(),
  attraction_id uuid not null references public.attractions(id) on delete cascade,
  image_url text not null,
  display_order integer null,
  alt text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_attraction_images_attraction
  on public.attraction_images (attraction_id);

create index if not exists idx_attraction_images_order
  on public.attraction_images (attraction_id, display_order asc nulls last);
