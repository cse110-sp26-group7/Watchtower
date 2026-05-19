DROP TABLE IF EXISTS events;
CREATE TABLE IF NOT EXISTS events (
    -- Common envelope
    event_id    TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL,
    event_type  TEXT NOT NULL
                CHECK (event_type IN ('error','performance','feedback','deploy')),
    timestamp   TEXT NOT NULL,
    environment TEXT NOT NULL
                CHECK (environment IN ('dev','staging','prod')),
    deploy_id   TEXT,

    -- Browser Context
    url        TEXT,
    user_agent TEXT,
    session_id TEXT,

    -- Server enrichments (received_at supplied by Worker per batch)
    received_at TEXT NOT NULL,
    country     TEXT,

    -- Error Event
    message  TEXT,
    name     TEXT,
    stack    TEXT,
    handled  INTEGER CHECK (handled IN (0, 1)),
    filename TEXT,
    lineno   INTEGER,
    colno    INTEGER,

    -- Performance Event
    metric_name   TEXT CHECK (metric_name IN ('LCP','FCP','TTFB','CLS','INP')),
    metric_value  REAL,
    metric_rating TEXT CHECK (metric_rating IN ('good','needs-improvement','poor')),

    -- Feedback Event
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
    comment         TEXT,

    -- Deploy Event
    version TEXT
);

CREATE INDEX idx_events_project_ts
    ON events (project_id, timestamp DESC, event_id);

CREATE INDEX idx_events_project_type_ts
    ON events (project_id, event_type, timestamp DESC, event_id);
