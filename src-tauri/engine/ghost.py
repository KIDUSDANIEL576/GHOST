import subprocess
import sys
import threading
import os
import time
import sqlite3

GHOST_DIR = ".ghost"
DB_PATH = os.path.join(GHOST_DIR, "ledger.db")
ENGINE_DIR = os.path.dirname(__file__)


def start_watcher():
    """Run watcher.py in a background thread."""
    subprocess.run([sys.executable, os.path.join(ENGINE_DIR, "watcher.py")])


def init_database():
    """Initialize .ghost directory and database."""
    os.makedirs(GHOST_DIR, exist_ok=True)
    schema_path = os.path.join(ENGINE_DIR, "schema.sql")

    if not os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        with open(schema_path) as f:
            conn.executescript(f.read())
        conn.close()
        print(f"[Ghost] Database initialized: {DB_PATH}")
    else:
        print(f"[Ghost] Database exists: {DB_PATH}")


def run(dev_command: str):
    """
    Main entry point.
    Wraps a dev command with Ghost monitoring.
    Usage: python ghost.py "npm run dev"
    """
    print(f"[Ghost] Starting with command: {dev_command}")

    # Step 1: Initialize database
    init_database()

    # Step 2: Start file watcher in background thread
    watcher_thread = threading.Thread(target=start_watcher, daemon=True, name="Watcher")
    watcher_thread.start()
    print("[Ghost] File watcher started")

    # Step 3: Pipe dev command through crash parser
    os.environ["GHOST_CLI_CONTEXT"] = "1"

    dev_process = subprocess.Popen(
        dev_command,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    crash_parser = subprocess.Popen(
        [sys.executable, os.path.join(ENGINE_DIR, "crash_parser.py")],
        stdin=subprocess.PIPE,
        text=True,
        bufsize=1
    )

    print(f"[Ghost] Monitoring started. Press Ctrl+C to stop.")

    try:
        for line in dev_process.stdout:
            sys.stdout.write(line)
            sys.stdout.flush()
            try:
                crash_parser.stdin.write(line)
                crash_parser.stdin.flush()
            except BrokenPipeError:
                pass
    except KeyboardInterrupt:
        print("\n[Ghost] Stopping...")
    finally:
        dev_process.terminate()
        crash_parser.terminate()
        print("[Ghost] Stopped.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ghost.py '<dev-command>'")
        print("Example: python ghost.py 'npm run dev'")
        sys.exit(1)
    run(sys.argv[1])
