/*
  # Storage Setup for Demo Assets

  1. Storage Bucket
    - Create demo-assets bucket for storing audio and video files
    - Configure public access and file size limits
    - Set allowed MIME types for media files

  2. Security Policies
    - Allow authenticated users to upload files
    - Allow users to read their own files
    - Allow public read access to demo assets
    - Allow users to update/delete their own files
*/

-- Create the demo-assets bucket (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'demo-assets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'demo-assets',
      'demo-assets', 
      true,
      104857600, -- 100MB limit
      ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/gif']
    );
  END IF;
END $$;

-- Enable RLS on storage objects (safe to run multiple times)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DO $$
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Allow authenticated uploads to demo-assets" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to read own demo assets" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to demo assets" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to update own demo assets" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to delete own demo assets" ON storage.objects;
END $$;

-- Create policies
CREATE POLICY "Allow authenticated uploads to demo-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'demo-assets');

CREATE POLICY "Allow users to read own demo assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'demo-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow public read access to demo assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'demo-assets');

CREATE POLICY "Allow users to update own demo assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'demo-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete own demo assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'demo-assets' AND auth.uid()::text = (storage.foldername(name))[1]);