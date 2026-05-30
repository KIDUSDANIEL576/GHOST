import sys, re, os, time, sqlite3, subprocess

DB_PATH    = ".ghost/ledger.db"
ENGINE_DIR = os.path.dirname(__file__)
CRASH_RX   = [r"TypeError:",r"ReferenceError:",r"SyntaxError:",
              r"UnhandledPromiseRejection",r"Error:",r"FATAL",r"Cannot read propert"]
STACK_RX   = re.compile(r"at\s+(?:[^\s]+\s+)?\(?([^:\s\)]+\.(?:ts|tsx|js|jsx|py)):(\d+)")


def write_crash(msg, trace, ffile, fline):
    now = time.time()
    for attempt in range(3):
        try:
            conn = sqlite3.connect(DB_PATH, timeout=5)
            conn.execute(
                "INSERT INTO runtime_crashes (timestamp,error_type,error_message,stack_trace,failing_file,failing_line) VALUES(?,?,?,?,?,?)",
                (now, _classify(msg), msg[:500], trace[:2000], ffile, fline))
            conn.commit(); conn.close()
            subprocess.Popen(
                [sys.executable, os.path.join(ENGINE_DIR,"ranker.py"), str(now), ffile or "None", str(fline or 0)],
                stdout=sys.stdout, stderr=sys.stderr)
            return
        except Exception as e:
            if attempt < 2: time.sleep(0.1); continue
            _emergency(msg, ffile)


def _classify(msg):
    for t in ["TypeError","ReferenceError","SyntaxError","UnhandledPromiseRejection","FATAL"]:
        if t in msg: return t
    return "Error"


def _emergency(msg, ffile):
    import json
    d = os.path.join(".ghost","emergency")
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d,f"c_{int(time.time())}.json"),'w') as f:
        json.dump({'msg':msg,'file':ffile},f)


def is_crash(line): return any(re.search(p,line) for p in CRASH_RX)


def parse():
    buf, emsg, efile, eline, in_crash = [], "", "", 0, False
    for raw in sys.stdin:
        sys.stdout.write(raw); sys.stdout.flush()
        line = raw.strip()
        buf.append(line)
        if len(buf) > 50: buf.pop(0)
        if is_crash(line) and not in_crash:
            in_crash = True; emsg = line
        if in_crash and not efile:
            m = STACK_RX.search(line)
            if m:
                c = m.group(1)
                if "node_modules" not in c and "<anonymous>" not in c:
                    try: efile = os.path.relpath(c, os.getcwd())
                    except ValueError: efile = c
                    eline = int(m.group(2))
        if in_crash and len(buf) >= 5:
            if not any(is_crash(l) or STACK_RX.search(l) for l in buf[-5:]):
                write_crash(emsg, "\n".join(buf), efile, eline)
                in_crash = False; emsg = ""; efile = ""; eline = 0
    if in_crash and emsg:
        write_crash(emsg, "\n".join(buf), efile, eline)

if __name__ == "__main__": parse()
