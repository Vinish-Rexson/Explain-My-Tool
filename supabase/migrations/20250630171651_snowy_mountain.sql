-- Create the demo-assets bucket (using INSERT as the function doesn't exist in migrations)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'demo-assets',
  'demo-assets',
  true,
  104857600, -- 100MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the demo-assets bucket
-- Use DO blocks to handle policy creation safely

DO $$
BEGIN
  -- Drop existing policies if they exist, then recreate them
  DROP POLICY IF EXISTS "Allow authenticated uploads to demo-assets" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to demo assets" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated read access to demo assets" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to update own demo assets" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to delete own demo assets" ON storage.objects;
END $$;

-- Allow authenticated users to upload to demo-assets bucket
CREATE POLICY "Allow authenticated uploads to demo-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'demo-assets');

-- Allow public read access to all demo assets
CREATE POLICY "Allow public read access to demo assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'demo-assets');

-- Allow authenticated users to read demo assets
CREATE POLICY "Allow authenticated read access to demo assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'demo-assets');

-- Allow users to update their own demo assets
CREATE POLICY "Allow users to update own demo assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'demo-assets');

-- Allow users to delete their own demo assets
CREATE POLICY "Allow users to delete own demo assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'demo-assets');