"""Widening of the Pipeline lab (2026-10-14): the same per-page measurements as steps 1 and 3 on three more WARC
files of the same segment (files 00001 to 00003, downloaded by $DC_SCRATCH/data/pipe/wide/get.sh), so the funnel
shares and the threshold findings rest on about 80,000 pages instead of 20,000.

Per page: datatrove's URLFilter; trafilatura 1.11.0 with run0's options but WITHOUT datatrove's 1 s timeout (30 s
safety cap; for file 00000 the comparable series is the re-run, 'traf_rerun'); resiliparse with Dolma's settings;
Common Crawl's WET; lid.176; the run0 filter chain per extractor; the chain variants on trafilatura's text; and a
join with FineWeb's own rows for the file (file_path = the WARC).

usage: pip_wide.py run 00001          -> $DC_SCRATCH/data/pipe/wide/out_00001.jsonl.gz
       pip_wide.py aggregate          -> src/pipe/out/wide.json (files 00000 to 00003)
"""
import os
import signal
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pip_common as P  # noqa: E402
import pip_funnel as F  # noqa: E402
L = P.L
from datatrove.data import Document  # noqa: E402

PFX = "CC-MAIN-20240712094214-20240712124214-"


def wide(*p):
    return os.path.join(L.scratch(), "data", "pipe", "wide", *p)


def run(n):
    import fasttext
    import pyarrow.parquet as pq
    from resiliparse.extract.html2text import extract_plain_text
    from trafilatura import extract
    from warcio.archiveiterator import ArchiveIterator
    from datatrove.pipeline.readers import WarcReader
    from datatrove.pipeline.filters import URLFilter
    model = fasttext.load_model(L.model_path("lid176"))
    chains = {k: P.chain(**v) for k, v in F.VARIANTS.items()}
    uf = URLFilter()
    wet = {}
    with open(wide("wet", PFX + n + ".warc.wet.gz"), "rb") as f:
        for r in ArchiveIterator(f):
            if r.rec_type == "conversion":
                wet[r.rec_headers.get_header("WARC-Refers-To")] = r.content_stream().read().decode("utf-8", "replace")
    fw = set()  # FineWeb membership is joined in aggregate()

    def alarm(*_):
        raise TimeoutError
    signal.signal(signal.SIGALRM, alarm)
    rows = []
    reader = WarcReader(wide("warc"), glob_pattern=f"{PFX}{n}.warc.gz", default_metadata={"dump": L.CRAWL})
    for i, d in enumerate(reader.run()):
        o = {"id": d.id, "in_fineweb": d.id in fw}
        r = uf.filter(d)
        if r is not True:
            o["url_out"] = r[1]
            rows.append(o)
            continue
        html = d.text
        signal.alarm(30)
        try:
            tr = extract(html, favor_precision=True, include_comments=False, deduplicate=True)
        except TimeoutError:
            tr = None
        finally:
            signal.alarm(0)
        res = extract_plain_text(html, preserve_formatting=True, main_content=True, list_bullets=True,
                                 alt_texts=False, links=False, form_fields=False, noscript=False, comments=True)
        texts = {"traf": tr or "", "res": res or "", "wet": wet.get(d.id) or ""}
        for x, t in texts.items():
            o[f"{x}_chars"] = len(t)
            o[f"{x}_lid"] = F.lid_scores(model, t) if t.strip() else None
            if not t.strip():
                o[f"{x}_out"] = ["1b_extract", "no_text"]
                continue
            res_ = P.run_chain(Document(text=t, id=d.id, metadata={"url": d.metadata.get("url")}), chains["base"])
            o[f"{x}_out"] = list(res_) if res_ != (None, None) else ["kept", None]
        if o["traf_lid"] and o["traf_lid"]["en"] > 0.65:
            for v in F.VARIANTS:
                if v == "base":
                    continue
                res_ = P.run_chain(Document(text=texts["traf"], id=d.id, metadata={}), chains[v][1:])
                o["var_" + v] = list(res_) if res_ != (None, None) else ["kept", None]
        rows.append(o)
        if (i + 1) % 2000 == 0:
            print(n, i + 1, flush=True)
        if os.environ.get("LIMIT") and i + 1 >= int(os.environ["LIMIT"]):
            break
    P.write_jsonl_gz(wide(f"out_{n}.jsonl.gz"), rows)
    print("done", n, len(rows), "fineweb rows", len(fw))


