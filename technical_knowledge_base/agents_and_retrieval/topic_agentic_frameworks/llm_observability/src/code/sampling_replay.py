"""Send one recorded trace to several OTLP endpoints in real time, one span at a time at its recorded end time
(as an SDK exporter would), after marking its last tool execution and its root span with status ERROR
(the failure is injected; the timings are the real run's). Writes a log of when each span was sent.
Usage: python sampling_replay.py IN.jsonl PREFIX LOG.json URL [URL ...]"""
import json, sys, threading, time, urllib.request

IN, PFX, LOG, URLS = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
INJECT = not PFX.startswith("0")  # prefixes starting with 0: replay the run as recorded, no injected failure
SKIP = "0af7651916cd43dd8448eb211c80319c"
spans = []
for line in open(IN):
    d = json.loads(line)
    for rs in d.get("resourceSpans", []):
        for ss in rs.get("scopeSpans", []):
            for s in ss.get("spans", []):
                if s["traceId"] == SKIP:
                    continue
                s["traceId"] = PFX + s["traceId"][4:]
                s["attributes"] = [a for a in s.get("attributes", []) if not a["key"].startswith(("user.", "organization."))]
                spans.append((int(s["endTimeUnixNano"]), {"service.name": rs["resource"]}, ss.get("scope", {}), s))
spans.sort(key=lambda u: u[0])
last_exec = [u for u in spans if u[3]["name"] == "claude_code.tool.execution"][-1][3]
root = [u for u in spans if not u[3].get("parentSpanId")][-1][3]
for s in ((last_exec, root) if INJECT else ()):
    s["status"] = {"code": 2, "message": "injected: tests still failing"}
t_first = spans[0][0]
log = {"injected_error_spans": [last_exec["name"], root["name"]] if INJECT else [], "sent": []}


def post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST", headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=30).read()


t0 = time.time()
for end, res, sc, s in spans:
    delay = (end - t_first) / 1e9 - (time.time() - t0)
    if delay > 0:
        time.sleep(delay)
    body = {"resourceSpans": [{"resource": res["service.name"], "scopeSpans": [{"scope": sc, "spans": [s]}]}]}
    ths = [threading.Thread(target=post, args=(u, body)) for u in URLS]
    [t.start() for t in ths]
    [t.join() for t in ths]
    log["sent"].append({"span": s["spanId"], "name": s["name"], "t": round(time.time() - t0, 2),
                        "error": s.get("status", {}).get("code") == 2})
log["t_start_epoch"] = t0
json.dump(log, open(LOG, "w"), indent=1)
print("sent", len(spans), "spans over", round(time.time() - t0, 1), "s")
