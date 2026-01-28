-- Migration: add display_order to listings for manual ordering
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS display_order integer;

CREATE INDEX IF NOT EXISTS listings_display_order_idx
  ON listings (display_order);
