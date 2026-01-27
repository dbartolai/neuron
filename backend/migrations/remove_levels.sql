-- Migration to remove level system and make level_idx nullable

-- Make level_idx nullable in level_defaults table
ALTER TABLE level_defaults ALTER COLUMN level_idx DROP NOT NULL;

-- Add unique constraint to ensure one default per mode (where level_idx IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_level_defaults_thread_type_null 
ON level_defaults(thread_type) 
WHERE level_idx IS NULL;

-- Remove level columns from courses table
ALTER TABLE courses DROP COLUMN IF EXISTS writing_level;
ALTER TABLE courses DROP COLUMN IF EXISTS testing_level;
ALTER TABLE courses DROP COLUMN IF EXISTS debugging_level;
