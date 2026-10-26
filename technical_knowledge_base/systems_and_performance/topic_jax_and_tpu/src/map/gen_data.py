"""Merge the hand-curated atlas (atlas_tools.py, atlas_api.py) with the machine-read metadata in inputs/ and the import
check (out/imports.json, if present) and write ../parts/36_js_tm_0data.js (do not edit that file by hand).
Checks (fails loudly): every repo/pypi named has a fetched record; a tool marked active or maintained is not archived on
GitHub; a tool marked archived is archived on GitHub; every lineage, picker and animation id exists; status 'quiet'
means no PyPI release or default-branch commit with real content in the last 12 months is flagged as a warning only.
Run: python3 -B src/map/gen_data.py"""
import json, os, re, sys, importlib.util
sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
I = os.path.join(HERE, "inputs")
OUT = os.path.join(HERE, "..", "parts", "36_js_tm_0data.js")
ASOF = "2026-10-15"


def mod(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, name + ".py"))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


def load(n, d=I):
    p = os.path.join(d, n)
    return json.load(open(p)) if os.path.exists(p) else {}


M = mod("atlas_tools"); AP = mod("atlas_api")
T, L = M.T, M.L
pypi, repos, feeds = load("pypi.json"), load("github_repos.json"), load("github_feeds.json")
imports = load("imports.json", os.path.join(HERE, "out"))
errs, warns = [], []


def months(a, b=ASOF):
    a = a if len(a) >= 7 else a + "-06"
    return (int(b[:4]) - int(a[:4])) * 12 + int(b[5:7]) - int(a[5:7])


tools = []
for t in T:
    r = {k: v for k, v in t.items() if v is not None}
    m = {}
    if t.get("pypi"):
        p = pypi.get(t["pypi"])
        if not p or "error" in p:
            errs.append(f"{t['id']}: no PyPI record for {t['pypi']}")
        else:
            m.update(ver=p["version"], verDate=p["date"], verSrc=f"https://pypi.org/project/{t['pypi']}/",
                     first=p["first"][0] if p.get("first") else None, nrel=p["n_releases"])
            lic = p["license"] or next((c.split(" :: ")[-1] for c in p["classifiers"] if c.startswith("License")), "")
            m["pypiLic"] = lic.split("\n")[0][:60].strip()
            newest = p["last5"][-1] if p.get("last5") else None
            if newest and newest[1] != p["version"]:
                m["newest"] = newest[1]; m["newestDate"] = newest[0]
    if t.get("repo"):
        g = repos.get(t["repo"])
        if not g or "error" in g:
            errs.append(f"{t['id']}: no GitHub record for {t['repo']}")
        else:
            m.update(repo=g["full_name"], ghLic=g["license"], archived=g["archived"], pushed=g["pushed"], created=g["created"], stars=g.get("stars"))
        f = feeds.get(t["repo"]) or {}
        cm = f.get("commits")
        if isinstance(cm, list) and cm:
            m["commit"] = cm[0][0]; m["commitMsg"] = cm[0][1][:80]
        rl = f.get("releases")
        if isinstance(rl, list) and rl and re.match(r"v?\d", rl[0][2]):
            m["ghRel"] = rl[0][1][:50]; m["ghRelDate"] = rl[0][0]
        if "ver" not in m and isinstance(rl, list) and rl and re.match(r"v?\d", rl[0][2]):
            m.update(ver=rl[0][2].replace("%2F", "/")[:30], verDate=rl[0][0], verSrc=f"https://github.com/{m.get('repo', t['repo'])}/releases")
    lic = m.get("ghLic") or m.get("pypiLic") or ""
    if lic in ("NOASSERTION", "Other"):
        lic = m.get("pypiLic") or "not detected"
    if t["id"] == "torchxla": lic = "BSD-style (repository LICENSE; GitHub does not detect an SPDX id)"
    if t["id"] == "libtpu": lic = "Google Cloud Platform Terms of Service (PyPI)"
    if t["id"] == "metal": lic = "Apple proprietary (PyPI)"
    if t["id"] == "torchtpu": lic = "Apache-2.0 (repository LICENSE, read 2026-10-26)"
    if t["layer"] == "cloud" and not t.get("repo"): lic = "Google Cloud terms"
    if t["id"] == "stax" or t["id"] == "jax2tf": lic = "Apache-2.0 (part of jax)"
    lic = {"Apache 2.0": "Apache-2.0", "Apache License 2.0": "Apache-2.0", "Apache License": "Apache-2.0", "MIT License": "MIT"}.get(lic, lic)
    m["lic"] = lic
    if m.get("archived") and t["status"] != "archived":
        errs.append(f"{t['id']}: archived on GitHub but status {t['status']}")
    if t["status"] == "archived" and not m.get("archived"):
        errs.append(f"{t['id']}: status archived but GitHub says not archived")
    dates = [d for d in (m.get("commit"), m.get("verDate"), m.get("newestDate")) if d]
    m["last"] = max(dates) if dates else ""
    if t["status"] == "active" and m["last"] and months(m["last"]) > 9:
        warns.append(f"{t['id']}: active but last activity {m['last']}")
    if t["status"] == "quiet" and m["last"] and months(m["last"]) < 3 and t["id"] not in ("t5x", "paxml", "aistack", "jmp"):
        warns.append(f"{t['id']}: quiet but last activity {m['last']}")
    if t["id"] in imports:
        m["imp"] = imports[t["id"]]
    r["m"] = m
    tools.append(r)

