/*
  # Add Tavus Video ID Column

  1. Changes
    - Add `tavus_video_id` column to `projects` table to store Tavus video IDs
    - This allows us to track and poll Tavus videos for completion status

  2. Security
    - No changes to RLS policies needed
    - Column is part of existing table with existing security
*/

-- Add tavus_video_id column to projects table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'tavus_video_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN tavus_video_id text;
  END IF;
END $$;