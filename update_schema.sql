-- Add view_state column to gardens table
ALTER TABLE gardens ADD COLUMN IF NOT EXISTS view_state jsonb DEFAULT '{"x": 0, "y": 0, "zoom": 1}';

-- Add is_expanded column to nodes table
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS is_expanded boolean DEFAULT true;
