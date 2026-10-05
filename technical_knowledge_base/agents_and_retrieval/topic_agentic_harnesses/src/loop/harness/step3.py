#!/usr/bin/env python3
# Loop lab, step 3: step 2 plus a shell tool and a permission gate in front of every tool call.
# Rules are checked in order, first match wins: deny, then allow; anything unmatched is "ask".
# A person answers "ask" at the terminal; with no terminal (our recordings) "ask" becomes deny,
# like Claude Code's --permission-prompts none. A denial is an observation the model reads.
# The gate is not a sandbox: an allowed command still runs with this program's rights.
# Usage: step3.py REPO LOG   (REPO: a fresh copy of the task repository; LOG: JSONL to write)
import json, os, re, subprocess, sys, time

REPO, LOG = sys.argv[1], sys.argv[2]
MODEL = os.environ.get("AH_MODEL", "haiku")
TASK = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests."
MAX_TURNS = 12
MAX_ERRORS = 3
SYSTEM = """You are a coding agent. You cannot see or change anything yourself: you act by asking
the harness to run one tool per reply. Tools:
  read_file  {"path": "<path relative to the repository>"}  returns the file's text
  run_tests  {}                                             runs python3 tests/test_core.py
  edit_file  {"path": "...", "old": "<exact text>", "new": "<replacement>"}
             replaces old with new; old must appear exactly once in the file
  run_command {"cmd": "<shell command>"}                    runs it in the repository, returns output
  finish     {"summary": "<one sentence>"}                  ends the task
Some actions need permission; a denied action returns a message saying why.
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


def edit_file(path, old, new):
    text = open(inside(path)).read()
    n = text.count(old)
    if n != 1:
        return f"error: old text found {n} times; it must appear exactly once (copy it exactly)"
    open(inside(path), "w").write(text.replace(old, new))
    return f"edited {path}"


def run_command(cmd):
    r = subprocess.run(cmd, shell=True, cwd=REPO, capture_output=True, text=True, timeout=60)
    return f"exit code {r.returncode}\n{r.stdout}{r.stderr}"


TOOLS = {"read_file": read_file, "run_tests": run_tests, "edit_file": edit_file,
         "run_command": run_command}

# ---- the permission gate
RULES = [  # (verdict, tool, regex on the path or command); first match wins
    ("deny", "edit_file", r"^tests/"),                       # the task forbids editing the tests
    ("deny", "run_command", r"\b(rm|curl|wget|pip|sudo|git push)\b"),
    ("ask", "run_command", r"[;&|`$<>]"),                    # chained or redirected: never auto-allow
    ("allow", "read_file", r""),
    ("allow", "run_tests", r""),
    ("allow", "edit_file", r"^textstats/"),
    ("allow", "run_command", r"^(ls|cat|grep|head|python3 tests/test_core\.py)\b"),
]


def check(tool, args):
    subject = str(args.get("path") or args.get("cmd") or "")
    verdict, why = "ask", "no rule matched"
    for v, t, pattern in RULES:
        if t == tool and re.search(pattern, subject):
            verdict, why = v, f"{v} rule ({t}, {pattern!r})"
            break
    if verdict != "ask":
        return verdict, why
    if sys.stdin.isatty():  # "ask": a person decides
        yes = input(f"allow {tool} {json.dumps(args)}? [y/N] ").strip().lower() == "y"
        return ("allow" if yes else "deny"), why + "; asked the user"
    return "deny", why + " and nobody can be asked"


def parse(text):
    """The FIRST line starting with ACTION, as JSON, and the text cut just after it."""
    m = re.search(r"^ACTION\s+(\{.*\})\s*$", text, re.M)
    if not m:
        raise ValueError("no ACTION line; end every reply with one")
    return json.loads(m.group(1)), text[:m.end()]


# ---- the loop
files = sorted(os.path.relpath(os.path.join(d, f), REPO)
               for d, _, fs in os.walk(REPO) for f in fs if "__pycache__" not in d)
transcript = [f"TASK: {TASK}\nFILES IN THE REPOSITORY:\n" + "\n".join(files)]
log("start", step=3, rules=RULES, model=MODEL, system=SYSTEM, max_turns=MAX_TURNS)
errors, stop = 0, "max turns"
for turn in range(1, MAX_TURNS + 1):
    prompt = "\n\n".join(transcript) + "\n\nYour next reply:"
    text, usage, secs = model(prompt)
    try:
        action, kept = parse(text)
        tool, args = action["tool"], action.get("args", {})
    except Exception as e:  # malformed reply: say so and let the model try again
        errors += 1
        transcript.append(f"--- turn {turn}: you ---\n{text}\n--- turn {turn}: harness ---\nerror: {e}")
        log("turn", turn=turn, prompt=prompt, text=text, observation=f"error: {e}", usage=usage, seconds=round(secs, 2))
        if errors >= MAX_ERRORS:
            stop = "too many malformed replies"
            break
        continue
    errors = 0
    transcript.append(f"--- turn {turn}: you ---\n{kept}")
    if tool == "finish":
        log("turn", turn=turn, prompt=prompt, text=text, discarded=text[len(kept):], action=action, usage=usage, seconds=round(secs, 2))
        stop = "finish"
        break
    decision, why = check(tool, args) if tool in TOOLS else ("allow", "unknown tool: no rule needed")
    if decision == "deny":
        obs = f"permission denied ({why}). Choose another action."
    else:
        try:
            obs = TOOLS[tool](**args)
        except Exception as e:  # unknown tool, bad arguments, missing file: tell the model
            obs = f"error: {type(e).__name__}: {e}"
    transcript.append(f"--- turn {turn}: result of {tool} ---\n{obs}")
    log("turn", turn=turn, prompt=prompt, text=text, discarded=text[len(kept):], action=action, observation=obs,
        decision=decision, why=why, usage=usage, seconds=round(secs, 2))
log("stop", reason=stop)
r = subprocess.run(["python3", "tests/test_core.py"], cwd=REPO, capture_output=True, text=True)
log("verdict", passed=r.returncode == 0, output=r.stdout + r.stderr)
