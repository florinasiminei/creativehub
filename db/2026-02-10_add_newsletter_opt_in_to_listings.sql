alter table if exists public.listings
  add column if not exists newsletter_opt_in boolean not null default false;
