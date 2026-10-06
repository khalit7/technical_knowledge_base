"""A tiny online evaluator: rule-based scores computed from what each run left behind, written to Langfuse
as scores on the run's trace, then read back. No model is involved.
Usage: python scorer.py FOBS_DIR OUT.json"""
import base64, json, os, sys, urllib.request

F, OUT = sys.argv[1], sys.argv[2]
AUTH = "Basic " + base64.b64encode(b"pk-lf-fobs:sk-lf-fobs").decode()


def call(method, path, body=None):
    req = urllib.request.Request("http://127.0.0.1:3100/api/public/" + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": AUTH, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def first_trace(path):
    return json.loads(open(path).readline())["context"]["trace_id"][2:]


runs = []
for key, label in (("manual", "hand-instrumented loop, local Qwen3-4B"), ("pydantic_ai", "Pydantic AI, local Qwen3-4B")):
    r = json.load(open(f"{F}/runs/v_{key}/result.json"))
    runs.append({"key": key, "label": label, "trace": first_trace(f"{F}/runs/v_{key}/spans.jsonl"),
                 "final": r["final"], "tests_pass": "0 failed" in r["tests_tail"], "turns": r["turns"], "cost": None})
for key, label, pfx in (("cc_default", "Claude Code, Haiku 4.5", "cccc"),):
    st = [json.loads(l) for l in open(f"{F}/cc/default.jsonl") if l.startswith("{")]
    fin = [x for x in st if x.get("type") == "result"][-1]
    tests = open(f"{F}/cc/w_default/textstats/core.py").read()
    runs.append({"key": key, "label": label, "trace": pfx + "bacc9dd1a5c6204a4c9112f86e54", "final": fin["result"],
                 "tests_pass": None, "turns": fin["num_turns"], "cost": fin["total_cost_usd"]})
import subprocess  # noqa: E402
p = subprocess.run(["python3", "tests/test_core.py"], cwd=f"{F}/cc/w_default", capture_output=True, text=True)
runs[-1]["tests_pass"] = p.returncode == 0

out = []
for r in runs:
    low = r["final"].lower()
    scores = {"tests_pass": 1 if r["tests_pass"] else 0,
              "summary_complete": 1 if ("tokenize" in low or "apostrophe" in low) and ("top_words" in low or "tie" in low or "alphabetical" in low) else 0,
              "turns": r["turns"]}
    if r["cost"] is not None:
        scores["cost_usd"] = r["cost"]
    ids = {}
    for name, v in scores.items():
        if os.environ.get("NO_POST"):
            continue
        ids[name] = call("POST", "scores", {"traceId": r["trace"], "name": name, "value": v, "dataType": "NUMERIC",
                                             "comment": "rule-based, fobs scorer.py"})["id"]
    out.append({"key": r["key"], "label": r["label"], "scores": scores, "final_excerpt": r["final"][:220]})
back = call("GET", "v3/scores?limit=100")
json.dump({"runs": out, "read_back": len(back.get("data", [])), "read_back_names": sorted({s["name"] for s in back.get("data", [])})},
          open(OUT, "w"), indent=1)
print(json.dumps(out, indent=1)[:1500], len(back.get("data", [])))
