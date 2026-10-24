import sqlite3
from contextlib import contextmanager

SCHEMA = """
CREATE TABLE IF NOT EXISTS news_candidates (
 id INTEGER PRIMARY KEY, source_id TEXT NOT NULL, source_name TEXT NOT NULL,
 title TEXT NOT NULL, url TEXT NOT NULL UNIQUE, published_date TEXT,
 suggested_category TEXT, matched_keyword_groups_json TEXT NOT NULL DEFAULT '[]',
 snippet TEXT NOT NULL DEFAULT '{}', body_text TEXT NOT NULL DEFAULT '',
 processing_status TEXT NOT NULL DEFAULT 'pending', fetch_status TEXT NOT NULL DEFAULT 'pending',
 fetch_error TEXT NOT NULL DEFAULT '', body_fetched_at TEXT,
 first_collected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_collected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at TEXT NOT NULL DEFAULT (datetime('now','+7 days'))
);
CREATE INDEX IF NOT EXISTS idx_candidates_source ON news_candidates(source_id, fetch_status, expires_at);
CREATE TABLE IF NOT EXISTS articles (
 id INTEGER PRIMARY KEY, category TEXT NOT NULL, entity TEXT NOT NULL,
 published_date TEXT NOT NULL, source TEXT NOT NULL, title TEXT NOT NULL,
 url TEXT NOT NULL UNIQUE, summary TEXT NOT NULL, tags_json TEXT NOT NULL DEFAULT '[]',
 review_status TEXT NOT NULL DEFAULT 'published', is_sample INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(published_date DESC);
CREATE TABLE IF NOT EXISTS collection_runs (
 id INTEGER PRIMARY KEY, source_id TEXT NOT NULL, source_name TEXT NOT NULL,
 run_status TEXT NOT NULL DEFAULT 'running', started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 finished_at TEXT, found_count INTEGER DEFAULT 0, saved_count INTEGER DEFAULT 0, error_message TEXT
);
CREATE TABLE IF NOT EXISTS monitor_control (
 id INTEGER PRIMARY KEY CHECK(id=1), pause_day TEXT NOT NULL DEFAULT '',
 last_tick TEXT, last_message TEXT NOT NULL DEFAULT '',
 lock_token TEXT NOT NULL DEFAULT '', lock_until REAL NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO monitor_control(id) VALUES(1);
CREATE TABLE IF NOT EXISTS monitor_jobs (
 job_key TEXT PRIMARY KEY, run_day TEXT NOT NULL, kind TEXT NOT NULL,
 source_id TEXT NOT NULL, article_id INTEGER, status TEXT NOT NULL,
 message TEXT NOT NULL DEFAULT '', started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_day ON monitor_jobs(run_day, source_id);
"""


class Database:
    def __init__(self, path):
        self.path = path

    @contextmanager
    def connect(self):
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def initialize(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.executescript(SCHEMA)

    def all(self, sql, args=()):
        with self.connect() as db:
            return [dict(row) for row in db.execute(sql, args).fetchall()]

    def first(self, sql, args=()):
        rows = self.all(sql, args)
        return rows[0] if rows else None

    def execute(self, sql, args=()):
        with self.connect() as db:
            return db.execute(sql, args).lastrowid
