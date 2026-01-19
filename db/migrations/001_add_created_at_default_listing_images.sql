-- Migration: ensure listing_images.created_at has a default of now()
-- Safe: will only set default if none exists

DO $$
DECLARE
    existing_default text;
BEGIN
    SELECT pg_get_expr(adbin, adrelid) INTO existing_default
    FROM pg_attrdef
    JOIN pg_class ON pg_attrdef.adrelid = pg_class.oid
    JOIN pg_attribute ON pg_attribute.attrelid = pg_class.oid AND pg_attribute.attnum = pg_attrdef.adnum
    WHERE pg_class.relname = 'listing_images' AND pg_attribute.attname = 'created_at'
    LIMIT 1;

    IF existing_default IS NULL THEN
        RAISE NOTICE 'Setting default for listing_images.created_at to now()';
        ALTER TABLE listing_images ALTER COLUMN created_at SET DEFAULT now();
    ELSE
        RAISE NOTICE 'listing_images.created_at already has a default: %', existing_default;
    END IF;
END$$;
