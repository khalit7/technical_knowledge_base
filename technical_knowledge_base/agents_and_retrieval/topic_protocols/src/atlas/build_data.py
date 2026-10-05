"""Build the Protocol atlas data: src/atlas/atlas.json and parts/33_js_0data.js.

Inputs: data_a.py, data_b.py, data_c.py (entries), meta.py (layers, chooser, compare notes), corrections.md,
sources/rfc_meta.json, sources/drafts.json, sources/github.json (written by fetch_sources.py on 2026-10-05),
and the recorded outputs in wire/out/*.txt (written by wire/run_public.sh and wire/run_local.sh, redacted by wire/redact.py).
RFC titles, months and statuses, draft revisions and release dates are filled from the fetched metadata,
never typed by hand. Run: python3 build_data.py   (no network; fails loudly on anything missing)."""
import re, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
CHECKED = "2026-10-05"
from data_a import A
from data_b import B
from data_c import C, FABRIC_LINKS
from meta import GROUPS, QUESTIONS, RULES, PAIRS

RFC = json.load(open(os.path.join(HERE, "sources/rfc_meta.json")))["rfcs"]
DR = json.load(open(os.path.join(HERE, "sources/drafts.json")))["drafts"]
GH = json.load(open(os.path.join(HERE, "sources/github.json")))["github"]
MONTHS = {m: i + 1 for i, m in enumerate("January February March April May June July August September October November December".split())}
STATUS = {"PROPOSED STANDARD": "Proposed Standard", "INTERNET STANDARD": "Internet Standard", "BEST CURRENT PRACTICE": "Best Current Practice",
          "INFORMATIONAL": "Informational", "EXPERIMENTAL": "Experimental", "DRAFT STANDARD": "Draft Standard", "HISTORIC": "Historic"}


def rfc(n):
    r = RFC.get(str(n))
    if not r: raise SystemExit(f"RFC {n} not in sources/rfc_meta.json: add it to fetch_sources.py")
    mon, yr = r["pub_date"].split()
    return r, f"{yr}-{MONTHS[mon]:02d}"


def gh(repo, tag):
    for x in GH[repo]:
        if x["tag"] == tag: return x
    raise SystemExit(f"release {repo} {tag} not in sources/github.json")


def src(s):
    if s[0] == "rfc":
        r, d = rfc(s[1]); sec = s[2] if len(s) > 2 else ""
        u = r["url"] + ("#section-" + sec.lstrip("§") if sec else "")
        obs = f"; obsoleted by {', '.join(r['obsoleted_by'])}" if r["obsoleted_by"] else ""
        return {"t": f"RFC {s[1]}{' ' + sec if sec else ''}: {r['title']} ({r['pub_date']}, {STATUS.get(r['status'], r['status'])}{obs})", "u": u}
    if s[0] == "draft":
        d = DR[s[1]]
        return {"t": f"{s[1]}-{d['rev']} (Internet-Draft, revision of {d['time'][:10]}, Datatracker state: {d['iesg_state']})", "u": d["url"]}
    if s[0] == "gh":
        x = gh(s[1], s[2])
        return {"t": f"{s[1]} release {s[2]} ({x['date']}, GitHub)", "u": x["url"]}
    assert len(s) == 2 and s[1].startswith("http"), s
    return {"t": s[0], "u": s[1]}


def ver(v, pid):
    if v[0] == "rfc":
        r, d = rfc(v[1]); return {"d": d, "l": f"{v[2]} (RFC {v[1]})", "u": r["url"], "p": pid}
    if v[0] == "draft":
        x = DR[v[1]]; return {"d": x["time"][:7], "l": f"{v[2]} ({v[1]}-{x['rev']})", "u": x["url"], "p": pid}
    if v[0] == "gh":
        x = gh(v[1], v[2]); return {"d": x["date"][:7], "l": v[3], "u": x["url"], "p": pid}
    assert re.match(r"^\d{4}-\d{2}$", v[0]), v
    return {"d": v[0], "l": v[1], "u": v[2], "p": pid}