def aggregate():
    fw0 = set(L.ids("fineweb_kept"))
    removed0 = Counter(d["metadata"].get("filter_reason") for d in L.run0_removed("1_url"))
    files = {}
    # file 00000 from steps 1 and 3 (trafilatura without timeout = traf_rerun)
    oc = P.read_jsonl_gz(P.scratch("outcomes.jsonl.gz"))
    rows0 = []
    for o in oc:
        r = {"id": o["id"], "in_fineweb": o["id"] in fw0, "traf_out": o["traf_rerun_out"], "res_out": o["res_out"],
             "wet_out": o["wet_out"]}
        for v in F.VARIANTS:
            if v != "base" and o.get("var_" + v):
                r["var_" + v] = o["var_" + v]
        rows0.append(r)
    rows0 += [{"id": None, "in_fineweb": False, "url_out": k} for k, c in removed0.items() for _ in range(c)]
    files["00000"] = (rows0, len(fw0))
    import pyarrow.parquet as pq
    for n in ("00001", "00002", "00003"):
        p = wide(f"out_{n}.jsonl.gz")
        if os.path.exists(p):
            fwp = wide("fw", f"fineweb_{PFX}{n}.parquet")
            fwi = set(pq.read_table(fwp, columns=["id"]).column("id").to_pylist()) if os.path.exists(fwp) else set()
            rows = P.read_jsonl_gz(p)
            for r in rows:
                r["in_fineweb"] = r["id"] in fwi
            files[n] = (rows, len(fwi))
    agg = {}
    tot = Counter()
    for n, (rows, nfw) in files.items():
        a = Counter()
        a["html_pages"] = len(rows)
        a["fineweb_rows"] = nfw
        a["files_with_fineweb"] = int(nfw > 0)
        a["url_removed"] = sum(1 for r in rows if r.get("url_out"))
        for x in ("traf", "res", "wet"):
            for r in rows:
                if r.get("url_out"):
                    continue
                s = r[f"{x}_out"][0]
                a[f"{x}|{s}"] += 1
                if s == "kept" and r["in_fineweb"]:
                    a[f"{x}|kept_in_fineweb"] += 1
                if s == "kept" and nfw:
                    a[f"{x}|kept_fwfiles"] += 1
        for v in F.VARIANTS:
            if v == "base":
                continue
            for r in rows:
                vv, b = r.get("var_" + v), r.get("traf_out")
                if not vv:
                    continue
                if vv[0] == "kept" and b[0] != "kept":
                    a[f"var|{v}|extra"] += 1
                    a[f"var|{v}|extra_in_fineweb"] += r["in_fineweb"]
                    a[f"var|{v}|extra_fwfiles"] += bool(nfw)
                if vv[0] != "kept" and b[0] == "kept":
                    a[f"var|{v}|lost"] += 1
                    a[f"var|{v}|lost_in_fineweb"] += r["in_fineweb"]
                    a[f"var|{v}|lost_fwfiles"] += bool(nfw)
        agg[n] = dict(a)
        tot.update(a)
    P.save_out("wide.json", {"files": agg, "total": dict(tot), "n_files": len(files),
                             "note": "trafilatura without datatrove's 1 s timeout in every file (file 00000: the re-run)"})
    print({k: v for k, v in tot.items() if "|kept" in k or k.startswith("var") or k in ("html_pages", "fineweb_rows")})


if __name__ == "__main__":
    run(sys.argv[2]) if sys.argv[1] == "run" else aggregate()
