DROP TABLE IF EXISTS events;
CREATE TABLE IF NOT EXISTS events (
    -- Common envelope
    event_id    TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    timestamp   TEXT NOT NULL,
    environment TEXT NOT NULL,
    deploy_id   TEXT,

    -- Browswer Context
    url TEXT,
    user_agent TEXT,
    session_id TEXT,

    -- Error Event
    message  TEXT,
    name     TEXT,
    stack    TEXT,
    handled  INTEGER,
    filename TEXT,
    lineno   INTEGER,
    colno    INTEGER,

    -- Performance Event
    metric_name   TEXT,
    metric_value  REAL,
    metric_rating TEXT,

    -- Feedback Event
    feedback_rating INTEGER,
    comment         TEXT,

    -- Deploy Event
    version TEXT
);