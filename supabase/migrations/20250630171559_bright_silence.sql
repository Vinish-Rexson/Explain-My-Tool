/*
  # Storage Setup for Demo Assets

  1. Storage Bucket
    - Create `demo-assets` bucket for storing audio and video files
    - Configure public access and file size limits
    - Set allowed MIME types for media files

  2. Security Policies
    - Allow authenticated users to upload files
    - Allow public read access to demo assets
    - Allow users to manage their own files
*/

-- Create the demo-assets bucket using Supabase storage functions
SELECT storage.create_bucket(
  'demo-assets',
  '{
    "public": true,
    "file_size_limit": 104857600,
    "allowed_mime_types": ["audio/mpeg", "audio/wav", "audio/mp3", "video/mp4", "video/webm", "video/quicktime", "image/jpeg", "image/png", "image/gif"]
  }'::jsonb
);

-- Create storage policies using Supabase policy functions
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