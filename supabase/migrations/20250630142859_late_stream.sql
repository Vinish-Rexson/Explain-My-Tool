/*
  # Add Tavus Video ID to Projects Table

  1. Changes
    - Add `tavus_video_id` column to `projects` table for tracking Tavus video generation
    - This allows us to poll the Tavus API for video completion status

  2. Security
    - No changes to RLS policies needed
    - Column is optional and only used for tracking
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'tavus_video_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN tavus_video_id text;
  END IF;
END $$;