ENTRIES = A + B + C
ids = [e["id"] for e in ENTRIES]
assert len(ids) == len(set(ids)), "duplicate ids"
gids = {g["id"] for g in GROUPS}
REQ = ["name", "full", "group", "body", "cur", "status", "plain", "problem", "how", "adds", "costs", "not_when", "replaces", "competes", "meet", "fail", "srcs"]
out_entries, timeline, wires = [], [], {}
for e in ENTRIES:
    e = dict(e)
    if e["group"] not in gids: raise SystemExit(f"{e['id']}: unknown group")
    for k in ("runs_on", "uses"):
        for t in e.get(k, []):
            if t not in ids: raise SystemExit(f"{e['id']}.{k}: unknown id {t}")
    if not e.get("brief"):
        for k in REQ:
            if not e.get(k): raise SystemExit(f"{e['id']} lacks {k}")
    e["srcs"] = [src(s) for s in e["srcs"]]
    for v in e.pop("versions", []):
        timeline.append(ver(v, e["id"]))
    for w in e.get("wire", []):
        f = os.path.join(HERE, "wire/out", w + ".txt")
        if not os.path.exists(f): raise SystemExit(f"{e['id']}: recording {w} missing")
        wires[w] = open(f).read().rstrip("\n")
    out_entries.append(e)

# corrections table rows
corr = []
for line in open(os.path.join(HERE, "corrections.md")):
    if not re.match(r"^\| \d+ \|", line): continue
    c = [x.strip() for x in line.strip().strip("|").split(" | ")]
    if len(c) != 7: raise SystemExit(f"bad corrections row: {line[:60]}")
    if c[6] not in ids: raise SystemExit(f"correction {c[0]} names unknown atlas id {c[6]}")
    corr.append({"n": int(c[0]), "page": c[1], "old": c[2], "verdict": c[3], "now": c[4], "src": c[5], "id": c[6]})

for r in RULES:
    for p in r["pick"]:
        if p not in ids: raise SystemExit(f"rule picks unknown id {p}")
for k in PAIRS:
    a, b = k.split("|")
    if a not in ids or b not in ids or [a, b] != sorted([a, b]): raise SystemExit(f"bad pair key {k}")

meta = open(os.path.join(HERE, "wire/out/meta.txt")).read().strip()
timeline.sort(key=lambda x: (x["d"], x["p"]))
data = {"checked": CHECKED, "groups": GROUPS, "entries": out_entries, "timeline": timeline, "wires": wires,
        "questions": QUESTIONS, "rules": RULES, "pairs": PAIRS, "corrections": corr,
        "fabric_links": [{"t": t, "u": "https://app.notion.com/p/" + i} for t, i in FABRIC_LINKS], "rec_meta": meta}
txt = json.dumps(data, ensure_ascii=False, indent=1)
if "\u2014" in txt: raise SystemExit("em dash in data: " + txt[txt.index("\u2014") - 60: txt.index("\u2014") + 20])
import sys as _s, os as _o; _s.path.insert(0, _o.path.join(_o.path.dirname(_o.path.abspath(__file__)), "..")); from private_patterns import alternation as _priv
for bad in ("glpat-", "sk-ant-"):
    if bad in txt: raise SystemExit(f"secret-looking or redacted string in data: {bad}")
if re.search(_priv(), txt): raise SystemExit("machine-specific string in data")
open(os.path.join(HERE, "atlas.json"), "w").write(txt)
js = "/* generated by src/atlas/build_data.py; do not edit by hand */\nwindow.AT_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + ";\n"
open(os.path.join(HERE, "../parts/33_js_0data.js"), "w").write(js)
print(f"entries {len(out_entries)}, timeline {len(timeline)}, recordings {len(wires)}, corrections {len(corr)}, rules {len(RULES)}, js {len(js)} bytes")
