-- Add topic column to threads table for storing detected topics
-- This allows threads to be classified by subject matter for better context

ALTER TABLE threads ADD COLUMN IF NOT EXISTS topic VARCHAR(255) NULL;

-- Add comment explaining the column
COMMENT ON COLUMN threads.topic IS 'Topic detected from the first message during thread creation. Used to provide context in chat prompts. NULL if no topics configured or detection failed.';
