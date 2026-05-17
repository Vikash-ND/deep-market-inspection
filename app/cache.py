import sqlite3
import json
import time

DB_PATH = "cache.db"
CACHE_EXPIRY = 300  # seconds (5 minutes)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cache (
            key TEXT PRIMARY KEY,
            value TEXT,
            timestamp REAL
        )
    """)
    conn.commit()
    conn.close()

def get_cache(key: str):
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute(
        "SELECT value, timestamp FROM cache WHERE key = ?", (key,)
    ).fetchone()
    conn.close()

    if row:
        value, timestamp = row
        if time.time() - timestamp < CACHE_EXPIRY:
            return json.loads(value)
    return None

def set_cache(key: str, value):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT OR REPLACE INTO cache (key, value, timestamp) VALUES (?, ?, ?)",
        (key, json.dumps(value), time.time())
    )
    conn.commit()
    conn.close()