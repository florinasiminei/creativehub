-- Add Google Maps location fields to listings table
-- This migration adds latitude, longitude, and search_radius columns

ALTER TABLE listings ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS search_radius INTEGER DEFAULT 5;

-- Create an index on coordinates for efficient location-based queries
CREATE INDEX IF NOT EXISTS idx_listings_coordinates ON listings(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
