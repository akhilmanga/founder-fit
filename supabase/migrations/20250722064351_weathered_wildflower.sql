/*
  # Create reports table for tracking generated compatibility reports

  1. New Tables
    - `reports`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable, foreign key to auth.users)
      - `session_id` (text, unique session identifier)
      - `report_data` (jsonb, stores the complete compatibility report)
      - `created_at` (timestamp with timezone)

  2. Security
    - Enable RLS on `reports` table
    - Add policy for service role access (backend operations)
    - Add policy for authenticated users to read their own reports (future use)

  3. Indexes
    - Index on session_id for fast lookups
    - Index on user_id for user-specific queries
    - Index on created_at for time-based analytics
*/

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  report_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy for service role (backend operations)
CREATE POLICY "Service role can manage all reports"
  ON reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for authenticated users to read their own reports (for future use)
CREATE POLICY "Users can read own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reports_session_id ON reports(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Create a unique constraint on session_id to prevent duplicate reports
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_session_id_unique ON reports(session_id);