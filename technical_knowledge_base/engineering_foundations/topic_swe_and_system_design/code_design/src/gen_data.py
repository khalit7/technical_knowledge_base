"""Build parts/30_js_data.js (window.CD) from the measured inputs. Run after any measurement:
  python3 gen_data.py
Inputs: inputs/refactor_steps.json (refactor/run_steps.py), inputs/llmcall.json (llmcall/measure.py),
inputs/bench_models.json (bench/bench_models.py), inputs/review_proofs.json (review/proofs.py),
inputs/probe_untested.json (refactor/probe_untested.py), and refactor/steps/step9.py (module depth).
"""
import ast, json, pathlib, re

HERE = pathlib.Path(__file__).parent
I = HERE / "inputs"
rs = json.loads((I / "refactor_steps.json").read_text())
llm = json.loads((I / "llmcall.json").read_text())
bench = json.loads((I / "bench_models.json").read_text())
proofs = json.loads((I / "review_proofs.json").read_text())
probe = json.loads((I / "probe_untested.json").read_text())
crash = json.loads((I / "probe_crash.json").read_text())
lib = json.loads((I / "libdemo.json").read_text())
lib["pyproject"] = (HERE / "libdemo" / "pyproject.toml").read_text()

steps = []
for s in rs["steps"]:
    steps.append({k: s[k] for k in ("step", "title", "why", "handler", "handler_lines", "handler_sloc", "cc_handler",
                                     "cc_max", "cc_mean", "n_funcs", "mi", "module_sloc", "passed", "total",
                                     "diff_add", "diff_del")} |
                 {"ruff": [v["code"] for v in s["ruff"]], "ruff_msg": [v["code"] + " " + v["msg"] for v in s["ruff"]],
                  "fails": [{"name": t["name"], "msg": t["msg"]} for t in s["tests"] if not t["ok"]],
                  "tests": [t["name"] for t in s["tests"]],
                  "diff": s["diff"][:80]})

# Module depth (Ousterhout): for each helper in the final step, interface = parameters a caller must
# supply, implementation = source lines of the body. Both counted from the real file.
src = (HERE / "refactor" / "steps" / "step10.py").read_text()
lines = src.splitlines()
depth = []
WANT = ["who", "take_token", "enforce_rate_limit", "current_owner", "request_fingerprint", "claim_key",
        "require_key", "chat_exists", "idempotency_claim", "make_reply", "save_reply", "send_message"]
for n in ast.parse(src).body:
    if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name in WANT:
        body = [l for l in lines[n.body[0].lineno - 1:n.end_lineno] if l.strip() and not l.strip().startswith("#")]
        if isinstance(n.body[0], ast.Expr) and isinstance(getattr(n.body[0], "value", None), ast.Constant):
            ds = n.body[0]
            body = [l for l in lines[ds.end_lineno:n.end_lineno] if l.strip() and not l.strip().startswith("#")]
        depth.append({"name": n.name, "params": len(n.args.args) + len(n.args.kwonlyargs), "body": len(body)})

# 2026-11-07 (3D stages): the same depth count for step 9, where the handler still called release_key itself
# (Fig. 3 shows the leak and step 10's fix), and the call sites of release_key in each handler.
def helpers(path, want):
    src = path.read_text(); ls = src.splitlines(); out = []
    for n in ast.parse(src).body:
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name in want:
            first = n.body[0]
            lo = first.end_lineno if isinstance(first, ast.Expr) and isinstance(getattr(first, "value", None), ast.Constant) else first.lineno - 1
            out.append({"name": n.name, "params": len(n.args.args) + len(n.args.kwonlyargs),
                        "body": sum(1 for l in ls[lo:n.end_lineno] if l.strip() and not l.strip().startswith("#"))})
    return out
depth9 = helpers(HERE / "refactor" / "steps" / "step9.py", WANT + ["release_key"])
release_calls = {str(s["step"]): s["handler"].count("release_key(") for s in rs["steps"] if s["step"] in (9, 10)}

# Functional core, imperative shell (Fig. 5): every function and method of llmcall/after.py with its group (from the file's own
# section comments), source lines of its body (same count as above) and its McCabe complexity as measured by radon in measure.py.
def fcis_parts():
    path = HERE / "llmcall" / "after.py"; src = path.read_text(); ls = src.splitlines(); out = []
    group = None
    marks = {i + 1: m.group(1) for i, l in enumerate(ls) if (m := re.match(r"# -+ (\w+):", l))}
    cc = llm["static"]["after"]["cc_by_func"]
    def body(n):
        first = n.body[0]
        lo = first.end_lineno if isinstance(first, ast.Expr) and isinstance(getattr(first, "value", None), ast.Constant) else first.lineno - 1
        return sum(1 for l in ls[lo:n.end_lineno] if l.strip() and not l.strip().startswith("#") and l.strip() != "...")
    for n in ast.parse(src).body:
        g = [v for k, v in marks.items() if k < n.lineno][-1] if any(k < n.lineno for k in marks) else None
        if isinstance(n, ast.FunctionDef):
            out.append({"name": n.name, "group": g, "sloc": body(n), "cc": cc.get(n.name)})
        elif isinstance(n, ast.ClassDef):
            for m in n.body:
                if isinstance(m, ast.FunctionDef):
                    nm = n.name + "." + m.name
                    out.append({"name": nm, "group": g, "sloc": body(m), "cc": cc.get(nm)})
    return out
fcis = {"after": fcis_parts(), "before": {"name": "summarize", "sloc": llm["static"]["before"]["sloc"], "cc": llm["static"]["before"]["cc_max"]}}

data = {
    "env": rs["env"], "ruff_rules": rs["ruff_rules"], "steps": steps, "probe": probe, "crash": crash,
    "llm": {"env": llm["env"], "scen": llm["scenarios"], "static": llm["static"], "unit": llm["unit_tests"],
            "before": llm["before_src"], "after": llm["after_src"]},
    "bench": bench, "proofs": proofs, "depth": depth, "lib": lib,
    "depth9": depth9, "release_calls": release_calls, "fcis": fcis,
}
js = "// generated by gen_data.py from src/inputs/*.json; do not edit\nwindow.CD=" + json.dumps(data, separators=(",", ":")) + ";\n"
(HERE / "parts" / "30_js_data.js").write_text(js)
print(len(js), "bytes;", len(steps), "steps;", depth)
