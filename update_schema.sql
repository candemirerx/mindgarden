-- Add view_state column to gardens table
ALTER TABLE gardens ADD COLUMN IF NOT EXISTS view_state jsonb DEFAULT '{"x": 0, "y": 0, "zoom": 1}';

-- Add is_expanded column to nodes table
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS is_expanded boolean DEFAULT true;

-- Add node_type column to nodes table (auto, branch, leaf)
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS node_type text DEFAULT 'auto';

-- Add color column to nodes table (kullanıcının seçtiği dal rengi)
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS color text;

-- Add is_pruned column to nodes table (budanmış not; silinmez, soluk gösterilir)
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS is_pruned boolean NOT NULL DEFAULT false;

-- Soft-delete tombstones used by Google Drive cross-device sync
ALTER TABLE gardens ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Sync queries filter by owner/garden and deleted state
CREATE INDEX IF NOT EXISTS gardens_user_deleted_idx ON gardens(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS nodes_garden_deleted_idx ON nodes(garden_id, deleted_at);