"""What is inside one PDF page: text lines with their boxes, in content-stream order, plus a small page image.
usage: python -I page_anatomy.py <pdf> <page_index0> <out.json> <out.jpg> [width_px]
Uses PyMuPDF 1.28.2: page.get_text("dict", sort=False) returns blocks and lines in the order the content stream
draws them (no reordering); fonts and sizes per span; images as image blocks. Coordinates are PDF points
(1/72 inch, origin top-left in PyMuPDF). Lines are what every text extractor starts from."""
import json, sys
import pymupdf

pdf, pno, OJ, OI = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
W = int(sys.argv[5]) if len(sys.argv) > 5 else 420
doc = pymupdf.open(pdf)
pg = doc[pno]
d = pg.get_text("dict", sort=False)
lines, images = [], []
for b in d["blocks"]:
    if b["type"] == 1:
        images.append([round(v, 1) for v in b["bbox"]])
        continue
    for ln in b["lines"]:
        t = "".join(s["text"] for s in ln["spans"])
        if not t.strip():
            continue
        sp = ln["spans"][0]
        lines.append({"b": b["number"], "bbox": [round(v, 1) for v in ln["bbox"]], "t": t,
                      "font": sp["font"], "size": round(sp["size"], 1), "dir": [round(v, 2) for v in ln["dir"]]})
# glyph-level facts: characters drawn, how many come from ligature or private-use code points
raw = pg.get_text("rawdict")
chars = [c["c"] for b in raw["blocks"] if b["type"] == 0 for l in b["lines"] for s in l["spans"] for c in s["chars"]]
fonts = sorted(set((f[3], f[1]) for f in pg.get_fonts()))
zoom = W / pg.rect.width
pix = pg.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), colorspace=pymupdf.csGRAY)
pix.save(OI, jpg_quality=55)
# the authors' e-mail line (title block of arXiv 1909.00175, y 155 to 171 pt) is blanked in the image afterwards by
# the page build (see src/README.md); its text is replaced in anatomy_order.py
json.dump({"pdf": pdf.split("/")[-1], "page": pno, "w": round(pg.rect.width, 1), "h": round(pg.rect.height, 1),
           "lines": lines, "images": images, "n_chars": len(chars),
           "ligatures": sum(1 for c in chars if c in "ﬀﬁﬂﬃﬄ"),
           "fonts": [{"name": n, "type": t} for n, t in fonts], "img_w": pix.width, "img_h": pix.height},
          open(OJ, "w"), ensure_ascii=False)
print(len(lines), "lines", len(images), "images", len(chars), "chars", pix.width, "x", pix.height)
