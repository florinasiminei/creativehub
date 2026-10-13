begin;

create extension if not exists pgcrypto;
create extension if not exists pg_cron;

alter table public.listings
  add column if not exists owner_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_owner_id_fkey'
      and conrelid = 'public.listings'::regclass
  ) then
    alter table public.listings
      add constraint listings_owner_id_fkey
      foreign key (owner_id)
      references auth.users(id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_listings_owner_id
  on public.listings(owner_id);

create table if not exists public.listing_owner_claims (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  claimant_email text,
  message text,
  notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_listing_owner_claims_listing_id
  on public.listing_owner_claims(listing_id);

create index if not exists idx_listing_owner_claims_user_id
  on public.listing_owner_claims(user_id);

create unique index if not exists uq_listing_owner_claims_pending
  on public.listing_owner_claims(listing_id, user_id)
  where status = 'pending';

create table if not exists public.publication_plans (
  code text primary key,
  name text not null,
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  duration_months integer not null check (duration_months > 0),
  renewal_window_days integer not null check (renewal_window_days >= 0),
  grace_days integer not null check (grace_days >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.publication_plans (
  code,
  name,
  amount_minor,
  currency,
  duration_months,
  renewal_window_days,
  grace_days,
  active
)
values (
  'annual_standard',
  'Publicare anuala',
  9900,
  'RON',
  12,
  60,
  14,
  true
)
on conflict (code) do update
set
  name = excluded.name,
  amount_minor = excluded.amount_minor,
  currency = excluded.currency,
  duration_months = excluded.duration_months,
  renewal_window_days = excluded.renewal_window_days,
  grace_days = excluded.grace_days,
  active = excluded.active,
  updated_at = now()
where (
  publication_plans.name,
  publication_plans.amount_minor,
  publication_plans.currency,
  publication_plans.duration_months,
  publication_plans.renewal_window_days,
  publication_plans.grace_days,
  publication_plans.active
) is distinct from (
  excluded.name,
  excluded.amount_minor,
  excluded.currency,
  excluded.duration_months,
  excluded.renewal_window_days,
  excluded.grace_days,
  excluded.active
);

update public.listings as listing
set renewal_due_at =
  listing.publication_expires_at
  - make_interval(days => plan.renewal_window_days)
from public.publication_plans as plan
where plan.code = 'annual_standard'
  and listing.publication_expires_at is not null
  and listing.publication_status in ('active', 'expiring', 'expired')
  and listing.renewal_due_at is distinct from (
    listing.publication_expires_at
    - make_interval(days => plan.renewal_window_days)
  );

alter table public.listing_publication_periods
  add column if not exists plan_code text,
  add column if not exists source text,
  add column if not exists idempotency_key text;

update public.listing_publication_periods
set
  plan_code = coalesce(plan_code, 'annual_standard'),
  source = coalesce(source, 'manual'),
  updated_at = coalesce(updated_at, created_at, now())
where plan_code is null
   or source is null
   or updated_at is null;

alter table public.listing_publication_periods
  alter column plan_code set default 'annual_standard',
  alter column plan_code set not null,
  alter column source set default 'manual',
  alter column source set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'listing_publication_periods_plan_code_fkey'
      and conrelid = 'public.listing_publication_periods'::regclass
  ) then
    alter table public.listing_publication_periods
      add constraint listing_publication_periods_plan_code_fkey
      foreign key (plan_code)
      references public.publication_plans(code)
      on update cascade
      on delete restrict;
  end if;
end
$$;

alter table public.listing_publication_periods
  drop constraint if exists listing_publication_periods_source_check;

alter table public.listing_publication_periods
  add constraint listing_publication_periods_source_check
  check (source in ('checkout', 'manual', 'backoffice'));

create unique index if not exists uq_listing_publication_periods_idempotency_key
  on public.listing_publication_periods(idempotency_key)
  where idempotency_key is not null;

insert into public.listing_publication_periods (
  listing_id,
  starts_at,
  ends_at,
  amount,
  currency,
  status,
  notes,
  created_by,
  plan_code,
  source,
  idempotency_key
)
select
  listing.id,
  case
    when listing.published_at is null
      or listing.published_at >= listing.publication_expires_at
      then listing.publication_expires_at - interval '12 months'
    else listing.published_at
  end,
  listing.publication_expires_at,
  0,
  plan.currency,
  case
    when listing.publication_expires_at > clock_timestamp()
      then 'active'
    else 'expired'
  end,
  'Perioada initiala gratuita.',
  'migration',
  plan.code,
  'backoffice',
  'initial-publication:' || listing.id::text
from public.listings as listing
join public.publication_plans as plan
  on plan.code = 'annual_standard'
where listing.publication_expires_at is not null
  and listing.publication_status in ('active', 'expiring', 'expired', 'suspended')
on conflict do nothing;

alter table public.listing_publication_payments
  add column if not exists amount_minor integer,
  add column if not exists status text,
  add column if not exists provider text,
  add column if not exists provider_checkout_id text,
  add column if not exists provider_payment_id text,
  add column if not exists idempotency_key text,
  add column if not exists checkout_url text,
  add column if not exists checkout_expires_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.listing_publication_payments
set
  amount_minor = coalesce(amount_minor, round(amount * 100)::integer),
  status = coalesce(status, 'paid'),
  provider = coalesce(nullif(btrim(provider), ''), 'manual'),
  updated_at = coalesce(updated_at, created_at, now())
where amount_minor is null
   or status is null
   or provider is null
   or btrim(provider) = ''
   or updated_at is null;

alter table public.listing_publication_payments
  alter column amount_minor set not null,
  alter column status set default 'paid',
  alter column status set not null,
  alter column provider set default 'manual',
  alter column provider set not null,
  alter column paid_at drop default,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.listing_publication_payments
  drop constraint if exists listing_publication_payments_amount_minor_check;

alter table public.listing_publication_payments
  add constraint listing_publication_payments_amount_minor_check
  check (amount_minor >= 0);

alter table public.listing_publication_payments
  drop constraint if exists listing_publication_payments_status_check;

alter table public.listing_publication_payments
  add constraint listing_publication_payments_status_check
  check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded'));

create unique index if not exists uq_listing_publication_payments_checkout
  on public.listing_publication_payments(provider, provider_checkout_id)
  where provider_checkout_id is not null;

create unique index if not exists uq_listing_publication_payments_provider_payment
  on public.listing_publication_payments(provider, provider_payment_id)
  where provider_payment_id is not null;

create unique index if not exists uq_listing_publication_payments_idempotency_key
  on public.listing_publication_payments(idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_listing_publication_payments_status
  on public.listing_publication_payments(status);

create table if not exists public.publication_payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payment_id uuid references public.listing_publication_payments(id) on delete set null,
  provider_payment_id text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index if not exists idx_publication_payment_webhook_events_payment_id
  on public.publication_payment_webhook_events(payment_id);

create index if not exists idx_publication_payment_webhook_events_unprocessed
  on public.publication_payment_webhook_events(received_at)
  where processed_at is null;

create or replace function public.owner_portal_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists listing_owner_claims_updated_at_trigger
  on public.listing_owner_claims;

create trigger listing_owner_claims_updated_at_trigger
before update on public.listing_owner_claims
for each row
execute function public.owner_portal_touch_updated_at();

drop trigger if exists publication_plans_updated_at_trigger
  on public.publication_plans;

create trigger publication_plans_updated_at_trigger
before update on public.publication_plans
for each row
execute function public.owner_portal_touch_updated_at();

drop trigger if exists listing_publication_payments_updated_at_trigger
  on public.listing_publication_payments;

create trigger listing_publication_payments_updated_at_trigger
before update on public.listing_publication_payments
for each row
execute function public.owner_portal_touch_updated_at();

drop trigger if exists listing_publication_periods_updated_at_trigger
  on public.listing_publication_periods;

create trigger listing_publication_periods_updated_at_trigger
before update on public.listing_publication_periods
for each row
execute function public.owner_portal_touch_updated_at();

create or replace function public.ensure_initial_publication_period()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_plan public.publication_plans%rowtype;
  v_starts_at timestamptz;
begin
  if new.is_published is not true
    or new.publication_expires_at is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.is_published is true then
      return new;
    end if;
  end if;

  if exists (
    select 1
    from public.listing_publication_periods as period
    where period.listing_id = new.id
      and period.ends_at = new.publication_expires_at
      and period.status = 'active'
  ) then
    return new;
  end if;

  select plan.*
  into v_plan
  from public.publication_plans as plan
  where plan.code = 'annual_standard'
    and plan.active = true;

  if not found then
    raise exception 'Planul anual nu este disponibil.';
  end if;

  v_starts_at := coalesce(new.published_at, clock_timestamp());
  if v_starts_at >= new.publication_expires_at then
    v_starts_at := new.publication_expires_at
      - make_interval(months => v_plan.duration_months);
  end if;

  insert into public.listing_publication_periods (
    listing_id,
    starts_at,
    ends_at,
    amount,
    currency,
    status,
    notes,
    created_by,
    plan_code,
    source,
    idempotency_key
  )
  values (
    new.id,
    v_starts_at,
    new.publication_expires_at,
    0,
    v_plan.currency,
    case
      when new.publication_expires_at > clock_timestamp()
        then 'active'
      else 'expired'
    end,
    'Perioada initiala gratuita.',
    coalesce(new.created_by_actor, 'backoffice'),
    v_plan.code,
    'backoffice',
    'initial-publication:' || new.id::text
  )
  on conflict do nothing;

  return new;
end
$$;

drop trigger if exists listings_initial_publication_insert_trigger
  on public.listings;
drop trigger if exists listings_initial_publication_update_trigger
  on public.listings;

create trigger listings_initial_publication_insert_trigger
after insert on public.listings
for each row
execute function public.ensure_initial_publication_period();

create trigger listings_initial_publication_update_trigger
after update of is_published, publication_expires_at on public.listings
for each row
execute function public.ensure_initial_publication_period();

create or replace function public.enforce_listing_image_limit()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.listing_id = old.listing_id then
      return new;
    end if;
  end if;

  perform 1
  from public.listings
  where id = new.listing_id
  for update;

  if (
    select count(*)
    from public.listing_images
    where listing_id = new.listing_id
  ) >= 30 then
    raise exception 'O proprietate poate avea maximum 30 de imagini.';
  end if;

  return new;
end
$$;

drop trigger if exists listing_images_limit_trigger
  on public.listing_images;

create trigger listing_images_limit_trigger
before insert or update of listing_id on public.listing_images
for each row
execute function public.enforce_listing_image_limit();

create or replace function public.enforce_published_listing_image_minimum()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_is_published boolean;
begin
  select listing.is_published
  into v_is_published
  from public.listings as listing
  where listing.id = old.listing_id
  for update;

  if not found then
    return old;
  end if;

  if v_is_published is true
    and (
      select count(*)
      from public.listing_images
      where listing_id = old.listing_id
    ) <= 5 then
    raise exception 'O proprietate publicata trebuie sa pastreze cel putin 5 imagini.';
  end if;

  return old;
end
$$;

drop trigger if exists listing_images_published_minimum_trigger
  on public.listing_images;

create trigger listing_images_published_minimum_trigger
before delete on public.listing_images
for each row
execute function public.enforce_published_listing_image_minimum();

create unique index if not exists uq_listing_images_listing_url
  on public.listing_images(listing_id, image_url);

create or replace function public.register_listing_image(
  p_listing_id uuid,
  p_image_url text,
  p_display_order integer,
  p_alt text,
  p_expected_owner_id uuid
)
returns table (
  image_id uuid,
  image_url text,
  display_order integer
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_existing public.listing_images%rowtype;
  v_inserted public.listing_images%rowtype;
  v_image_url text := btrim(coalesce(p_image_url, ''));
begin
  if p_listing_id is null or v_image_url = '' then
    raise exception 'Datele imaginii sunt invalide.';
  end if;

  if p_alt is not null and length(p_alt) > 500 then
    raise exception 'Textul alternativ este prea lung.';
  end if;

  perform 1
  from public.listings
  where id = p_listing_id
    and (
      p_expected_owner_id is null
      or owner_id = p_expected_owner_id
    )
  for update;

  if not found then
    raise exception 'Listing-ul nu exista sau proprietarul s-a schimbat.';
  end if;

  select image.*
  into v_existing
  from public.listing_images as image
  where image.listing_id = p_listing_id
    and image.image_url = v_image_url
  limit 1;

  if found then
    return query
    select
      v_existing.id,
      v_existing.image_url,
      v_existing.display_order;
    return;
  end if;

  insert into public.listing_images (
    listing_id,
    image_url,
    display_order,
    alt
  )
  values (
    p_listing_id,
    v_image_url,
    p_display_order,
    nullif(btrim(coalesce(p_alt, '')), '')
  )
  returning * into v_inserted;

  return query
  select
    v_inserted.id,
    v_inserted.image_url,
    v_inserted.display_order;
end
$$;

create or replace function public.delete_listing_image_record(
  p_image_id uuid,
  p_expected_owner_id uuid
)
returns table (
  deleted_image_url text
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_listing_id uuid;
  v_image_url text;
  v_owner_id uuid;
begin
  select
    image.listing_id,
    image.image_url,
    listing.owner_id
  into
    v_listing_id,
    v_image_url,
    v_owner_id
  from public.listing_images as image
  join public.listings as listing
    on listing.id = image.listing_id
  where image.id = p_image_id
  for update of listing, image;

  if not found then
    raise exception 'Imaginea nu exista.';
  end if;

  if p_expected_owner_id is not null
    and v_owner_id is distinct from p_expected_owner_id then
    raise exception 'Proprietarul listarii s-a schimbat.';
  end if;

  delete from public.listing_images
  where id = p_image_id;

  return query select v_image_url;
end
$$;

create or replace function public.reorder_listing_images(
  p_listing_id uuid,
  p_image_ids uuid[],
  p_expected_owner_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_image_ids uuid[] := coalesce(p_image_ids, '{}'::uuid[]);
  v_updated integer := 0;
begin
  if p_listing_id is null
    or cardinality(v_image_ids) = 0
    or cardinality(v_image_ids) > 30 then
    raise exception 'Lista de imagini este invalida.';
  end if;

  if cardinality(v_image_ids) <> (
    select count(distinct image_id)
    from unnest(v_image_ids) as input(image_id)
  ) then
    raise exception 'Lista de imagini contine duplicate.';
  end if;

  perform 1
  from public.listings
  where id = p_listing_id
    and (
      p_expected_owner_id is null
      or owner_id = p_expected_owner_id
    )
  for update;

  if not found then
    raise exception 'Listing-ul nu exista sau proprietarul s-a schimbat.';
  end if;

  if (
    select count(*)
    from public.listing_images
    where listing_id = p_listing_id
      and id = any(v_image_ids)
  ) <> cardinality(v_image_ids) then
    raise exception 'Lista contine imagini care nu apartin proprietatii.';
  end if;

  if (
    select count(*)
    from public.listing_images
    where listing_id = p_listing_id
  ) <> cardinality(v_image_ids) then
    raise exception 'Lista trebuie sa contina toate imaginile proprietatii.';
  end if;

  update public.listing_images as image
  set display_order = (ordered.position - 1)::integer
  from unnest(v_image_ids) with ordinality
    as ordered(image_id, position)
  where image.id = ordered.image_id
    and image.listing_id = p_listing_id;

  get diagnostics v_updated = row_count;
  return v_updated;
end
$$;

create or replace function public.replace_listing_facilities(
  p_listing_id uuid,
  p_facility_ids uuid[],
  p_expected_owner_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_facility_ids uuid[] := coalesce(p_facility_ids, '{}'::uuid[]);
  v_inserted integer := 0;
begin
  if p_listing_id is null then
    raise exception 'Listing-ul este obligatoriu.';
  end if;

  if cardinality(v_facility_ids) > 50 then
    raise exception 'Au fost selectate prea multe facilitati.';
  end if;

  perform 1
  from public.listings
  where id = p_listing_id
    and (
      p_expected_owner_id is null
      or owner_id = p_expected_owner_id
    )
  for update;

  if not found then
    raise exception 'Listing-ul nu exista sau proprietarul s-a schimbat.';
  end if;

  if exists (
    select 1
    from unnest(v_facility_ids) as selected(facility_id)
    left join public.facilities as facility
      on facility.id = selected.facility_id
    where facility.id is null
  ) then
    raise exception 'Lista de facilitati contine valori invalide.';
  end if;

  delete from public.listing_facilities
  where listing_id = p_listing_id;

  insert into public.listing_facilities(listing_id, facility_id)
  select p_listing_id, selected.facility_id
  from (
    select distinct facility_id
    from unnest(v_facility_ids) as input(facility_id)
  ) as selected;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end
$$;

create or replace function public.review_listing_owner_claim(
  p_claim_id uuid,
  p_action text,
  p_reviewer text
)
returns table (
  claim_id uuid,
  listing_id uuid,
  claimant_user_id uuid,
  claim_status text,
  listing_owner_id uuid,
  reviewed_at timestamptz
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_claim public.listing_owner_claims%rowtype;
  v_owner_id uuid;
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_reviewed_at timestamptz := clock_timestamp();
begin
  if v_action not in ('approve', 'reject') then
    raise exception 'Actiunea trebuie sa fie approve sau reject.';
  end if;

  if nullif(btrim(coalesce(p_reviewer, '')), '') is null then
    raise exception 'Reviewer-ul este obligatoriu.';
  end if;

  select claim.*
  into v_claim
  from public.listing_owner_claims as claim
  where claim.id = p_claim_id
  for update;

  if not found then
    raise exception 'Claim-ul nu exista.';
  end if;

  select listing.owner_id
  into v_owner_id
  from public.listings as listing
  where listing.id = v_claim.listing_id
  for update;

  if not found then
    raise exception 'Listarea nu exista.';
  end if;

  if v_claim.status <> 'pending' then
    if (v_action = 'approve' and v_claim.status = 'approved')
      or (v_action = 'reject' and v_claim.status = 'rejected') then
      return query
      select
        v_claim.id,
        v_claim.listing_id,
        v_claim.user_id,
        v_claim.status,
        v_owner_id,
        v_claim.reviewed_at;
      return;
    end if;

    raise exception 'Claim-ul a fost deja procesat cu statusul %.', v_claim.status;
  end if;

  if v_action = 'approve' then
    if v_owner_id is not null and v_owner_id <> v_claim.user_id then
      raise exception 'Listarea are deja un alt proprietar.';
    end if;

    update public.listings
    set
      owner_id = v_claim.user_id,
      edit_token = null
    where id = v_claim.listing_id;

    update public.listing_owner_claims
    set
      status = 'approved',
      reviewed_by = btrim(p_reviewer),
      reviewed_at = v_reviewed_at
    where id = v_claim.id
    returning * into v_claim;

    update public.listing_owner_claims
    set
      status = 'rejected',
      reviewed_by = btrim(p_reviewer),
      reviewed_at = v_reviewed_at,
      notes = concat_ws(
        E'\n',
        nullif(notes, ''),
        'Respins automat: o alta revendicare a fost aprobata.'
      )
    where listing_owner_claims.listing_id = v_claim.listing_id
      and listing_owner_claims.id <> v_claim.id
      and listing_owner_claims.status = 'pending';

    v_owner_id := v_claim.user_id;
  else
    update public.listing_owner_claims
    set
      status = 'rejected',
      reviewed_by = btrim(p_reviewer),
      reviewed_at = v_reviewed_at
    where id = v_claim.id
    returning * into v_claim;
  end if;

  return query
  select
    v_claim.id,
    v_claim.listing_id,
    v_claim.user_id,
    v_claim.status,
    v_owner_id,
    v_claim.reviewed_at;
end
$$;

create or replace function public.prepare_listing_renewal_checkout(
  p_listing_id uuid,
  p_user_id uuid,
  p_idempotency_key text
)
returns table (
  payment_id uuid,
  period_id uuid,
  listing_title text,
  amount_minor integer,
  currency text,
  checkout_id text,
  checkout_url text,
  checkout_expires_at timestamptz
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_listing record;
  v_plan public.publication_plans%rowtype;
  v_existing record;
  v_period_id uuid;
  v_payment_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_checkout_expires_at timestamptz := clock_timestamp() + interval '24 hours';
  v_key text := btrim(coalesce(p_idempotency_key, ''));
begin
  if p_listing_id is null or p_user_id is null then
    raise exception 'Listing-ul si utilizatorul sunt obligatorii.';
  end if;

  if v_key = '' or length(v_key) > 200 then
    raise exception 'Cheia de idempotenta este invalida.';
  end if;

  select
    listing.id,
    listing.title,
    listing.owner_id,
    listing.publication_status,
    listing.publication_expires_at,
    listing.renewal_due_at
  into v_listing
  from public.listings as listing
  where listing.id = p_listing_id
  for update;

  if not found then
    raise exception 'Listarea nu exista.';
  end if;

  if v_listing.owner_id is null or v_listing.owner_id <> p_user_id then
    raise exception 'Utilizatorul nu este proprietarul listarii.';
  end if;

  select plan.*
  into v_plan
  from public.publication_plans as plan
  where plan.code = 'annual_standard'
    and plan.active = true;

  if not found then
    raise exception 'Planul anual nu este disponibil.';
  end if;

  select
    payment.id as payment_id,
    period.id as period_id,
    period.listing_id,
    payment.amount_minor,
    payment.currency,
    payment.provider_checkout_id,
    payment.checkout_url,
    payment.checkout_expires_at
  into v_existing
  from public.listing_publication_payments as payment
  join public.listing_publication_periods as period
    on period.id = payment.period_id
  where payment.idempotency_key = v_key
  limit 1;

  if found then
    if v_existing.listing_id <> p_listing_id then
      raise exception 'Cheia de idempotenta este deja utilizata.';
    end if;

    return query
    select
      v_existing.payment_id,
      v_existing.period_id,
      v_listing.title::text,
      v_existing.amount_minor,
      v_existing.currency,
      v_existing.provider_checkout_id,
      v_existing.checkout_url,
      v_existing.checkout_expires_at;
    return;
  end if;

  select
    payment.id as payment_id,
    period.id as period_id,
    payment.amount_minor,
    payment.currency,
    payment.provider_checkout_id,
    payment.checkout_url,
    payment.checkout_expires_at
  into v_existing
  from public.listing_publication_payments as payment
  join public.listing_publication_periods as period
    on period.id = payment.period_id
  where period.listing_id = p_listing_id
    and period.status = 'pending'
    and payment.status = 'pending'
    and (
      payment.checkout_expires_at is null
      or payment.checkout_expires_at > clock_timestamp()
    )
  order by payment.created_at desc
  limit 1;

  if found then
    return query
    select
      v_existing.payment_id,
      v_existing.period_id,
      v_listing.title::text,
      v_existing.amount_minor,
      v_existing.currency,
      v_existing.provider_checkout_id,
      v_existing.checkout_url,
      v_existing.checkout_expires_at;
    return;
  end if;

  if v_listing.publication_expires_at is null then
    raise exception 'Listarea nu are o perioada de publicare care poate fi reinnoita.';
  end if;

  if v_listing.publication_status not in ('active', 'expiring', 'expired') then
    raise exception 'Statusul listarii nu permite reinnoirea.';
  end if;

  if clock_timestamp() < coalesce(
    v_listing.renewal_due_at,
    v_listing.publication_expires_at
      - make_interval(days => v_plan.renewal_window_days)
  ) then
    raise exception 'Fereastra de reinnoire nu este deschisa.';
  end if;

  if clock_timestamp() > v_listing.publication_expires_at
    + make_interval(days => v_plan.grace_days) then
    raise exception 'Perioada de gratie pentru reinnoire a expirat.';
  end if;

  v_starts_at := greatest(clock_timestamp(), v_listing.publication_expires_at);
  v_ends_at := v_starts_at + make_interval(months => v_plan.duration_months);

  insert into public.listing_publication_periods (
    listing_id,
    starts_at,
    ends_at,
    amount,
    currency,
    status,
    notes,
    created_by,
    plan_code,
    source,
    idempotency_key
  )
  values (
    p_listing_id,
    v_starts_at,
    v_ends_at,
    v_plan.amount_minor::numeric / 100,
    v_plan.currency,
    'pending',
    'Checkout anual initiat de proprietar.',
    p_user_id::text,
    v_plan.code,
    'checkout',
    v_key
  )
  returning id into v_period_id;

  insert into public.listing_publication_payments (
    period_id,
    amount,
    amount_minor,
    currency,
    method,
    paid_at,
    status,
    provider,
    idempotency_key,
    checkout_expires_at
  )
  values (
    v_period_id,
    v_plan.amount_minor::numeric / 100,
    v_plan.amount_minor,
    v_plan.currency,
    'checkout',
    null,
    'pending',
    'stripe',
    v_key,
    v_checkout_expires_at
  )
  returning id into v_payment_id;

  return query
  select
    v_payment_id,
    v_period_id,
    v_listing.title::text,
    v_plan.amount_minor,
    v_plan.currency,
    null::text,
    null::text,
    v_checkout_expires_at;
end
$$;

create or replace function public.finalize_listing_renewal_payment(
  p_payment_id uuid,
  p_provider_checkout_id text,
  p_provider_payment_id text,
  p_amount_minor integer,
  p_currency text
)
returns table (
  payment_id uuid,
  period_id uuid,
  listing_id uuid,
  publication_expires_at timestamptz,
  publication_status text
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_payment record;
  v_now timestamptz := clock_timestamp();
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_currency text := upper(btrim(coalesce(p_currency, '')));
  v_provider_checkout_id text := btrim(coalesce(p_provider_checkout_id, ''));
  v_provider_payment_id text := btrim(coalesce(p_provider_payment_id, ''));
begin
  if p_payment_id is null then
    raise exception 'Payment-ul este obligatoriu.';
  end if;

  if v_provider_checkout_id = '' then
    raise exception 'Identificatorul checkout-ului este obligatoriu.';
  end if;

  if v_provider_payment_id = '' then
    raise exception 'Identificatorul platii providerului este obligatoriu.';
  end if;

  if p_amount_minor is null or p_amount_minor < 0 then
    raise exception 'Suma platita este invalida.';
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Moneda este invalida.';
  end if;

  select
    payment.id as payment_id,
    payment.period_id,
    payment.amount_minor,
    payment.currency,
    payment.status as payment_status,
    payment.provider,
    payment.provider_checkout_id,
    payment.provider_payment_id,
    period.listing_id,
    period.plan_code,
    listing.publication_expires_at as current_expires_at,
    plan.duration_months,
    plan.renewal_window_days
  into v_payment
  from public.listing_publication_payments as payment
  join public.listing_publication_periods as period
    on period.id = payment.period_id
  join public.listings as listing
    on listing.id = period.listing_id
  join public.publication_plans as plan
    on plan.code = period.plan_code
  where payment.id = p_payment_id
  for update of payment, period, listing;

  if not found then
    raise exception 'Payment-ul nu exista.';
  end if;

  if v_payment.provider <> 'stripe' then
    raise exception 'Providerul payment-ului nu este Stripe.';
  end if;

  if v_payment.provider_checkout_id is not null
    and v_payment.provider_checkout_id <> v_provider_checkout_id then
    raise exception 'Checkout-ul Stripe nu corespunde payment-ului.';
  end if;

  if v_payment.amount_minor <> p_amount_minor
    or upper(v_payment.currency) <> v_currency then
    raise exception 'Suma sau moneda nu corespunde checkout-ului.';
  end if;

  if v_payment.payment_status = 'paid' then
    if v_payment.provider_checkout_id is distinct from v_provider_checkout_id
      or v_payment.provider_payment_id is distinct from v_provider_payment_id then
      raise exception 'Payment-ul a fost finalizat cu alt identificator.';
    end if;

    return query
    select
      payment.id,
      period.id,
      listing.id,
      listing.publication_expires_at,
      listing.publication_status
    from public.listing_publication_payments as payment
    join public.listing_publication_periods as period
      on period.id = payment.period_id
    join public.listings as listing
      on listing.id = period.listing_id
    where payment.id = p_payment_id;
    return;
  end if;

  if v_payment.payment_status not in ('pending', 'failed', 'cancelled') then
    raise exception 'Payment-ul nu poate fi finalizat din statusul %.',
      v_payment.payment_status;
  end if;

  if exists (
    select 1
    from public.listing_publication_payments as other_payment
    where other_payment.provider = 'stripe'
      and other_payment.provider_payment_id = v_provider_payment_id
      and other_payment.id <> p_payment_id
  ) then
    raise exception 'Plata providerului a fost deja utilizata.';
  end if;

  v_starts_at := greatest(
    v_now,
    coalesce(v_payment.current_expires_at, v_now)
  );
  v_ends_at := v_starts_at
    + make_interval(months => v_payment.duration_months);

  update public.listing_publication_payments
  set
    status = 'paid',
    provider_checkout_id = v_provider_checkout_id,
    provider_payment_id = v_provider_payment_id,
    reference = coalesce(reference, v_provider_payment_id),
    paid_at = coalesce(paid_at, v_now)
  where id = p_payment_id;

  update public.listing_publication_periods
  set
    starts_at = v_starts_at,
    ends_at = v_ends_at,
    status = 'active'
  where id = v_payment.period_id;

  update public.listings
  set
    is_published = true,
    published_at = coalesce(published_at, v_starts_at),
    publication_expires_at = v_ends_at,
    renewal_due_at = v_ends_at
      - make_interval(days => v_payment.renewal_window_days),
    publication_status = 'active'
  where id = v_payment.listing_id;

  return query
  select
    payment.id,
    period.id,
    listing.id,
    listing.publication_expires_at,
    listing.publication_status
  from public.listing_publication_payments as payment
  join public.listing_publication_periods as period
    on period.id = payment.period_id
  join public.listings as listing
    on listing.id = period.listing_id
  where payment.id = p_payment_id;
end
$$;

create or replace function public.create_manual_listing_renewal(
  p_listing_id uuid,
  p_amount numeric,
  p_currency text,
  p_method text,
  p_reference text,
  p_notes text,
  p_created_by text,
  p_idempotency_key text
)
returns table (
  period_id uuid,
  payment_id uuid,
  listing_id uuid,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_listing record;
  v_plan public.publication_plans%rowtype;
  v_existing record;
  v_period_id uuid;
  v_payment_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_currency text := upper(btrim(coalesce(p_currency, '')));
  v_key text := btrim(coalesce(p_idempotency_key, ''));
begin
  if p_listing_id is null then
    raise exception 'Listing-ul este obligatoriu.';
  end if;

  if p_amount is null or p_amount < 0 then
    raise exception 'Suma este invalida.';
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Moneda este invalida.';
  end if;

  if v_key = '' or length(v_key) > 200 then
    raise exception 'Cheia de idempotenta este invalida.';
  end if;

  if nullif(btrim(coalesce(p_created_by, '')), '') is null then
    raise exception 'Autorul reinnoirii este obligatoriu.';
  end if;

  select
    listing.id,
    listing.publication_expires_at
  into v_listing
  from public.listings as listing
  where listing.id = p_listing_id
  for update;

  if not found then
    raise exception 'Listarea nu exista.';
  end if;

  select
    period.id as period_id,
    payment.id as payment_id,
    period.listing_id,
    period.starts_at,
    period.ends_at
  into v_existing
  from public.listing_publication_periods as period
  left join public.listing_publication_payments as payment
    on payment.period_id = period.id
    and payment.idempotency_key = v_key
  where period.idempotency_key = v_key
  limit 1;

  if found then
    if v_existing.listing_id <> p_listing_id then
      raise exception 'Cheia de idempotenta este deja utilizata.';
    end if;

    return query
    select
      v_existing.period_id,
      v_existing.payment_id,
      v_existing.listing_id,
      v_existing.starts_at,
      v_existing.ends_at;
    return;
  end if;

  select plan.*
  into v_plan
  from public.publication_plans as plan
  where plan.code = 'annual_standard'
    and plan.active = true;

  if not found then
    raise exception 'Planul anual nu este disponibil.';
  end if;

  v_starts_at := greatest(
    clock_timestamp(),
    coalesce(v_listing.publication_expires_at, clock_timestamp())
  );
  v_ends_at := v_starts_at + make_interval(months => v_plan.duration_months);

  insert into public.listing_publication_periods (
    listing_id,
    starts_at,
    ends_at,
    amount,
    currency,
    status,
    notes,
    created_by,
    plan_code,
    source,
    idempotency_key
  )
  values (
    p_listing_id,
    v_starts_at,
    v_ends_at,
    p_amount,
    v_currency,
    'active',
    nullif(btrim(coalesce(p_notes, '')), ''),
    btrim(p_created_by),
    v_plan.code,
    'manual',
    v_key
  )
  returning id into v_period_id;

  if p_amount > 0 then
    insert into public.listing_publication_payments (
      period_id,
      amount,
      amount_minor,
      currency,
      method,
      paid_at,
      reference,
      notes,
      status,
      provider,
      idempotency_key
    )
    values (
      v_period_id,
      p_amount,
      round(p_amount * 100)::integer,
      v_currency,
      nullif(btrim(coalesce(p_method, '')), ''),
      clock_timestamp(),
      nullif(btrim(coalesce(p_reference, '')), ''),
      nullif(btrim(coalesce(p_notes, '')), ''),
      'paid',
      'manual',
      v_key
    )
    returning id into v_payment_id;
  end if;

  update public.listings
  set
    is_published = true,
    published_at = coalesce(published_at, v_starts_at),
    publication_expires_at = v_ends_at,
    renewal_due_at = v_ends_at
      - make_interval(days => v_plan.renewal_window_days),
    publication_status = 'active'
  where id = p_listing_id;

  return query
  select
    v_period_id,
    v_payment_id,
    p_listing_id,
    v_starts_at,
    v_ends_at;
end
$$;

create or replace function public.sync_listing_publication_lifecycle()
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_changed integer := 0;
  v_step integer := 0;
begin
  update public.listing_publication_payments as payment
  set status = 'cancelled'
  where payment.status = 'pending'
    and payment.checkout_expires_at is not null
    and payment.checkout_expires_at <= clock_timestamp();

  get diagnostics v_step = row_count;
  v_changed := v_changed + v_step;

  update public.listing_publication_periods as period
  set status = 'cancelled'
  where period.status = 'pending'
    and exists (
      select 1
      from public.listing_publication_payments as payment
      where payment.period_id = period.id
        and payment.status = 'cancelled'
    );

  get diagnostics v_step = row_count;
  v_changed := v_changed + v_step;

  update public.listing_publication_periods as period
  set status = 'expired'
  where period.status = 'active'
    and period.ends_at <= clock_timestamp();

  get diagnostics v_step = row_count;
  v_changed := v_changed + v_step;

  with lifecycle as (
    select
      listing.id,
      listing.publication_expires_at,
      coalesce(
        listing.renewal_due_at,
        listing.publication_expires_at
          - make_interval(days => coalesce(plan.renewal_window_days, 60))
      ) as effective_renewal_due_at,
      coalesce(plan.grace_days, 14) as grace_days
    from public.listings as listing
    left join lateral (
      select publication_plan.renewal_window_days,
             publication_plan.grace_days
      from public.listing_publication_periods as period
      join public.publication_plans as publication_plan
        on publication_plan.code = period.plan_code
      where period.listing_id = listing.id
      order by period.ends_at desc
      limit 1
    ) as plan on true
    where listing.publication_status in ('active', 'expiring', 'expired')
      and listing.publication_expires_at is not null
  ),
  desired as (
    select
      lifecycle.id,
      lifecycle.effective_renewal_due_at,
      case
        when clock_timestamp() >= lifecycle.publication_expires_at
          + make_interval(days => lifecycle.grace_days)
          then 'suspended'
        when clock_timestamp() >= lifecycle.publication_expires_at
          then 'expired'
        when clock_timestamp() >= lifecycle.effective_renewal_due_at
          then 'expiring'
        else 'active'
      end as next_status,
      clock_timestamp() < lifecycle.publication_expires_at as should_remain_published
    from lifecycle
  )
  update public.listings as listing
  set
    publication_status = desired.next_status,
    renewal_due_at = desired.effective_renewal_due_at,
    is_published = case
      when desired.should_remain_published then listing.is_published
      else false
    end
  from desired
  where listing.id = desired.id
    and (
      listing.publication_status is distinct from desired.next_status
      or listing.renewal_due_at is distinct from desired.effective_renewal_due_at
      or (
        desired.should_remain_published = false
        and listing.is_published = true
      )
    );

  get diagnostics v_step = row_count;
  v_changed := v_changed + v_step;

  return v_changed;
end
$$;

alter table public.listings enable row level security;
alter table public.listing_owner_claims enable row level security;
alter table public.publication_plans enable row level security;
alter table public.listing_publication_periods enable row level security;
alter table public.listing_publication_payments enable row level security;
alter table public.publication_payment_webhook_events enable row level security;

revoke all on table public.listing_owner_claims
  from public, anon, authenticated;
revoke all on table public.publication_plans
  from public, anon, authenticated;
revoke all on table public.listing_publication_periods
  from public, anon, authenticated;
revoke all on table public.listing_publication_payments
  from public, anon, authenticated;
revoke all on table public.publication_payment_webhook_events
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.listing_owner_claims
  to service_role;
grant select, insert, update, delete
  on table public.publication_plans
  to service_role;
grant select, insert, update, delete
  on table public.listing_publication_periods
  to service_role;
grant select, insert, update, delete
  on table public.listing_publication_payments
  to service_role;
grant select, insert, update, delete
  on table public.publication_payment_webhook_events
  to service_role;
grant select, insert, update, delete
  on table public.listings
  to service_role;
grant select on table public.facilities
  to service_role;
grant select, insert, delete
  on table public.listing_facilities
  to service_role;
grant select, insert, update, delete
  on table public.listing_images
  to service_role;

drop policy if exists "Public read active publication plans"
  on public.publication_plans;

create policy "Public read active publication plans"
  on public.publication_plans
  for select
  to anon, authenticated
  using (active = true);

grant select on table public.publication_plans
  to anon, authenticated;

drop policy if exists "Public read active listings"
  on public.listings;
drop policy if exists "Anon read listings"
  on public.listings;

create policy "Public read active listings"
  on public.listings
  for select
  to anon, authenticated
  using (
    is_published = true
    and publication_status in ('active', 'expiring')
    and (
      publication_expires_at is null
      or publication_expires_at > now()
    )
  );

drop policy if exists "Public listing lifecycle guard"
  on public.listings;

create policy "Public listing lifecycle guard"
  on public.listings
  as restrictive
  for select
  to anon, authenticated
  using (
    is_published = true
    and publication_status in ('active', 'expiring')
    and (
      publication_expires_at is null
      or publication_expires_at > now()
    )
  );

drop policy if exists "Anon read images"
  on public.listing_images;
drop policy if exists "Anon read published listing images"
  on public.listing_images;
drop policy if exists "Public read active listing images"
  on public.listing_images;

create policy "Public read active listing images"
  on public.listing_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.listings as listing
      where listing.id = listing_images.listing_id
        and listing.is_published = true
        and listing.publication_status in ('active', 'expiring')
        and (
          listing.publication_expires_at is null
          or listing.publication_expires_at > now()
        )
    )
  );

drop policy if exists "Anon read listing_facilities"
  on public.listing_facilities;
drop policy if exists "Anon read published listing facilities"
  on public.listing_facilities;
drop policy if exists "Public read active listing facilities"
  on public.listing_facilities;

create policy "Public read active listing facilities"
  on public.listing_facilities
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.listings as listing
      where listing.id = listing_facilities.listing_id
        and listing.is_published = true
        and listing.publication_status in ('active', 'expiring')
        and (
          listing.publication_expires_at is null
          or listing.publication_expires_at > now()
        )
    )
  );

grant select on table public.listing_images, public.listing_facilities
  to anon, authenticated;

drop policy if exists "Anon read facilities"
  on public.facilities;
drop policy if exists "Public read facilities"
  on public.facilities;

create policy "Public read facilities"
  on public.facilities
  for select
  to anon, authenticated
  using (true);

revoke all on table public.facilities
  from anon, authenticated;
grant select on table public.facilities
  to anon, authenticated;

revoke select on table public.listings
  from anon, authenticated;

revoke select (
  edit_token,
  owner_id,
  terms_accepted,
  terms_accepted_at,
  newsletter_opt_in
) on table public.listings
  from anon, authenticated;

do $$
declare
  v_public_columns text;
begin
  select string_agg(format('%I', columns.column_name), ', ' order by columns.ordinal_position)
  into v_public_columns
  from information_schema.columns
  where columns.table_schema = 'public'
    and columns.table_name = 'listings'
    and columns.column_name not in (
      'edit_token',
      'owner_id',
      'terms_accepted',
      'terms_accepted_at',
      'newsletter_opt_in'
    );

  if v_public_columns is null then
    raise exception 'Nu au fost gasite coloane publice pentru listings.';
  end if;

  execute format(
    'grant select (%s) on table public.listings to anon, authenticated',
    v_public_columns
  );
end
$$;

update public.listings
set edit_token = encode(gen_random_bytes(24), 'hex')
where edit_token is not null
  and is_published = true
  and edit_token !~ '^[0-9a-f]{48}$';

revoke all on function public.owner_portal_touch_updated_at()
  from public, anon, authenticated;
revoke all on function public.ensure_initial_publication_period()
  from public, anon, authenticated;
revoke all on function public.enforce_listing_image_limit()
  from public, anon, authenticated;
revoke all on function public.enforce_published_listing_image_minimum()
  from public, anon, authenticated;
revoke all on function public.register_listing_image(uuid, text, integer, text, uuid)
  from public, anon, authenticated;
revoke all on function public.delete_listing_image_record(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.reorder_listing_images(uuid, uuid[], uuid)
  from public, anon, authenticated;
revoke all on function public.replace_listing_facilities(uuid, uuid[], uuid)
  from public, anon, authenticated;
revoke all on function public.review_listing_owner_claim(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.prepare_listing_renewal_checkout(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.finalize_listing_renewal_payment(uuid, text, text, integer, text)
  from public, anon, authenticated;
revoke all on function public.create_manual_listing_renewal(
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
revoke all on function public.sync_listing_publication_lifecycle()
  from public, anon, authenticated;

grant execute on function public.review_listing_owner_claim(uuid, text, text)
  to service_role;
grant execute on function public.ensure_initial_publication_period()
  to service_role;
grant execute on function public.enforce_listing_image_limit()
  to service_role;
grant execute on function public.enforce_published_listing_image_minimum()
  to service_role;
grant execute on function public.register_listing_image(uuid, text, integer, text, uuid)
  to service_role;
grant execute on function public.delete_listing_image_record(uuid, uuid)
  to service_role;
grant execute on function public.reorder_listing_images(uuid, uuid[], uuid)
  to service_role;
grant execute on function public.replace_listing_facilities(uuid, uuid[], uuid)
  to service_role;
grant execute on function public.prepare_listing_renewal_checkout(uuid, uuid, text)
  to service_role;
grant execute on function public.finalize_listing_renewal_payment(uuid, text, text, integer, text)
  to service_role;
grant execute on function public.create_manual_listing_renewal(
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;
grant execute on function public.sync_listing_publication_lifecycle()
  to service_role;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select job.jobid
    from cron.job as job
    where job.jobname = 'listing-publication-lifecycle-hourly'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'listing-publication-lifecycle-hourly',
    '5 * * * *',
    'select public.sync_listing_publication_lifecycle();'
  );
end
$$;

commit;
