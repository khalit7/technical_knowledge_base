"""Language ID in depth on the 19,241 documents trafilatura extracted in run0 (the exact input of run0's LID step).

Three identifiers on the same text:
  ft176   fastText lid.176.bin (176 labels; FineWeb, RefinedWeb, DCLM, Dolma); called exactly as datatrove 0.10.1's
          FastTextLID.predict (utils/lid.py:53-59): newlines replaced by spaces, k=-1 (all labels)
  glotlid GlotLID v3 model_v3.bin (cis-lmu/glotlid; FineWeb2), same call; labels like eng_Latn
  cld2    Common Crawl's own label in the WET record header (WARC-Identified-Content-Language, CLD2), first code
Document level: top label and score of each, English score of each.
Line level (code-switching): every line with at least 4 whitespace words is classified by both models; per document
the share of those characters whose GlotLID top label differs from the document's GlotLID top label with line score
>= 0.5, and the most common such label.
Run in this page's venv: nice -n 15 $DC_SCRATCH/ef/venv/bin/python -I -B ef_lid.py
Output: $DC_SCRATCH/data/ef/lid.jsonl.gz
"""
import collections
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402
L = E.L


def main():
    import fasttext
    fasttext.FastText.eprint = lambda *a, **k: None
    ft = fasttext.load_model(L.model_path("lid176"))
    gl = fasttext.load_model(E.scratch("models", "glotlid_model_v3.bin"))

    def pred(m, text, k=-1):
        labs, sc = m.predict(text.replace("\n", " "), k=k)
        d = {lab.split("__")[2]: float(s) for lab, s in zip(labs, sc)}
        top = max(d.items(), key=lambda x: x[1])
        return top, d

    cld2 = {}
    from warcio.archiveiterator import ArchiveIterator
    with open(L._cc("wet"), "rb") as f:
        for r in ArchiveIterator(f):
            if r.rec_type == "conversion":
                lang = r.rec_headers.get_header("WARC-Identified-Content-Language")
                cld2[r.rec_headers.get_header("WARC-Refers-To")] = (lang or "").split(",")[0] or None
    out = []
    lim = int(os.environ.get("EF_LIMIT", "0")) or None
    for i, d in enumerate(L.run0("extracted", limit=lim)):
        t = d["text"]
        (ftl, fts), ftd = pred(ft, t)
        (gll, gls), gld = pred(gl, t)
        row = {"id": d["id"], "n": len(t), "ft": ftl, "fts": round(fts, 4), "ft_en": round(ftd.get("en", 0.0), 4),
               "gl": gll, "gls": round(gls, 4), "gl_en": round(gld.get("eng_Latn", 0.0), 4),
               "gl2": sorted(gld.items(), key=lambda x: -x[1])[1][0] if len(gld) > 1 else None,
               "cld2": cld2.get(d["id"])}
        # line level
        other = collections.Counter()
        tot, nl, ft_other = 0, 0, 0
        for line in t.split("\n"):
            if len(line.split()) < 4:
                continue
            nl += 1
            (ll, ls), _ = pred(gl, line, 1)
            (fl, fs), _ = pred(ft, line, 1)
            tot += len(line)
            if ls >= 0.5 and ll != gll:
                other[ll] += len(line)
            if fs >= 0.5 and fl != ftl:
                ft_other += len(line)
        row["lines"] = nl
        row["mix"] = round(sum(other.values()) / tot, 4) if tot else 0.0
        row["mix_lang"] = other.most_common(1)[0][0] if other else None
        row["mix_ft"] = round(ft_other / tot, 4) if tot else 0.0
        out.append(row)
        if (i + 1) % 2000 == 0:
            print(i + 1, flush=True)
    E.write_jsonl_gz(E.scratch("lid.jsonl.gz"), out)
    print("done", len(out))


if __name__ == "__main__":
    main()
