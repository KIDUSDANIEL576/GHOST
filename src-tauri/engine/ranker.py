import sys
import os
import re
import json
import sqlite3
import time
from typing import List, Dict

DB_PATH = ".ghost/ledger.db"
WINDOW_SEC = 180.0


def get_recent_mutations(crash_time: float) -> List[Dict]:
    """Get file mutations in the window before crash."""
    cutoff = crash_time - WINDOW_SEC
    try:
        conn = sqlite3.connect(DB_PATH, timeout=5)
        rows = conn.execute(
            "SELECT file_path, timestamp, change_type FROM file_mutations "
            "WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC",
            (cutoff, crash_time)
        ).fetchall()
        conn.close()
        return [{'path': r[0], 'ts': r[1], 'type': r[2]} for r in rows]
    except Exception as e:
        print(f"[Ghost/Ranker] DB read failed: {e}")
        return []


def score_suspects(mutations: List[Dict], crash_time: float,
                   target_file: str, target_line: int) -> List[Dict]:
    """
    PRIMARY: Full heuristic scoring.
    Score each file based on: recency + stack match + imports + directory.
    """
    scores = {}

    # Score by recency
    for m in mutations:
        path = m['path']
        age = crash_time - m['ts']

        if path not in scores:
            scores[path] = {'score': 0, 'signals': set(), 'context': m['type']}

        if age < 30:
            scores[path]['score'] += 20
            scores[path]['signals'].add('VERY_RECENT')
        elif age < 120:
            scores[path]['score'] += 15
            scores[path]['signals'].add('RECENT')
        else:
            scores[path]['score'] += 10
            scores[path]['signals'].add('IN_WINDOW')

        if m['type'] == 'TRACKED':
            scores[path]['score'] += 5
            scores[path]['signals'].add('AI_GENERATED')

    # Score by stack trace match
    if target_file and target_file not in ('None', ''):
        if target_file not in scores:
            scores[target_file] = {'score': 0, 'signals': set(), 'context': 'CRASH_FILE'}
        scores[target_file]['score'] += 50
        scores[target_file]['signals'].add('STACK_MATCH')

        # Scan imports in crash file
        if os.path.exists(target_file):
            try:
                content = open(target_file, encoding='utf-8', errors='ignore').read()
                for path in list(scores.keys()):
                    if path == target_file:
                        continue
                    base = os.path.splitext(os.path.basename(path))[0]
                    if re.search(
                        rf"(?:import|require).*['\"].*{re.escape(base)}",
                        content, re.IGNORECASE
                    ):
                        scores[path]['score'] += 30
                        scores[path]['signals'].add('IMPORTED_BY_CRASH')
            except Exception:
                pass

        # Directory proximity
        crash_dir = os.path.dirname(target_file)
        for path in scores:
            if path != target_file and os.path.dirname(path) == crash_dir:
                scores[path]['score'] += 10
                scores[path]['signals'].add('SAME_DIR')

    return sorted(
        [{'rank': 0, 'file': p, 'score': d['score'],
          'signals': list(d['signals']), 'context': d['context']}
         for p, d in scores.items()],
        key=lambda x: x['score'], reverse=True
    )[:5]


def fallback_score(mutations: List[Dict]) -> List[Dict]:
    """FALLBACK: Rank by recency only (no imports scan)."""
    seen = {}
    for m in mutations:
        if m['path'] not in seen:
            seen[m['path']] = m['ts']

    ranked = sorted(seen.items(), key=lambda x: x[1], reverse=True)
    return [
        {'rank': i+1, 'file': p, 'score': 100 - i*15,
         'signals': ['RECENCY_ONLY'], 'context': 'FALLBACK'}
        for i, (p, _) in enumerate(ranked[:5])
    ]


def emergency_score() -> List[Dict]:
    """EMERGENCY: Sort all project files by mtime. Always works."""
    files = []
    for root, dirs, filenames in os.walk(os.getcwd()):
        dirs[:] = [d for d in dirs if d not in
                   {'node_modules', '.git', '.ghost', '__pycache__', '.next', 'dist'}]
        for f in filenames:
            path = os.path.join(root, f)
            try:
                rel = os.path.relpath(path, os.getcwd())
                files.append((rel, os.path.getmtime(path)))
            except OSError:
                continue

    files.sort(key=lambda x: x[1], reverse=True)
    return [
        {'rank': i+1, 'file': p, 'score': 100 - i*15,
         'signals': ['EMERGENCY'], 'context': 'EMERGENCY'}
        for i, (p, _) in enumerate(files[:5])
    ]


def print_hud(suspects: List[Dict], target_file: str, target_line: int):
    """Print terminal crash report."""
    print(f"\n\033[41m\033[97m 👻 GHOST: CRASH DETECTED \033[0m")
    print(f"\033[90mCrash at:\033[0m {target_file}:{target_line}")
    print("\033[90m" + "─" * 55 + "\033[0m")
    print("Likely causes (ranked):\n")

    colors = ['\033[91m', '\033[93m', '\033[97m', '\033[90m', '\033[90m']

    for i, s in enumerate(suspects[:3]):
        s['rank'] = i + 1
        c = colors[min(i, len(colors)-1)]
        print(f" {c}{i+1}. {s['file']}\033[0m  (score: {s['score']})")
        print(f"    \033[90m{', '.join(s['signals'])}\033[0m\n")

    print("\033[94m[1] Restore Last Working  [2] View Diff  [3] Skip\033[0m\n")


def rank(crash_time: float, target_file: str, target_line: int):
    """Main entry. Returns ranked suspects via all 3 methods."""
    suspects = []

    # Method 1: Full heuristic
    try:
        mutations = get_recent_mutations(crash_time)
        if mutations:
            suspects = score_suspects(mutations, crash_time, target_file, target_line)
    except Exception as e:
        print(f"[Ghost/Ranker] Heuristic failed: {e}")

    # Method 2: Fallback
    if not suspects:
        try:
            mutations = get_recent_mutations(crash_time)
            suspects = fallback_score(mutations)
        except Exception as e:
            print(f"[Ghost/Ranker] Fallback failed: {e}")

    # Method 3: Emergency (always works)
    if not suspects:
        suspects = emergency_score()

    # Assign ranks
    for i, s in enumerate(suspects):
        s['rank'] = i + 1

    print_hud(suspects, target_file, target_line)

    # Output JSON for Tauri to parse
    print(f"GHOST_JSON:{json.dumps({'suspects': suspects, 'crashFile': target_file, 'crashLine': target_line})}")

    return suspects


if __name__ == "__main__":
    if len(sys.argv) >= 4:
        crash_time = float(sys.argv[1])
        target_file = sys.argv[2] if sys.argv[2] != 'None' else ''
        target_line = int(sys.argv[3]) if sys.argv[3].isdigit() else 0
        rank(crash_time, target_file, target_line)
    else:
        print("Usage: python ranker.py <crash_time> <file> <line>")
