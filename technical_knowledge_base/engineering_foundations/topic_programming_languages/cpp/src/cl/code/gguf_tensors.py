# Dump every tensor's name, offset and byte size (via gguf_read.py) for the to-scale file map.
import io, json, sys, contextlib, os
sys.path.insert(0, os.path.dirname(__file__))
from gguf_read import main, BLOCK
with contextlib.redirect_stdout(io.StringIO()):
    kv, tensors, data_start = main(sys.argv[1], show_t=0)
rows = []
for name, ne, typ, off in tensors:
    n = 1
    for d in ne: n *= d
    el, by = BLOCK[typ]
    rows.append([name, off, n // el * by])
rows.sort(key=lambda r: r[1])
json.dump({"data_start": data_start, "tensors": rows}, open(sys.argv[2], "w"))
print(len(rows), "tensors; first", rows[:3], "last", rows[-1])
