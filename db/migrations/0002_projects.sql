CREATE TABLE IF NOT EXISTS projects (
    project_id  TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO projects (project_id, name)
VALUES ('we_demo', 'WatchTower Demo');