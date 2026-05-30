import os, sys, time, sqlite3, threading
from pathlib import Path

GHOST_DIR   = ".ghost"
DB_PATH     = os.path.join(GHOST_DIR, "ledger.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")
DEBOUNCE    = 0.5
IGNORE_DIRS = {'node_modules','.git','.ghost','.next','__pycache__','dist','build','target'}
IGNORE_EXTS = {'.log','.tmp','.db','.db-shm','.db-wal','.lock'}


def init_db():
    os.makedirs(GHOST_DIR, exist_ok=True)
    os.makedirs(os.path.join(GHOST_DIR, "snapshots"), exist_ok=True)
    os.makedirs(os.path.join(GHOST_DIR, "emergency"), exist_ok=True)
    for attempt in range(3):
        try:
            conn = sqlite3.connect(DB_PATH, timeout=10)
            conn.executescript(open(SCHEMA_PATH).read())
            conn.close()
            print(f"[Ghost/DB] Ready: {DB_PATH}")
            return True
        except Exception as e:
            print(f"[Ghost/DB] Attempt {attempt+1} failed: {e}")
            time.sleep(0.5)
    return False


def log_mutation(rel_path, size=0):
    ctype = "TRACKED" if os.environ.get("GHOST_CLI_CONTEXT") == "1" else "UNTRACKED"
    for attempt in range(3):
        try:
            conn = sqlite3.connect(DB_PATH, timeout=5)
            conn.execute(
                "INSERT INTO file_mutations (timestamp,file_path,change_type,file_size) VALUES(?,?,?,?)",
                (time.time(), rel_path, ctype, size))
            conn.commit(); conn.close()
            return
        except sqlite3.OperationalError as e:
            if "locked" in str(e) and attempt < 2: time.sleep(0.1*(attempt+1)); continue
            _emergency(rel_path, ctype)
        except Exception: break


def _emergency(path, ctype):
    import json
    d = os.path.join(GHOST_DIR, "emergency")
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d,f"m_{int(time.time())}.json"),'w') as f:
        json.dump({'path':path,'ts':time.time(),'type':ctype},f)


def ignore(path):
    parts = Path(path).parts
    if any(p in IGNORE_DIRS for p in parts): return True
    if Path(path).suffix.lower() in IGNORE_EXTS: return True
    if Path(path).name.startswith('.'): return True
    return False


def start_watchdog():
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler
        last, lock = {}, threading.Lock()

        class H(FileSystemEventHandler):
            def _h(self, path):
                if ignore(path): return
                now = time.time()
                with lock:
                    if path in last and now-last[path] < DEBOUNCE: return
                    last[path] = now
                try:
                    rel = os.path.relpath(path, os.getcwd())
                    sz  = os.path.getsize(path) if os.path.exists(path) else 0
                    log_mutation(rel, sz)
                    print(f"[Ghost/Watch] {rel}")
                except Exception as e: print(f"[Ghost/Watch] Error: {e}")
            def on_modified(self,e):
                if not e.is_directory: self._h(e.src_path)
            def on_created(self,e):
                if not e.is_directory: self._h(e.src_path)

        obs = Observer()
        obs.schedule(H(), path=os.getcwd(), recursive=True)
        obs.start()
        print("[Ghost/Watch] Primary watcher (watchdog) started")
        return obs
    except ImportError:
        print("[Ghost/Watch] watchdog not found. Using fallback.")
        return None
    except Exception as e:
        print(f"[Ghost/Watch] Primary failed: {e}"); return None


def start_polling():
    print("[Ghost/Watch] Fallback polling watcher started (2s)")
    known = {}
    def poll():
        while True:
            try:
                for root,dirs,files in os.walk(os.getcwd()):
                    dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith('.')]
                    for f in files:
                        fp = os.path.join(root,f)
                        if ignore(fp): continue
                        try:
                            s = os.stat(fp)
                            st = (s.st_mtime, s.st_size)
                            if fp in known and known[fp] != st:
                                log_mutation(os.path.relpath(fp,os.getcwd()), s.st_size)
                            known[fp] = st
                        except OSError: continue
            except Exception as e: print(f"[Ghost/Poll] Error: {e}")
            time.sleep(2)
    threading.Thread(target=poll, daemon=True, name="Poll").start()


def run():
    if not init_db(): print("[Ghost] FATAL: DB init failed"); sys.exit(1)
    obs = start_watchdog()
    if obs is None:
        start_polling()
        try:
            while True: time.sleep(1)
        except KeyboardInterrupt: pass
    else:
        try:
            while True:
                time.sleep(1)
                if not obs.is_alive():
                    print("[Ghost] Primary watcher died. Starting fallback.")
                    obs.stop(); start_polling()
                    while True: time.sleep(1)
        except KeyboardInterrupt:
            obs.stop(); obs.join()
    print("[Ghost/Watch] Stopped.")

if __name__ == "__main__": run()
