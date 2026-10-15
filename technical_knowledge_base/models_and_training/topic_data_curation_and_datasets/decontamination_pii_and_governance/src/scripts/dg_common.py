"""Shared helpers for the Decontamination, PII and data governance page (prefix dg).

Reusable by other tabs (the root's Post-training data lab can import this): benchmark items in one shape,
every corpus of the running example as (corpus, doc_id, text) streams, and the text normalisation used
by every n-gram method on the page.

Run with the shared venv:  $DC_SCRATCH/venv/bin/python -I -B <script>.py
Large outputs go to $DC_SCRATCH/data/dg/ (outside the repo); small JSON the page embeds goes to ../data/.
"""
import gzip
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data"))
sys.path.insert(0, ROOT_DATA)
import load as L  # noqa: E402  (the root's loader: paths via DC_SCRATCH)

PAGE_DATA = os.path.normpath(os.path.join(HERE, "..", "data"))


def out_dir(*parts):
    d = os.path.join(L.scratch(), "data", "dg", *parts)
    os.makedirs(d, exist_ok=True)
    return d


def save_page(name, obj):
    os.makedirs(PAGE_DATA, exist_ok=True)
    with open(os.path.join(PAGE_DATA, name), "w") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


# ------------------------------------------------------------------ benchmark items
# Each item: bench, idx (row number in the split), query (the prompt part), label (the gold answer part),
# full (query + label, what a page that copies the item would contain). Natural text, no prompt template:
# a web page that copies an item copies its words, not an evaluation harness's "Answer:" scaffolding.
BENCH_NAMES = {
    "mmlu_test": "MMLU", "gsm8k_test": "GSM8K", "arc_challenge_test": "ARC-Challenge", "arc_easy_test": "ARC-Easy",
    "humaneval_test": "HumanEval", "math500_test": "MATH-500", "hellaswag_validation": "HellaSwag",
}
CALC = re.compile(r"<<[^>]*>>")  # GSM8K calculator annotations, absent from copies on the web


def bench_items():
    items = []
    for b in L.BENCH:
        d = L.bench(b)
        for i, r in enumerate(d.itertuples(index=False)):
            if b == "mmlu_test":
                ch = [str(c) for c in r.choices]
                q, a = r.question + "\n" + "\n".join(ch), ch[int(r.answer)]
            elif b.startswith("arc_"):
                txt, lab = list(r.choices["text"]), list(r.choices["label"])
                q = r.question + "\n" + "\n".join(txt)
                a = txt[lab.index(r.answerKey)] if r.answerKey in lab else ""
            elif b == "gsm8k_test":
                q, a = r.question, CALC.sub("", r.answer)
            elif b == "hellaswag_validation":
                q, a = r.ctx, list(r.endings)[int(r.label)]
            elif b == "humaneval_test":
                q, a = r.prompt, r.canonical_solution
            elif b == "math500_test":
                q, a = r.problem, r.solution
            items.append({"bench": b, "idx": i, "query": q, "label": a, "full": q + "\n" + a})
    return items


# ------------------------------------------------------------------ corpora
# Every corpus as an iterator of (doc_id, text). "kind" says what the page may show from it:
# scrubbed = PII-scrubbed web text (excerpts allowed, short, organisations only); raw = never shown;
# public = public synthetic or post-training rows (excerpts allowed).
def _msgs_text(msgs):
    return "\n".join(str(m.get("content", "")) for m in msgs)


def _nemotron_files():
    import glob
    return sorted(glob.glob(L.path("nemotron_cc", "quality-*.jsonl.gz")))


def _iter_nemotron():
    for fn in _nemotron_files():
        part = os.path.basename(fn).split("__CC-MAIN")[0]
        try:
            with gzip.open(fn, "rt") as f:
                for i, line in enumerate(f):
                    try:
                        r = json.loads(line)
                    except json.JSONDecodeError:
                        break  # head sample: the last line may be cut
                    yield f"{part}#{i}", r["text"]
        except (EOFError, OSError):
            continue  # truncated gzip stream at the end of a head sample


def _iter_parquet(kind, name, textcol="text", idcol="id"):
    d = L.curated(name, columns=[textcol, idcol]) if kind == "curated" else None
    for r in d.itertuples(index=False):
        yield str(getattr(r, idcol)), getattr(r, textcol)


