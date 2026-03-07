alter table public.listings
  add column if not exists created_by_actor text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_created_by_actor_check'
  ) then
    alter table public.listings
      add constraint listings_created_by_actor_check
      check (created_by_actor in ('admin', 'georgiana', 'client'));
  end if;
end
$$;
