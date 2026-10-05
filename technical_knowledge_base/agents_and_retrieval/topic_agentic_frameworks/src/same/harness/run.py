"""Run one agent once on a fresh copy of the task repo and record everything.
Usage: python run.py <script e.g. a1_plain> <label> [claude model]
Writes runs/<label>/{requests.jsonl|sdk.jsonl, stdout.txt, stderr.txt, meta.json, diff.txt}."""
import json, os, shutil, subprocess, sys, time, urllib.request, difflib

HERE = os.path.dirname(os.path.abspath(__file__))
TASK_REPO = os.path.join(HERE, "..", "task_repo")
PROXY = int(os.environ.get("PROXY_PORT", "8091"))
MODEL = os.environ.get("MODEL", "mlx-community/Qwen3-4B-Instruct-2507-4bit")

script, label = sys.argv[1], sys.argv[2]
cmodel = sys.argv[3] if len(sys.argv) > 3 else "haiku"
out = os.path.join(HERE, "runs", label)
shutil.rmtree(out, ignore_errors=True)
repo = os.path.join(out, "repo")
shutil.copytree(TASK_REPO, repo)
env = dict(os.environ, PYTHONPATH=os.path.join(HERE, "code"), BASE_URL=f"http://127.0.0.1:{PROXY}/v1",
           MODEL=MODEL, CLAUDE_MODEL=cmodel, SDK_LOG=os.path.join(out, "sdk.jsonl"),
           PYTHONDONTWRITEBYTECODE="1")
if not script.startswith("a6"):
    urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{PROXY}/__log", method="POST",
                           data=json.dumps({"file": os.path.join(out, "requests.jsonl")}).encode()))
t0 = time.time()
try:
    p = subprocess.run([os.path.join(HERE, "fwenv/bin/python"), os.path.join(HERE, "code", script + ".py")],
                       cwd=repo, env=env, capture_output=True, text=True, timeout=1200)
    rc, so, se = p.returncode, p.stdout, p.stderr
except subprocess.TimeoutExpired as e:
    rc, so, se = "timeout", str(e.stdout), str(e.stderr)
wall = time.time() - t0
t = subprocess.run(["python3", "tests/test_core.py"], cwd=repo, capture_output=True, text=True)
tests_same = open(os.path.join(repo, "tests/test_core.py")).read() == open(os.path.join(TASK_REPO, "tests/test_core.py")).read()
diff = []
for rel in ("textstats/core.py", "textstats/__init__.py", "tests/test_core.py"):
    a = open(os.path.join(TASK_REPO, rel)).read().splitlines(True)
    b = open(os.path.join(repo, rel)).read().splitlines(True) if os.path.exists(os.path.join(repo, rel)) else []
    diff += difflib.unified_diff(a, b, "a/" + rel, "b/" + rel)
open(os.path.join(out, "diff.txt"), "w").write("".join(diff))
open(os.path.join(out, "stdout.txt"), "w").write(so or "")
open(os.path.join(out, "stderr.txt"), "w").write(se or "")
meta = {"script": script, "label": label, "model": cmodel if script.startswith("a6") else MODEL,
        "rc": rc, "wall_s": round(wall, 1), "tests_pass": t.returncode == 0, "tests_unchanged": tests_same,
        "tests_output": t.stdout.strip().splitlines()[-1] if t.stdout.strip() else t.stderr[-200:],
        "date": time.strftime("%Y-%m-%d")}
json.dump(meta, open(os.path.join(out, "meta.json"), "w"), indent=1)
print(json.dumps(meta))
