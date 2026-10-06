#!/usr/bin/env python3
# Building a harness: the Loop lab's loop (topic root, step 5) moved onto NATIVE tool calling.
# The model now gets JSON-schema tool definitions in the request and answers with structured
# tool_calls (OpenAI chat-completions shape, served by mlx_lm.server for a local model), so the
# harness no longer parses text. Everything else is the Loop lab's: the same four tools, the same
# permission gate, the same running example. Standard library only (urllib), so every byte sent is visible.
#
# Stop conditions are the subject of this page, so this harness records them instead of only obeying
# them: it runs to a generous turn cap and logs, per turn, what each candidate stop rule would have said.
# The page replays the logs under different rules.
#
# Usage: native.py REPO LOG [--temp T] [--max-turns N] [--seed S]
import argparse, concurrent.futures as cf, hashlib, json, os, re, subprocess, sys, time, urllib.request

ap = argparse.ArgumentParser()
ap.add_argument("repo"); ap.add_argument("log")
ap.add_argument("--temp", type=float, default=0.0)
ap.add_argument("--max-turns", type=int, default=25)
ap.add_argument("--seed", type=int, default=0)
ap.add_argument("--base", default="http://127.0.0.1:8090/v1")
ap.add_argument("--model", default="mlx-community/Qwen3-4B-Instruct-2507-4bit")
ap.add_argument("--stop-rule", choices=["naive", "careful", "verify"], default="careful",
                help="naive: any reply without a tool call ends the run (the first recorded runs); "
                     "careful: a reply cut by max_tokens is not a stop; verify: careful, and the harness "
                     "runs the tests itself before accepting a stop")
ap.add_argument("--max-nudges", type=int, default=3)
A = ap.parse_args()
REPO, LOG = A.repo, A.log
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"  # keep __pycache__ out of what the model sees
TASK = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests."
SYSTEM = ("You are a coding agent working in a small Python repository. Use the tools to look at the code, "
          "run the tests, and edit files. When the tests pass, reply with a one-sentence summary and no tool call. "
          "Never use the em-dash character.")

# ---- tool definitions: what the model sees (name, description, JSON schema)
def fn(name, desc, props=None, req=None):
    return {"type": "function", "function": {"name": name, "description": desc,
            "parameters": {"type": "object", "properties": props or {}, "required": req or []}}}

TOOLS = [
    fn("read_file", "Return the text of a file in the repository.",
       {"path": {"type": "string", "description": "Path relative to the repository root."}}, ["path"]),
    fn("run_tests", "Run the test suite (python3 tests/test_core.py). The first line is the exit code."),
    fn("edit_file", "Replace one exact piece of text in a file. old must appear exactly once in the file; "
       "copy it exactly, including indentation.",
       {"path": {"type": "string"}, "old": {"type": "string"}, "new": {"type": "string"}}, ["path", "old", "new"]),
    fn("run_command", "Run a shell command in the repository root and return its output.",
       {"cmd": {"type": "string"}}, ["cmd"]),
]
READ_ONLY = {"read_file", "run_tests"}   # safe to run side by side when the model asks for several


# ---- tools: plain functions (as in the Loop lab)
def inside(path):
    p = os.path.realpath(os.path.join(REPO, path))
    if not p.startswith(os.path.realpath(REPO) + os.sep):
        raise ValueError("path is outside the repository")
    return p

def read_file(path):
    return open(inside(path)).read()

def run_tests():
    r = subprocess.run(["python3", "tests/test_core.py"], cwd=REPO, stdout=subprocess.PIPE,
                       stderr=subprocess.STDOUT, text=True, timeout=60)
    return f"exit code {r.returncode}\n{r.stdout}"

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

IMPL = {"read_file": read_file, "run_tests": run_tests, "edit_file": edit_file, "run_command": run_command}

# ---- the Loop lab's permission gate (step 5 rules), first match wins; nobody to ask, so ask = deny
RULES = [
    ("deny", "edit_file", r"^tests/"),
    ("deny", "run_command", r"\b(rm|curl|wget|pip|sudo|git push)\b"),
    ("ask", "run_command", r"[;&|`$<>]"),
    ("allow", "read_file", r""), ("allow", "run_tests", r""),
    ("allow", "edit_file", r"^textstats/"),
    ("allow", "run_command", r"^(ls|cat|grep|head|python3 tests/test_core\.py)\b"),
]

def check(tool, args):
    subject = str(args.get("path") or args.get("cmd") or "")
    for v, t, pattern in RULES:
        if t == tool and re.search(pattern, subject):
            return ("allow" if v == "allow" else "deny"), f"{v} rule ({t}, {pattern!r})"
    return "deny", "no rule matched and nobody can be asked"


