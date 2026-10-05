#!/usr/bin/env python3
# Loop lab, step 1: the loop, with two tools (read_file, run_tests).
# The "model" is `claude -p` with every built-in tool switched off (--tools ""), so it can only
# return text. The harness finds one ACTION line in that text, runs the tool itself, appends the
# result to the transcript and calls the model again. Stops when a reply has no ACTION line
# (the model thinks it is done) or after MAX_TURNS.
# Usage: step1.py REPO LOG   (REPO: a fresh copy of the task repository; LOG: JSONL to write)
import json, os, re, subprocess, sys, time

REPO, LOG = sys.argv[1], sys.argv[2]
MODEL = os.environ.get("AH_MODEL", "haiku")
TASK = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests."
MAX_TURNS = 8
SYSTEM = """You are a coding agent. You cannot see or change anything yourself: you act by asking
the harness to run one tool per reply. Tools:
  read_file  {"path": "<path relative to the repository>"}  returns the file's text
  run_tests  {}                                             runs python3 tests/test_core.py
Write at most three short sentences of reasoning, then end your reply with exactly one line:
ACTION {"tool": "<name>", "args": {...}}
Never use the em-dash character."""


def log(kind, **data):
    with open(LOG, "a") as f:
        f.write(json.dumps({"kind": kind, **data}) + "\n")


def model(prompt):
    """One stateless model call: the whole transcript goes in, text comes out."""
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


# ---- tools: plain Python functions; the model only ever sees their names and their output
def inside(path):
    p = os.path.realpath(os.path.join(REPO, path))
    if not p.startswith(os.path.realpath(REPO) + os.sep):
        raise ValueError("path is outside the repository")
    return p


def read_file(path):
    return open(inside(path)).read()


def run_tests():
    r = subprocess.run(["python3", "tests/test_core.py"], cwd=REPO,
                       capture_output=True, text=True, timeout=60)
    return f"exit code {r.returncode}\n{r.stdout}{r.stderr}"


TOOLS = {"read_file": read_file, "run_tests": run_tests}


def parse(text):
    """The last line starting with ACTION, as JSON. Tool calling is just this."""
    found = re.findall(r"^ACTION\s+(\{.*\})\s*$", text, re.M)
    return json.loads(found[-1]) if found else None


# ---- the loop
files = sorted(os.path.relpath(os.path.join(d, f), REPO)
               for d, _, fs in os.walk(REPO) for f in fs if "__pycache__" not in d)
transcript = [f"TASK: {TASK}\nFILES IN THE REPOSITORY:\n" + "\n".join(files)]
log("start", step=1, model=MODEL, system=SYSTEM, max_turns=MAX_TURNS)
for turn in range(1, MAX_TURNS + 1):
    prompt = "\n\n".join(transcript) + "\n\nYour next reply:"
    text, usage, secs = model(prompt)
    transcript.append(f"--- turn {turn}: you ---\n{text}")
    action = parse(text)
    if action is None:  # no tool call: the model has answered, so the loop ends
        log("turn", turn=turn, prompt=prompt, text=text, usage=usage, seconds=round(secs, 2), stop="no action")
        break
    try:
        obs = TOOLS[action["tool"]](**action.get("args", {}))
    except Exception as e:  # unknown tool, bad arguments, missing file: tell the model
        obs = f"error: {type(e).__name__}: {e}"
    transcript.append(f"--- turn {turn}: result of {action.get('tool')} ---\n{obs}")
    log("turn", turn=turn, prompt=prompt, text=text, action=action, observation=obs,
        usage=usage, seconds=round(secs, 2))
r = subprocess.run(["python3", "tests/test_core.py"], cwd=REPO, capture_output=True, text=True)
log("verdict", passed=r.returncode == 0, output=r.stdout + r.stderr)
