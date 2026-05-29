import os
import sys
import time
import sqlite3
import threading
from pathlib import Path

GHOST_DIR = ".ghost"
DB_PATH = os.path.join(GHOST_DIR, "ledger.db")
DEBOUNCE_SEC = 0.5
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")

IGNORE = {
    'node_modules', '.git', '.ghost', '.next', '__pycache__',
    'dist', 'build', '.cache', 'target', '.turbo'
}

IGNORE_EXTENSIONS = {'.log', '.tmp', '.lock', '.db', '.db-shm', '.db-wal'}


def init_db():
    """Initialize database from schema. Returns True if successful."""
    os.makedirs(GHOST_DIR, exist_ok=True)
    os.makedirs(os.path.join(GHOST_DIR, "snapshots"), exist_ok=True)
    os.makedirs(os.path.join(GHOST_DIR, "emergency"), exist_ok=True)

    if not os.path.exists(SCHEMA_PATH):
        print(f"[Ghost/Watcher] ERROR: schema.sql not found at {SCHEMA_PATH}")
        return False

    for attempt in range(3):
        try:
            conn = sqlite3.connect(DB_PATH, timeout=10)
            with open(SCHEMA_PATH) as f:
                conn.executescript(f.read())
            conn.close()
            print(f"[Ghost/Watcher] Database ready: {DB_PATH}")
            return True
        except Exception as e:
            print(f"[Ghost/Watcher] DB init attempt {attempt+1} failed: {e}")
            time.sleep(0.5)

    print("[Ghost/Watcher] All DB init attempts failed")
    return False


def log_mutation(file_path: str, timestamp: float, file_size: int):
    """Write a file mutation to the database."""
    change_type = "TRACKED" if os.environ.get("GHOST_CLI_CONTEXT") == "1" else "UNTRACKED"

    for attempt in range(3):
        try:
            conn = sqlite3.connect(DB_PATH, timeout=5)
            conn.execute(
                "INSERT INTO file_mutations (timestamp, file_path, change_type, file_size) VALUES (?, ?, ?, ?)",
                (timestamp, file_path, change_type, file_size)
            )
            conn.commit()
            conn.close()
            return True
        except sqlite3.OperationalError as e:
            if "locked" in str(e) and attempt < 2:
                time.sleep(0.1 * (attempt + 1))
                continue
            print(f"[Ghost/Watcher] DB write error: {e}")
            _emergency_log(file_path, timestamp, change_type)
            return False
        except Exception as e:
            print(f"[Ghost/Watcher] Unexpected error: {e}")
            return False


def _emergency_log(file_path: str, timestamp: float, change_type: str):
    """Fallback: write to JSON file if SQLite fails."""
    import json
    emergency_file = os.path.join(GHOST_DIR, "emergency", f"mutation_{int(timestamp)}.json")
    try:
        with open(emergency_file, 'w') as f:
            json.dump({'path': file_path, 'timestamp': timestamp, 'type': change_type}, f)
    except Exception:
        pass  # Emergency log also failed — just move on


def should_ignore(path: str) -> bool:
    """Return True if this file/path should be ignored."""
    parts = Path(path).parts
    if any(p in IGNORE for p in parts):
        return True
    ext = Path(path).suffix.lower()
    if ext in IGNORE_EXTENSIONS:
        return True
    if os.path.basename(path).startswith('.'):
        return True
    return False


# ─────────────────────────────────────────────
# PRIMARY WATCHER: Event-based (watchdog)
# ─────────────────────────────────────────────

def start_watchdog_watcher():
    """
    PRIMARY watcher using watchdog library.
    Returns True if started, False if watchdog not available.
    """
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler

        last_events = {}
        lock = threading.Lock()

        class Handler(FileSystemEventHandler):
            def _handle(self, path: str):
                if should_ignore(path):
                    return
                now = time.time()
                with lock:
                    if path in last_events and (now - last_events[path]) < DEBOUNCE_SEC:
                        return
                    last_events[path] = now
                try:
                    rel = os.path.relpath(path, os.getcwd())
                    size = os.path.getsize(path) if os.path.exists(path) else 0
                    if log_mutation(rel, now, size):
                        print(f"[Ghost/Watcher] Tracked: {rel}")
                except Exception as e:
                    print(f"[Ghost/Watcher] Handle error: {e}")

            def on_modified(self, event):
                if not event.is_directory:
                    self._handle(event.src_path)

            def on_created(self, event):
                if not event.is_directory:
                    self._handle(event.src_path)

        observer = Observer()
        observer.schedule(Handler(), path=os.getcwd(), recursive=True)
        observer.start()
        print("[Ghost/Watcher] Primary watchdog watcher started")
        return observer

    except ImportError:
        print("[Ghost/Watcher] watchdog not installed. Using fallback.")
        return None
    except Exception as e:
        print(f"[Ghost/Watcher] Primary watcher failed: {e}")
        return None


# ─────────────────────────────────────────────
# FALLBACK WATCHER: Polling-based (always works)
# ─────────────────────────────────────────────

def start_polling_watcher():
    """
    FALLBACK watcher — scans filesystem every 2 seconds.
    Slower than watchdog but works on any system.
    """
    print("[Ghost/Watcher] Starting fallback polling watcher (2s interval)")

    known_states = {}  # path -> (mtime, size)
    running = [True]

    def poll():
        while running[0]:
            try:
                for root, dirs, files in os.walk(os.getcwd()):
                    dirs[:] = [d for d in dirs if d not in IGNORE and not d.startswith('.')]
                    for file in files:
                        full = os.path.join(root, file)
                        if should_ignore(full):
                            continue
                        try:
                            stat = os.stat(full)
                            state = (stat.st_mtime, stat.st_size)
                            if full in known_states and known_states[full] != state:
                                rel = os.path.relpath(full, os.getcwd())
                                log_mutation(rel, time.time(), stat.st_size)
                                print(f"[Ghost/FallbackWatcher] Changed: {rel}")
                            known_states[full] = state
                        except OSError:
                            continue
            except Exception as e:
                print(f"[Ghost/FallbackWatcher] Poll error: {e}")
            time.sleep(2)

    thread = threading.Thread(target=poll, daemon=True, name="PollingWatcher")
    thread.start()
    return running  # Return reference so caller can stop it


# ─────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────

def run():
    """Initialize DB and start watcher with automatic fallback."""
    if not init_db():
        print("[Ghost/Watcher] FATAL: Could not initialize database")
        sys.exit(1)

    # Try primary watcher first
    observer = start_watchdog_watcher()

    if observer is None:
        # Primary failed — use fallback
        start_polling_watcher()
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("[Ghost/Watcher] Stopped.")
    else:
        # Primary running — monitor its health
        try:
            while True:
                time.sleep(1)
                if not observer.is_alive():
                    print("[Ghost/Watcher] Primary watcher died. Starting fallback.")
                    observer.stop()
                    start_polling_watcher()
                    while True:
                        time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
            observer.join()
            print("[Ghost/Watcher] Stopped.")


if __name__ == "__main__":
    run()
