/*
  # GitHub Integration

  1. Database Changes
    - Add github_access_token to profiles table
    - Create repositories table to store fetched GitHub repos
    - Add indexes for better performance

  2. New Tables
    - `repositories`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `github_id` (bigint, GitHub repo ID)
      - `name` (text, repository name)
      - `full_name` (text, owner/repo)
      - `description` (text)
      - `html_url` (text, GitHub URL)
      - `clone_url` (text)
      - `language` (text, primary language)
      - `stargazers_count` (integer)
      - `forks_count` (integer)
      - `is_private` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `synced_at` (timestamp)

  3. Security
    - Enable RLS on repositories table
    - Add policies for users to manage their own repositories
*/

-- Add GitHub access token to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'github_access_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN github_access_token text;
  END IF;
END $$;

-- Create repositories table
CREATE TABLE IF NOT EXISTS repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  github_id bigint NOT NULL,
  name text NOT NULL,
  full_name text NOT NULL,
  description text,
  html_url text NOT NULL,
  clone_url text NOT NULL,
  language text,
  stargazers_count integer DEFAULT 0,
  forks_count integer DEFAULT 0,
  is_private boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  synced_at timestamptz DEFAULT now(),
  UNIQUE(user_id, github_id)
);

-- Enable RLS on repositories table
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- Repositories policies
CREATE POLICY "Users can read own repositories"
  ON repositories
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own repositories"
  ON repositories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own repositories"
  ON repositories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own repositories"
  ON repositories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add updated_at trigger for repositories
CREATE TRIGGER update_repositories_updated_at
  BEFORE UPDATE ON repositories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS repositories_user_id_idx ON repositories(user_id);
CREATE INDEX IF NOT EXISTS repositories_github_id_idx ON repositories(github_id);
CREATE INDEX IF NOT EXISTS repositories_language_idx ON repositories(language);
CREATE INDEX IF NOT EXISTS repositories_synced_at_idx ON repositories(synced_at);