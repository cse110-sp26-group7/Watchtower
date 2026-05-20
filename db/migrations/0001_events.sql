DROP TABLE IF EXISTS events;
CREATE TABLE IF NOT EXISTS events (
    -- Common envelope
    event_id    TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL,
    event_type  TEXT NOT NULL
                CHECK (event_type IN ('error','performance','feedback','deploy','pageview')),
    timestamp   TEXT NOT NULL,
    environment TEXT NOT NULL
                CHECK (environment IN ('dev','staging','prod')),
    deploy_id   TEXT,

    -- Server enrichments (set by the ingest worker)
    received_at TEXT NOT NULL,
    country     TEXT,

    -- Type-specific fields as JSON; shape per event-schema-draft.md
    payload TEXT NOT NULL
);

CREATE INDEX idx_events_project_ts
    ON events (project_id, timestamp DESC, event_id);

CREATE INDEX idx_events_project_type_ts
    ON events (project_id, event_type, timestamp DESC, event_id);
