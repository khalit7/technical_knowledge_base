"""Flatten OTLP JSON lines (collector file exporter) into one span per line: python otlp_flat.py IN.jsonl"""
import json, sys
def val(v):
    if not v: return None
    k = list(v)[0]; x = v[k]
    if k == "arrayValue": return [val(i) for i in x.get("values", [])]
    if k == "kvlistValue": return {i["key"]: val(i["value"]) for i in x.get("values", [])}
    if k == "intValue": return int(x)
    return x
def flat(path):
    out = []
    for line in open(path):
        d = json.loads(line)
        for rs in d.get("resourceSpans", []):
            res = {a["key"]: val(a["value"]) for a in rs.get("resource", {}).get("attributes", [])}
            for ss in rs.get("scopeSpans", []):
                for s in ss.get("spans", []):
                    out.append({"trace": s["traceId"], "id": s["spanId"], "parent": s.get("parentSpanId") or None,
                                "name": s["name"], "kind": s.get("kind"), "t0": int(s["startTimeUnixNano"]), "t1": int(s["endTimeUnixNano"]),
                                "status": s.get("status", {}).get("code"), "scope": ss.get("scope", {}).get("name"),
                                "service": res.get("service.name"), "resource": res,
                                "attrs": {a["key"]: val(a["value"]) for a in s.get("attributes", [])},
                                "events": [{"name": e["name"], "t": int(e["timeUnixNano"]), "attrs": {a["key"]: val(a["value"]) for a in e.get("attributes", [])}} for e in s.get("events", [])]})
    return out
if __name__ == "__main__":
    for s in flat(sys.argv[1]):
        print(json.dumps(s))
