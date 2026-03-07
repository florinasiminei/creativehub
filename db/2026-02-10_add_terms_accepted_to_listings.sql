alter table public.listings
  add column if not exists terms_accepted boolean not null default false,
  add column if not exists terms_accepted_at timestamptz null;
