import os
import sys
import time
import json
import shutil
import sqlite3
import hashlib
import threading
from typing import Optional, List, Dict

GHOST_DIR = ".ghost"
DB_PATH = os.path.join(GHOST_DIR, "ledger.db")
SNAPSHOTS_DIR = os.path.join(GHOST_DIR, "snapshots")

IGNORE_DIRS = {
    'node_modules', '.git', '.ghost', '.next', '__pycache__',
    'dist', 'build', '.cache', 'target', '.turbo'
}
IGNORE_EXTS = {'.log', '.tmp', '.db', '.db-shm', '.db-wal', '.lock'}
MAX_FILE_MB = 10
MAX_FILES = 500


# ─────────────────────────────────────────────
# CREATE SNAPSHOT
# ─────────────────────────────────────────────

def create_snapshot(label: str = "auto", trigger: str = "auto") -> Dict:
    """
    Create a snapshot of the current project.
    Returns: { success, snapshot_uuid, files_captured, error }
    """
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
    snapshot_id = str(int(time.time() * 1000))
    snapshot_dir = os.path.join(SNAPSHOTS_DIR, snapshot_id)
    os.makedirs(snapshot_dir, exist_ok=True)

    files = collect_files()
    if not files:
        return {'success': False, 'snapshot_uuid': None, 'files_captured': 0,
                'error': 'No files found'}

    manifest = []
    captured = 0

    for rel_path in files[:MAX_FILES]:
        result = copy_file(rel_path, snapshot_dir)
        if result:
            manifest.append(result)
            captured += 1

    if captured == 0:
        shutil.rmtree(snapshot_dir, ignore_errors=True)
        return {'success': False, 'snapshot_uuid': None, 'files_captured': 0,
                'error': 'No files captured'}

    # Write manifest
    with open(os.path.join(snapshot_dir, '_manifest.json'), 'w') as f:
        json.dump({'label': label, 'trigger': trigger,
                   'timestamp': time.time(), 'files': manifest}, f, indent=2)

    # Store in DB
    store_metadata(snapshot_id, label, trigger, captured, manifest)

    print(f"✅ Snapshot '{label}': {captured} files ({snapshot_id})")
    return {'success': True, 'snapshot_uuid': snapshot_id,
            'files_captured': captured, 'error': None}


def copy_file(rel_path: str, snapshot_dir: str) -> Optional[Dict]:
    """Copy one file into snapshot directory. Returns manifest entry or None."""
    try:
        if not os.path.exists(rel_path):
            return None
        size = os.path.getsize(rel_path)
        if size > MAX_FILE_MB * 1024 * 1024:
            return None

        dest = os.path.join(snapshot_dir, rel_path)
        os.makedirs(os.path.dirname(dest) or '.', exist_ok=True)
        shutil.copy2(rel_path, dest)

        with open(rel_path, 'rb') as f:
            checksum = hashlib.sha256(f.read()).hexdigest()[:12]

        return {'path': rel_path, 'size': size, 'checksum': checksum}
    except Exception as e:
        print(f"[Snapshot] Could not copy {rel_path}: {e}")
        return None


def collect_files() -> List[str]:
    """Collect all project files respecting ignore rules."""
    files = []
    for root, dirs, filenames in os.walk(os.getcwd()):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith('.')]
        for filename in filenames:
            if any(filename.endswith(e) for e in IGNORE_EXTS):
                continue
            if filename.startswith('.'):
                continue
            full = os.path.join(root, filename)
            try:
                files.append(os.path.relpath(full, os.getcwd()))
            except ValueError:
                continue
    return files


