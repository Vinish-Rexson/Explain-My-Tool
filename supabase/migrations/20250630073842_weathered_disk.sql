/*
  # Create demo-assets storage bucket

  1. New Storage Bucket
    - `demo-assets` bucket for storing generated audio, video, and image files
    - Public read access enabled
    - 100MB file size limit
    - Supports audio, video, and image MIME types

  2. Security Policies
    - Authenticated users can upload files
    - Public read access for all files
    - Authenticated users can manage their own files
*/

-- Create the demo-assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'demo-assets',
  'demo-assets', 
  true,
  104857600, -- 100MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated uploads to demo-assets" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to read own demo assets" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to demo assets" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to update own demo assets" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to delete own demo assets" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Policy: Allow authenticated users to upload files to demo-assets bucket
CREATE POLICY "Allow authenticated uploads to demo-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'demo-assets');

-- Policy: Allow public read access to all demo assets
CREATE POLICY "Allow public read access to demo assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'demo-assets');

-- Policy: Allow authenticated users to update files in demo-assets bucket
CREATE POLICY "Allow users to update demo assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'demo-assets');

-- Policy: Allow authenticated users to delete files in demo-assets bucket
CREATE POLICY "Allow users to delete demo assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'demo-assets');