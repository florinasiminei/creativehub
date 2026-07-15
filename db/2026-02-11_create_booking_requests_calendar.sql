-- Calendar Deplasari - cereri programare vizite foto/video
-- Idempotent migration for Supabase/Postgres.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS calendar_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judet TEXT NOT NULL,
  city TEXT,
  available_after_time TEXT DEFAULT '10:00',
  min_distance_km INTEGER,
  max_distance_km INTEGER,
  max_visits_per_day INTEGER,
  requires_manual_approval BOOLEAN DEFAULT TRUE,
  allow_weekends BOOLEAN DEFAULT FALSE,
  travel_cost_supplement NUMERIC DEFAULT 0,
  internal_notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calendar_rules ADD COLUMN IF NOT EXISTS min_distance_km INTEGER;
ALTER TABLE calendar_rules ADD COLUMN IF NOT EXISTS max_distance_km INTEGER;
ALTER TABLE calendar_rules ADD COLUMN IF NOT EXISTS available_after_time TEXT DEFAULT '10:00';
ALTER TABLE calendar_rules ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE calendar_rules ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'calendar_rules'
      AND column_name = 'notes'
  ) THEN
    UPDATE calendar_rules
    SET internal_notes = COALESCE(internal_notes, notes)
    WHERE internal_notes IS NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  property_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  judet TEXT NOT NULL,
  city TEXT,
  sat TEXT,
  preferred_date DATE NOT NULL,
  external_links JSONB,
  notes TEXT,
  status TEXT DEFAULT 'cerere_primita' CHECK (
    status IN (
      'cerere_primita',
      'in_verificare',
      'confirmata',
      'reprogramare_propusa',
      'anulata',
      'finalizata'
    )
  ),
  applied_rule_id UUID REFERENCES calendar_rules(id) ON DELETE SET NULL,
  confirmed_date DATE,
  proposed_date DATE,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS lead_id UUID;
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES listings(id) ON DELETE SET NULL;
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS applied_rule_id UUID REFERENCES calendar_rules(id) ON DELETE SET NULL;
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS confirmed_date DATE;
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS proposed_date DATE;
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_requests'
      AND column_name = 'external_links'
      AND data_type <> 'jsonb'
  ) THEN
    ALTER TABLE booking_requests
      ALTER COLUMN external_links TYPE JSONB
      USING CASE
        WHEN external_links IS NULL OR btrim(external_links::text) = '' THEN NULL
        ELSE external_links::jsonb
      END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS calendar_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key BOOLEAN NOT NULL DEFAULT TRUE,
  available_days TEXT[] DEFAULT '{"Monday","Tuesday","Wednesday","Thursday","Friday"}',
  available_after_time TEXT DEFAULT '10:00',
  available_hours TEXT[] DEFAULT '{"10:00"}',
  max_visits_per_day INTEGER DEFAULT 1 CHECK (max_visits_per_day BETWEEN 1 AND 20),
  min_days_before_booking INTEGER DEFAULT 3 CHECK (min_days_before_booking BETWEEN 1 AND 30),
  auto_confirm BOOLEAN DEFAULT FALSE,
  manual_confirmation_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calendar_settings ADD COLUMN IF NOT EXISTS singleton_key BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE calendar_settings ADD COLUMN IF NOT EXISTS available_after_time TEXT DEFAULT '10:00';
UPDATE calendar_settings
SET available_after_time = COALESCE(
  available_after_time,
  NULLIF((available_hours)[1], ''),
  '10:00'
);
ALTER TABLE calendar_settings ALTER COLUMN max_visits_per_day SET DEFAULT 1;

WITH ranked_settings AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS row_number
  FROM calendar_settings
)
UPDATE calendar_settings
SET singleton_key = ranked_settings.row_number = 1
FROM ranked_settings
WHERE calendar_settings.id = ranked_settings.id;

CREATE UNIQUE INDEX IF NOT EXISTS calendar_settings_singleton_idx
  ON calendar_settings (singleton_key)
  WHERE singleton_key IS TRUE;

CREATE TABLE IF NOT EXISTS calendar_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  blocked_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (start_date <= end_date)
);

CREATE TABLE IF NOT EXISTS calendar_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id UUID NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
  notification_type TEXT CHECK (notification_type IN ('new_request', 'status_change', 'reminder')),
  sent_via TEXT[] DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT now(),
  email_sent_to TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_lead_id ON booking_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_preferred_date ON booking_requests(preferred_date);
CREATE INDEX IF NOT EXISTS idx_booking_requests_confirmed_date ON booking_requests(confirmed_date);
CREATE INDEX IF NOT EXISTS idx_booking_requests_judet_city ON booking_requests(judet, city);
CREATE INDEX IF NOT EXISTS idx_calendar_rules_judet_city_active ON calendar_rules(judet, city, active);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_dates ON calendar_blocks(start_date, end_date);

CREATE OR REPLACE FUNCTION calendar_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS booking_requests_updated_at_trigger ON booking_requests;
CREATE TRIGGER booking_requests_updated_at_trigger
BEFORE UPDATE ON booking_requests
FOR EACH ROW
EXECUTE FUNCTION calendar_touch_updated_at();

DROP TRIGGER IF EXISTS calendar_settings_updated_at_trigger ON calendar_settings;
CREATE TRIGGER calendar_settings_updated_at_trigger
BEFORE UPDATE ON calendar_settings
FOR EACH ROW
EXECUTE FUNCTION calendar_touch_updated_at();

DROP TRIGGER IF EXISTS calendar_rules_updated_at_trigger ON calendar_rules;
CREATE TRIGGER calendar_rules_updated_at_trigger
BEFORE UPDATE ON calendar_rules
FOR EACH ROW
EXECUTE FUNCTION calendar_touch_updated_at();

INSERT INTO calendar_settings (
  singleton_key,
  available_days,
  available_after_time,
  available_hours,
  max_visits_per_day,
  min_days_before_booking,
  auto_confirm,
  manual_confirmation_required
)
VALUES (
  TRUE,
  '{"Monday","Tuesday","Wednesday","Thursday","Friday"}',
  '10:00',
  '{"10:00"}',
  1,
  3,
  FALSE,
  TRUE
)
ON CONFLICT DO NOTHING;

ALTER TABLE calendar_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE calendar_rules FROM anon, authenticated;
REVOKE ALL ON TABLE booking_requests FROM anon, authenticated;
REVOKE ALL ON TABLE calendar_settings FROM anon, authenticated;
REVOKE ALL ON TABLE calendar_blocks FROM anon, authenticated;
REVOKE ALL ON TABLE calendar_notifications FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE calendar_rules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE booking_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE calendar_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE calendar_blocks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE calendar_notifications TO service_role;

COMMIT;