WIDE = {  # whole first parquet file of CC-MAIN-2024-30, downloaded for this page (see SETUP.md, dg section)
    "fineweb_file0": "dg/wide/fineweb/data/CC-MAIN-2024-30/000_00000.parquet",
    "fineweb_edu_file0": "dg/wide/fineweb-edu/data/CC-MAIN-2024-30/000_00000.parquet",
}


def _iter_wide(name):
    import pyarrow.parquet as pq
    f = pq.ParquetFile(C_path(WIDE[name]))
    for g in range(f.num_row_groups):
        t = f.read_row_group(g, columns=["id", "text"])
        for i, x in zip(t.column("id").to_pylist(), t.column("text").to_pylist()):
            yield i, x


def C_path(rel):
    return L.path(*rel.split("/"))


def _iter_run0(stage):
    for d in L.run0(stage):
        yield d["id"], d["text"]


def _iter_post(name):
    d = L.post(name)
    for i, r in enumerate(d.itertuples(index=False)):
        if name == "tulu3_sft_5k":
            yield r.id, _msgs_text(r.messages)
        elif name == "ultrafeedback_binarized_prefs_5k":
            ch = r.chosen[-1]["content"] if len(r.chosen) else ""
            rj = r.rejected[-1]["content"] if len(r.rejected) else ""
            yield r.prompt_id, r.prompt + "\n" + ch + "\n" + rj
        elif name == "rlvr_gsm_math_if_all":
            yield f"rlvr#{i}", _msgs_text(r.messages) + "\n" + str(r.ground_truth)
        elif name == "cosmopedia_web_samples_v2_2k":
            yield f"cosmo#{i}", r.text


CORPORA = {
    # name: (label, kind, group, iterator factory)
    "run0_final": ("run0 final (our FineWeb-style output, 1 WARC)", "scrubbed", "web", lambda: _iter_run0("final")),
    "run0_extracted": ("run0 extracted, before any filter (1 WARC)", "raw", "web", lambda: _iter_run0("extracted")),
    "fineweb": ("FineWeb CC-MAIN-2024-30, 50k random rows", "scrubbed", "web",
                lambda: _iter_parquet("curated", "fineweb_rand50k")),
    "fineweb_edu": ("FineWeb-Edu CC-MAIN-2024-30, 50k random rows", "scrubbed", "web",
                    lambda: _iter_parquet("curated", "fineweb_edu_rand50k")),
    "dclm": ("DCLM-baseline 1.0, first 50k rows", "raw", "web", lambda: _iter_parquet("curated", "dclm_first50k")),
    "nemotron": ("Nemotron-CC CC-MAIN-2024-30 head samples (real and synthetic buckets)", "raw", "web",
                 _iter_nemotron),
    "fineweb_file0": ("FineWeb CC-MAIN-2024-30, whole file 000_00000 (971,981 rows)", "scrubbed", "web",
                      lambda: _iter_wide("fineweb_file0")),
    "fineweb_edu_file0": ("FineWeb-Edu CC-MAIN-2024-30, whole file 000_00000", "scrubbed", "web",
                          lambda: _iter_wide("fineweb_edu_file0")),
    "tulu3_sft": ("Tulu 3 SFT mixture, 5k rows (5 subsets)", "public", "post", lambda: _iter_post("tulu3_sft_5k")),
    "ultrafeedback": ("UltraFeedback binarized, 5k pairs (prompt, chosen, rejected)", "public", "post",
                      lambda: _iter_post("ultrafeedback_binarized_prefs_5k")),
    "rlvr": ("Tulu 3 RLVR GSM/MATH/IF, all 29,946 prompts", "public", "post", lambda: _iter_post("rlvr_gsm_math_if_all")),
    "cosmopedia": ("Cosmopedia web_samples_v2, 2k synthetic documents", "public", "post",
                   lambda: _iter_post("cosmopedia_web_samples_v2_2k")),
}


def corpus_iter(name):
    return CORPORA[name][3]()


def corpus_text(name, doc_id):
    for i, t in corpus_iter(name):
        if i == doc_id:
            return t
    return None
