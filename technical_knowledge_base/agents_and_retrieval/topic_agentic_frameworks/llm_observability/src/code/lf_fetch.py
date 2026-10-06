"""Read back from the self-hosted Langfuse (v4, public API v2) every observation of the traces a variant wrote.
Usage: python lf_fetch.py VARIANT_DIR [OUT.json]   (trace ids taken from VARIANT_DIR/spans.jsonl)"""
import base64, json, sys, urllib.request

D = sys.argv[1]
AUTH = "Basic " + base64.b64encode(b"pk-lf-fobs:sk-lf-fobs").decode()
FIELDS = "core,basic,time,io,metadata,model,usage,prompt,metrics"


def get(path):
    req = urllib.request.Request("http://127.0.0.1:3100" + path, headers={"Authorization": AUTH})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


tids = []
for line in open(f"{D}/spans.jsonl"):
    t = json.loads(line)["context"]["trace_id"][2:]
    if t not in tids:
        tids.append(t)
obs = []
for t in tids:
    try:
        d = get(f"/api/public/v2/observations?traceId={t}&limit=100&fields={FIELDS}")
    except Exception as e:
        d = get(f"/api/public/v2/observations?traceId={t}&limit=100")
    obs += d.get("data", [])
res = {"traces_sent": len(tids), "traces_found": len({o["traceId"] for o in obs}), "observations": obs}
if len(sys.argv) > 2:
    json.dump(res, open(sys.argv[2], "w"), indent=1)
print(D.split("/")[-1], "traces sent", len(tids), "found", res["traces_found"], "observations", len(obs),
      sorted({o["type"] for o in obs}))
