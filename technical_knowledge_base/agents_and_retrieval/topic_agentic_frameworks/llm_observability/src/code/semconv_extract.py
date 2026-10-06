"""Extract span definitions (attributes with requirement levels) from the OTel GenAI semantic-conventions
model files at a pinned commit. Usage: python semconv_extract.py SEMCONV_DIR OUT.json"""
import json, sys, yaml

D, OUT = sys.argv[1], sys.argv[2]
spans = yaml.safe_load(open(f"{D}/spans.yaml"))
reg = yaml.safe_load(open(f"{D}/registry.yaml"))
metrics = yaml.safe_load(open(f"{D}/metrics.yaml"))
attrs = {}
for g in reg.get("groups", []) + reg.get("attribute_groups", []):
    for a in g.get("attributes", []):
        if "key" in a or "id" in a:
            attrs[a.get("key") or a.get("id")] = a
for a in reg.get("attributes", []) or []:
    attrs[a.get("key") or a.get("id")] = a
groups = {g["id"]: g for g in spans.get("attribute_groups", [])}


def level(rl):
    if isinstance(rl, str):
        return rl, ""
    if isinstance(rl, dict):
        k = list(rl)[0]
        return k, str(rl[k]).strip()
    return "unspecified", ""


def expand(items):
    out = []
    for it in items:
        if "ref_group" in it:
            out += expand(groups[it["ref_group"]]["attributes"])
        elif "ref" in it:
            prev = next((o for o in out if o["key"] == it["ref"]), None)
            if prev is not None and "requirement_level" not in it:
                prev["sampling_relevant"] = bool(it.get("sampling_relevant"))
                continue
            lv, cond = level(it.get("requirement_level", attrs.get(it["ref"], {}).get("requirement_level", "recommended")))
            base = attrs.get(it["ref"], {})
            t = base.get("type")
            if isinstance(t, dict):
                t = "enum"
            out.append({"key": it["ref"], "level": lv, "cond": cond,
                        "brief": (it.get("brief") or base.get("brief") or "").strip()[:220],
                        "type": t or "", "stability": base.get("stability", ""),
                        "sampling_relevant": bool(it.get("sampling_relevant"))})
    return out


res = {"commit": "cb10b70c15c099ccab144e8316d934c9699da0fd", "date": "2026-10-05", "spans": []}
for s in spans.get("spans", []):
    if "type" not in s:
        continue
    nm = s.get("name", {})
    note = nm.get("note", "") if isinstance(nm, dict) else ""
    res["spans"].append({"type": s["type"], "kind": s.get("kind"), "stability": s.get("stability"),
                         "brief": (s.get("brief") or "").strip()[:300], "name_note": note.strip().split("\n")[0][:200],
                         "attributes": expand(s.get("attributes", []))})
res["metrics"] = [{"name": m.get("name") or m.get("metric_name"), "instrument": m.get("instrument"), "unit": m.get("unit"),
                   "brief": (m.get("brief") or "").strip()[:200]} for m in metrics.get("metrics", metrics.get("groups", []))]
ops = attrs.get("gen_ai.operation.name", {}).get("type", {})
res["operation_names"] = [m.get("value") for m in (ops.get("members", []) if isinstance(ops, dict) else [])]
prov = attrs.get("gen_ai.provider.name", {}).get("type", {})
res["provider_names"] = [m.get("value") for m in (prov.get("members", []) if isinstance(prov, dict) else [])]
dep = [k for k, a in attrs.items() if a.get("deprecated")]
res["deprecated"] = {k: str(attrs[k].get("deprecated"))[:160] for k in dep}
json.dump(res, open(OUT, "w"), indent=1)
print(len(res["spans"]), [s["type"] for s in res["spans"]], len(res["metrics"]), res["operation_names"], len(dep))
