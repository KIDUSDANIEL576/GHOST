import os, sys, time, sqlite3, subprocess, shutil, json, tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src-tauri', 'engine'))

GHOST_DIR   = "src-tauri/.ghost"
DB_PATH     = os.path.join(GHOST_DIR, "ledger.db")
SCHEMA_PATH = os.path.join("src-tauri", "engine", "schema.sql")
PASS_MSG    = "✅ PASS"
FAIL_MSG    = "❌ FAIL"

results = {}


def setup():
    os.makedirs(GHOST_DIR, exist_ok=True)
    os.makedirs(os.path.join(GHOST_DIR, "snapshots"), exist_ok=True)
    os.makedirs(os.path.join(GHOST_DIR, "emergency"), exist_ok=True)
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(open(SCHEMA_PATH).read())
    conn.close()
    print("✅ Test environment ready\n")


def insert_mutations(rows):
    conn = sqlite3.connect(DB_PATH)
    conn.executemany(
        "INSERT INTO file_mutations (timestamp, file_path, change_type, file_size) VALUES (?,?,?,?)", rows)
    conn.commit(); conn.close()


def clear_tables():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM file_mutations")
    conn.execute("DELETE FROM runtime_crashes")
    conn.commit(); conn.close()


def run_ranker(crash_time, target_file, target_line):
    cwd = os.getcwd()
    os.chdir("src-tauri")
    try:
        r = subprocess.run(
            [sys.executable, "engine/ranker.py", str(crash_time), target_file, str(target_line)],
            capture_output=True, text=True, timeout=15)
        output = r.stdout + r.stderr
        for line in output.splitlines():
            if line.startswith("GHOST_JSON:"):
                return json.loads(line[len("GHOST_JSON:"):]).get("suspects", [])
        return []
    except Exception as e:
        print(f"Ranker error: {e}"); return []
    finally:
        os.chdir(cwd)


# ── TEST 1: Clipboard paste storm ─────────────────────────────
def test_1_clipboard_storm():
    print("📋 Test 1: Clipboard Paste Storm")
    now = time.time(); target = "src/components/auth.ts"
    rows = [(now - (10 - i)*0.1, target, "UNTRACKED", 5000) for i in range(10)]
    rows += [(now - 300, f"src/noise_{i}.ts", "UNTRACKED", 100) for i in range(3)]
    insert_mutations(rows)
    suspects = run_ranker(now, target, 15)
    passed = suspects and suspects[0]['file'] == target
    results['test_1'] = PASS_MSG if passed else FAIL_MSG
    print(f"  {results['test_1']}: Top suspect = {suspects[0]['file'] if suspects else 'NONE'}")
    clear_tables()


# ── TEST 2: Auto-save spam ─────────────────────────────────────
def test_2_autosave_spam():
    print("\n💾 Test 2: Auto-Save Spam")
    now = time.time(); target = "src/api/billing.ts"
    rows = [(now - 30 + i*0.1, target, "TRACKED", 8000) for i in range(300)]
    insert_mutations(rows)
    suspects = run_ranker(now, target, 45)
    passed = suspects and suspects[0]['file'] == target
    results['test_2'] = PASS_MSG if passed else FAIL_MSG
    print(f"  {results['test_2']}: Top suspect = {suspects[0]['file'] if suspects else 'NONE'}")
    clear_tables()


# ── TEST 3: Async delayed crash ───────────────────────────────
def test_3_async_delayed():
    print("\n⏱️  Test 3: Async Delayed Crash")
    now = time.time(); target = "src/webhooks/stripe.ts"
    rows = [(now - 120, target, "TRACKED", 3000)]
    rows += [(now - i*8, f"src/ui/btn-{i}.tsx", "UNTRACKED", 200) for i in range(5)]
    insert_mutations(rows)
    suspects = run_ranker(now, target, 88)
    found = any(s['file'] == target for s in suspects[:3])
    results['test_3'] = PASS_MSG if found else "⚠️  WARN"
    print(f"  {results['test_3']}: Target in top 3: {found}")
    clear_tables()


# ── TEST 4: Mixed human + AI edits ────────────────────────────
def test_4_mixed_authorship():
    print("\n🤝 Test 4: Mixed Human + AI Edits")
    now = time.time(); target = "src/auth/jwt.ts"
    rows = [
        (now - 60, "src/Header.tsx",    "UNTRACKED", 500),
        (now - 30, target,              "TRACKED",   2000),   # AI edit
        (now - 20, "src/styles.css",    "UNTRACKED", 100),
        (now - 10, target,              "UNTRACKED", 50),     # Human edit
    ]
    insert_mutations(rows)
    suspects = run_ranker(now, target, 23)
    passed = suspects and suspects[0]['file'] == target
    results['test_4'] = PASS_MSG if passed else FAIL_MSG
    print(f"  {results['test_4']}: Auth is #1: {passed}")
    clear_tables()


# ── TEST 5: Snapshot + Restore ────────────────────────────────
def test_5_snapshot_restore():
    print("\n📸 Test 5: Snapshot → Restore Integrity")
    test_file = os.path.join("src-tauri", "test_snap_file.ts")
    original  = "const working = 'yes';\nexport default working;\n"
    broken    = "const BROKEN = undefined.property;\n"

    with open(test_file, 'w') as f: f.write(original)

    cwd = os.getcwd()
    os.chdir("src-tauri")

    try:
        from snapshot_manager import create_snapshot, restore_snapshot
        r = create_snapshot("test_snap", "manual")
        if not r['success']:
            results['test_5'] = FAIL_MSG
            print(f"  {FAIL_MSG}: Snapshot failed: {r['error']}")
            return

        with open("test_snap_file.ts", 'w') as f: f.write(broken)

        res = restore_snapshot(r['snapshot_uuid'])
        with open("test_snap_file.ts") as f: restored = f.read()

        passed = restored == original
        results['test_5'] = PASS_MSG if passed else FAIL_MSG
        print(f"  {results['test_5']}: File restored correctly: {passed}")

    except Exception as e:
        results['test_5'] = FAIL_MSG
        print(f"  {FAIL_MSG}: Exception: {e}")
    finally:
        os.chdir(cwd)
        if os.path.exists(test_file): os.remove(test_file)
        bak = test_file + '.ghost_bak'
        if os.path.exists(bak): os.remove(bak)


def print_summary():
    print("\n" + "═"*55)
    print("  📊 GHOST CHAOS TEST RESULTS")
    print("═"*55)
    passed = sum(1 for v in results.values() if PASS_MSG in v)
    total  = len(results)
    for k, v in results.items():
        print(f"  {v}  {k}")
    print(f"\n  {passed}/{total} passed")
    if passed == total:
        print("\n  🎉 ALL TESTS PASSED — Ghost is airplane-grade ready!")
        print("  You can now build your production installer.")
    elif passed >= total * 0.8:
        print(f"\n  ⚠️  Minor issues. Review warnings before launching.")
    else:
        print(f"\n  🚨 Critical failures. Fix before shipping to users.")
    print("═"*55)
    return passed == total


if __name__ == "__main__":
    print("═"*55)
    print("  👻 GHOST UNIVERSAL CHAOS TEST SUITE")
    print("═"*55)
    setup()
    test_1_clipboard_storm()
    test_2_autosave_spam()
    test_3_async_delayed()
    test_4_mixed_authorship()
    test_5_snapshot_restore()
    success = print_summary()
    sys.exit(0 if success else 1)
