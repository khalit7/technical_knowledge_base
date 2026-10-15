"""Tables, code and maths through each extractor, on the targeted CC-MAIN-2024-30 pages (ef_targeted.py fetch).

For every page the reference structures are read from the HTML with resiliparse's DOM parser:
  table rows   each <tr> with at least 2 cells of text; a row SURVIVES WITH STRUCTURE when its cell texts appear in
               order on one output line; it survives as words when 80% of its words appear anywhere
  code lines   each non-blank line of a <pre> block (8+ characters); it survives verbatim when the stripped line is an
               output line's stripped text, and with indentation when its leading whitespace is kept too
  TeX          LaTeX source found in the page: MathJax delimiters in text ($...$, \\(...\\), $$...$$), <script
               type="math/tex">, MathML <annotation encoding="application/x-tex">, and the alt text of Wikipedia's
               maths images; it survives when its backslash commands (\\frac, \\sum, ...) or the whole snippet (spaces
               removed) appear in the output
Extractors: traf111 (shared venv; datatrove's settings), traf231, resiliparse (Dolma settings), justext,
readability, alltext (resiliparse main_content=False: every visible string, the closest local stand-in for WET).
Usage: ef_struct.py <extractor>...   (traf111 in the shared venv, the others in this page's venv)
Output: merged into src/data/ef_struct.json (per group and extractor) and $DC_SCRATCH/data/ef/targeted/out_<x>.jsonl.gz
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402

TEX_INLINE = re.compile(r"\$\$(.+?)\$\$|\\\((.+?)\\\)|\\\[(.+?)\\\]|(?<![\\$\w])\$([^$\n]{2,200}?)\$(?!\w)", re.S)
CMD = re.compile(r"\\[a-zA-Z]+")


def make(name):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import ef_wceb
    return ef_wceb.make(name)


def records():
    from warcio.archiveiterator import ArchiveIterator
    idx = json.load(open(E.scratch("targeted", "index.json")))
    by_url = {x["url"]: x for x in idx}
    with open(E.scratch("targeted", "records.warc.gz"), "rb") as f:
        for r in ArchiveIterator(f):
            if r.rec_type != "response":
                continue
            u = r.rec_headers.get_header("WARC-Target-URI")
            b = r.content_stream().read()
            try:
                h = b.decode("utf-8")
            except UnicodeDecodeError:
                h = b.decode("latin-1")
            if u in by_url:
                yield by_url[u], h


def refs(html):
    from resiliparse.parse.html import HTMLTree
    tree = HTMLTree.parse(html)
    body = tree.body
    rows, code, tex = [], [], []
    if body is None:
        return rows, code, tex
    for tr in body.query_selector_all("tr"):
        cells = [re.sub(r"\s+", " ", c.text).strip() for c in tr.query_selector_all("td, th")]
        cells = [c for c in cells if c]
        if len(cells) >= 2:
            rows.append(cells)
    for pre in body.query_selector_all("pre"):
        for line in pre.text.split("\n"):
            if len(line.strip()) >= 8:
                code.append(line.rstrip())
    for s in tree.document.query_selector_all('script[type^="math/tex"]'):
        tex.append(s.text)
    for a in body.query_selector_all('annotation[encoding="application/x-tex"]'):
        tex.append(a.text)
    for img in body.query_selector_all("img.mwe-math-fallback-image-inline, img.mwe-math-fallback-image-display"):
        alt = img.getattr("alt") or ""
        if alt:
            tex.append(alt)
    for node_text in [body.text]:
        for m in TEX_INLINE.finditer(node_text):
            t = next(g for g in m.groups() if g)
            if CMD.search(t) or re.search(r"[\^_=]", t):
                tex.append(t)
    return rows, code[:400], list(dict.fromkeys(x.strip() for x in tex if x.strip()))[:300]


def score(out, rows, code, tex):
    out = out or ""
    lines = [x for x in out.split("\n")]
    stripped = {x.strip() for x in lines if x.strip()}
    low = out.lower()
    words = set(re.findall(r"\w+", low))
    r_struct = r_words = 0
    for cells in rows:
        pat = r".*".join(re.escape(c[:40]) for c in cells)
        if any(re.search(pat, ln) for ln in lines if len(ln) < 5000):
            r_struct += 1
        w = set(re.findall(r"\w+", " ".join(cells).lower()))
        if w and len(w & words) / len(w) >= 0.8:
            r_words += 1
    c_verb = c_ind = 0
    line_set = set(lines)
    for c in code:
        if c.strip() in stripped:
            c_verb += 1
        if c in line_set and c != c.lstrip():
            c_ind += 1
    n_ind = sum(1 for c in code if c != c.lstrip())
    nospace = re.sub(r"\s+", "", out)
    t_whole = t_cmd = 0
    n_cmd = 0
    for t in tex:
        if re.sub(r"\s+", "", t) in nospace:
            t_whole += 1
        cmds = CMD.findall(t)
        if cmds:
            n_cmd += 1
            if all(c in out for c in cmds):
                t_cmd += 1
    return {"rows": len(rows), "rows_struct": r_struct, "rows_words": r_words, "code": len(code),
            "code_verbatim": c_verb, "code_indented": n_ind, "code_indent_kept": c_ind, "tex": len(tex),
            "tex_whole": t_whole, "tex_cmd": n_cmd, "tex_cmd_kept": t_cmd, "chars": len(out)}


def main(names):
    import logging
    import signal
    logging.disable(logging.WARNING)

    def alarm(*_):
        raise TimeoutError
    signal.signal(signal.SIGALRM, alarm)
    pages, seen = [], set()
    for meta, html in records():  # the same page captured under several query strings counts once
        key = meta["url"].split("?")[0].replace("://www.", "://")
        if key not in seen:
            seen.add(key)
            pages.append((meta, html))
    try:
        res = E.load_json("ef_struct.json")
    except FileNotFoundError:
        res = {}
    for name in names:
        fn = make(name)
        rows_out = []
        agg = {}
        for meta, html in pages:
            rws, cd, tx = refs(html)
            signal.alarm(30)
            try:
                out = fn(html) or ""
            except Exception:  # noqa: BLE001
                out = ""
            finally:
                signal.alarm(0)
            s = score(out, rws, cd, tx)
            rows_out.append({"url": meta["url"], "group": meta["group"], **s, "out": out[:6000]})
            a = agg.setdefault(meta["group"], {"pages": 0})
            a["pages"] += 1
            for k, v in s.items():
                a[k] = a.get(k, 0) + v
        E.write_jsonl_gz(E.scratch("targeted", f"out_{name}.jsonl.gz"), rows_out)
        res[name] = agg
        print(name, json.dumps(agg)[:600], flush=True)
    E.save("ef_struct.json", res)


if __name__ == "__main__":
    main(sys.argv[1:])
