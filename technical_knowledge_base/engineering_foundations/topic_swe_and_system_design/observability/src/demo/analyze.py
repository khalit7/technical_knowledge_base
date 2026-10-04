"""Turn the demo run's raw outputs into the page's demo_data.json (small extracts only)."""
import json, os, re, sys, urllib.parse, urllib.request, statistics, random
D = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(D, "out")
DEST = sys.argv[1]
cl = json.load(open(os.path.join(O, "client.json")))
T0 = cl["t0_unix"]; PH = cl["phases"]
END = T0 + 225
PROM = "http://127.0.0.1:9099/api/v1/"


def q(path, **kw):
    u = PROM + path + "?" + urllib.parse.urlencode(kw)
    return json.load(urllib.request.urlopen(u))


W = "30s"
QR = {
    "rps": f'sum(rate(http_requests_total{{job="chat-api"}}[{W}]))',
    "avg": f'sum(rate(http_request_duration_seconds_sum{{job="chat-api"}}[{W}])) / sum(rate(http_request_duration_seconds_count{{job="chat-api"}}[{W}]))',
    "p50": f'histogram_quantile(0.5, sum by (le) (rate(http_request_duration_seconds_bucket{{job="chat-api"}}[{W}])))',
    "p99": f'histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket{{job="chat-api"}}[{W}])))',
    "err": f'sum(rate(http_requests_total{{job="chat-api",status=~"5.."}}[{W}])) / sum(rate(http_requests_total{{job="chat-api"}}[{W}]))',
    "dep_p99": f'histogram_quantile(0.99, sum by (le) (rate(dependency_duration_seconds_bucket{{job="chat-api",dependency="retrieval"}}[{W}])))',
}
series = {}
for k, expr in QR.items():
    r = q("query_range", query=expr, start=T0 + 5, end=END, step="5")
    vals = r["data"]["result"][0]["values"] if r["data"]["result"] else []
    series[k] = [[round(float(t) - T0, 1), (None if v in ("NaN", "+Inf") else round(float(v), 4))] for t, v in vals]

# instant queries at the end of each phase, 60 s windows (the numbers quoted in the text)
INST = {}
for ph, t in [("normal", T0 + 88), ("incident", T0 + 178)]:
    INST[ph] = {}
    for k, expr in QR.items():
        e = expr.replace("[30s]", "[60s]")
        r = q("query", query=e, time=t)
        res = r["data"]["result"]
        INST[ph][k] = round(float(res[0]["value"][1]), 4) if res else None
raw_example = q("query", query=QR["p99"].replace("[30s]", "[60s]"), time=T0 + 178)
raw_example["data"]["result"][0]["value"][0] = round(raw_example["data"]["result"][0]["value"][0], 3)

# per-route bucket counts in the incident minute, for the interpolation figure
bk = q("query", query='sum by (le) (increase(http_request_duration_seconds_bucket{job="chat-api"}[60s]))', time=T0 + 178)
buckets = sorted([[float(x["metric"]["le"]), round(float(x["value"][1]), 2)] for x in bk["data"]["result"]], key=lambda a: a[0])

# exact percentiles from the client's own record (ground truth)
req = cl["requests"]
def pct(xs, p):
    xs = sorted(xs); i = max(0, min(len(xs) - 1, int(round(p * len(xs) + 0.5)) - 1)); return xs[i]
exact = {}
for ph, a, b in [("normal", 28, 88), ("incident", 118, 178)]:
    xs = [r["d"] for r in req if a <= r["t"] + r["d"] < b]
    exact[ph] = {"n": len(xs), "avg": round(sum(xs) / len(xs), 4), "p50": pct(xs, .5), "p99": pct(xs, .99),
                 "max": max(xs), "errors": sum(1 for r in req if a <= r["t"] + r["d"] < b and r["s"] >= 500)}
reqs_small = [[round(r["t"], 2), round(r["d"] * 1000), r["s"]] for r in req]

# traces
spans = {}
for svc in ("chat-api", "retrieval"):
    for line in open(os.path.join(O, f"spans_{svc}.jsonl")):
        s = json.loads(line); tid = s["context"]["trace_id"][2:]
        spans.setdefault(tid, []).append(s)
from datetime import datetime
def ts(x): return datetime.strptime(x.replace("Z", "+0000"), "%Y-%m-%dT%H:%M:%S.%f%z").timestamp()
traces = []
for tid, ss in spans.items():
    root = [s for s in ss if s["parent_id"] is None]
    if not root: continue
    r = root[0]; t0 = ts(r["start_time"])
    traces.append({"id": tid, "t": round(t0 - T0, 3), "dur": round((ts(r["end_time"]) - t0) * 1000, 1),
                   "err": r["status"]["status_code"] == "ERROR", "ss": ss})
