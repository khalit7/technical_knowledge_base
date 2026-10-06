"""Replay recorded OTLP JSON (collector file-exporter lines) to an OTLP/HTTP endpoint.
Usage: python otlp_replay.py IN.jsonl URL TRACE_PREFIX [realtime]
- every traceId gets its first 4 hex characters replaced by TRACE_PREFIX, so several replays of one trace can coexist;
- account identity attributes (user.email, user.account_uuid, user.account_id, user.id, organization.id) are
  replaced before anything leaves the machine's capture file;
- with 'realtime', each span is sent alone at its recorded end time (shifted to now), as an SDK's exporter would."""
import json, sys, time, urllib.request

IN, URL, PFX = sys.argv[1], sys.argv[2], sys.argv[3]
REAL = len(sys.argv) > 4 and sys.argv[4] == "realtime"
SKIP_TRACE = "0af7651916cd43dd8448eb211c80319c"  # the shim's self-test span
SCRUB = {"user.email": "user@example.invalid", "user.account_uuid": "acct-uuid", "user.account_id": "acct-id",
         "user.id": "user-id", "organization.id": "org-id"}


def post(body):
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status


def fix_span(s):
    s["traceId"] = PFX + s["traceId"][4:]
    for a in s.get("attributes", []):
        if a["key"] in SCRUB:
            a["value"] = {"stringValue": SCRUB[a["key"]]}
    return s


units = []
for line in open(IN):
    d = json.loads(line)
    for rs in d.get("resourceSpans", []):
        for ss in rs.get("scopeSpans", []):
            keep = [fix_span(s) for s in ss.get("spans", []) if s["traceId"] != SKIP_TRACE]
            for s in keep:
                units.append((int(s["endTimeUnixNano"]), rs.get("resource", {}), ss.get("scope", {}), s))
units.sort(key=lambda u: u[0])
if not REAL:
    by = {}
    for _, res, sc, s in units:
        post({"resourceSpans": [{"resource": res, "scopeSpans": [{"scope": sc, "spans": [s]}]}]})
    print("sent", len(units), "spans")
else:
    t_first = units[0][0]
    t0 = time.time()
    for end, res, sc, s in units:
        delay = (end - t_first) / 1e9 - (time.time() - t0)
        if delay > 0:
            time.sleep(delay)
        post({"resourceSpans": [{"resource": res, "scopeSpans": [{"scope": sc, "spans": [s]}]}]})
    print("sent", len(units), "spans over", round(time.time() - t0, 1), "s")