def run_one(call):
    """Validate, gate and execute one tool call. Never raises: errors become observations."""
    name = call["function"]["name"]
    try:
        args = json.loads(call["function"].get("arguments") or "{}")
        if not isinstance(args, dict):
            raise ValueError("arguments must be a JSON object")
    except Exception as e:
        return name, {}, "error", f"error: arguments are not valid JSON ({e})"
    if name not in IMPL:
        return name, args, "error", f"error: there is no tool named {name}; tools: {', '.join(IMPL)}"
    verdict, why = check(name, args)
    if verdict == "deny":
        return name, args, "denied", f"permission denied ({why}). Choose another action."
    try:
        return name, args, "ok", IMPL[name](**args)
    except TypeError as e:
        return name, args, "error", f"error: bad arguments for {name}: {e}"
    except Exception as e:
        return name, args, "error", f"error: {type(e).__name__}: {e}"


def post(body):
    req = urllib.request.Request(A.base + "/chat/completions", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer local"})
    t = time.time()
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.loads(r.read()), time.time() - t


def log(kind, **d):
    with open(LOG, "a") as f:
        f.write(json.dumps({"kind": kind, **d}) + "\n")


def tests_pass():
    r = subprocess.run(["python3", "tests/test_core.py"], cwd=REPO, capture_output=True, text=True)
    return r.returncode == 0


files = sorted(os.path.relpath(os.path.join(d, f), REPO)   # as in the Loop lab: the task lists the files
               for d, _, fs in os.walk(REPO) for f in fs if "__pycache__" not in d)
messages = [{"role": "system", "content": SYSTEM},
            {"role": "user", "content": TASK + "\nFILES IN THE REPOSITORY:\n" + "\n".join(files)}]
log("start", user=messages[1]["content"], stop_rule=A.stop_rule, model=A.model, temp=A.temp, seed=A.seed, max_turns=A.max_turns, system=SYSTEM, task=TASK, tools=TOOLS, rules=RULES)
seen = {}          # hash of (tool, args) -> times asked: feeds the repeated-call rule
stop, spent, nudges = "turn cap", 0, 0
for turn in range(1, A.max_turns + 1):
    body = {"model": A.model, "messages": messages, "tools": TOOLS, "temperature": A.temp,
            "max_tokens": 1024, "seed": A.seed * 1000 + turn}
    try:
        resp, secs = post(body)
    except Exception as e:
        log("infra_error", turn=turn, error=str(e)); stop = "infrastructure error"; break
    ch = resp["choices"][0]; msg = ch["message"]; usage = resp.get("usage", {})
    spent += usage.get("prompt_tokens", 0) + usage.get("completion_tokens", 0)
    calls = msg.get("tool_calls") or []
    entry = {"turn": turn, "finish_reason": ch.get("finish_reason"), "content": msg.get("content") or "",
             "tool_calls": calls, "usage": usage, "seconds": round(secs, 2), "spent": spent,
             "n_messages": len(messages), "passing_before": tests_pass()}
    assistant = {"role": "assistant", "content": msg.get("content") or ""}
    if calls:
        assistant["tool_calls"] = calls
    messages.append(assistant)
    if not calls:  # the model's own stop: a reply with no tool call ... or is it?
        entry["results"] = []
        if A.stop_rule != "naive" and ch.get("finish_reason") == "length":
            note = (f"Your reply was cut off at the output limit ({body['max_tokens']} tokens) before any tool call. "
                    "Continue, more briefly.")
            messages.append({"role": "user", "content": note})
            entry["harness_note"] = note
            log("turn", **entry); continue
        if A.stop_rule != "naive" and not (msg.get("content") or "").strip():
            # mlx_lm.server drops a tool call whose JSON does not parse, leaving an empty reply
            note = "Your reply was empty (a tool call that is not valid JSON is dropped). Try again."
            messages.append({"role": "user", "content": note})
            entry["harness_note"] = note
            log("turn", **entry); continue
        if A.stop_rule == "verify" and not tests_pass() and nudges < A.max_nudges:
            nudges += 1
            note = "The harness ran python3 tests/test_core.py and it still fails:\n" + run_tests() + \
                   "\nThe task is not done. Continue."
            messages.append({"role": "user", "content": note})
            entry["harness_note"] = note
            log("turn", **entry); continue
        log("turn", **entry); stop = "model stopped (no tool call)"; break
    # several calls in one reply: read-only ones run side by side, anything that writes runs alone, in order
    results = [None] * len(calls)
    if all(c["function"]["name"] in READ_ONLY for c in calls) and len(calls) > 1:
        with cf.ThreadPoolExecutor(4) as ex:
            for i, r in enumerate(ex.map(run_one, calls)):
                results[i] = r
    else:
        for i, c in enumerate(calls):
            results[i] = run_one(c)
    entry["results"] = []
    for c, (name, args, status, out) in zip(calls, results):
        key = hashlib.sha1(json.dumps([name, args], sort_keys=True).encode()).hexdigest()[:10]
        seen[key] = seen.get(key, 0) + 1
        messages.append({"role": "tool", "tool_call_id": c.get("id", ""), "content": out})
        entry["results"].append({"name": name, "args": args, "status": status, "output": out,
                                 "key": key, "times_asked": seen[key]})
    entry["passing_after"] = tests_pass()
    log("turn", **entry)
log("stop", reason=stop, turns=turn, spent=spent)
log("verdict", passed=tests_pass())
