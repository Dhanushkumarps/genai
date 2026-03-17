-- Add Telegram identity fields to the users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

-- Index for fast lookups by telegram_id
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
