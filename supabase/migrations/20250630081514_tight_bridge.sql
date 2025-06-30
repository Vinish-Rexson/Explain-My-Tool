/*
  # Add conversation sessions table

  1. New Tables
    - `conversation_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `project_id` (uuid, foreign key to projects)
      - `tavus_session_id` (text, optional)
      - `status` (text, enum: initializing, active, ended, error)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `ended_at` (timestamp, optional)

  2. Security
    - Enable RLS on `conversation_sessions` table
    - Add policies for users to manage their own conversation sessions
*/

CREATE TABLE IF NOT EXISTS conversation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tavus_session_id text,
  status text NOT NULL DEFAULT 'initializing' CHECK (status IN ('initializing', 'active', 'ended', 'error')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- Users can create their own conversation sessions
CREATE POLICY "Users can create own conversation sessions"
  ON conversation_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own conversation sessions
CREATE POLICY "Users can read own conversation sessions"
  ON conversation_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own conversation sessions
CREATE POLICY "Users can update own conversation sessions"
  ON conversation_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own conversation sessions
CREATE POLICY "Users can delete own conversation sessions"
  ON conversation_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_conversation_sessions_updated_at
  BEFORE UPDATE ON conversation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS conversation_sessions_user_id_idx ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS conversation_sessions_project_id_idx ON conversation_sessions(project_id);
CREATE INDEX IF NOT EXISTS conversation_sessions_status_idx ON conversation_sessions(status);