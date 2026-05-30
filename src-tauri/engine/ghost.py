import subprocess, sys, threading, os, time, sqlite3

GHOST_DIR  = ".ghost"
DB_PATH    = os.path.join(GHOST_DIR, "ledger.db")
ENGINE_DIR = os.path.dirname(__file__)


def init():
    os.makedirs(GHOST_DIR, exist_ok=True)
    if not os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        conn.executescript(open(os.path.join(ENGINE_DIR,"schema.sql")).read())
        conn.close()
    print(f"[Ghost] Ready. Data stays local: {os.path.abspath(DB_PATH)}")


def run(cmd):
    print(f"[Ghost] Monitoring: {cmd}")
    init()
    threading.Thread(
        target=lambda: subprocess.run([sys.executable, os.path.join(ENGINE_DIR,"watcher.py")]),
        daemon=True, name="Watcher").start()
    os.environ["GHOST_CLI_CONTEXT"] = "1"
    dev = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    parser = subprocess.Popen([sys.executable, os.path.join(ENGINE_DIR,"crash_parser.py")], stdin=subprocess.PIPE, text=True, bufsize=1)
    print("[Ghost] Running. Ctrl+C to stop.")
    try:
        for line in dev.stdout:
            sys.stdout.write(line); sys.stdout.flush()
            try: parser.stdin.write(line); parser.stdin.flush()
            except BrokenPipeError: pass
    except KeyboardInterrupt: pass
    finally: dev.terminate(); parser.terminate(); print("[Ghost] Stopped.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ghost.py '<command>'"); sys.exit(1)
    run(sys.argv[1])
