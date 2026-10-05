"""A third road to SASS: cuTile Python -> CUDA Tile IR bytecode -> tileiras -> cubin, with no GPU.
Runs INSIDE kb-gpu-lab:1 after `pip install cuda-tile==1.6.0` (run_tile.sh). Writes ../out/tile/."""
import os, sys, subprocess, json
import cuda.tile as ct
from cuda.tile.compilation import KernelSignature, ArrayConstraint, CallingConvention

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out", "tile"); os.makedirs(OUT, exist_ok=True)
TILE = 1024

@ct.kernel
def vector_add(a, b, out):                 # one block of the grid adds one tile of 1024 numbers
    i = ct.bid(0)
    x = ct.load(a, index=(i,), shape=(TILE,))
    y = ct.load(b, index=(i,), shape=(TILE,))
    ct.store(out, index=(i,), tile=x + y)

def arr():
    return ArrayConstraint(ct.float32, 1, index_dtype=ct.int32, stride_constant=(1,), stride_lower_bound_incl=0,
                           alias_groups=(), may_alias_internally=False)

sig = KernelSignature(parameters=[arr(), arr(), arr()], calling_convention=CallingConvention.cutile_python_v2())
res = {"cuda_tile": ct.__version__ if hasattr(ct, "__version__") else open(os.path.join(os.path.dirname(ct.__file__), "VERSION")).read().strip()}
ct.compilation.export_kernel(vector_add, [sig], os.path.join(OUT, "vector_add.tilebc"), output_format="tileir_bytecode")
res["bytecode_bytes"] = os.path.getsize(os.path.join(OUT, "vector_add.tilebc"))
for sm in ("sm_80", "sm_90", "sm_100", "sm_120"):
    path = os.path.join(OUT, f"vector_add.{sm}.cubin")
    try:
        ct.compilation.export_kernel(vector_add, [sig], path, gpu_code=sm, output_format="cubin")
        sass = subprocess.run(["cuobjdump", "-sass", path], capture_output=True, text=True).stdout
        open(path[:-6] + ".sass.txt", "w").write(sass)
        res[sm] = {"ok": True, "cubin_bytes": os.path.getsize(path)}
    except Exception as e:
        res[sm] = {"ok": False, "error": (type(e).__name__ + ": " + str(e).strip().splitlines()[-1])[:300]}
json.dump(res, open(os.path.join(OUT, "tile.json"), "w"), indent=1)
print(json.dumps(res))
