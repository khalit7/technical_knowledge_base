"""Two read-only lookups. (1) Name the Certificate Transparency logs whose SCTs the surveyed certificates carry,
using Chrome's published log list (gstatic log_list v3). (2) CAA records (RFC 8659) of the surveyed domains, over DoH to
1.1.1.1 by IP (this machine's port-53 DNS is answered by a local filter, so plain dig is not used).
Usage: python ct_caa.py <public_chains.json> <out.json>"""
import base64, json, sys, time, requests
CH, OUT = sys.argv[1], sys.argv[2]
chains = json.load(open(CH))
ll = requests.get("https://www.gstatic.com/ct/log_list/v3/log_list.json", timeout=20).json()
logs = {}
for op in ll["operators"]:
    for kind in ("logs", "tiled_logs"):
        for l in op.get(kind, []):
            logs[base64.b64decode(l["log_id"]).hex()] = {"operator": op["name"], "description": l["description"], "kind": kind,
                                                         "state": list(l.get("state", {}).keys())[:1]}
used = {}
for h in chains["hosts"]:
    for s in (h.get("chain_sent") or [{}])[0].get("scts", []):
        used.setdefault(s["log_id"], []).append(h["host"])
ct = [{"log_id": k[:16], **logs.get(k, {"description": "not in Chrome's list"}), "hosts": v} for k, v in used.items()]
caa = {}
for dom in ["anthropic.com", "openai.com", "huggingface.co", "github.com", "google.com", "cloudflare.com", "pypi.org", "mistral.ai"]:
    r = requests.get("https://1.1.1.1/dns-query", params={"name": dom, "type": "CAA"}, headers={"accept": "application/dns-json"}, timeout=10).json()
    caa[dom] = [a["data"] for a in r.get("Answer", []) if a["type"] == 257]
    time.sleep(0.3)
json.dump({"recorded": time.strftime("%Y-%m-%d"), "log_list_version": ll.get("version"), "log_list_time": ll.get("log_list_timestamp"),
           "ct_logs_seen": ct, "caa": caa}, open(OUT, "w"), indent=1)
for c in ct:
    print(c["description"], c.get("kind"), c.get("state"), c["hosts"][:3])
for k, v in caa.items():
    print(k, v)
