"""One real page read three ways, as boxes at their PDF coordinates, for the Reading-tab animation.
usage: python -I anatomy_order.py <pdf> <page_index0> <anatomy.json from page_anatomy.py> <docling.md> <out.json>
  stream : PyMuPDF 1.28.2 lines in content-stream order (get_text("dict", sort=False))
  plumber: pdfplumber 0.11.10 page.extract_text_lines(), the lines its extract_text() joins, in its order
           (characters clustered by vertical position across the whole page width)
  read   : PyMuPDF's blocks ordered by where Docling 2.138.0 wrote their text (rapidfuzz partial_ratio_alignment
           of the block's first 120 characters in Docling's Markdown, score >= 80); blocks not found are 'dropped'
           (Docling removes page headers, footers and marginal stamps by layout class)"""
import json, re, sys
import pdfplumber
from rapidfuzz import fuzz

PDF, PNO, A, DL, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
an = json.load(open(A))


def norm(s):
    return re.sub(r"\s+", " ", re.sub(r"[*_#|`]", " ", s)).strip().lower()


EM = re.compile(r"[\w.%+-]+(?: [\w.%+-]+)?@[\w.-]+\.[a-z]{2,}")  # authors' e-mail addresses are not reproduced as text
red = lambda t: EM.sub("[e-mail address]", t)
lines = [{"bbox": l["bbox"], "t": red(l["t"]), "b": l["b"]} for l in an["lines"]]
with pdfplumber.open(PDF) as pdf:
    pl = pdf.pages[PNO].extract_text_lines()
plumber = [{"bbox": [round(x["x0"], 1), round(x["top"], 1), round(x["x1"], 1), round(x["bottom"], 1)], "t": red(x["text"])} for x in pl]
dl = norm(open(DL).read())
bpos, btext = {}, {}
for l in an["lines"]:  # match on the original text, store the redacted one
    btext.setdefault(l["b"], []).append(l["t"])
for b, ts in btext.items():
    probe = norm(" ".join(ts))[:120]
    al = fuzz.partial_ratio_alignment(probe, dl) if len(probe) > 3 else None
    bpos[b] = al.dest_start if al and al.score >= 80 else None
read = sorted([i for i, l in enumerate(lines) if bpos[l["b"]] is not None], key=lambda i: (bpos[lines[i]["b"]], i))
dropped = [i for i, l in enumerate(lines) if bpos[l["b"]] is None]
P = {k: an[k] for k in ("pdf", "page", "w", "h", "n_chars", "ligatures", "fonts")}
P["img"] = an.get("img_name", "")
json.dump({"page": P, "img": "anat_" + an["pdf"].replace(".pdf", "") + "_p%d.jpg" % (PNO + 1),
           "lines": lines, "plumber": plumber, "read": read, "dropped": dropped},
          open(OUT, "w"), ensure_ascii=False)
span = sum(1 for x in plumber if x["bbox"][0] < an["w"] * 0.45 and x["bbox"][2] > an["w"] * 0.55)
print(len(lines), "lines;", len(plumber), "pdfplumber lines,", span, "cross the gutter;", len(dropped), "lines dropped by docling:",
      sorted(set(lines[i]["t"][:40] for i in dropped)))
