"""Compile the same Numba kernel to PTX without a GPU (cuda.compile_ptx uses NVVM, the NVIDIA
LLVM-based compiler that nvcc also uses). Prints JSON with the first PTX lines and a few counts."""
import json, re
from numba import cuda, float32

def scale(x, y, a):
    i = cuda.grid(1)
    if i < x.size:
        y[i] = a * x[i]

ptx, resty = cuda.compile_ptx(scale, (float32[:], float32[:], float32), cc=(9, 0))
lines = ptx.splitlines()
body = [l for l in lines if re.match(r"\s+(ld|st|mad|mul|setp|mov|cvt|add|@|bra|ret)", l)]
print(json.dumps({"lines": len(lines), "target": [l for l in lines if l.startswith(".target")],
                  "version": [l for l in lines if l.startswith(".version")],
                  "tid_reads": len(re.findall(r"%tid\.x", ptx)), "ctaid_reads": len(re.findall(r"%ctaid\.x", ptx)),
                  "body": body[:40]}))
