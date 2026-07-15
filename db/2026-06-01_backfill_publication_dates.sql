-- Backfill published_at and publication_expires_at for already-published listings.
-- published_at = created_at (the listing was published when it was created)
-- publication_expires_at = created_at + 1 year
-- publication_status = 'active' or 'expired', based on the calculated expiration date
-- renewal_due_at = publication_expires_at - 30 days

BEGIN;

UPDATE listings
SET
  published_at      = created_at,
  publication_expires_at = created_at + INTERVAL '1 year',
  renewal_due_at    = created_at + INTERVAL '1 year' - INTERVAL '30 days',
  publication_status = CASE
    WHEN created_at + INTERVAL '1 year' < now() THEN 'expired'
    ELSE 'active'
  END
WHERE is_published = true
  AND published_at IS NULL;

COMMIT;
