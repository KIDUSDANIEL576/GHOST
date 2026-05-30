import os, sys, time, sqlite3, subprocess, shutil, json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src-tauri', 'engine'))

GHOST_DIR   = "src-tauri/.ghost"
DB_PATH     = os.path.join(GHOST_DIR, "ledger.db")
SCHEMA_PATH = os.path.join("src-tauri", "engine", "schema.sql")
PASS = "✅ PASS"
FAIL = "❌ FAIL"
WARN = "⚠️  WARN"
results = {}


def setup():
    if os.path.exists(DB_PATH): os.remove(DB_PATH)
    os.makedirs(GHOST_DIR, exist_ok=True)
    os.makedirs(os.path.join(GHOST_DIR, "snapshots"), exist_ok=True)
    os.makedirs(os.path.join(GHOST_DIR, "emergency"), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(open(SCHEMA_PATH).read())
    conn.close()
    print("✅ Test environment ready\n")


def insert_rows(rows):
    conn = sqlite3.connect(DB_PATH)
    conn.executemany(
        "INSERT INTO file_mutations (timestamp,file_path,change_type,file_size) VALUES(?,?,?,?)", rows)
    conn.commit(); conn.close()


def clear():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM file_mutations")
    conn.execute("DELETE FROM runtime_crashes")
    conn.commit(); conn.close()


def run_ranker(crash_time, target, line):
    cwd = os.getcwd()
    os.chdir("src-tauri")
    try:
        r = subprocess.run(
            [sys.executable, "engine/ranker.py", str(crash_time), target, str(line)],
            capture_output=True, text=True, timeout=15)
        for ln in (r.stdout + r.stderr).splitlines():
            if ln.startswith("GHOST_JSON:"):
                return json.loads(ln[len("GHOST_JSON:"):]).get("suspects", [])
        return []
    except Exception as e: print(f"  Ranker error: {e}"); return []
    finally: os.chdir(cwd)


# ── Test 1: Clipboard paste storm ────────────────────────────
def test_1():
    print("📋 Test 1: Clipboard Paste Storm")
    now = time.time(); target = "src/components/auth.ts"
    rows = [(now - (10-i)*0.1, target, "UNTRACKED", 5000) for i in range(10)]
    rows += [(now - 300, f"src/noise_{i}.ts", "UNTRACKED", 100) for i in range(3)]
    insert_rows(rows)
    s = run_ranker(now, target, 15)
    ok = bool(s) and s[0]['file'] == target
    results['test_1_clipboard_storm'] = PASS if ok else FAIL
    print(f"  {results['test_1_clipboard_storm']}: top suspect = {s[0]['file'] if s else 'NONE'}")
    clear()


# ── Test 2: Auto-save spam ────────────────────────────────────
def test_2():
    print("\n💾 Test 2: Auto-Save Spam (300 mutations)")
    now = time.time(); target = "src/api/billing.ts"
    rows = [(now - 30 + i*0.1, target, "TRACKED", 8000) for i in range(300)]
    insert_rows(rows)
    s = run_ranker(now, target, 45)
    ok = bool(s) and s[0]['file'] == target
    results['test_2_autosave_spam'] = PASS if ok else FAIL
    print(f"  {results['test_2_autosave_spam']}: top suspect = {s[0]['file'] if s else 'NONE'}")
    clear()


# ── Test 3: Async delayed crash ───────────────────────────────
def test_3():
    print("\n⏱️  Test 3: Async Delayed Crash (120s gap)")
    now = time.time(); target = "src/webhooks/stripe.ts"
    rows = [(now - 120, target, "TRACKED", 3000)]
    rows += [(now - i*8, f"src/ui/btn{i}.tsx", "UNTRACKED", 200) for i in range(5)]
    insert_rows(rows)
    s = run_ranker(now, target, 88)
    found = any(x['file'] == target for x in s[:3])
    results['test_3_async_crash'] = PASS if found else WARN
    print(f"  {results['test_3_async_crash']}: target in top 3 = {found}")
    clear()


# ── Test 4: Mixed human + AI edits ────────────────────────────
def test_4():
    print("\n🤝 Test 4: Mixed Human + AI Edits")
    now = time.time(); target = "src/auth/jwt.ts"
    rows = [
        (now - 60, "src/Header.tsx", "UNTRACKED", 500),
        (now - 30, target,           "TRACKED",   2000),   # AI
        (now - 20, "src/styles.css", "UNTRACKED", 100),
        (now - 10, target,           "UNTRACKED", 50),     # Human
    ]
    insert_rows(rows)
    s = run_ranker(now, target, 23)
    ok = bool(s) and s[0]['file'] == target
    results['test_4_mixed_edits'] = PASS if ok else FAIL
    print(f"  {results['test_4_mixed_edits']}: target is #1 = {ok}")
    clear()


# ── Test 5: Snapshot + Restore ────────────────────────────────
def test_5():
    print("\n📸 Test 5: Snapshot → Modify → Restore → Verify")
    test_file = os.path.join("src-tauri", "test_snap_verify.ts")
    original  = "const working = 'yes';\nexport default working;\n"
    broken    = "const BROKEN = undefined.explode;\n"
    with open(test_file, 'w') as f: f.write(original)
    cwd = os.getcwd()
    os.chdir("src-tauri")
    try:
        from snapshot_manager import create_snapshot, restore_snapshot
        r = create_snapshot("test_snap", "manual")
        if not r['success']:
            results['test_5_restore'] = FAIL
            print(f"  {FAIL}: Snapshot failed: {r['error']}")
            return
        with open("test_snap_verify.ts", 'w') as f: f.write(broken)
        res = restore_snapshot(r['snapshot_uuid'])
        with open("test_snap_verify.ts") as f: restored = f.read()
        ok = restored == original
        results['test_5_restore'] = PASS if ok else FAIL
        print(f"  {results['test_5_restore']}: content matches original = {ok}")
        if not ok:
            print(f"    Got:      {repr(restored[:50])}")
            print(f"    Expected: {repr(original[:50])}")
    except Exception as e:
        results['test_5_restore'] = FAIL
        print(f"  {FAIL}: Exception: {e}")
    finally:
        os.chdir(cwd)
        for f in [test_file, test_file + '.ghost_bak']:
            if os.path.exists(f): os.remove(f)


def summary():
    print("\n" + "═"*55)
    print("  👻 GHOST CHAOS TEST RESULTS")
    print("═"*55)
    passed = sum(1 for v in results.values() if PASS in v)
    total  = len(results)
    for k, v in results.items():
        print(f"  {v}  {k.replace('_',' ')}")
    print(f"\n  {passed}/{total} passed")
    if passed == total:
        print("\n  🎉 ALL TESTS PASS — Ghost is ready to ship!")
        print("  Run: npm run tauri build")
    elif passed >= total * 0.8:
        print("\n  ⚠️  Most tests pass. Review warnings.")
    else:
        print("\n  🚨 Critical failures. Fix before shipping.")
    print("═"*55)
    return passed == total


if __name__ == "__main__":
    print("═"*55)
    print("  👻 GHOST CHAOS TEST SUITE")
    print("═"*55)
    setup()
    test_1(); test_2(); test_3(); test_4(); test_5()
    ok = summary()
    sys.exit(0 if ok else 1)
