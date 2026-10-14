"""Count concrete defects in each parser's output of the 24 QASPER papers.
usage: python -I defects.py <ING_DIR>/out_qasper <out.json>
  hyphen_breaks : a word split by a line-end hyphen, "repre-\\nsentation" or "repre- sentation" (lower-case both sides)
  ligatures     : U+FB00..U+FB04 characters left in the text (fi, fl, ff, ffi, ffl as one glyph)
  stamp         : arXiv's margin stamp ("arXiv:<id>v<k> [cs.XX] <date>") kept, counted per paper
  glued_words   : tokens of 25 or more letters (missing spaces glue words together)
  cid           : "(cid:NN)" placeholders for glyphs with no Unicode mapping
  chars         : total characters"""
import json, os, re, sys

D, OUT = sys.argv[1:3]
res = {}
for p in sorted(os.listdir(D)):
    pd = os.path.join(D, p)
    if not os.path.isdir(pd):
        continue
    c = dict(hyphen_breaks=0, ligatures=0, stamp=0, glued_words=0, cid=0, chars=0, papers=0)
    for f in sorted(os.listdir(pd)):
        if not f.endswith(".md"):
            continue
        t = open(os.path.join(pd, f)).read()
        c["papers"] += 1; c["chars"] += len(t)
        c["hyphen_breaks"] += len(re.findall(r"[a-z]{2,}-\s*\n\s*[a-z]{2,}|[a-z]{3,}- [a-z]{3,}", t))
        c["ligatures"] += len(re.findall("[ﬀ-ﬄ]", t))
        c["stamp"] += 1 if re.search(r"arXiv:\s?\d{4}\.\d{4,5}v\d", t) else 0
        c["glued_words"] += len(re.findall(r"\b[A-Za-z]{25,}\b", t))
        c["cid"] += len(re.findall(r"\(cid:\d+\)", t))
    res[p] = c
    print(p, c)
json.dump(res, open(OUT, "w"), indent=0)
