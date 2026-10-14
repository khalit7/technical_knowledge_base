"""Fetch dated metadata for the Tool map: PyPI (version, date, licence, release history), GitHub (licence, archived,
last push, latest release or tag, latest commit on the default branch) and Hugging Face (dataset and model cards:
licence, created, last modified, size, gated).
Run: python3 src/map/fetch_meta.py [pypi|gh|feeds|hfd|hfm|cc]   (plain Python 3; writes src/map/inputs/*.json).
GitHub's unauthenticated API allows 60 calls an hour, so repo metadata is one API call per repo; releases, tags and
commits come from the public Atom feeds (github.com/<repo>/{releases,tags,commits}.atom), which are not rate limited.
Adapted from the RAG topic's Tool map (agents_and_retrieval/topic_rag_and_retrieval/src/map/fetch_meta.py)."""
import json, os, sys, time, urllib.request, xml.etree.ElementTree as ET
HERE = os.path.dirname(os.path.abspath(__file__))
I = os.path.join(HERE, "inputs")
UA = {"User-Agent": "kb-tool-map/1.0"}

PYPI = ["datatrove", "dolma", "nemo-curator", "py-data-juicer", "trafilatura", "resiliparse", "justext", "readability-lxml",
        "inscriptis", "boilerpy3", "fastwarc", "warcio", "fasttext", "fasttext-wheel", "fasttext-numpy2", "fasttext-numpy2-wheel",
        "gcld3", "pycld3", "lingua-language-detector", "langdetect", "datasketch", "rensa", "rbloom", "kenlm",
        "presidio-analyzer", "pyarrow", "zstandard", "webdataset", "mosaicml-streaming", "litdata", "datasets", "ray",
        "pyspark", "daft", "polars", "tokenizers", "megatron-core", "text-dedup", "olmo-core", "huggingface-hub"]

GH = ["huggingface/datatrove", "allenai/dolma", "NVIDIA-NeMo/Curator", "modelscope/data-juicer", "ChenghaoMou/text-dedup",
      "adbar/trafilatura", "chatnoir-eu/chatnoir-resiliparse", "miso-belica/jusText", "buriy/python-readability",
      "mozilla/readability", "facebookresearch/fastText", "cisnlp/GlotLID", "google/cld3", "pemistahl/lingua-py",
      "google-research/deduplicate-text-datasets", "ekzhu/datasketch", "beowolx/rensa", "KenanHanke/rbloom", "kpu/kenlm",
      "facebookresearch/cc_net", "mlfoundations/dclm", "microsoft/presidio", "bigcode-project/bigcode-dataset",
      "togethercomputer/RedPajama-Data", "EleutherAI/the-pile", "mosaicml/streaming", "webdataset/webdataset",
      "huggingface/datasets", "Lightning-AI/litData", "ray-project/ray", "apache/spark", "Eventual-Inc/Daft",
      "huggingface/fineweb-2", "apache/arrow", "facebook/zstd", "allenai/OLMo-core", "NVIDIA/Megatron-LM",
      "commoncrawl/cc-index-table", "huggingface/cosmopedia", "allenai/open-instruct", "EleutherAI/gpt-neox",
      "Zyphra/Zyda_processing", "NVIDIA/NeMo-Curator", "allenai/olmocr",
      "allenai/datamap-rs", "allenai/duplodocus", "liujch1998/bsade", "allenai/dolma3"]

