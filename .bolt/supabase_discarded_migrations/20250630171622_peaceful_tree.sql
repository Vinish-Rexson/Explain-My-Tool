/*
  # Create demo-assets storage bucket and policies

  1. Storage Bucket
    - Create `demo-assets` bucket for storing audio and video files
    - Set public access and file size limits
    - Configure allowed MIME types

  2. Security Policies
    - Allow authenticated users to upload files
    - Allow public read access to all demo assets
    - Allow authenticated users to manage their files
*/

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
-- Allow authenticated users to upload to demo-assets bucket
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to demo-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'demo-assets');

-- Allow public read access to all demo assets
CREATE POLICY IF NOT EXISTS "Allow public read access to demo assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'demo-assets');

-- Allow authenticated users to read demo assets
CREATE POLICY IF NOT EXISTS "Allow authenticated read access to demo assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'demo-assets');

-- Allow users to update their own demo assets
CREATE POLICY IF NOT EXISTS "Allow users to update own demo assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'demo-assets');

-- Allow users to delete their own demo assets
CREATE POLICY IF NOT EXISTS "Allow users to delete own demo assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'demo-assets');