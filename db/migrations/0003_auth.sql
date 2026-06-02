-- users table
CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt        TEXT NOT NULL,
    iterations  INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- sessions table
CREATE TABLE IF NOT EXISTS sessions (
    session_id  TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at  TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- add owner_id to projects
ALTER TABLE projects ADD COLUMN owner_id TEXT REFERENCES users(id);


-- seed demo user (password: demo1234)
INSERT OR IGNORE INTO users (id, email, password_hash, salt, iterations)
VALUES (
  'usr_demo',
  'demo@watchtower.dev',
  'c97031fb20e811fc70af3311c0d5c595279d1a01cac81923c45d6c34b8aa2acc',
  '758a8abf06cf2d47732cf7091bd5d94d',
  100000
);

-- backfill demo project owner
UPDATE projects SET owner_id = 'usr_demo' WHERE project_id = 'wt_demo';
