# ================================================================
# GHOST UNIVERSAL: SNAPSHOT MANAGER
# PRIVACY: All data stored locally. No network calls. Ever.
# ================================================================

import os, sys, time, json, shutil, sqlite3, hashlib, threading, argparse
from typing import Optional, List, Dict

GHOST_DIR     = ".ghost"
DB_PATH       = os.path.join(GHOST_DIR, "ledger.db")
SNAPSHOTS_DIR = os.path.join(GHOST_DIR, "snapshots")
IGNORE_DIRS   = {'node_modules','.git','.ghost','.next','__pycache__','dist','build','target'}
IGNORE_EXTS   = {'.log','.tmp','.db','.db-shm','.db-wal','.lock'}
MAX_FILE_MB   = 10
MAX_FILES     = 500
_LOCK         = threading.Lock()


def create_snapshot(label="auto", trigger="auto"):
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
    sid     = str(int(time.time() * 1000))
    snap_d  = os.path.join(SNAPSHOTS_DIR, sid)
    os.makedirs(snap_d, exist_ok=True)
    files    = collect_files()
    if not files:
        return {'success':False,'snapshot_uuid':None,'files_captured':0,'error':'No files'}
    manifest, captured = [], 0
    for rel in files[:MAX_FILES]:
        r = copy_file(rel, snap_d)
        if r: manifest.append(r); captured += 1
    if not captured:
        shutil.rmtree(snap_d, ignore_errors=True)
        return {'success':False,'snapshot_uuid':None,'files_captured':0,'error':'No files captured'}
    with open(os.path.join(snap_d,'_manifest.json'),'w') as f:
        json.dump({'label':label,'trigger':trigger,'timestamp':time.time(),'files':manifest},f,indent=2)
    _store_meta(sid, label, trigger, captured, manifest)
    print(f"✅ Snapshot '{label}': {captured} files saved locally ({sid})")
    return {'success':True,'snapshot_uuid':sid,'files_captured':captured,'error':None}


def copy_file(rel, snap_d):
    try:
        if not os.path.exists(rel): return None
        sz = os.path.getsize(rel)
        if sz > MAX_FILE_MB * 1024 * 1024: return None
        dest = os.path.join(snap_d, rel)
        os.makedirs(os.path.dirname(dest) or '.', exist_ok=True)
        shutil.copy2(rel, dest)
        with open(rel,'rb') as f: ck = hashlib.sha256(f.read()).hexdigest()[:12]
        return {'path':rel,'size':sz,'checksum':ck}
    except: return None


def collect_files():
    files = []
    for root,dirs,fnames in os.walk(os.getcwd()):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith('.')]
        for fn in fnames:
            if any(fn.endswith(e) for e in IGNORE_EXTS): continue
            if fn.startswith('.'): continue
            try: files.append(os.path.relpath(os.path.join(root,fn), os.getcwd()))
            except ValueError: continue
    return files


def _store_meta(sid, label, trigger, count, manifest):
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        conn.execute(
            "INSERT INTO snapshots(snapshot_uuid,timestamp,label,trigger_type,file_count,manifest_json) VALUES(?,?,?,?,?,?)",
            (sid, time.time(), label, trigger, count, json.dumps(manifest)))
        conn.commit(); conn.close()
    except Exception as e: print(f"[Snapshot] Meta store error: {e}")


def restore_snapshot(identifier):
    snap_d = _resolve(identifier)
    if not snap_d:
        return {'success':False,'files_restored':0,'files_failed':0,'method_used':'none','error':f'Not found: {identifier}'}

    r = _copy_restore(snap_d, fast=True)
    if r['success']: _record(identifier, r); print(f"✅ Restored ({r['method_used']}): {r['files_restored']} files"); return r

    r = _copy_restore(snap_d, fast=False)
    if r['success']: _record(identifier, r); print(f"✅ Restored ({r['method_used']}): {r['files_restored']} files"); return r

    r = _emergency_restore(snap_d)
    _record(identifier, r); return r


def _copy_restore(snap_d, fast=True):
    restored, failed = [], []
    try:
        for root,_,files in os.walk(snap_d):
            for fn in [f for f in files if not f.startswith('_')]:
                src = os.path.join(root,fn)
                rel = os.path.relpath(src, snap_d)
                try:
                    if os.path.exists(rel): shutil.copy2(rel, rel+'.ghost_bak')
                    os.makedirs(os.path.dirname(rel) or '.', exist_ok=True)
                    shutil.copy2(src, rel)
                    restored.append(rel)
                except Exception:
                    if fast: failed.append(rel)
                    else:
                        try: shutil.copy2(src, rel); restored.append(rel)
                        except: failed.append(rel)
        method = 'full_copy' if fast else 'resilient_copy'
        return {'success':bool(restored) and (fast and not failed or not fast),
                'files_restored':len(restored),'files_failed':len(failed),
                'method_used':method,'error':None if not failed else f'{len(failed)} failed'}
    except Exception as e:
        return {'success':False,'files_restored':0,'files_failed':0,'method_used':'failed','error':str(e)}


