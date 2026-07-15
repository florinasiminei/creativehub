-- Backoffice leads, listing linkage, and annual publication lifecycle.
-- Idempotent migration for Supabase/Postgres.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  property_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  judet TEXT,
  city TEXT,
  sat TEXT,
  source TEXT DEFAULT 'cold_call',
  status TEXT NOT NULL DEFAULT 'nou' CHECK (
    status IN (
      'nou',
      'contactat',
      'interesat',
      'cerere_deplasare',
      'convertit',
      'neinteresat',
      'inactiv'
    )
  ),
  follow_up_at TIMESTAMPTZ,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES listings(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS property_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS judet TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sat TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'cold_call';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'nou';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE leads
SET property_name = COALESCE(NULLIF(property_name, ''), 'Lead fara nume')
WHERE property_name IS NULL OR btrim(property_name) = '';

ALTER TABLE leads ALTER COLUMN property_name SET NOT NULL;
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'nou';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_status_check'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_status_check CHECK (
        status IN (
          'nou',
          'contactat',
          'interesat',
          'cerere_deplasare',
          'convertit',
          'neinteresat',
          'inactiv'
        )
      );
  END IF;
END $$;

ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_requests_lead_id_fkey'
  ) THEN
    ALTER TABLE booking_requests
      ADD CONSTRAINT booking_requests_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS publication_expires_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS renewal_due_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS publication_status TEXT DEFAULT 'draft';

UPDATE listings
SET publication_status = CASE
  WHEN COALESCE(is_published, FALSE) IS TRUE
    AND publication_expires_at IS NOT NULL
    AND publication_expires_at < now()
    THEN 'expired'
  WHEN COALESCE(is_published, FALSE) IS TRUE THEN 'active'
  WHEN publication_status IS NULL THEN 'draft'
  ELSE publication_status
END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_publication_status_check'
  ) THEN
    ALTER TABLE listings
      ADD CONSTRAINT listings_publication_status_check CHECK (
        publication_status IN ('draft', 'active', 'expiring', 'expired', 'suspended')
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS listing_publication_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  amount NUMERIC,
  currency TEXT DEFAULT 'RON',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (starts_at < ends_at)
);

CREATE TABLE IF NOT EXISTS listing_publication_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES listing_publication_periods(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'RON',
  method TEXT,
  paid_at TIMESTAMPTZ DEFAULT now(),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_listing_id ON leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_location ON leads(judet, city);
CREATE INDEX IF NOT EXISTS idx_booking_requests_lead_id ON booking_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_listings_publication_status ON listings(publication_status);
CREATE INDEX IF NOT EXISTS idx_listings_publication_expires_at ON listings(publication_expires_at);
CREATE INDEX IF NOT EXISTS idx_listing_publication_periods_listing_id ON listing_publication_periods(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_publication_payments_period_id ON listing_publication_payments(period_id);

CREATE OR REPLACE FUNCTION backoffice_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS leads_updated_at_trigger ON leads;
CREATE TRIGGER leads_updated_at_trigger
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION backoffice_touch_updated_at();

DROP TRIGGER IF EXISTS listing_publication_periods_updated_at_trigger ON listing_publication_periods;
CREATE TRIGGER listing_publication_periods_updated_at_trigger
BEFORE UPDATE ON listing_publication_periods
FOR EACH ROW
EXECUTE FUNCTION backoffice_touch_updated_at();

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_payments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE leads FROM anon, authenticated;
REVOKE ALL ON TABLE listing_publication_periods FROM anon, authenticated;
REVOKE ALL ON TABLE listing_publication_payments FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE leads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE listing_publication_periods TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE listing_publication_payments TO service_role;

COMMIT;