traces.sort(key=lambda x: x["t"])
def compact(tr):
    ss = tr["ss"]; root = [s for s in ss if s["parent_id"] is None][0]; t0 = ts(root["start_time"])
    ids = {s["context"]["span_id"]: i for i, s in enumerate(ss)}
    order = sorted(range(len(ss)), key=lambda i: ts(ss[i]["start_time"]))
    out = []
    for i in order:
        s = ss[i]
        out.append({"name": s["name"], "svc": s["resource"]["attributes"]["service.name"],
                    "id": s["context"]["span_id"][2:], "parent": (s["parent_id"] or "")[2:],
                    "kind": s["kind"].split(".")[1], "start": round((ts(s["start_time"]) - t0) * 1000, 2),
                    "dur": round((ts(s["end_time"]) - ts(s["start_time"])) * 1000, 2),
                    "status": s["status"]["status_code"], "attrs": s["attributes"],
                    "events": [{"name": e["name"], "attrs": {k: (v[:160] if isinstance(v, str) else v) for k, v in e["attributes"].items() if k != "exception.stacktrace"}} for e in s["events"]]})
    return {"id": tr["id"], "t": tr["t"], "dur": tr["dur"], "err": tr["err"], "spans": out}

normal = [t for t in traces if 30 < t["t"] < 88 and not t["err"]]
inc = [t for t in traces if 95 < t["t"] < 178]
typical = sorted(normal, key=lambda t: t["dur"])[len(normal) // 2]
slow_ok = max([t for t in inc if not t["err"]], key=lambda t: t["dur"])
errt = [t for t in inc if t["err"]][0]
rnd = random.Random(3)
pick = rnd.sample(normal, 12) + rnd.sample([t for t in inc if not t["err"] and t["dur"] < 800], 10) + \
       sorted([t for t in inc if t["dur"] >= 800], key=lambda t: -t["dur"])[:12] + [t for t in inc if t["err"]][:4]
ids = {t["id"] for t in pick} | {typical["id"], slow_ok["id"], errt["id"]}
explorer = [compact(t) for t in traces if t["id"] in ids]

# sampling comparison on the incident phase (real trace ids)
def head_keep(tid, ratio):  # OpenTelemetry TraceIdRatioBased: lower 64 bits < ratio * 2^64
    return int(tid[16:], 16) < round(ratio * 2 ** 64)
interesting = [t for t in inc if t["err"] or t["dur"] > 1000]
samp = {"incident_traces": len(inc), "interesting": len(interesting),
        "head10_kept": sum(head_keep(t["id"], .1) for t in inc),
        "head10_kept_interesting": sum(head_keep(t["id"], .1) for t in interesting),
        "tail_kept": sum(1 for t in inc if t["err"] or t["dur"] > 1000 or head_keep(t["id"], .05)),
        "tail_kept_interesting": len(interesting)}

# logs: lines for the three highlighted traces + the incident stream around the error
logs = {}
for svc in ("chat-api", "retrieval"):
    for line in open(os.path.join(O, f"logs_{svc}.jsonl")):
        d = json.loads(line); logs.setdefault(d.get("trace_id"), []).append(line.strip())
loglines = {k: logs.get(k, []) for k in (typical["id"], slow_ok["id"], errt["id"])}
api_lines = [l.strip() for l in open(os.path.join(O, "logs_chat-api.jsonl"))]
avg_line = sum(len(l) + 1 for l in api_lines) / len(api_lines)
ret_lines = [l.strip() for l in open(os.path.join(O, "logs_retrieval.jsonl"))]
avg_line_ret = sum(len(l) + 1 for l in ret_lines) / len(ret_lines)
# the stream an engineer tails during the incident: 14 consecutive chat-api lines around the first error
ie = next(i for i, l in enumerate(api_lines) if '"status":503' in l)
stream = api_lines[ie - 9: ie + 5]

def keep_metric_text(path):
    out = []
    for l in open(path):
        if any(m in l for m in ("http_requests", "http_request_duration", "dependency_duration", "in_flight")) and "_created" not in l:
            out.append(l.rstrip("\n"))
    return out
mprom = keep_metric_text(os.path.join(O, "metrics_prom.txt"))
mom = keep_metric_text(os.path.join(O, "metrics_om.txt"))
nseries = sum(1 for l in open(os.path.join(O, "metrics_prom.txt")) if l.strip() and not l.startswith("#"))

data = {"run": {"t0_unix": round(T0), "phases": PH, "requests": len(req), "date": "2026-10-04",
                "versions": {"opentelemetry-sdk": "1.45.0", "prometheus-client": "0.26.0", "prometheus": "3.15.0", "python": "3.12.11"}},
        "queries": QR, "series": series, "inst": INST, "raw_example": raw_example, "buckets_incident": buckets,
        "exact": exact, "reqs": reqs_small,
        "highlight": {"typical": typical["id"], "slow": slow_ok["id"], "error": errt["id"]},
        "traces": explorer, "sampling": samp, "loglines": loglines, "stream": stream,
        "log_bytes": {"chat_api_avg_line": round(avg_line, 1), "retrieval_avg_line": round(avg_line_ret, 1),
                      "chat_api_lines": len(api_lines), "retrieval_lines": len(ret_lines)},
        "metrics_text": mprom, "metrics_om": mom, "series_exposed_total": nseries}
json.dump(data, open(DEST, "w"), separators=(",", ":"))
print("bytes", os.path.getsize(DEST)); print(json.dumps(INST)); print(json.dumps(exact)); print(samp)
print("typical", typical["dur"], "slow", slow_ok["dur"], "err", errt["dur"], "traces", len(explorer))
print(buckets); print(avg_line, avg_line_ret, nseries)
