"""Redact and compact the raw gateway recordings into src/recordings/fgw_runs.json.

Usage: python3 extract.py <raw run dir>   (the scratch folder holding runs/ and inputs/; never committed)
Keeps only what the page draws: times relative to each case's start, statuses, which fake provider answered,
error types. Removes: virtual keys and their hashes, request ids, the Claude session ids, any local path,
model-server fingerprints. Claude runs keep only the answer text, token usage, cost and duration.
Fails if anything that looks private survives (see the checks at the end)."""
import json, os, re, sys

RAW = sys.argv[1]
R = lambda *p: os.path.join(RAW, *p)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "recordings", "fgw_runs.json")


def jl(path):
    return [json.loads(l) for l in open(path) if l.strip()]


def scrub(s):
    s = re.sub(r"Key=[0-9a-f]{20,}", "Key=<key hash>", s or "")
    s = re.sub(r"\(sk-\.\.\.[A-Za-z0-9]{2,8}\)", "(sk-...)", s)
    s = re.sub(r"api_key: [0-9a-f]{20,}", "api_key: <key hash>", s)
    s = re.sub(r"sk-[A-Za-z0-9_-]{10,}", "sk-<key>", s)
    return s.replace("\u2014", ", ")


out = {"note": "Recorded 2026-10-06 on an Apple M1 Pro; LiteLLM 1.104.0. Fake providers A (0.2 s), B (1.0 s), C (scripted)."}

# E1 routing strategies
e1 = json.load(open(R("runs", "e1_routing.json")))
out["e1"] = {"n": e1["n"], "conc": e1["concurrency"], "lat": e1["base_latency_s"],
             "cases": [{"s": c["strategy"], "count": c["count"], "wall": c["wall_s"],
                        "r": [[x["t0"], x["t1"], x["dep"]] for x in c["requests"]]} for c in e1["cases"]]}

# E2 failures: caller view plus every upstream attempt (from the fake providers' logs)
e2 = json.load(open(R("runs", "e2_failures.json")))
prov = jl(R("runs", "prov_A.jsonl")) + jl(R("runs", "prov_C.jsonl"))
cases = []
for c in e2["cases"]:
    ts = c["t_start"]
    reqs = []
    for r in c["requests"]:
        att = sorted([p for p in prov if p["msg"] == f"{c['key']} req {r['i']}" and p["t0"] >= ts - 0.5], key=lambda p: p["t0"])
        reqs.append({"i": r["i"], "t0": r["t0"], "t1": r["t1"], "ok": r["ok"], "dep": r.get("dep"), "err": r.get("error"),
                     "att": [[p["name"], p["status"], round(p["t0"] - ts, 3), round(p["t1"] - ts, 3)] for p in att]})
    cases.append({"key": c["key"], "label": c["label"], "beh": c["behaviour_C"], "kw": c["router_kwargs"], "reqs": reqs})
out["e2"] = cases

# E3 amplification
e3 = json.load(open(R("runs", "e3_amplify.json")))
provC = jl(R("runs", "prov_C.jsonl"))
out["e3"] = {"gateway": e3["gateway"], "sdk": e3["openai_sdk"], "cases": []}
for c in e3["cases"]:
    ts = c["t_start"]
    att = sorted([p for p in provC if p["tag"] == c["key"]], key=lambda p: p["t0"])
    out["e3"]["cases"].append({"key": c["key"], "label": c["label"], "tmo": c["client_timeout_s"], "mr": c["client_max_retries"],
                               "done": c["client_done_s"], "err": c["result"].get("error"),
                               "ev": [[e["ev"], e["t"]] for e in c["events"]],
                               "att": [[round(p["t0"] - ts, 3), round(p["t1"] - ts, 3)] for p in att]})

# E4 rate limits and E5 budgets
e4 = json.load(open(R("runs", "e4_limits.json")))
q = e4["requests"]
out["e4"] = {"rpm": e4["rpm_limit"],
             "steady": [[x["t0"], x["status"]] for x in q if x["case"] == "steady"],
             "burst": [[x["t0"], x["status"]] for x in q if x["case"] == "burst"],
             "err429": scrub(next(x["err_msg"] for x in q if x["status"] == 429)),
             "retry_after": next(x["retry_after"] for x in q if x["status"] == 429)}
e5b = json.load(open(R("runs", "e5b_budget.json")))
e5b["cases"].update(json.load(open(R("runs", "e5c_noreserve.json")))["cases"])  # same driver, reservation switched off
out["e5"] = {"budget": e4["max_budget"], "per_call": e4["price_per_call_usd"],
             "seq": [[x["t0"], x["t1"], x["status"]] for x in q if x["case"] == "budget_seq"],
             "conc": [[x["t0"], x["t1"], x["status"]] for x in q if x["case"] == "budget_conc"],
             "spend": {"seq": e4["spend"]["budget_seq_after_15s"], "conc": e4["spend"]["budget_conc_after_15s"]},
             "waves": {k: {"extra": v["extra"], "spend": v["spend_after"],
                           "r": [[x["wave"], x["t0"], x["t1"], x["status"]] for x in v["requests"]],
                           "msg": scrub(next((x["err_msg"] for x in v["requests"] if x["status"] == 422), ""))}
                       for k, v in e5b["cases"].items()},
             "err422": scrub(next(x["err_msg"] for x in q if x["status"] == 422)),
             # spend per key read back from the proxy after all runs (the in-run reads can precede the batched write)
             "spend_later": {k: v["spend"] for k, v in json.load(open(R("runs", "key_spend_later.json"))).items() if k.startswith("fgw-")}}

