"""Build gelu_ext.cpp with load_inline and return the module. Import: from cpp_ext import load_ext."""
import os, time
from torch.utils.cpp_extension import load_inline

HERE = os.path.dirname(os.path.abspath(__file__))


def load_ext(build_dir, name="ext_gelu", verbose=False):
    os.makedirs(build_dir, exist_ok=True)
    src = open(os.path.join(HERE, "gelu_ext.cpp")).read()
    t = time.perf_counter()
    mod = load_inline(name=name, cpp_sources=[src], functions=["raw_gelu", "raw_gelu_backward"],
                      extra_cflags=["-O3"], build_directory=build_dir, verbose=verbose)
    return mod, time.perf_counter() - t
