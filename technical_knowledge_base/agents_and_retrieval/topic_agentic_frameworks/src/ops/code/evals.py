"""A tiny regression suite over recorded agent runs (no model calls).

Usage: python evals.py TASK_REPO TRACE_REC_DIR ORCH_REC_DIR OWN_REC_DIR OUT.json
For each recorded run of the standard task it rebuilds the final code (original task repo + the run's diff),
reruns the visible tests and six hidden checks, and reads the trajectory for behaviour checks.
Inputs are the redacted recordings already in the repo, so the suite itself is reproducible.
"""
import json, os, re, shutil, subprocess, sys, tempfile

TASK, TRACE, ORCH, OWN, OUT = sys.argv[1:6]
HIDDEN = json.load(open(os.path.join(ORCH, "baseline.json")))["hidden_source"]


def final_checks(diff_text):
    d = tempfile.mkdtemp()
    shutil.copytree(TASK, os.path.join(d, "r"))
    r = os.path.join(d, "r")
    touched = sorted(set(re.findall(r"^\+\+\+ /work/(\S+)", diff_text, re.M)))
    if diff_text.strip():
        p = subprocess.run(["patch", "-p2", "-s", "-d", r], input=diff_text, text=True, capture_output=True)
        if p.returncode != 0:
            return {"error": "patch failed: " + p.stderr[:200], "touched": touched}
    t = subprocess.run(["python3", "tests/test_core.py"], cwd=r, capture_output=True, text=True, timeout=60)
    h = subprocess.run(["python3", "-c", HIDDEN], cwd=r, capture_output=True, text=True, timeout=60)
    shutil.rmtree(d)
    hidden = json.loads(h.stdout) if h.returncode == 0 else []
    return {"tests_pass": "0 failed" in t.stdout, "tests_out": t.stdout.strip().splitlines()[-1] if t.stdout.strip() else "",
            "hidden": hidden, "touched": touched}


def trajectory(path):
    """Tool calls in order, permission denials, last edit and last test run positions, result record."""
    calls, denials, res = [], 0, None
    for line in open(path):
        d = json.loads(line)
        t = d.get("type")
        if t == "assistant":
            for c in d["message"].get("content", []):
                if c.get("type") == "tool_use":
                    calls.append({"name": c["name"], "cmd": json.dumps(c.get("input", {}))[:160], "id": c.get("id"), "denied": False})
        elif t == "user":
            cont = d.get("message", {}).get("content", [])
            for c in cont if isinstance(cont, list) else []:
                if c.get("type") == "tool_result" and c.get("is_error"):
                    txt = json.dumps(c.get("content", ""))
                    if re.search(r"permission|denied|haven't granted|not allowed|requires approval", txt, re.I):
                        for x in calls:
                            if x["id"] == c.get("tool_use_id"):
                                x["denied"] = True
        elif t == "result":
            res = d
    edits = [i for i, c in enumerate(calls) if c["name"] in ("Edit", "Write", "MultiEdit")]
    tests = [i for i, c in enumerate(calls) if c["name"] == "Bash" and "test" in c["cmd"] and not c["denied"]]
    denials = len((res or {}).get("permission_denials") or []) or sum(1 for c in calls if c["denied"])
    return {"n_tools": len(calls), "tools": [c["name"] for c in calls], "denials": denials,
            "tested_after_edit": bool(edits and tests and tests[-1] > edits[-1]),
            "turns": res.get("num_turns") if res else None, "cost": res.get("total_cost_usd") if res else None,
            "wall_s": round(res.get("duration_ms", 0) / 1000, 1) if res else None,
            "model": next(iter((res or {}).get("modelUsage", {}) or {}), None)}


runs = []
meta_index = json.load(open(os.path.join(os.path.dirname(TRACE.rstrip("/")), "runs.json")))
for name in sorted(meta_index):
    if not re.match(r"(std|md|log|nocache|ttl5m|sub|plan)_", name):
        continue
    meta = json.load(open(os.path.join(TRACE, name + ".meta.json")))
    r = {"run": name, "source": "harness root, Trace lab", "group": meta_index[name].get("group"),
         "title": meta_index[name].get("title")}
    r.update(trajectory(os.path.join(TRACE, name + ".jsonl")))
    r.update(final_checks(meta.get("diff", "")))
    runs.append(r)
for name in ("agent", "agent_denied"):
    p = os.path.join(ORCH, name)
    s = json.load(open(os.path.join(p, "summary.json")))
    r = {"run": "orch_" + name, "source": "this page, Orchestration lab", "group": "orch",
         "title": {"agent": "Free agent, Haiku (Orchestration lab)", "agent_denied": "Free agent, Haiku, allow-list python3 only"}[name]}
    r.update(trajectory(os.path.join(p, "agent.jsonl")))
    r.update({"tests_pass": bool(s.get("passed")), "tests_out": s.get("test_output", "").strip().splitlines()[-1],
              "hidden": s.get("hidden") or next((e["detail"]["hidden"] for e in s["events"] if e.get("node") == "test"), []),
              "touched": []})
    runs.append(r)
own = os.path.join(OWN, "cc_otel_haiku.jsonl")
if os.path.exists(own):
    r = {"run": "ops_cc_otel", "source": "this tab, tracing run", "group": "std", "title": "Fix the tests, Haiku, with OpenTelemetry on"}
    r.update(trajectory(own))
    r.update(final_checks(open(os.path.join(OWN, "cc_otel_haiku.diff")).read()))
    runs.append(r)
json.dump({"runs": runs}, open(OUT, "w"), indent=1)
for r in runs:
    print(r["run"], r.get("tests_pass"), sum(1 for x in r.get("hidden", []) if x[1]), r["turns"], r["cost"], r["denials"], r["tested_after_edit"], r.get("touched"))