HFD = ["allenai/c4", "EleutherAI/pile", "monology/pile-uncopyrighted", "togethercomputer/RedPajama-Data-1T",
       "togethercomputer/RedPajama-Data-V2", "cerebras/SlimPajama-627B", "tiiuae/falcon-refinedweb", "HuggingFaceFW/fineweb",
       "HuggingFaceFW/fineweb-edu", "HuggingFaceFW/fineweb-2", "HuggingFaceFW/finepdfs", "HuggingFaceFW/fineweb-edu-score-2",
       "mlfoundations/dclm-baseline-1.0", "mlfoundations/dclm-baseline-1.0-parquet", "mlfoundations/dclm-pool-400m-1x",
       "allenai/dolma", "allenai/olmo-mix-1124", "allenai/dolmino-mix-1124", "allenai/dolma3_mix-6T-1025",
       "allenai/olmo-3-pretraining-mix", "nvidia/Nemotron-CC-v2", "nvidia/Nemotron-CC-Math-v1", "nvidia/Nemotron-Pretraining-Dataset-sample",
       "Zyphra/Zyda", "Zyphra/Zyda-2", "bigcode/the-stack", "bigcode/the-stack-v2", "bigcode/the-stack-v2-dedup",
       "HuggingFaceTB/smollm-corpus", "HuggingFaceTB/cosmopedia", "HuggingFaceTB/finemath", "EleutherAI/proof-pile-2",
       "common-pile/comma_v0.1_training_dataset", "PleIAs/common_corpus", "allenai/peS2o", "open-web-math/open-web-math",
       "HuggingFaceFW/fineweb-2-hq", "epfml/FineWeb2-HQ", "allenai/tulu-3-sft-mixture", "openbmb/UltraFeedback",
       "HuggingFaceH4/ultrafeedback_binarized", "allenai/olmo-2-1124-7b-preference-mix", "HuggingFaceTB/smoltalk",
       "nvidia/Llama-Nemotron-Post-Training-Dataset", "open-thoughts/OpenThoughts3-1.2M", "allenai/RLVR-GSM-MATH-IF-Mixed-Constraints"]

HFM = ["facebook/fasttext-language-identification", "cis-lmu/glotlid", "HuggingFaceFW/fineweb-edu-classifier",
       "mlfoundations/fasttext-oh-eli5", "nvidia/quality-classifier-deberta", "nvidia/nemocurator-fineweb-mixtral-edu-classifier",
       "nvidia/nemocurator-fineweb-nemotron-4-edu-classifier", "HuggingFaceFW/finepdfs_edu_classifier_eng_Latn",
       "allenai/dolma-jigsaw-fasttext-bigrams-nsfw", "openbmb/Ultra-FineWeb-classifier", "nvidia/domain-classifier"]


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
                hist.append([min(f["upload_time"] for f in files)[:10], v])
        hist.sort()
        rel_files = d["releases"].get(info["version"]) or d.get("urls") or []
        cls = [c for c in info.get("classifiers") or [] if c.startswith("License") or c.startswith("Development Status")]
        out[p] = {"version": info["version"], "date": min([f["upload_time"] for f in rel_files] or [""])[:10],
                  "license": (info.get("license_expression") or info.get("license") or "")[:120], "classifiers": cls,
                  "summary": info.get("summary"), "requires_python": info.get("requires_python"),
                  "first": hist[0] if hist else None, "n_releases": len(hist), "last5": hist[-5:], "fetched": time.strftime("%Y-%m-%d")}
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
                  "desc": (d.get("description") or "")[:200], "fetched": time.strftime("%Y-%m-%d")}
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


def _hf(kind, names, fname):
    out = load(fname)
    for m in names:
        try:
            d = json.loads(get(f"https://huggingface.co/api/{kind}/{m}"))
        except Exception as e:
            out[m] = {"error": str(e)[:80], "fetched": time.strftime("%Y-%m-%d")}; print(m, "ERR", e); continue
        card = d.get("cardData") or {}
        tags = d.get("tags") or []
        lic = card.get("license") or next((t[8:] for t in tags if t.startswith("license:")), None)
        size = next((t for t in tags if t.startswith("size_categories:")), None)
        out[m] = {"id": d.get("id"), "sha": d.get("sha"), "lastModified": (d.get("lastModified") or "")[:10],
                  "created": (d.get("createdAt") or "")[:10], "license": lic, "license_name": card.get("license_name"),
                  "license_link": card.get("license_link"), "gated": d.get("gated"), "disabled": d.get("disabled"),
                  "private": d.get("private"), "size_cat": size, "downloads": d.get("downloads"),
                  "n_files": len(d.get("siblings") or []), "fetched": time.strftime("%Y-%m-%d")}
        print(m, lic, out[m]["created"], out[m]["lastModified"], d.get("gated"), size)
    save(fname, out)


def cc():
    """Common Crawl's list of crawls (newest first)."""
    d = json.loads(get("https://index.commoncrawl.org/collinfo.json"))
    save("commoncrawl_collinfo.json", {"fetched": time.strftime("%Y-%m-%d"), "n": len(d), "newest": d[:6], "oldest": d[-2:]})
    print(len(d), d[0])


if __name__ == "__main__":
    {"pypi": pypi, "gh": gh, "feeds": feeds, "hfd": lambda: _hf("datasets", HFD, "hf_datasets.json"),
     "hfm": lambda: _hf("models", HFM, "hf_models.json"), "cc": cc}[sys.argv[1]]()
