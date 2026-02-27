-- Add website info fields to published_apps for SEO/social sharing
ALTER TABLE published_apps 
ADD COLUMN IF NOT EXISTS favicon_url TEXT,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN published_apps.favicon_url IS 'URL to the favicon image';
COMMENT ON COLUMN published_apps.meta_title IS 'Custom meta title for SEO (overrides app name)';
COMMENT ON COLUMN published_apps.meta_description IS 'Meta description for SEO and social sharing';
COMMENT ON COLUMN published_apps.og_image_url IS 'Open Graph image URL for social sharing';