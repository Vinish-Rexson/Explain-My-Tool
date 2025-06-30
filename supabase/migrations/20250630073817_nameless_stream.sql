/*
  # Create demo-assets storage bucket

  1. New Storage Bucket
    - `demo-assets` bucket for storing generated audio and video files
    - Public access enabled for demo sharing
    - 100MB file size limit
    - Restricted to audio/video/image MIME types

  2. Security Policies
    - Authenticated users can upload files
    - Users can manage their own files
    - Public read access for sharing demos
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

-- Policy: Allow authenticated users to upload files to demo-assets bucket
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to demo-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'demo-assets');

-- Policy: Allow authenticated users to read their own files
CREATE POLICY IF NOT EXISTS "Allow users to read own demo assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'demo-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow public read access to completed demo files
CREATE POLICY IF NOT EXISTS "Allow public read access to demo assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'demo-assets');

-- Policy: Allow authenticated users to update their own files
CREATE POLICY IF NOT EXISTS "Allow users to update own demo assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'demo-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow authenticated users to delete their own files
CREATE POLICY IF NOT EXISTS "Allow users to delete own demo assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'demo-assets' AND auth.uid()::text = (storage.foldername(name))[1]);