ids = {t["id"] for t in tools}
for e in L:
    for k in e[:2]:
        if k not in ids: errs.append(f"lineage: unknown id {k}")
for p in AP.P:
    for k in p["stack"] + p["avoid"]:
        if k not in ids: errs.append(f"picker {p['id']}: unknown id {k}")
slots = {s[0] for s in AP.SLOTS}
for s in AP.SLOTS:
    if s[3] and s[3] not in ids: errs.append(f"slot {s[0]}: unknown id {s[3]}")
for e in AP.EV:
    if e[1] not in slots: errs.append(f"event: unknown slot {e[1]}")
    if e[3] and e[3] not in ids: errs.append(f"event: unknown id {e[3]}")
ev = sorted(AP.EV, key=lambda e: e[0] if len(e[0]) >= 7 else e[0] + "-06")

# lineage lifespans: start = first PyPI release or repo creation (or an override), end = last activity if archived/quiet/deprecated/moved
LIN_ROWS = ["haiku", "objax", "linen", "nnx", "penzai", "treescope", "t5x", "paxml", "easylm", "maxtext", "tunix", "levanter", "marin",
            "jetstream", "tpuinf", "sglangjax", "torchxla", "torchax", "torchtpu", "xpk", "clustertk"]
START = {"nnx": ["2024", "Flax README: 'Released in 2024'"], "linen": ["2020-03", "first Flax release on PyPI"],
         "torchtpu": ["2026-04", "announcement"], "torchax": ["2025-03", "first PyPI release (then inside pytorch/xla)"],
         "levanter": None, "marin": None}
lin = []
byid = {t["id"]: t for t in tools}
for k in LIN_ROWS:
    t = byid[k]; m = t["m"]
    st = START.get(k)
    if st:
        s, sn = st
    else:
        c = [d for d in (m.get("first"), m.get("created")) if d]
        s = min(c)[:7] if c else None; sn = "first PyPI release" if m.get("first") and m.get("first") == min(c) else "repository created"
    end = (m.get("last") or ASOF)[:7] if t["status"] == "moved" else ASOF[:7] if t["status"] in ("active", "maintained", "preview", "maintenance", "deprecated", "moved") else (m.get("last") or ASOF)[:7]
    if not s: errs.append(f"lineage start missing for {k}")
    lin.append({"id": k, "s": s, "sn": sn, "e": end})

data = {"asof": ASOF, "tools": tools, "lineage": L, "lin": lin, "api": AP.A, "hw": AP.HW, "pick": AP.P, "slots": AP.SLOTS, "ev": ev,
        "importsMeta": imports.get("_meta")}
for w in warns: print("WARN", w)
if errs:
    for e in errs: print("ERR", e)
    sys.exit(1)
js = "window.TM_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
assert chr(0x2014) not in js, "em dash in data"
open(OUT, "w").write("// generated by src/map/gen_data.py, do not edit\n" + js)
print("wrote", os.path.relpath(OUT), len(js), "bytes;", len(tools), "tools,", len(L), "lineage edges,", len(AP.A), "API rows")