def store_metadata(snapshot_id: str, label: str, trigger: str,
                   file_count: int, manifest: List[Dict]):
    """Store snapshot metadata in SQLite."""
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        conn.execute(
            """INSERT INTO snapshots
               (snapshot_uuid, timestamp, label, trigger_type, file_count, manifest_json)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (snapshot_id, time.time(), label, trigger, file_count, json.dumps(manifest))
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[Snapshot] DB store failed: {e}")


# ─────────────────────────────────────────────
# RESTORE SNAPSHOT (4 fallback layers)
# ─────────────────────────────────────────────

def restore_snapshot(snapshot_identifier: str) -> Dict:
    """
    Restore files from a snapshot.
    Tries 4 methods in sequence.
    Returns: { success, files_restored, files_failed, method_used, error }
    """
    # Resolve to a snapshot directory
    snap_dir = resolve_snapshot(snapshot_identifier)

    if not snap_dir:
        return {'success': False, 'files_restored': 0, 'files_failed': 0,
                'method_used': 'none', 'error': f'Snapshot not found: {snapshot_identifier}'}

    # Method 1: Full copy
    result = method_full_copy(snap_dir)
    if result['success']:
        record_restore(snapshot_identifier, result)
        print(f"✅ Restored using {result['method_used']}: {result['files_restored']} files")
        return result

    print(f"⚠️  Method 1 failed: {result['error']}. Trying method 2...")

    # Method 2: Copy with individual error handling
    result = method_resilient_copy(snap_dir)
    if result['success']:
        record_restore(snapshot_identifier, result)
        print(f"✅ Restored using {result['method_used']}: {result['files_restored']} files")
        return result

    print(f"⚠️  Method 2 failed. Trying emergency restore...")

    # Method 3: Emergency partial restore (never crashes, always returns something)
    result = method_emergency(snap_dir)
    record_restore(snapshot_identifier, result)
    return result


def method_full_copy(snap_dir: str) -> Dict:
    """Method 1: Fast full copy."""
    restored, failed = [], []
    try:
        for root, dirs, files in os.walk(snap_dir):
            files = [f for f in files if not f.startswith('_')]
            for file in files:
                src = os.path.join(root, file)
                rel = os.path.relpath(src, snap_dir)
                dest = rel

                try:
                    if os.path.exists(dest):
                        shutil.copy2(dest, dest + '.ghost_bak')
                    os.makedirs(os.path.dirname(dest) or '.', exist_ok=True)
                    shutil.copy2(src, dest)
                    restored.append(rel)
                except Exception as e:
                    failed.append(rel)

        return {'success': len(restored) > 0 and len(failed) == 0,
                'files_restored': len(restored), 'files_failed': len(failed),
                'method_used': 'full_copy', 'error': None if not failed else f'{len(failed)} files failed'}
    except Exception as e:
        return {'success': False, 'files_restored': 0, 'files_failed': 0,
                'method_used': 'full_copy', 'error': str(e)}


def method_resilient_copy(snap_dir: str) -> Dict:
    """Method 2: Copy files one by one, skip failures."""
    restored, failed = [], []

    for root, dirs, files in os.walk(snap_dir):
        files = [f for f in files if not f.startswith('_')]
        for file in files:
            src = os.path.join(root, file)
            rel = os.path.relpath(src, snap_dir)
            dest = rel
            try:
                os.makedirs(os.path.dirname(dest) or '.', exist_ok=True)
                shutil.copy2(src, dest)
                restored.append(rel)
            except Exception:
                failed.append(rel)

    return {'success': len(restored) > 0,
            'files_restored': len(restored), 'files_failed': len(failed),
            'method_used': 'resilient_copy',
            'error': None if restored else 'No files restored'}


def method_emergency(snap_dir: str) -> Dict:
    """
    Method 3: Emergency restore.
    Tries NEAREST snapshot if target is corrupted.
    ALWAYS returns a result, never raises.
    """
    # If target is gone, find nearest
    if not os.path.exists(snap_dir):
        available = sorted([
            d for d in os.listdir(SNAPSHOTS_DIR)
            if os.path.isdir(os.path.join(SNAPSHOTS_DIR, d))
        ], reverse=True)

        if not available:
            return {'success': False, 'files_restored': 0, 'files_failed': 0,
                    'method_used': 'emergency', 'error': 'No snapshots available'}

        snap_dir = os.path.join(SNAPSHOTS_DIR, available[0])
        print(f"[Snapshot] Emergency: using {available[0]}")

    restored, failed = [], []
    for root, dirs, files in os.walk(snap_dir):
        files = [f for f in files if not f.startswith('_')]
        for file in files:
            src = os.path.join(root, file)
            rel = os.path.relpath(src, snap_dir)
            try:
                os.makedirs(os.path.dirname(rel) or '.', exist_ok=True)
                shutil.copy2(src, rel)
                restored.append(rel)
            except Exception:
                failed.append(rel)

    return {'success': len(restored) > 0,
            'files_restored': len(restored), 'files_failed': len(failed),
            'method_used': 'emergency', 'error': None}


def resolve_snapshot(identifier: str) -> Optional[str]:
    """Resolve snapshot identifier to a directory path."""
    if identifier == 'last-working':
        return find_last_working()

    # Try direct path
    direct = os.path.join(SNAPSHOTS_DIR, identifier)
    if os.path.exists(direct):
        return direct

    # Try DB lookup
    try:
        conn = sqlite3.connect(DB_PATH, timeout=5)
        row = conn.execute(
            "SELECT snapshot_uuid FROM snapshots WHERE snapshot_uuid = ? OR id = ?",
            (identifier, identifier)
        ).fetchone()
        conn.close()
        if row:
            path = os.path.join(SNAPSHOTS_DIR, row[0])
            return path if os.path.exists(path) else None
    except Exception:
        pass

    return None


def find_last_working() -> Optional[str]:
    """Find last snapshot before first unresolved crash."""
    try:
        conn = sqlite3.connect(DB_PATH, timeout=5)
        row = conn.execute(
            "SELECT MIN(timestamp) FROM runtime_crashes WHERE resolved = 0"
        ).fetchone()

        if not row or not row[0]:
            # No crashes — return most recent snapshot
            row = conn.execute(
                "SELECT snapshot_uuid FROM snapshots ORDER BY timestamp DESC LIMIT 1"
            ).fetchone()
            conn.close()
            if row:
                return os.path.join(SNAPSHOTS_DIR, row[0])
            return None

        first_crash = row[0]
        row = conn.execute(
            "SELECT snapshot_uuid FROM snapshots WHERE timestamp < ? AND is_valid = 1 "
            "ORDER BY timestamp DESC LIMIT 1",
            (first_crash,)
        ).fetchone()
        conn.close()

        if row:
            path = os.path.join(SNAPSHOTS_DIR, row[0])
            return path if os.path.exists(path) else None
        return None

    except Exception as e:
        print(f"[Snapshot] find_last_working error: {e}")
        return None


def record_restore(snapshot_id: str, result: Dict):
    """Write restore record to DB."""
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        snap = conn.execute(
            "SELECT id FROM snapshots WHERE snapshot_uuid = ?", (str(snapshot_id),)
        ).fetchone()
        snap_db_id = snap[0] if snap else 1

        conn.execute(
            """INSERT INTO restores
               (snapshot_id, timestamp, restore_type, files_restored, files_failed, success)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (snap_db_id, time.time(), result.get('method_used', 'unknown'),
             result.get('files_restored', 0), result.get('files_failed', 0),
             1 if result.get('success') else 0)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[Snapshot] record_restore error: {e}")


def get_timeline() -> List[Dict]:
    """Return all snapshots for UI display."""
    try:
        conn = sqlite3.connect(DB_PATH, timeout=5)
        rows = conn.execute(
            """SELECT snapshot_uuid, timestamp, label, file_count, trigger_type, is_valid
               FROM snapshots ORDER BY timestamp DESC LIMIT 100"""
        ).fetchall()
        conn.close()

        result = []
        for r in rows:
            from datetime import datetime
            result.append({
                'id': r[0], 'timestamp': r[1],
                'label': r[2], 'fileCount': r[3],
                'triggerType': r[4], 'isValid': bool(r[5]),
                'time': datetime.fromtimestamp(r[1]).strftime('%H:%M:%S')
            })
        return result
    except Exception as e:
        print(f"[Snapshot] get_timeline error: {e}")
        return []


# ─────────────────────────────────────────────
# CLI INTERFACE
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Ghost Snapshot Manager')
    sub = parser.add_subparsers(dest='cmd')

    c = sub.add_parser('create')
    c.add_argument('--label', default='auto')
    c.add_argument('--trigger', default='manual')

    r = sub.add_parser('restore')
    r.add_argument('--id', required=True)

    sub.add_parser('timeline')
    sub.add_parser('last-working')
    sub.add_parser('timeline-json')

    args = parser.parse_args()

    if args.cmd == 'create':
        result = create_snapshot(args.label, args.trigger)
        print(json.dumps(result))

    elif args.cmd == 'restore':
        result = restore_snapshot(args.id)
        print(json.dumps(result))

    elif args.cmd == 'last-working':
        result = restore_snapshot('last-working')
        print(json.dumps(result))

    elif args.cmd == 'timeline':
        for s in get_timeline():
            print(f"{s['time']} — {s['label']} ({s['id']}) [{s['fileCount']} files]")

    elif args.cmd == 'timeline-json':
        print(json.dumps(get_timeline()))

    else:
        parser.print_help()
