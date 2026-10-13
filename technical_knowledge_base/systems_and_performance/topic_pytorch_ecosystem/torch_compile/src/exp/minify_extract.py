"""Summarise one minifier session (minify.py, then the launcher it wrote) into ../inputs/minify.json: the failing graph the
launcher started from, each successful shrink, the number of queries, and the minimal repro's graph.
Usage: PY minify_extract.py <scratch dir where minify.py ran> <seconds the launcher took>"""
import glob, os, re, sys
from common import clean, save
D = sys.argv[1]
launcher = open(glob.glob(os.path.join(D, "torch_compile_debug", "*", "minifier", "minifier_launcher.py"))[0]).read()
log = open(os.path.join(D, "mini.log")).read()
repro = open(os.path.join(D, "repro.py")).read()
def fwd(src):
    i = src.find("    def forward(")
    j = src.find("\n\n", i)
    return src[i:j]
save("minify.json", {"start_graph": clean(fwd(launcher)), "final_graph": clean(fwd(repro)),
                     "started": re.findall(r"Started off with (\d+) nodes", log), "shrinks": re.findall(r"SUCCESS: Went from (\d+) to (\d+) nodes", log),
                     "queries": re.findall(r"Made (\d+) queries", log), "launcher_seconds": int(sys.argv[2]),
                     "strategies": sorted(set(re.findall(r"Strategy: ([A-Za-z ]+) \(G", log)))})
