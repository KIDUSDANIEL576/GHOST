import sys, os, re, json, sqlite3, time
from typing import List, Dict

DB_PATH = ".ghost/ledger.db"
WINDOW  = 180.0

# ── SCORING (correlation-based, not causal) ──────────────────
# These scores show CORRELATION STRENGTH not probability of causation.
# Ghost reduces search space. Ghost does not find root causes.
SCORE_IN_STACK_TRACE   = 50
SCORE_CHANGED_UNDER_30S = 20
SCORE_CHANGED_UNDER_2M  = 15
SCORE_IN_WINDOW         = 10
SCORE_LINKED_BY_IMPORT  = 30
SCORE_NEARBY_FILE       = 10
SCORE_AI_PASTE          = 5


def get_mutations(crash_time):
    try:
        conn = sqlite3.connect(DB_PATH, timeout=5)
        rows = conn.execute(
            "SELECT file_path,timestamp,change_type FROM file_mutations "
            "WHERE timestamp>=? AND timestamp<=? ORDER BY timestamp DESC",
            (crash_time - WINDOW, crash_time)).fetchall()
        conn.close()
        return [{'path':r[0],'ts':r[1],'type':r[2]} for r in rows]
    except: return []


def heuristic_rank(mutations, crash_time, target_file, target_line):
    scores = {}
    for m in mutations:
        p = m['path']
        age = crash_time - m['ts']
        if p not in scores:
            scores[p] = {'score':0,'signals':set(),'context':m['type']}
        if age < 30:
            scores[p]['score'] += SCORE_CHANGED_UNDER_30S
            scores[p]['signals'].add('CHANGED_RECENTLY')
        elif age < 120:
            scores[p]['score'] += SCORE_CHANGED_UNDER_2M
            scores[p]['signals'].add('CHANGED_RECENTLY')
        else:
            scores[p]['score'] += SCORE_IN_WINDOW
            scores[p]['signals'].add('IN_WINDOW')
        if m['type'] == 'TRACKED':
            scores[p]['score'] += SCORE_AI_PASTE
            scores[p]['signals'].add('AI_PASTE_DETECTED')

    if target_file and target_file not in ('None',''):
        if target_file not in scores:
            scores[target_file] = {'score':0,'signals':set(),'context':'CRASH_FILE'}
        scores[target_file]['score'] += SCORE_IN_STACK_TRACE
        scores[target_file]['signals'].add('IN_STACK_TRACE')
        if os.path.exists(target_file):
            try:
                content = open(target_file, encoding='utf-8', errors='ignore').read()
                for p in list(scores):
                    if p == target_file: continue
                    base = os.path.splitext(os.path.basename(p))[0]
                    if re.search(rf"(?:import|require).*['\"].*{re.escape(base)}",content,re.I):
                        scores[p]['score'] += SCORE_LINKED_BY_IMPORT
                        scores[p]['signals'].add('LINKED_BY_IMPORT')
            except: pass
        crash_dir = os.path.dirname(target_file)
        for p in scores:
            if p != target_file and os.path.dirname(p) == crash_dir:
                scores[p]['score'] += SCORE_NEARBY_FILE
                scores[p]['signals'].add('NEARBY_FILE')

    return sorted(
        [{'rank':0,'file':p,'score':d['score'],'signals':list(d['signals']),'context':d['context']}
         for p,d in scores.items()],
        key=lambda x: x['score'], reverse=True)[:5]


def recency_rank(mutations):
    seen = {}
    for m in mutations:
        if m['path'] not in seen: seen[m['path']] = m['ts']
    return [{'rank':i+1,'file':p,'score':100-i*15,'signals':['RECENCY_FALLBACK'],'context':'FALLBACK'}
            for i,(p,_) in enumerate(sorted(seen.items(),key=lambda x:x[1],reverse=True)[:5])]


def emergency_rank():
    files = []
    for root,dirs,fnames in os.walk(os.getcwd()):
        dirs[:] = [d for d in dirs if d not in {'node_modules','.git','.ghost','__pycache__','.next','dist'}]
        for f in fnames:
            try:
                fp = os.path.join(root,f)
                files.append((os.path.relpath(fp,os.getcwd()), os.path.getmtime(fp)))
            except: continue
    files.sort(key=lambda x:x[1],reverse=True)
    return [{'rank':i+1,'file':p,'score':100-i*15,'signals':['EMERGENCY'],'context':'EMERGENCY'}
            for i,(p,_) in enumerate(files[:5])]


def print_hud(suspects, target_file, target_line):
    print(f"\n\033[41m\033[97m 👻 GHOST: SEARCH SPACE REDUCED \033[0m")
    print(f"Crash at: {target_file}:{target_line}")
    print("─"*55)
    # Ghost shows correlation, not causation.
    print("Files to check first (ranked by correlation):\n")
    colors = ['\033[91m','\033[93m','\033[97m','\033[90m','\033[90m']
    for i,s in enumerate(suspects[:3]):
        s['rank'] = i+1
        print(f" {colors[min(i,4)]}{i+1}. {s['file']}\033[0m  (score: {s['score']})")
        print(f"    \033[90m{', '.join(s['signals'])}\033[0m\n")
    print("\033[94m[1] Restore Last Working  [2] View Timeline  [3] Skip\033[0m\n")


def rank(crash_time, target_file, target_line):
    suspects = []
    try:
        m = get_mutations(crash_time)
        if m: suspects = heuristic_rank(m, crash_time, target_file, target_line)
    except Exception as e: print(f"[Ranker] Heuristic failed: {e}")
    if not suspects:
        try:
            m = get_mutations(crash_time)
            suspects = recency_rank(m)
        except: pass
    if not suspects:
        suspects = emergency_rank()
    for i,s in enumerate(suspects): s['rank'] = i+1
    print_hud(suspects, target_file, target_line)
    print(f"GHOST_JSON:{json.dumps({'suspects':suspects,'crashFile':target_file,'crashLine':target_line})}")
    return suspects


if __name__ == "__main__":
    if len(sys.argv) >= 4:
        rank(float(sys.argv[1]),
             sys.argv[2] if sys.argv[2]!='None' else '',
             int(sys.argv[3]) if sys.argv[3].isdigit() else 0)
