CREATE TABLE IF NOT EXISTS user_devices (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    fcm_token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS user_reminders (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    reminder_id TEXT NOT NULL,
    title TEXT NOT NULL,
    time TEXT NOT NULL,
    repeat TEXT NOT NULL DEFAULT 'daily',
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, reminder_id)
);
