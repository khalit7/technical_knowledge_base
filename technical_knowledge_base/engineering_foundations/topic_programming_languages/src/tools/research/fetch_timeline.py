"""Timeline data: first release date of each TypeScript minor (npm), Node majors (nodejs.org/dist/index.json),
Python releases (python.org API), Rust releases (GitHub releases feed pages + RELEASES.md). Writes timeline_raw.json."""
import json, urllib.request, re, datetime
UA = {"User-Agent": "kb-toolchain-atlas/1.0"}
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r: return r.read().decode("utf-8", "replace")
out = {"_checked": datetime.datetime.utcnow().isoformat() + "Z"}

# TypeScript: first stable x.y.0 publish on npm
d = json.loads(get("https://registry.npmjs.org/typescript"))
ts = {}
for v, t in d["time"].items():
    m = re.fullmatch(r"(\d+)\.(\d+)\.0", v)
    if m and int(m.group(1)) >= 4: ts[v] = t[:10]
out["typescript_minors"] = dict(sorted(ts.items(), key=lambda kv: kv[1]))
out["typescript_disttags"] = d["dist-tags"]
out["typescript_tagdates"] = {k: d["time"].get(v, "")[:10] for k, v in d["dist-tags"].items()}
out["typescript_6x"] = {v: t[:10] for v, t in d["time"].items() if re.fullmatch(r"6\.\d+\.\d+", v)}
out["typescript_7x"] = {v: t[:10] for v, t in d["time"].items() if re.fullmatch(r"7\.\d+\.\d+(-(beta|rc)[.\d]*)?", v)}

# Node: majors, first release and LTS
idx = json.loads(get("https://nodejs.org/dist/index.json"))
majors = {}
for r in idx:
    mj = int(r["version"][1:].split(".")[0])
    majors.setdefault(mj, {"first": None, "latest": None, "lts": None})
    e = majors[mj]
    if e["latest"] is None: e["latest"] = [r["version"], r["date"]]
    e["first"] = [r["version"], r["date"]]
    if r["lts"] and (e["lts"] is None or r["date"] < e["lts"][1]): e["lts"] = [r["lts"], r["date"], r["version"]]
out["node"] = {k: v for k, v in majors.items() if k >= 18}
try:
    out["node_schedule"] = json.loads(get("https://raw.githubusercontent.com/nodejs/Release/main/schedule.json"))
except Exception as e: out["node_schedule"] = repr(e)

# Python releases
try:
    rel = json.loads(get("https://www.python.org/api/v2/downloads/release/?is_published=true"))
    py = [(r["name"], r["release_date"][:10]) for r in rel if re.match(r"Python 3\.1[2-5]", r["name"])]
    out["python"] = sorted(py, key=lambda x: x[1])
except Exception as e: out["python"] = repr(e)

# Rust: RELEASES.md headings "Version 1.xx.0 (yyyy-mm-dd)"
rm = get("https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md")
out["rust"] = re.findall(r"^Version (1\.\d+\.\d+) \((\d{4}-\d\d-\d\d)\)", rm, re.M)[:40]
json.dump(out, open("timeline_raw.json", "w"), indent=1)
print(json.dumps({k: (v if k != "node_schedule" else "...") for k, v in out.items()}, indent=0)[:9000])