def _emergency_restore(snap_d):
    if not os.path.exists(snap_d):
        avail = sorted([d for d in os.listdir(SNAPSHOTS_DIR) if os.path.isdir(os.path.join(SNAPSHOTS_DIR,d))],reverse=True)
        if not avail: return {'success':False,'files_restored':0,'files_failed':0,'method_used':'emergency','error':'No snapshots'}
        snap_d = os.path.join(SNAPSHOTS_DIR, avail[0])
        print(f"[Snapshot] Emergency: using nearest snapshot {avail[0]}")
    restored, failed = [], []
    for root,_,files in os.walk(snap_d):
        for fn in [f for f in files if not f.startswith('_')]:
            src = os.path.join(root,fn)
            rel = os.path.relpath(src, snap_d)
            try: os.makedirs(os.path.dirname(rel) or '.',exist_ok=True); shutil.copy2(src,rel); restored.append(rel)
            except: failed.append(rel)
    return {'success':bool(restored),'files_restored':len(restored),'files_failed':len(failed),'method_used':'emergency','error':None}


def _resolve(identifier):
    if identifier == 'last-working': return _find_last_working()
    direct = os.path.join(SNAPSHOTS_DIR, str(identifier))
    if os.path.exists(direct): return direct
    try:
        conn = sqlite3.connect(DB_PATH,timeout=5)
        row = conn.execute("SELECT snapshot_uuid FROM snapshots WHERE snapshot_uuid=? OR CAST(id AS TEXT)=?",
                          (str(identifier),str(identifier))).fetchone()
        conn.close()
        if row:
            p = os.path.join(SNAPSHOTS_DIR, row[0])
            return p if os.path.exists(p) else None
    except: pass
    return None


def _find_last_working():
    try:
        conn = sqlite3.connect(DB_PATH,timeout=5)
        row = conn.execute("SELECT MIN(timestamp) FROM runtime_crashes WHERE resolved=0").fetchone()
        if not row or not row[0]:
            row = conn.execute("SELECT snapshot_uuid FROM snapshots ORDER BY timestamp DESC LIMIT 1").fetchone()
            conn.close()
            if row:
                p = os.path.join(SNAPSHOTS_DIR,row[0]); return p if os.path.exists(p) else None
            return None
        ft = row[0]
        row = conn.execute("SELECT snapshot_uuid FROM snapshots WHERE timestamp<? AND is_valid=1 ORDER BY timestamp DESC LIMIT 1",(ft,)).fetchone()
        conn.close()
        if row:
            p = os.path.join(SNAPSHOTS_DIR,row[0]); return p if os.path.exists(p) else None
    except Exception as e: print(f"[Snapshot] find_last_working: {e}")
    return None


def _record(sid, result):
    try:
        conn = sqlite3.connect(DB_PATH,timeout=10)
        snap = conn.execute("SELECT id FROM snapshots WHERE snapshot_uuid=?",(str(sid),)).fetchone()
        conn.execute("INSERT INTO restores(snapshot_id,timestamp,restore_type,files_restored,files_failed,success) VALUES(?,?,?,?,?,?)",
                    (snap[0] if snap else 1, time.time(), result.get('method_used','unknown'),
                     result.get('files_restored',0), result.get('files_failed',0), 1 if result.get('success') else 0))
        conn.commit(); conn.close()
    except: pass


def get_timeline():
    try:
        from datetime import datetime
        conn = sqlite3.connect(DB_PATH,timeout=5)
        rows = conn.execute("SELECT snapshot_uuid,timestamp,label,file_count,trigger_type,is_valid FROM snapshots ORDER BY timestamp DESC LIMIT 100").fetchall()
        conn.close()
        return [{'id':r[0],'timestamp':r[1],'label':r[2],'fileCount':r[3],'triggerType':r[4],
                 'isValid':bool(r[5]),'time':datetime.fromtimestamp(r[1]).strftime('%H:%M:%S')} for r in rows]
    except: return []


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest='cmd')
    c = sub.add_parser('create'); c.add_argument('--label',default='auto'); c.add_argument('--trigger',default='manual')
    r = sub.add_parser('restore'); r.add_argument('--id',required=True)
    sub.add_parser('last-working'); sub.add_parser('timeline'); sub.add_parser('timeline-json')
    args = p.parse_args()
    if args.cmd == 'create':         print(json.dumps(create_snapshot(args.label, args.trigger)))
    elif args.cmd == 'restore':      print(json.dumps(restore_snapshot(args.id)))
    elif args.cmd == 'last-working': print(json.dumps(restore_snapshot('last-working')))
    elif args.cmd == 'timeline':
        for s in get_timeline(): print(f"{s['time']} — {s['label']} [{s['fileCount']} files]")
    elif args.cmd == 'timeline-json': print(json.dumps(get_timeline()))
    else: p.print_help()
