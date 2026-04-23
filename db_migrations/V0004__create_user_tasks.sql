CREATE TABLE IF NOT EXISTS user_tasks (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_id BIGINT NOT NULL,
    text TEXT NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    time TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'low',
    category TEXT NOT NULL DEFAULT 'personal',
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, task_id)
);
