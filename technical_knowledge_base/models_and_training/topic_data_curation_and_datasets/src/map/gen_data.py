"""Merge the hand-curated atlas (atlas_tools.py, atlas_corpora.py) with the machine-read metadata in inputs/ and
write ../parts/36_js_tm_0data.js (do not edit that file by hand).
Checks (fails loudly): every repo/pypi/hf named in the atlas has a fetched record; a tool marked active or maintained is
not archived on GitHub; a tool marked archived is archived on GitHub (or has no repo); every corpus parent and every
built/used id exists; corpus dates that say 'paper' match the arXiv API record; 'hub' dates match the HF created date.
Run: python3 src/map/gen_data.py"""
import json, os, sys, importlib.util
sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
I = os.path.join(HERE, "inputs")
OUT = os.path.join(HERE, "..", "parts", "36_js_tm_0data.js")


def mod(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, name + ".py"))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


def load(n):
    p = os.path.join(I, n)
    return json.load(open(p)) if os.path.exists(p) else {}


T = mod("atlas_tools").T
C = mod("atlas_corpora").C
pypi, repos, feeds, hfd, hfm, arx = (load("pypi.json"), load("github_repos.json"), load("github_feeds.json"),
                                     load("hf_datasets.json"), load("hf_models.json"), load("arxiv_meta.json").get("papers", {}))
cc = load("commoncrawl_collinfo.json")
errs, warns = [], []
ASOF = "2026-10-14"


def months(a, b=ASOF):
    ya, ma = int(a[:4]), int(a[5:7]) if len(a) >= 7 else 1
    yb, mb = int(b[:4]), int(b[5:7])
    return (yb - ya) * 12 + mb - ma


tools = []
for t in T:
    r = dict(t)
    meta = {}
    if t.get("pypi"):
        p = pypi.get(t["pypi"])
        if not p or "error" in p:
            errs.append(f"{t['id']}: no PyPI record for {t['pypi']}")
        else:
            meta["ver"] = p["version"]; meta["verDate"] = p["date"]; meta["verSrc"] = f"https://pypi.org/project/{t['pypi']}/"
            meta["pypiLic"] = p["license"] or next((c.split(" :: ")[-1] for c in p["classifiers"] if c.startswith("License")), "")
            meta["first"] = p["first"][0] if p.get("first") else None
            meta["nrel"] = p.get("n_releases")
    if t.get("repo"):
        g = repos.get(t["repo"])
        if not g or "error" in g:
            errs.append(f"{t['id']}: no GitHub record for {t['repo']}")
        else:
            meta.update(repo=g["full_name"], ghLic=g["license"], archived=g["archived"], pushed=g["pushed"], created=g["created"])
        f = feeds.get(t["repo"]) or {}
        cm = f.get("commits")
        if isinstance(cm, list) and cm:
            meta["commit"] = cm[0][0]; meta["commitMsg"] = cm[0][1][:70]
        if "ver" not in meta:
            for kind in ("releases", "tags"):
                e = f.get(kind)
                if isinstance(e, list) and e:
                    meta["ver"] = e[0][1][:40]; meta["verDate"] = e[0][0]
                    meta["verSrc"] = f"https://github.com/{meta.get('repo', t['repo'])}/{kind}"; break
    if t.get("hf"):
        h = hfm.get(t["hf"])
        if not h or "error" in h:
            errs.append(f"{t['id']}: no HF record for {t['hf']}")
        else:
            meta.update(hfLic=h.get("license_name") or h.get("license"), hfCreated=h["created"], hfMod=h["lastModified"])
            if "ver" not in meta:
                meta["ver"] = "model files"; meta["verDate"] = h["lastModified"]; meta["verSrc"] = f"https://huggingface.co/{t['hf']}"
    # licence shown: GitHub SPDX, else PyPI, else HF
    meta["lic"] = meta.get("ghLic") or meta.get("pypiLic") or meta.get("hfLic") or ""
    if meta["lic"] in ("NOASSERTION",):
        meta["lic"] = "not detected by GitHub (see note)"
    if t["id"] == "lid176":
        meta["lic"] = "code MIT; model files CC-BY-SA 3.0"
    if t["id"] == "wet":
        meta["lic"] = "Common Crawl Terms of Use"
    if t["id"] == "bsade":
        meta["lic"] = "none detected"
    # status checks
    if meta.get("archived") and t["status"] != "archived":
        errs.append(f"{t['id']}: archived on GitHub but status {t['status']}")
    if t["status"] == "archived" and t.get("repo") and not meta.get("archived"):
        errs.append(f"{t['id']}: status archived but GitHub says not archived")
    last = max([d for d in (meta.get("commit"), meta.get("verDate"), meta.get("hfMod")) if d] or ["0000-01"])
    meta["last"] = last
    if t["status"] == "active" and last != "0000-01" and months(last) > 9:
        warns.append(f"{t['id']}: active but last activity {last}")
    r["m"] = meta
    tools.append(r)

ids_t = {t["id"] for t in tools}
ids_c = {c["id"] for c in C}
corp = []
for c in C:
    r = dict(c)
    for p in c["parents"]:
        if p not in ids_c: errs.append(f"{c['id']}: unknown parent {p}")
    for b in c["built"]:
        if b not in ids_t: errs.append(f"{c['id']}: unknown tool {b}")
    if c["dsrc"] == "paper":
        a = arx.get(c["paper"])
        if not a or a["published"] != c["date"]:
            errs.append(f"{c['id']}: date {c['date']} vs arXiv {a and a['published']}")
    if c["dsrc"] == "hub":
        h = hfd.get(c["hf"])
        if not h or h.get("created") != c["date"]:
            errs.append(f"{c['id']}: date {c['date']} vs HF created {h and h.get('created')}")
    if c.get("hf"):
        h = hfd.get(c["hf"]) or {}
        r["h"] = {k: h.get(k) for k in ("license", "license_name", "gated", "created", "lastModified", "n_files", "error", "fetched") if h.get(k) not in (None, "")}
        lic = h.get("license")
        r["lic"] = c.get("lic") or (", ".join(lic) if isinstance(lic, list) else lic) or "not stated in card metadata"
    else:
        r["lic"] = c.get("lic") or ""
    if c.get("paper"):
        a = arx.get(c["paper"]) or {}
        r["paperUrl"] = f"https://arxiv.org/abs/{a.get('id')}" if a else None
        r["paperTitle"] = a.get("title")
    corp.append(r)
for t in tools:
    for u in t["used"]:
        if u not in ids_c: errs.append(f"{t['id']}: used by unknown corpus {u}")
        else:
            c = next(x for x in C if x["id"] == u)
            if t["id"] not in c["built"]:
                warns.append(f"{t['id']} lists {u} but {u}.built does not list {t['id']}")

extra = {}
for n in ("toy_check.json", "storage.json"):
    p = os.path.join(HERE, "out", n)
    if os.path.exists(p):
        extra[n.split(".")[0]] = json.load(open(p))
data = {"asof": ASOF, "tools": tools, "corpora": corp, "cc": {"n": cc.get("n"), "newest": (cc.get("newest") or [{}])[0]}, **extra}
for w in warns: print("WARN", w)
if errs:
    for e in errs: print("ERR", e)
    sys.exit(1)
js = "window.TM_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
assert chr(0x2014) not in js, "em dash in data"
open(OUT, "w").write("// generated by src/map/gen_data.py, do not edit\n" + js)
print("wrote", OUT, len(js), "bytes;", len(tools), "tools,", len(corp), "corpora")
