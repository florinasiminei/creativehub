create table if not exists public.seo_pageviews (
  id bigserial primary key,
  path text not null,
  anon_id text null,
  referrer text null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_seo_pageviews_path_created_at
  on public.seo_pageviews (path, created_at desc);

create index if not exists idx_seo_pageviews_created_at
  on public.seo_pageviews (created_at desc);

create index if not exists idx_seo_pageviews_path_anon_created_at
  on public.seo_pageviews (path, anon_id, created_at desc);
