"""Fetch dated metadata for the Tool map: PyPI (version, date, licence, release history, yanked releases) and GitHub
(licence, archived flag, last push, latest release or tag, latest commit on the default branch).
Run: python3 src/map/fetch_meta.py [pypi|gh|feeds]   (plain Python 3; writes src/map/inputs/*.json).
GitHub's unauthenticated API allows 60 calls an hour, so repo metadata is one API call per repo; releases, tags and
commits come from the public Atom feeds (github.com/<repo>/{releases,tags,commits}.atom), which are not rate limited.
Adapted from the data-curation topic's Tool map (models_and_training/topic_data_curation_and_datasets/src/map)."""
import json, os, sys, time, urllib.request, xml.etree.ElementTree as ET
HERE = os.path.dirname(os.path.abspath(__file__))
I = os.path.join(HERE, "inputs")
UA = {"User-Agent": "kb-tool-map/1.0"}

PYPI = ["jax", "jaxlib", "jax-cuda12-plugin", "jax-cuda13-plugin", "jax-rocm60-plugin", "jax-rocm7-plugin", "libtpu",
        "jax-metal", "ml-dtypes", "flax", "equinox", "dm-haiku", "objax", "trax", "optax", "orbax-checkpoint", "orbax-export",
        "grain", "chex", "jmp", "penzai", "treescope", "jax-ai-stack", "jaxtyping", "maxtext", "google-tunix", "levanter",
        "haliax", "paxml", "praxis", "t5x", "google-jetstream", "vllm", "tpu-inference", "sglang-jax", "torch-xla", "torchax",
        "keras", "keras-hub", "tensorflow", "tokamax", "qwix", "xpk", "easydel", "marin", "kauldron", "jax-tpu-embedding"]

GH = ["jax-ml/jax", "openxla/xla", "openxla/stablehlo", "google/flax", "patrick-kidger/equinox", "google-deepmind/dm-haiku",
      "google/objax", "google/trax", "google-deepmind/optax", "google/orbax", "google/grain", "google-deepmind/chex",
      "google-deepmind/jmp", "google-deepmind/penzai", "google-deepmind/treescope", "AI-Hypercomputer/maxtext", "google/tunix",
      "stanford-crfm/levanter", "google-research/big_vision", "google-research/t5x", "google/paxml", "google/praxis",
      "young-geng/EasyLM", "marin-community/marin", "AI-Hypercomputer/JetStream", "vllm-project/tpu-inference",
      "sgl-project/sglang-jax", "pytorch/xla", "google/torchax", "keras-team/keras", "jax-ml/jax-ai-stack", "ROCm/rocm-jax",
      "jax-ml/scaling-book", "openxla/tokamax", "google/qwix", "AI-Hypercomputer/xpk", "erfanzar/EasyDeL", "google-research/kauldron",
      "AI-Hypercomputer/maxdiffusion", "stanford-crfm/haliax", "AI-Hypercomputer/tpu-recipes", "GoogleCloudPlatform/cluster-toolkit"]


def get(url, binary=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        b = r.read()
    return b if binary else b.decode("utf-8", "replace")


def save(name, d):
    json.dump(d, open(os.path.join(I, name), "w"), indent=1, sort_keys=True)


def load(name):
    p = os.path.join(I, name)
    return json.load(open(p)) if os.path.exists(p) else {}


def pypi():
    out = load("pypi.json")
    for p in PYPI:
        try:
            d = json.loads(get(f"https://pypi.org/pypi/{p}/json"))
        except Exception as e:
            out[p] = {"error": str(e)[:80], "fetched": time.strftime("%Y-%m-%d")}; print(p, "ERR", e); continue
        info = d["info"]
        hist = []
        for v, files in d["releases"].items():
            if files:
                hist.append([min(f["upload_time"] for f in files)[:10], v, all(f.get("yanked") for f in files)])
        hist.sort()
        rel_files = d["releases"].get(info["version"]) or d.get("urls") or []
        cls = [c for c in info.get("classifiers") or [] if c.startswith("License") or c.startswith("Development Status")]
        out[p] = {"version": info["version"], "date": min([f["upload_time"] for f in rel_files] or [""])[:10],
                  "license": (info.get("license_expression") or info.get("license") or "")[:120], "classifiers": cls,
                  "summary": info.get("summary"), "requires_python": info.get("requires_python"),
                  "requires_dist": [r for r in (info.get("requires_dist") or []) if "extra ==" not in r][:25],
                  "home": (info.get("project_urls") or {}),
                  "first": hist[0][:2] if hist else None, "n_releases": len(hist), "last5": [h[:2] for h in hist[-5:]],
                  "fetched": time.strftime("%Y-%m-%d")}
        print(p, out[p]["version"], out[p]["date"], out[p]["license"][:40])
    save("pypi.json", out)


def gh():
    out = load("github_repos.json")
    for r in GH:
        if r in out and "error" not in out[r]:
            continue
        try:
            d = json.loads(get(f"https://api.github.com/repos/{r}"))
        except Exception as e:
            print(r, "ERR", e); out[r] = {"error": str(e)[:80], "fetched": time.strftime("%Y-%m-%d")}
            if "403" in str(e) or "429" in str(e):
                break
            continue
        out[r] = {"full_name": d["full_name"], "license": (d.get("license") or {}).get("spdx_id"), "archived": d["archived"],
                  "pushed": d["pushed_at"][:10], "created": d["created_at"][:10], "default_branch": d.get("default_branch"),
                  "stars": d.get("stargazers_count"), "desc": (d.get("description") or "")[:200], "fetched": time.strftime("%Y-%m-%d")}
        print(r, "->", out[r]["full_name"], out[r]["license"], out[r]["archived"], out[r]["pushed"])
    save("github_repos.json", out)


def feeds():
    """Latest release or tag and latest commit on the default branch, from Atom feeds."""
    ns = {"a": "http://www.w3.org/2005/Atom"}
    out = load("github_feeds.json")
    for r in GH:
        rec = {"fetched": time.strftime("%Y-%m-%d")}
        for kind in ("releases", "tags", "commits"):
            try:
                x = ET.fromstring(get(f"https://github.com/{r}/{kind}.atom", binary=True))
            except Exception as e:
                rec[kind] = {"error": str(e)[:60]}; continue
            ent = []
            for e in x.findall("a:entry", ns)[:6]:
                t = (e.find("a:title", ns).text or "").strip().splitlines()[0][:70]
                u = e.find("a:updated", ns).text or ""
                link = e.find("a:link", ns).attrib.get("href", "")
                ent.append([u[:10], t, link.rsplit("/", 1)[-1][:40]])
            rec[kind] = ent
        out[r] = rec
        rl = rec.get("releases") or []
        cm = rec.get("commits") or []
        print(r, "rel", rl[:1] if isinstance(rl, list) else rl, "commit", cm[:1] if isinstance(cm, list) else cm)
    save("github_feeds.json", out)


if __name__ == "__main__":
    {"pypi": pypi, "gh": gh, "feeds": feeds}[sys.argv[1]]()
