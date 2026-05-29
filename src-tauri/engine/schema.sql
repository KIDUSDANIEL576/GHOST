PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS file_mutations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL DEFAULT 'default',
    timestamp   REAL NOT NULL,
    file_path   TEXT NOT NULL,
    change_type TEXT NOT NULL CHECK(change_type IN ('TRACKED','UNTRACKED','DELETED','CREATED')),
    file_size   INTEGER DEFAULT 0,
    created_at  REAL NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS runtime_crashes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id    TEXT NOT NULL DEFAULT 'default',
    timestamp     REAL NOT NULL,
    error_type    TEXT NOT NULL DEFAULT 'Unknown',
    error_message TEXT NOT NULL,
    stack_trace   TEXT NOT NULL DEFAULT '',
    failing_file  TEXT,
    failing_line  INTEGER,
    severity      TEXT NOT NULL DEFAULT 'ERROR',
    resolved      INTEGER NOT NULL DEFAULT 0,
    resolved_at   REAL,
    created_at    REAL NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_uuid   TEXT NOT NULL UNIQUE,
    session_id      TEXT NOT NULL DEFAULT 'default',
    timestamp       REAL NOT NULL,
    label           TEXT NOT NULL,
    trigger_type    TEXT NOT NULL DEFAULT 'auto',
    file_count      INTEGER NOT NULL DEFAULT 0,
    total_size_kb   REAL DEFAULT 0,
    manifest_json   TEXT NOT NULL DEFAULT '[]',
    checksum        TEXT,
    is_valid        INTEGER NOT NULL DEFAULT 1,
    created_at      REAL NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS restores (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id     INTEGER NOT NULL REFERENCES snapshots(id),
    timestamp       REAL NOT NULL,
    restore_type    TEXT NOT NULL DEFAULT 'full',
    files_restored  INTEGER NOT NULL DEFAULT 0,
    files_failed    INTEGER NOT NULL DEFAULT 0,
    duration_ms     INTEGER,
    success         INTEGER NOT NULL DEFAULT 0,
    error_message   TEXT,
    created_at      REAL NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS health_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp     REAL NOT NULL DEFAULT (strftime('%s','now')),
    component     TEXT NOT NULL,
    status        TEXT NOT NULL,
    message       TEXT,
    fallback_used INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_mutations_timestamp ON file_mutations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mutations_file ON file_mutations(file_path);
CREATE INDEX IF NOT EXISTS idx_crashes_timestamp ON runtime_crashes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON snapshots(timestamp DESC);

CREATE TRIGGER IF NOT EXISTS auto_resolve_crashes
    AFTER INSERT ON restores
    WHEN NEW.success = 1
BEGIN
    UPDATE runtime_crashes
    SET resolved = 1, resolved_at = NEW.timestamp
    WHERE timestamp < NEW.timestamp AND resolved = 0;
END;
