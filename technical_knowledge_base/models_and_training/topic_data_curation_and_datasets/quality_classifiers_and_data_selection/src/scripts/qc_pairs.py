"""Paired format test: the same source page before and after Nemotron-CC's LLM rewrites.

Nemotron-CC synthetic rows carry the source page's URL and WARC-Record-ID. For the first N rows of each synthetic
partition (part-00000 head samples saved by the synthetic_data sibling in $DC_SCRATCH/data/syn/nemo/), ask the
CC-MAIN-2024-30 URL index where the capture lives, fetch only that record's bytes (HTTP range), check that the record id
matches, and extract text with jusText (Nemotron-CC's extractor), as the sibling's get_sources.py does for 5 rows.
Run under the download lock (polite: one request at a time, 1 s apart).  Output: $DC_SCRATCH/qc/pairs.jsonl (resumable).
usage: qc_pairs.py fetch <N per kind>
"""
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request

import qc_common as C

NM = os.path.join(C.L.scratch(), "data", "syn", "nemo")
KINDS = [("high", "distill"), ("high", "diverse_qa_pairs"), ("high", "extract_knowledge"), ("high", "knowledge_list"),
         ("high", "wrap_medium"), ("low", "wrap_medium")]
OUTF = C.sdir("pairs.jsonl")


def get(url, rng=None):
    for i in range(5):
        try:
            h = {"User-Agent": "kb-research/0.1 (quality-classifier study)"}
            if rng:
                h["Range"] = rng
            return urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=60).read()
        except Exception as e:  # 503 slow-down from the index: back off
            print("retry", i, type(e).__name__, flush=True)
            time.sleep(5 + 10 * i)
    return None


def fetch(n):
    from warcio.archiveiterator import ArchiveIterator
    import justext
    have = set()
    if os.path.exists(OUTF):
        have = {(r["kind"], r["warc_record_id"]) for r in C.jl_read(OUTF)}
    out = open(OUTF, "a")
    for q, k2 in KINDS:
        kind = f"{q}__{k2}"
        rows = C.jl_read(os.path.join(NM, f"{q}__{k2}__part00000.jsonl"))
        seen, done = set(), sum(1 for kk, _ in have if kk == kind)
        for row in rows:
            if done >= n:
                break
            rid = row["warc_record_id"]
            if rid in seen or (kind, rid) in have:
                continue
            seen.add(rid)
            idx = get("https://index.commoncrawl.org/CC-MAIN-2024-30-index?" + urllib.parse.urlencode({"url": row["url"], "output": "json"}))
            time.sleep(1)
            if not idx:
                continue
            found = None
            for line in idx.decode().strip().splitlines():
                c = json.loads(line)
                if c.get("status") != "200":
                    continue
                off, ln = int(c["offset"]), int(c["length"])
                raw = get("https://data.commoncrawl.org/" + c["filename"], f"bytes={off}-{off + ln - 1}")
                time.sleep(1)
                if not raw:
                    continue
                for rec in ArchiveIterator(io.BytesIO(raw)):
                    r_id = rec.rec_headers.get_header("WARC-Record-ID").strip("<>").replace("urn:uuid:", "")
                    html = rec.content_stream().read()
                    if r_id == rid:
                        found = html
                        break
                if found:
                    break
            if not found:
                continue
            try:
                paras = [p.text for p in justext.justext(found, justext.get_stoplist("English")) if not p.is_boilerplate]
            except Exception:
                continue
            src = "\n".join(paras)
            if len(src.split()) < 50:
                continue
            # all synthetic rows of this partition generated from this page (several segments per page)
            syn = [r["text"] for r in rows if r["warc_record_id"] == rid]
            out.write(json.dumps({"kind": kind, "warc_record_id": rid, "url": row["url"], "source": src, "synthetic": syn}) + "\n")
            out.flush()
            done += 1
            print(kind, done, len(src.split()), len(syn), flush=True)
    out.close()


KIND_LABEL = {"high__distill": "Distill (concise rewrite)", "high__diverse_qa_pairs": "Diverse Q&A pairs", "high__extract_knowledge": "Extract knowledge",
              "high__knowledge_list": "Knowledge list", "high__wrap_medium": "Wikipedia-style (high source)", "low__wrap_medium": "Wikipedia-style (low source)"}


def score():
    """FineWeb-Edu score and DCLM logit for each source page and the mean over its rewrites (CPU, small)."""
    import numpy as np
    rows = C.jl_read(OUTF)
    src = [r["source"] for r in rows]
    syn = [s for r in rows for s in r["synthetic"]]
    e_src = C.Q.edu_scores(src); e_syn = C.Q.edu_scores(syn)
    d_src = C.Q.dclm_scores(src); d_syn = C.Q.dclm_scores(syn)
    lg = lambda p: float(np.log(max(p, 1e-7) / max(1 - p, 1e-7)))  # noqa: E731
    out, k = {}, 0
    for r, es, ds in zip(rows, e_src, d_src):
        n = len(r["synthetic"])
        ea = float(np.mean(e_syn[k:k + n])); da = float(np.mean([lg(x) for x in d_syn[k:k + n]])); k += n
        out.setdefault(r["kind"], []).append((es, ea, lg(ds), da))
    res = {"rows": []}
    for kind, v in out.items():
        a = np.array(v)
        res["rows"].append({"kind": KIND_LABEL.get(kind, kind), "n": len(v), "edu_b": float(a[:, 0].mean()), "edu_a": float(a[:, 1].mean()),
                            "edu_up": float((a[:, 1] > a[:, 0]).mean()), "dc_b": float(a[:, 2].mean()), "dc_a": float(a[:, 3].mean()),
                            "dc_up": float((a[:, 3] > a[:, 2]).mean()), "edu_pass_b": float((a[:, 0] >= 2.5).mean()), "edu_pass_a": float((a[:, 1] >= 2.5).mean())})
    allv = np.array([x for v in out.values() for x in v])
    hq = np.array([x for kk, v in out.items() if kk.startswith("high") and kk != "high__wrap_medium" for x in v])
    res["summary"] = (f"over {len(allv)} pages and their rewrites, the rewrite's FineWeb-Edu score is higher than its own source's for "
                      f"{100 * (allv[:, 1] > allv[:, 0]).mean():.0f}% of pages (mean {allv[:, 0].mean():.2f} to {allv[:, 1].mean():.2f}); for the four "
                      f"high-quality rewrite styles alone, {100 * (hq[:, 1] > hq[:, 0]).mean():.0f}% (pass rate at 2.5: {100 * (hq[:, 0] >= 2.5).mean():.0f}% "
                      f"of sources, {100 * (hq[:, 1] >= 2.5).mean():.0f}% of rewrites)") if len(hq) else ""
    res["note"] = ("Each source page was fetched from Common Crawl by the WARC record id the Nemotron-CC row carries and extracted with jusText; "
                   "rewrites are segments of the source, so the comparison is each source's score against the mean over its rewrite segments. "
                   "Rows: Nemotron-CC CC-MAIN-2024-30 part-00000 head samples (the synthetic data sibling's downloads), first pages with a fetchable source.")
    C.dump("pairs_scores.json", res)
    print(res["summary"])


if __name__ == "__main__":
    if sys.argv[1] == "fetch":
        fetch(int(sys.argv[2]))
    elif sys.argv[1] == "score":
        score()
