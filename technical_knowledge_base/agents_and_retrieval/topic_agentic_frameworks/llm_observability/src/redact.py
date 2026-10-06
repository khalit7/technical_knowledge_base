"""Copy the experiments' results from the scratch folder into recordings/ and data/, redacted.
Usage: python3 redact.py <scratch>/agents/fobs
Redaction: the experiment folder becomes /work; the home directory, login name and git identity are replaced
(found at run time by code/redact_common.py, so no copy of them is written here); every e-mail address except the
page's fake ones becomes user@example.invalid; Claude Code's account identity attributes (user.email, user.id,
user.account_uuid, user.account_id, organization.id) and session ids are replaced by labels; thinking signatures,
message uuids and rate-limit events are dropped; em-dashes become ", ". Fails if any private string survives."""
import json, os, sys, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "code"))
import redact_common as R  # noqa: E402
from otlp_flat import flat  # noqa: E402

F = os.path.abspath(sys.argv[1])
R.WORKROOT = F
REC, DAT = os.path.join(HERE, "recordings"), os.path.join(HERE, "data")
os.makedirs(REC, exist_ok=True)
os.makedirs(DAT, exist_ok=True)
IDENT = {"user.email": "user@example.invalid", "user.id": "user-id", "user.account_uuid": "account-uuid",
         "user.account_id": "account-id", "organization.id": "org-id", "session.id": "session-1"}
written = []


def dump(path, obj, lines=False):
    txt = "\n".join(json.dumps(o) for o in obj) + "\n" if lines else json.dumps(obj, indent=1)
    txt = R.scrub(txt)
    open(path, "w").write(txt)
    written.append(path)


# 1. the local-model run, as the locked proxy saw it (8 requests)
rows = [json.loads(l) for l in open(f"{F}/runs/record_proxy.jsonl")]
dump(f"{REC}/local_run_exchanges.jsonl", [{"call": i + 1, "seconds_holding_lock": round(r["t1"] - r["t0"], 2),
      "request_messages": r["request"]["messages"], "response": r["response"]} for i, r in enumerate(rows)], lines=True)

# 2. Claude Code stream-json recordings
def clean_stream(path):
    out, ids = [], {}
    for line in open(path):
        if not line.startswith("{"):
            continue
        d = json.loads(line)
        t = d.get("type")
        if t == "rate_limit_event":
            continue
        if t == "system" and d.get("subtype") == "init":
            d = {k: d.get(k) for k in ("type", "subtype", "model", "permissionMode", "tools", "claude_code_version")}
            d["cwd"] = "/work"
        for k in ("session_id", "uuid", "parent_tool_use_id", "request_id"):
            d.pop(k, None)
        msg = d.get("message")
        if isinstance(msg, dict):
            if msg.get("id"):
                msg["id"] = ids.setdefault(msg["id"], "msg-%d" % (len(ids) + 1))
            for c in msg.get("content") or []:
                if isinstance(c, dict):
                    c.pop("signature", None)
        out.append(d)
    return out


for k in ("default", "content"):
    dump(f"{REC}/cc_{k}.jsonl", clean_stream(f"{F}/cc/{k}.jsonl"), lines=True)


# 3. Claude Code + app + test-runner traces, flattened
def clean_trace(path, rel_to=None):
    S = [s for s in flat(path) if s["trace"] != "0af7651916cd43dd8448eb211c80319c"]
    t0 = min(s["t0"] for s in S)
    ids = {s["id"]: i for i, s in enumerate(sorted(S, key=lambda s: s["t0"]))}
    out = []
    for s in sorted(S, key=lambda s: s["t0"]):
        a = {k: (IDENT[k] if k in IDENT else v) for k, v in s["attrs"].items()}
        for k in ("client_request_id", "request_id", "gen_ai.response.id", "service.instance.id"):
            if k in a:
                a[k] = "id"
        out.append({"i": ids[s["id"]], "parent": ids.get(s["parent"], -1), "service": s["service"], "name": s["name"],
                    "kind": s["kind"], "t0": round((s["t0"] - t0) / 1e9, 3), "t1": round((s["t1"] - t0) / 1e9, 3),
                    "status": s["status"], "attrs": a,
                    "events": [{"name": e["name"], "t": round((e["t"] - t0) / 1e9, 3), "attrs": e["attrs"]} for e in s["events"]]})
    return out


dump(f"{REC}/cc_default_trace.json", clean_trace(f"{F}/cc/default_traces_raw.jsonl"))
dump(f"{REC}/cc_content_trace.json", clean_trace(f"{F}/cc/content_traces_raw.jsonl"))

# 4. instrumentation comparison (built by code/compare.py)
dump(f"{DAT}/instrumentations.json", json.load(open(f"{F}/instr.json")))

