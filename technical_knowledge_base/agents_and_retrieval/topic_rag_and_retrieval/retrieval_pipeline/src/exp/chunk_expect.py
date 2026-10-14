"""Expected chunk spans from the root's chunkers.py for the two workbench papers (input to check_js.mjs)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import rp
sys.path.insert(0, os.path.join(rp.ROOT_SRC, "pipe"))
import chunkers as C, chunk_eval as CE
tok = CE.load_tok(); docs, _ = rp.L.longdoc()
cases = [("fixed", 256, 32), ("fixed", 200, 40), ("fixed", 512, 0), ("recursive", 256, 32), ("recursive", 120, 10), ("sentence", 256, 0),
         ("structure", 256, 0), ("structure", 128, 0), ("paragraph", 0, 0)]
out = {}
for pid in ("1910.06592", "2002.01320"):
    d = C.Doc(next(x for x in docs if x["paper_id"] == pid), tok)
    for k, s, o in cases:
        f = {"fixed": lambda: C.fixed(d, s, o), "recursive": lambda: C.recursive(d, s, o), "sentence": lambda: C.sentence(d, s),
             "structure": lambda: C.structure(d, s), "paragraph": lambda: C.paragraph(d)}[k]
        out["%s|%s|%d|%d" % (pid, k, s, o)] = [list(x) for x in f()]
json.dump(out, open(rp.work("chunk_expect.json"), "w"))
print(len(out))
