"""Merge the hand-curated atlas (atlas_tools.py, atlas_more.py) with the machine-read metadata in inputs/ and the
version cross-check (out/versions.json, if present) and write ../parts/36_js_tm_0data.js (do not edit that file by hand).
Checks (fails loudly): every repo/pypi named has a fetched record; a tool marked archived is archived on GitHub and a
tool archived on GitHub is marked archived; every lineage, ownership, picker and animation id exists; 'active' with no
activity in 9 months, or 'quiet' with activity in the last 3 months, is a warning.
Run: python3 -B src/map/gen_data.py      (adapted from the JAX topic's Tool map)"""
import json, os, re, sys, importlib.util
sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
I = os.path.join(HERE, "inputs")
OUT = os.path.join(HERE, "..", "parts", "36_js_tm_0data.js")
ASOF = "2026-10-16"


def mod(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, name + ".py"))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


def load(n, d=I):
    p = os.path.join(d, n)
    return json.load(open(p)) if os.path.exists(p) else {}


M = mod("atlas_tools"); AP = mod("atlas_more")
T, L, OWN = M.T, M.L, M.OWN
pypi, repos, feeds = load("pypi.json"), load("github_repos.json"), load("github_feeds.json")
vers = load("versions.json", os.path.join(HERE, "out"))
errs, warns = [], []
SPDX = {"Apache 2.0": "Apache-2.0", "Apache License 2.0": "Apache-2.0", "Apache License": "Apache-2.0", "Apache": "Apache-2.0",
        "Apache Software License 2.0": "Apache-2.0", "Apache License Version 2.0": "Apache-2.0", "MIT License": "MIT", "BSD-3": "BSD-3-Clause",
        "Apache Software License": "Apache-2.0"}


def months(a, b=ASOF):
    a = a if len(a) >= 7 else a + "-06"
    return (int(b[:4]) - int(a[:4])) * 12 + int(b[5:7]) - int(a[5:7])


tools = []
for t in T:
    r = {k: v for k, v in t.items() if v is not None and k not in ("relpick", "ver", "lic")}
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
        pick = re.compile(t.get("relpick") or r"^v?\d")
        VR = re.compile(r"v?\d+(?:\.\d+)+(?:\.post\d+)?")
        good = [x for x in rl if (pick.search(x[1]) or pick.search(x[2])) and not re.search(r"(rc|alpha|beta|dev|nightly)", x[2], re.I)] if isinstance(rl, list) else []
        if good:
            vm = VR.search(good[0][1]) or VR.search(good[0][2].replace("%2F", "/"))
            m["ghRel"] = vm.group(0) if vm else good[0][1][:40]; m["ghRelDate"] = good[0][0]
            if "ver" not in m:
                m.update(ver=m["ghRel"], verDate=good[0][0], verSrc=f"https://github.com/{m.get('repo', t['repo'])}/releases")
    if t.get("ver"):
        m.update(ver=t["ver"][0], verDate=t["ver"][1], verSrc=t["ver"][2])
    lic = t.get("lic") or m.get("ghLic") or m.get("pypiLic") or ""
    if lic in ("NOASSERTION", "Other"):
        lic = m.get("pypiLic") or "not detected"
    m["lic"] = SPDX.get(lic, lic) or "not stated"
    if m.get("archived") and t["status"] != "archived":
        errs.append(f"{t['id']}: archived on GitHub but status {t['status']}")
    if t["status"] == "archived" and t.get("repo") and not m.get("archived"):
        errs.append(f"{t['id']}: status archived but GitHub says not archived")
    dates = [d for d in (m.get("commit"), m.get("verDate")) if d]
    m["last"] = max(dates) if dates else ""
    if t["status"] == "active" and m["last"] and months(m["last"]) > 9:
        warns.append(f"{t['id']}: active but last activity {m['last']}")
    if t["status"] == "quiet" and m["last"] and months(m["last"]) < 3:
        warns.append(f"{t['id']}: quiet but last activity {m['last']}")
    r["m"] = m
    tools.append(r)

ids = {t["id"] for t in tools}
for e in L:
    for k in e[:2]:
        if k not in ids: errs.append(f"lineage: unknown id {k}")
for o in OWN:
    if o[0] not in ids: errs.append(f"owner: unknown id {o[0]}")
for p in AP.P:
    for k in p["stack"] + p["avoid"]:
        if k not in ids: errs.append(f"picker {p['id']}: unknown id {k}")
slots = {s[0] for s in AP.SLOTS}
for s in AP.SLOTS:
    if s[3] not in ids: errs.append(f"slot {s[0]}: unknown id {s[3]}")
for e in AP.EV:
    if e[1] not in slots: errs.append(f"event: unknown slot {e[1]}")
    if e[3] not in ids: errs.append(f"event: unknown id {e[3]}")
ev = sorted(AP.EV, key=lambda e: e[0])

# lineage lifespans: start = first PyPI release, repository creation or an override; end = today, or last activity if quiet/archived
LIN_ROWS = [("Kubernetes training APIs", ["mpiop", "trainerv1", "trainer", "jobset", "kueue", "volcano", "kai", "runai"]),
            ("Slurm and clusters", ["openpbs", "slurm", "slinky", "sunk", "hyperpod", "pcluster"]),
            ("Runtimes and platforms", ["ray", "kuberay", "skypilot", "determined", "nomad"]),
            ("Storage", ["minio", "juicefs", "alluxio"]),
            ("Tracking", ["neptune", "wandb", "mlflow", "clearml"])]
START = {"slurm": ["2002", "initial release 2002 (Slurm FAQ, slurm.schedmd.com/faq.html)"], "sunk": ["2023-03", "CoreWeave release notes, March 2023"],
         "hyperpod": ["2023-11", "launch post, 2023-11-29"], "runai": ["2024-12", "as an NVIDIA product (acquisition closed 2024-12-30); the company is older"],
         "slinky": ["2024-11", "open-source release"], "trainer": ["2025-07", "v2.0 release"]}
lin = []
byid = {t["id"]: t for t in tools}
for g, rows in LIN_ROWS:
    for k in rows:
        t = byid[k]; m = t["m"]
        st = START.get(k)
        if st:
            s, sn = st
        else:
            c = [d for d in (m.get("first"), m.get("created")) if d]
            s = min(c)[:7] if c else None
            sn = "first PyPI release" if m.get("first") and m.get("first") == min(c) else "repository created"
        end = (m.get("last") or ASOF)[:7] if t["status"] in ("quiet", "archived") else ASOF[:7]
        if k == "neptune": end = "2026-03"
        if not s: errs.append(f"lineage start missing for {k}")
        lin.append({"id": k, "g": g, "s": s, "sn": sn, "e": end})

data = {"asof": ASOF, "tools": tools, "lineage": L, "own": OWN, "lin": lin, "hw": AP.HW, "pick": AP.P, "slots": AP.SLOTS, "ev": ev,
        "vers": vers or None}
for w in warns: print("WARN", w)
if errs:
    for e in errs: print("ERR", e)
    sys.exit(1)
js = "window.TM_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
assert chr(0x2014) not in js, "em dash in data"
open(OUT, "w").write("// generated by src/map/gen_data.py, do not edit\n" + js)
print("wrote", os.path.relpath(OUT), len(js), "bytes;", len(tools), "tools,", len(L), "hand-overs,", len(OWN), "owner changes,", len(ev), "events")