# E6 cache, E7 translation
e6 = json.load(open(R("runs", "e6_cache.json")))
out["e6"] = {"q": e6["question"], "steps": [{"k": s["step"], "label": s["label"], "params": s["params"], "s": s["seconds"],
                                              "key": (s["headers"]["x-litellm-cache-key"] or "")[:12], "text": scrub(s["text"])}
                                             for s in e6["steps"]]}
e7 = json.load(open(R("runs", "e7_translate.json")))
mlx = jl(R("runs", "mlx_proxy.jsonl"))
routes = []
for r in e7["routes"]:
    up = min((m for m in mlx if m["t0"] >= r["t0"] - 0.5 and m["path"] != "/v1/models"), key=lambda m: m["t0"])
    req = up["request"] or {}
    routes.append({"model": r["model"], "status": r["status"], "up_path": up["path"], "up_status": up["status"],
                   "up_keys": sorted(req.keys()),
                   "up_body": {k: req[k] for k in ("messages", "input", "instructions", "include") if k in req},
                   "reply": scrub(json.dumps({k: r["response"].get(k) for k in ("type", "role", "content", "stop_reason", "usage")}
                                             if r["status"] == 200 else r["response"]))})
out["e7"] = routes

# OpenRouter endpoints (public catalogue, read 2026-10-06)
models = json.load(open(R("inputs", "or_models.json")))["data"]
out["or_count"] = {"models": len(models), "authors": len({m["id"].split("/")[0] for m in models}),
                   "free": sum(1 for m in models if m["id"].endswith(":free"))}
eps = {}
for f in sorted(os.listdir(R("inputs"))):
    if f.startswith("ep_"):
        d = json.load(open(R("inputs", f)))["data"]
        eps[d["id"]] = [{"p": e.get("provider_name"), "tag": e.get("tag"), "in": float(e["pricing"]["prompt"]) * 1e6,
                         "out": float(e["pricing"]["completion"]) * 1e6, "q": e.get("quantization"), "ctx": e.get("context_length"),
                         "up": None if e.get("uptime_last_30m") is None else round(e["uptime_last_30m"], 2)}
                        for e in d["endpoints"]]
out["or_eps"] = eps

# Router experiment. Grading: a numeric answer is right if the first number in the final ANSWER line equals it
# (so "2500 grams" counts for 2500); a word answer must match exactly after lower-casing and stripping quotes.
def ok(got, gold):
    if got is None:
        return False
    if re.fullmatch(r"-?\d+", gold):
        m = re.search(r"-?\d[\d,]*", got)
        return bool(m) and m.group(0).replace(",", "") == gold
    return got.strip("'\" .") == gold


# Router experiment
T = json.load(open(R("runs", "r_tasks.json")))
L = json.load(open(R("runs", "r_local.json")))
H = json.load(open(R("runs", "r_haiku.json")))
out["router"] = {"tasks": [{"id": t["id"], "f": t["family"], "q": t["q"], "a": t["a"], "cr": t["cr_score"], "tier": t["cr_tier"],
                            "lo": L[t["id"]]["got"], "ho": H[t["id"]]["got"],
                            "lok": ok(L[t["id"]]["got"], t["a"]), "hok": ok(H[t["id"]]["got"], t["a"]),
                            "lt": L[t["id"]]["usage"]["completion_tokens"], "lin": L[t["id"]]["usage"]["prompt_tokens"],
                            "hc": H[t["id"]]["cost_usd"], "hin": H[t["id"]]["usage"]["input_tokens"], "hout": H[t["id"]]["usage"]["output_tokens"],
                            "ls": L[t["id"]]["seconds"], "hs": H[t["id"]]["seconds"],
                            "lx": scrub(L[t["id"]]["text"])[-400:], "hx": scrub(H[t["id"]]["text"] or "")[-400:]}
                           for t in T],
                 "haiku_model": sorted({k for v in H.values() for k in (v.get("model_usage") or {})})}

s = json.dumps(out, ensure_ascii=False)
for bad in ("/Users/", "Users-", os.path.basename(os.path.expanduser("~")), "glpat", "sk-ant", "@gmail", "macOS-", "system_fingerprint"):
    assert bad.lower() not in s.lower(), bad
assert not re.search(r"[0-9a-f]{40,}", s), "long hex id survived"
assert "\u2014" not in s
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=0)
print("wrote", OUT, len(s), "bytes")
