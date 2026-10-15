"""The pages shown in the Extraction comparer tab, every extractor's output for each (this page's venv).

Running-example pages (from the WARC; outputs from the Pipeline lab's extract_all and this page's runs):
  the three pages the Pipeline lab shows (a calendar widget, a layout-table menu, a <pre> data block), the jusText
  animation page, and two more organisation pages chosen where the extractors disagree most.
Targeted pages (ef_targeted.py): one per structure kind (code, Wikipedia maths, Wikipedia table, data table,
MathJax Q&A). Outputs are cut to 2,400 characters, emails/phones/IPs replaced, em-dashes written as '--'.
Output: src/data/ef_pages.json
"""
import json
import os
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402
from ef_labels import scrub  # noqa: E402

CUT = 2400
WARC_PAGES = {  # id -> why it is here
    "<urn:uuid:62fe0777-37df-4ff6-aa1d-6a73aeadcc47>": "An advocacy page whose sidebar holds a calendar widget",
    "<urn:uuid:0f49d717-e5da-4941-83d3-b2c6095532bf>": "A weather-centre page laid out as one big table",
    "<urn:uuid:c707d53a-fac5-463c-ab61-b71546de83df>": "A railway reference page whose data sits in a <pre> block",
    "<urn:uuid:57c05339-85ef-474b-b860-3120a3df1c74>": "A glossary entry (the jusText animation's page)",
}
TARGETED = {  # url -> (why, anchor phrase: the window shown starts 150 characters before it, when found)
    "https://docs.python.org/3/library/abc.html?highlight=abc": ("Python documentation: code in <pre> blocks",
                                                                 "look at this example ABC definition"),
    "https://en.wikipedia.org/wiki/Central_limit_theorem": ("Wikipedia: maths as MathML with TeX annotations",
                                                            "Lyapunov condition"),
    "https://en.wikipedia.org/wiki/List_of_acquisitions_by_Oracle": ("Wikipedia: a long table", "This is a listing"),
    "https://www.worldometers.info/co2-emissions/canada-co2-emissions/": ("A statistics page built from tables", ""),
}


def window(t, anchor):
    if not t or not anchor:
        return t
    k = t.find(anchor)
    return t if k < 0 else ("[...] " if k > 150 else "") + t[max(0, k - 150):]


def clean(t):
    if not t:
        return ""
    t = t.replace("—", "--")
    import re
    t = re.sub(r"[\w.+-]+@[\w-]+\.[\w.-]+", "email@example.com", t)
    return t[:CUT] + ("\n[... cut at 2,400 characters]" if len(t) > CUT else "")


def main():
    out = []
    ex = {r["id"]: r for r in E.extract_all() if r["id"] in WARC_PAGES}
    more = {}
    for name in ("justext", "readability", "traf231"):
        more[name] = {r["id"]: r["text"] for r in E.read_jsonl_gz(E.scratch(f"more_{name}.jsonl.gz"))
                      if r["id"] in WARC_PAGES}
    for i, why in WARC_PAGES.items():
        r = ex[i]
        u = urllib.parse.urlsplit(r["url"])
        out.append({"src": "warc", "host": u.netloc, "path": u.path[:60], "why": why, "html_chars": r["html_chars"],
                    "x": {"traf111": clean(r["traf"]), "traf231": clean(more["traf231"].get(i)),
                          "res": clean(r["res"]), "justext": clean(more["justext"].get(i)),
                          "readability": clean(more["readability"].get(i)), "wet": clean(r["wet"])},
                    "n": {"traf111": len(r["traf"] or ""), "traf231": len(more["traf231"].get(i) or ""),
                          "res": len(r["res"] or ""), "justext": len(more["justext"].get(i) or ""),
                          "readability": len(more["readability"].get(i) or ""), "wet": len(r["wet"] or "")}})
    tg = {}
    for name in ("traf111", "traf231", "resiliparse", "justext", "readability", "alltext"):
        for r in E.read_jsonl_gz(E.scratch("targeted", f"out_{name}.jsonl.gz")):
            if r["url"] in TARGETED:
                tg.setdefault(r["url"], {})[name] = r
    for url, (why, anchor) in TARGETED.items():
        d = tg[url]
        u = urllib.parse.urlsplit(url)
        key = {"resiliparse": "res", "alltext": "all"}
        out.append({"src": "targeted", "host": u.netloc, "path": u.path[:60], "why": why,
                    "x": {key.get(k, k): clean(window(v["out"], anchor)) for k, v in d.items()},
                    "n": {key.get(k, k): v["chars"] for k, v in d.items()},
                    "struct": {key.get(k, k): {kk: v[kk] for kk in ("rows", "rows_struct", "code", "code_verbatim",
                                                                   "code_indented", "code_indent_kept", "tex",
                                                                   "tex_whole")} for k, v in d.items()}})
    E.save("ef_pages.json", out)
    print(len(out), sum(len(json.dumps(x)) for x in out))


if __name__ == "__main__":
    main()
