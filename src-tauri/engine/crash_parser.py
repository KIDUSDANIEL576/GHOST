import sys
import re
import os
import time
import sqlite3
import subprocess

DB_PATH = ".ghost/ledger.db"
ENGINE_DIR = os.path.dirname(__file__)

# Patterns that signal a crash
CRASH_PATTERNS = [
    r"TypeError:", r"ReferenceError:", r"SyntaxError:",
    r"UnhandledPromiseRejection", r"Error:", r"Exception",
    r"FATAL", r"Segmentation fault", r"Cannot read propert",
]

# Stack frame pattern (Node.js/TypeScript style)
STACK_PATTERN = re.compile(
    r"at\s+(?:[^\s]+\s+)?\(?([^:\s\)]+\.(?:ts|tsx|js|jsx|py)):(\d+)(?::\d+)?\)?"
)


def write_crash(msg: str, trace: str, failing_file: str, failing_line: int):
    """Write crash to database. Falls back to file if DB unavailable."""
    now = time.time()

    for attempt in range(3):
        try:
            conn = sqlite3.connect(DB_PATH, timeout=5)
            conn.execute(
                """INSERT INTO runtime_crashes
                   (timestamp, error_type, error_message, stack_trace, failing_file, failing_line)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (now, detect_error_type(msg), msg[:500], trace[:2000], failing_file, failing_line)
            )
            conn.commit()
            conn.close()

            # Trigger the ranker immediately
            subprocess.Popen(
                [sys.executable, os.path.join(ENGINE_DIR, "ranker.py"),
                 str(now), failing_file or "None", str(failing_line or 0)],
                stdout=sys.stdout, stderr=sys.stderr
            )
            return

        except Exception as e:
            if attempt < 2:
                time.sleep(0.1)
                continue
            # Emergency fallback
            import json
            emergency_dir = os.path.join(".ghost", "emergency")
            os.makedirs(emergency_dir, exist_ok=True)
            with open(os.path.join(emergency_dir, f"crash_{int(now)}.json"), 'w') as f:
                json.dump({'msg': msg, 'file': failing_file, 'line': failing_line}, f)


def detect_error_type(msg: str) -> str:
    """Classify the error type from message."""
    for t in ["TypeError", "ReferenceError", "SyntaxError",
              "UnhandledPromiseRejection", "FATAL"]:
        if t in msg:
            return t
    return "Error"


def is_crash_line(line: str) -> bool:
    """Return True if this line signals a crash."""
    return any(re.search(p, line) for p in CRASH_PATTERNS)


def parse_stream():
    """
    Read stdin line by line.
    Pass through to stdout (transparent).
    Detect crashes and write to DB.
    """
    buffer = []
    error_msg = ""
    failing_file = ""
    failing_line = 0
    in_crash = False

    for raw_line in sys.stdin:
        # Always pass through
        sys.stdout.write(raw_line)
        sys.stdout.flush()

        line = raw_line.strip()
        buffer.append(line)

        # Keep buffer to last 50 lines
        if len(buffer) > 50:
            buffer.pop(0)

        # Detect crash start
        if is_crash_line(line) and not in_crash:
            in_crash = True
            error_msg = line

        # Parse stack frame (only first match = most relevant)
        if in_crash and not failing_file:
            match = STACK_PATTERN.search(line)
            if match:
                candidate = match.group(1)
                # Ignore node_modules and anonymous
                if "node_modules" not in candidate and "<anonymous>" not in candidate:
                    try:
                        failing_file = os.path.relpath(candidate, os.getcwd())
                    except ValueError:
                        failing_file = candidate
                    failing_line = int(match.group(2))

        # Crash ends after 5 quiet lines or new crash detected
        if in_crash and len(buffer) >= 5:
            last_5 = buffer[-5:]
            if not any(is_crash_line(l) or STACK_PATTERN.search(l) for l in last_5):
                # Write the crash
                trace = "\n".join(buffer)
                write_crash(error_msg, trace, failing_file, failing_line)
                # Reset
                in_crash = False
                error_msg = ""
                failing_file = ""
                failing_line = 0

    # Handle crash that was still building at EOF
    if in_crash and error_msg:
        trace = "\n".join(buffer)
        write_crash(error_msg, trace, failing_file, failing_line)


if __name__ == "__main__":
    parse_stream()