# 5. Langfuse: what it stored for the Claude Code trace, three ways
lfc = {}
for p, label in (("aaaa", "raw"), ("bbbb", "mapped"), ("cccc", "ttl")):
    obs = json.load(open(f"{F}/lfdata/cc_{p}.json"))["data"]
    lfc[label] = {"observations": len(obs), "types": dict(collections.Counter(o["type"] for o in obs)),
                  "generations": [{"start": o["startTime"], "model": o.get("model"), "usage": o.get("usageDetails"),
                                   "cost": o.get("costDetails"), "total": o.get("totalCost")}
                                  for o in sorted(obs, key=lambda o: o["startTime"]) if o["type"] == "GENERATION"],
                  "total_cost": round(sum(float(o.get("totalCost") or 0) for o in obs), 10)}
cost_metric, n = 0.0, 0
for line in open(f"{F}/cc/default_metrics_raw.jsonl"):
    for rm in json.loads(line)["resourceMetrics"]:
        for sm in rm["scopeMetrics"]:
            for m in sm["metrics"]:
                if m["name"] == "claude_code.cost.usage":
                    for dp in m["sum"]["dataPoints"]:
                        cost_metric += dp["asDouble"]
                        n += 1
fin = [d for d in clean_stream(f"{F}/cc/default.jsonl") if d.get("type") == "result"][-1]
lfc["claude_code_result"] = {"total_cost_usd": fin["total_cost_usd"], "num_turns": fin["num_turns"],
                             "usage": fin.get("usage"), "modelUsage": fin.get("modelUsage")}
lfc["cost_metric"] = {"sum_usd": round(cost_metric, 10), "exports": n, "temporality": "delta"}
dump(f"{DAT}/langfuse_cc.json", lfc)

# 6. redaction, sampling, scores, Langfuse stack
dump(f"{DAT}/redaction.json", json.load(open(f"{F}/results_redaction.json")))
# where the OS login name sat in the Claude Code content trace, by attribute (counts only; user.email is the account address)
dump(f"{DAT}/login_breakdown.json", json.load(open(f"{F}/login_breakdown.json")))
_raw = flat(f"{F}/cc/content_traces_raw.jsonl")
BASH_ID = next(s["id"] for s in _raw if s["name"] == "claude_code.tool" and any("drwx" in json.dumps(e["attrs"]) for e in s["events"]))


def pick(spans):
    """the two spans the page shows: the interaction (prompt) and the Bash tool span whose output came from `ls -la`"""
    inter = next(s for s in spans if s["name"] == "claude_code.interaction")
    bash = next(s for s in spans if s["id"] == BASH_ID)
    keep = ("user_prompt", "user.email", "tool_name", "full_command", "file_path", "redaction.masked.count",
            "redaction.masked.keys", "redaction.redacted.count", "span.type")
    return [{"name": s["name"], "attrs": {k: s["attrs"][k] for k in keep if k in s["attrs"]},
             "events": [{"name": e["name"], "attrs": e["attrs"]} for e in s["events"]]} for s in (inter, bash)]


cc_tid = flat(f"{F}/cc/content_traces_raw.jsonl")[0]["trace"][4:]
ex = {"before": pick([dict(s, attrs={k: (IDENT[k] if k in IDENT else v) for k, v in s["attrs"].items()})
                      for s in flat(f"{F}/cc/content_traces_raw.jsonl")])}
for name in ("mask", "hash", "allowlist"):
    ex[name] = pick([s for s in flat(f"{F}/col/out_red/{name}.jsonl") if s["trace"][4:] == cc_tid])
dump(f"{DAT}/redaction_examples.json", ex)

samp = {"replay_failed": json.load(open(f"{F}/col/out_samp/replay_log.json")), "configs": {}}
for name in ("short", "short_cached", "long", "root"):
    p = f"{F}/col/out_samp/{name}.jsonl"
    S = flat(p) if os.path.exists(p) and os.path.getsize(p) else []
    samp["configs"][name] = {"kept": len(S), "errors_kept": sum(1 for s in S if s["status"] == 2)}
for name in ("any_error", "root_outcome"):
    S = flat(f"{F}/col/out_samp2/{name}.jsonl")
    samp["configs"][name] = {"kept_by_trace": dict(collections.Counter("failed run" if s["trace"].startswith("6b6b") else "successful run" for s in S))}
samp["emitted_seconds_after_replay_start"] = json.load(open(f"{F}/col/sampling_times.json"))
dump(f"{DAT}/sampling.json", samp)
dump(f"{DAT}/scores.json", json.load(open(f"{F}/scores.json")))
dump(f"{DAT}/langfuse_stack.json", json.load(open(f"{F}/lf_stack.json")))

# leak check over everything written
bad = {}
for p in written:
    found = R.leaks(open(p).read())
    if found:
        bad[os.path.basename(p)] = sorted(set(found))[:5]
if bad:
    print("LEAK", {k: len(v) for k, v in bad.items()})
    sys.exit(1)
print("ok", len(written), "files")
