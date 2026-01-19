-- Migration: set created_at to now() for listing_images rows that have NULL
-- Use with care in production. This ensures NOT NULL constraint is satisfied if created_at is missing.

UPDATE listing_images SET created_at = now() WHERE created_at IS NULL;
