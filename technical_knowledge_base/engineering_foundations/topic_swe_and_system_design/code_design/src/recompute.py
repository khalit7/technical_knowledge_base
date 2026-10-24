"""Recompute every derived number the page shows, from the measured inputs, independently of the page's JavaScript.
check_page.mjs compares its output with what the page renders. Run: python3 recompute.py"""
import json, pathlib
I = pathlib.Path(__file__).parent / "inputs"
b = json.loads((I / "bench_models.json").read_text())["ns_per_object"]
rs = json.loads((I / "refactor_steps.json").read_text())["steps"]
llm = json.loads((I / "llmcall.json").read_text())
crash = json.loads((I / "probe_crash.json").read_text())
steps = [s for s in rs if s["step"] != "bigbang"]
bang = next(s for s in rs if s["step"] == "bigbang")
out = {
    "pdRatio": f'{b["pydantic BaseModel(...)"] / b["dataclass(slots=True)"]:.1f}',
    "cc": [s["cc_handler"] for s in steps], "lines": [s["handler_lines"] for s in steps],
    "passed": [s["passed"] for s in steps], "total": [s["total"] for s in steps],
    "bang": {"cc": bang["cc_handler"], "lines": bang["handler_lines"], "passed": bang["passed"], "total": bang["total"]},
    "before_none": sum(1 for s in llm["scenarios"] if s["before"]["result"] == "returns None"),
    "before_retry_sleep": sum(2 ** a for a in range(3)),            # 1 + 2 + 4: before.py sleeps after every attempt
    "before_max_slept": max(s["before"]["slept_s"] for s in llm["scenarios"]),
    "crash_retry_until_step9": sorted({v["retry"] for k, v in crash.items() if k != "step10"}),
    "crash_retry_step10": crash["step10"]["retry"],
}

# 2026-10-24 rebuild: figures added to Reading
import re, ast
CON = [("auth", r"authoriz|who\(|unauthorized|owner: Owner|if not owner"),
       ("rate", r"take_token|rate_headers|limit_headers|enforce_rate|if not ok|Retry in|Retry-After"),
       ("idem", r"idempotency|req_hash|claim|replay|release|require_key|fingerprint|IntegrityError|old_hash|status ==|saved|Idempotent|\bkey\b|new key|Retry after"),
       ("store", r"DB\.|save_reply|chat_exists|msg_id|credits|\bout = |chat_id, owner|Chat not found"),
       ("model", r"sleep|reply|fake_stream|StreamingResponse|body\.stream|Cache-Control")]
def concern(l):
    for k, rx in CON:
        if re.search(rx, l): return k
    return None
def runs(handler):
    r, prev = {}, None
    for l in handler.split("\n"):
        c = concern(l)
        if c and c != prev: r[c] = r.get(c, 0) + 1
        if c: prev = c
    return r
out["idem_runs_before"] = runs(steps[0]["handler"])["idem"]
src = (pathlib.Path(__file__).parent / "refactor" / "steps" / "step10.py").read_text().splitlines()
tree = ast.parse("\n".join(src))
body = {}
for n in tree.body:
    if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
        start = n.body[0]
        lo = start.end_lineno if isinstance(start, ast.Expr) and isinstance(getattr(start, "value", None), ast.Constant) else start.lineno - 1
        body[n.name] = (len(n.args.args) + len(n.args.kwonlyargs), sum(1 for l in src[lo:n.end_lineno] if l.strip() and not l.strip().startswith("#")))
HELP = {"auth": ["current_owner", "who"], "rate": ["enforce_rate_limit", "take_token"],
        "idem": ["idempotency_claim", "claim_key", "request_fingerprint", "require_key"], "store": ["save_reply", "chat_exists"], "model": ["make_reply"]}
out["hidden"] = {k: sum(body[n][1] for n in v) for k, v in HELP.items()}
out["claim_key"] = body["claim_key"]
out["composition"] = {k: [2 * 2 ** k, 2 + k] for k in (1, 2, 3)}
assert out["before_retry_sleep"] == out["before_max_slept"]
print(json.dumps(out))
