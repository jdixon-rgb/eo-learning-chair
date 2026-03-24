-- Add forum moderator flag to chapter_members
ALTER TABLE chapter_members ADD COLUMN IF NOT EXISTS is_forum_moderator BOOLEAN DEFAULT false;
