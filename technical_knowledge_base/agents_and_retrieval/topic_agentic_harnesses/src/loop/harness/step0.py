#!/usr/bin/env python3
# Loop lab, step 0: no loop. One model call with the source file pasted in.
# The "model" is `claude -p` with every built-in tool switched off (--tools "") and our own
# system prompt, so all it can do is return text. We paste core.py, ask for the fixed file,
# write whatever comes back, and run the tests once to grade it. The model never sees the tests.
# Usage: step0.py REPO LOG   (REPO: a fresh copy of the task repository; LOG: JSONL to write)
import json, os, re, subprocess, sys, time

REPO, LOG = sys.argv[1], sys.argv[2]
MODEL = os.environ.get("AH_MODEL", "haiku")
TASK = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests."
SYSTEM = ("You are a careful Python programmer. Reply with the complete corrected file in one "
          "```python code block and nothing after it. Never use the em-dash character.")


def log(kind, **data):
    with open(LOG, "a") as f:
        f.write(json.dumps({"kind": kind, **data}) + "\n")


def model(prompt):
    """One model call. Returns (text, usage, seconds)."""
    t = time.time()
    out = subprocess.run(["claude", "-p", "--output-format", "stream-json", "--verbose",
                          "--no-session-persistence", "--setting-sources", "project",
                          "--strict-mcp-config", "--model", MODEL, "--tools", "",
                          "--system-prompt", SYSTEM],
                         input=prompt, capture_output=True, text=True,
                         cwd=os.environ.get("AH_EMPTY", "/tmp"), timeout=600)
    with open(LOG + ".raw", "a") as f:
        f.write(out.stdout)
    res = [r for r in map(json.loads, out.stdout.splitlines()) if r.get("type") == "result"][-1]
    return res["result"], res["usage"], time.time() - t


src = open(os.path.join(REPO, "textstats/core.py")).read()
prompt = f"TASK: {TASK}\n\nThis is textstats/core.py:\n```python\n{src}```"
log("start", step=0, model=MODEL, system=SYSTEM)
text, usage, secs = model(prompt)
log("turn", turn=1, prompt=prompt, text=text, usage=usage, seconds=round(secs, 2))
m = re.findall(r"```python\n(.*?)```", text, re.S)
if m:
    open(os.path.join(REPO, "textstats/core.py"), "w").write(m[-1])
r = subprocess.run(["python3", "tests/test_core.py"], cwd=REPO, capture_output=True, text=True)
log("verdict", passed=r.returncode == 0, output=r.stdout + r.stderr)
