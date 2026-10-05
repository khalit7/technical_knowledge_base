"""Shared helpers for the orchestration lab: a model call through `claude -p` with
every tool disabled (the model only returns text), the test runner, hidden checks,
and a function-level merge. All file I/O is done here, never by the model."""
import json, os, re, shutil, subprocess, time, ast, threading

HERE = os.path.dirname(os.path.abspath(__file__))
SCR = os.path.dirname(os.path.dirname(HERE))  # scratchpad
TASK = os.path.join(SCR, "agents", "task_repo")
REC = os.path.join(SCR, "agents", "recordings", "aforch")
NOEM = " Never use the em-dash character."
_lock = threading.Lock()
_count_file = os.path.join(HERE, "claude_runs.txt")


def bump(label):
    with _lock:
        with open(_count_file, "a") as f:
            f.write(f"{time.strftime('%H:%M:%S')} {label}\n")


class Clock:
    def __init__(self):
        self.t0 = time.time()
        self.events = []

    def now(self):
        return round(time.time() - self.t0, 3)


def call_model(run, label, system, prompt, clock, model="haiku", node=None):
    """One model call, tools disabled. Raw JSONL kept under recordings/aforch/<run>/."""
    d = os.path.join(REC, run)
    os.makedirs(d, exist_ok=True)
    empty = os.path.join(HERE, "empty_cwd")
    os.makedirs(empty, exist_ok=True)
    if prompt.startswith("-"):
        prompt = "Input:\n" + prompt  # a leading dash would be parsed as a CLI flag
    cmd = ["claude", "-p", prompt, "--output-format", "stream-json", "--verbose",
           "--no-session-persistence", "--setting-sources", "project", "--strict-mcp-config",
           "--model", model, "--tools", "", "--system-prompt", system + NOEM]
    t0 = clock.now()
    bump(f"{run}/{label}")
    p = subprocess.run(cmd, cwd=empty, capture_output=True, text=True, timeout=600)
    t1 = clock.now()
    with open(os.path.join(d, label + ".jsonl"), "w") as f:
        f.write(p.stdout)
    text, res = "", None
    for line in p.stdout.splitlines():
        try:
            r = json.loads(line)
        except Exception:
            continue
        if r.get("type") == "result":
            res = r
    if res is None:
        with open(_count_file, "a") as f:
            f.write("  ^ failed before reaching the model\n")
        raise RuntimeError(f"no result record for {label}: {p.stderr[:500]}")
    text = res.get("result", "")
    u = res.get("usage", {})
    ev = dict(node=node or label, kind="llm", label=label, model=model, t0=t0, t1=t1,
              input=u.get("input_tokens", 0), cache_write=u.get("cache_creation_input_tokens", 0),
              cache_read=u.get("cache_read_input_tokens", 0), output=u.get("output_tokens", 0),
              thinking=(u.get("output_tokens_details") or {}).get("thinking_tokens", 0),
              cost=res.get("total_cost_usd", 0), api_ms=res.get("duration_api_ms"),
              is_error=res.get("is_error", False), prompt=prompt, system=system + NOEM, text=text)
    with _lock:
        clock.events.append(ev)
    return text, ev


def code_event(clock, node, label, t0, detail):
    clock.events.append(dict(node=node, kind="code", label=label, t0=t0, t1=clock.now(), detail=detail))


def fresh_copy(run):
    d = os.path.join(HERE, "work", run)
    if os.path.exists(d):
        shutil.rmtree(d)
    shutil.copytree(TASK, d)
    return d


def read(d, rel):
    with open(os.path.join(d, rel)) as f:
        return f.read()


def write(d, rel, s):
    with open(os.path.join(d, rel), "w") as f:
        f.write(s)


def run_tests(d):
    p = subprocess.run(["python3", "tests/test_core.py"], cwd=d, capture_output=True, text=True, timeout=60)
    out = (p.stdout + p.stderr).strip()
    return p.returncode == 0, out


HIDDEN = r'''
import sys, json; sys.path.insert(0, ".")
from textstats.core import word_count, top_words, tokenize
checks = [
 ("contractions and possessives", lambda: word_count("It's the cat's toy") == 4),
 ("uppercase contraction", lambda: word_count("DON'T Stop") == 2),
 ("quotes around a word are not part of it", lambda: tokenize("'quoted' words") == ["quoted", "words"]),
 ("higher count still first", lambda: top_words("c c c a b a b", n=3) == [("c", 3), ("a", 2), ("b", 2)]),
 ("ties alphabetical beyond n=2", lambda: top_words("b a b a c", n=3) == [("a", 2), ("b", 2), ("c", 1)]),
 ("empty text", lambda: top_words("", n=3) == [] and word_count("") == 0),
]
res = []
for name, f in checks:
    try: ok = bool(f())
    except Exception as e: ok = False
    res.append([name, ok])
print(json.dumps(res))
'''


def hidden_checks(d):
    p = subprocess.run(["python3", "-c", HIDDEN], cwd=d, capture_output=True, text=True, timeout=60)
    try:
        return json.loads(p.stdout.strip().splitlines()[-1])
    except Exception:
        return [["import failed", False]]


def code_block(text):
    m = re.findall(r"```(?:python|py)?\s*\n(.*?)```", text, re.S)
    return max(m, key=len) if m else None


def json_block(text):
    m = re.search(r"```(?:json)?\s*\n(.*?)```", text, re.S)
    s = m.group(1) if m else text
    i, j = min([k for k in (s.find("["), s.find("{")) if k >= 0], default=0), max(s.rfind("]"), s.rfind("}"))
    return json.loads(s[i:j + 1])


def merge_functions(src, new_code):
    """Replace each top-level function in src with the same-named one in new_code; add missing imports."""
    new_tree = ast.parse(new_code)
    lines = src.splitlines()
    replaced = []
    for node in new_tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            seg = ast.get_source_segment(new_code, node)
            if seg not in src:
                lines.insert(0, seg)
    for node in new_tree.body:
        if isinstance(node, ast.FunctionDef):
            seg = ast.get_source_segment(new_code, node)
            tree = ast.parse("\n".join(lines))
            for old in tree.body:
                if isinstance(old, ast.FunctionDef) and old.name == node.name:
                    lines[old.lineno - 1:old.end_lineno] = seg.splitlines()
                    replaced.append(node.name)
                    break
    return "\n".join(lines) + "\n", replaced


def save_summary(run, clock, extra):
    d = os.path.join(REC, run)
    os.makedirs(d, exist_ok=True)
    out = dict(run=run, wall=clock.now(), events=clock.events, **extra)
    with open(os.path.join(d, "summary.json"), "w") as f:
        json.dump(out, f, indent=1)
    return out
