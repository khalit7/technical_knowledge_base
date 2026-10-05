# Check that the built page embeds exactly the recorded outputs and the pinned source lines.
# 1. index.html carries parts/50_js_cl_0data.js byte for byte;
# 2. the raw outputs on the page equal the files in out/;
# 3. every excerpt equals the lines of the pinned clone (if the clone is present);
# 4. every data-clv / data-out / data-ex reference in Part 3's parts resolves to a value.
import json, os, pathlib, re, subprocess, sys, tempfile
H = pathlib.Path(__file__).resolve().parent.parent
P = H.parent / "parts"
page = (H.parent.parent / "index.html").read_text()
js = (P / "50_js_cl_0data.js").read_text()
bad = 0
def fail(msg):
    global bad; bad += 1; print("FAIL", msg)
if js.strip() not in page: fail("index.html does not contain 50_js_cl_0data.js")
CL = json.loads(js[js.index("window.CL=") + 10: js.rstrip().rindex(";")])
O = H / "out"
rd = lambda n: (O / n).read_text()
checks = {
    "simple_cpu": rd("simple_cpu.txt").split("\n", 1)[1].strip(),
    "simple_metal": rd("simple_metal.txt").strip(),
    "simple_q4_0": rd("simple_q4_0.txt").strip(),
    "counts": rd("counts.txt"), "server": rd("server.txt"), "server_log": rd("server_log.txt"),
    "gguf_read": rd("gguf_read.txt"), "gguf_dump": rd("gguf_dump.txt"), "sched_splits": rd("sched_splits.txt"),
    "threadpool": rd("threadpool_offsets.txt"), "features": rd("features.txt"), "versions": rd("versions.txt"),
    "gguf_read_py": (H / "code/gguf_read.py").read_text(), "features_cpp": (H / "code/features.cpp").read_text(),
}
for k, want in checks.items():
    if CL["out"].get(k) != want: fail(f"out.{k} differs from the recorded file")
# log extracts must be made of whole recorded lines
for k, f in (("simple_cpu_log", "simple_cpu_log.txt"), ("simple_metal_log", "simple_metal_log.txt"), ("quantize", "quantize_summary.txt")):
    lines = set(rd(f).split("\n"))
    for l in CL["out"][k].split("\n"):
        if l not in lines: fail(f"out.{k} line not in {f}: {l[:80]}")
if CL["quant"] != json.loads(rd("quant_demo.json")): fail("quant differs from quant_demo.json")
for name, rows in (("cpu", "bench_cpu.json"), ("metal", "bench_metal.json"), ("q4", "bench_q4_cpu.json")):
    raw = json.loads(rd(rows))
    for r, b in zip(raw, CL["bench"][name]):
        if [round(x, 1) for x in r["samples_ts"]] != b["s"]: fail(f"bench {name} samples differ")
ex = json.loads(rd("excerpts.json"))
if ex["excerpts"] != CL["src"]: fail("excerpts differ from out/excerpts.json")
LL = pathlib.Path(os.environ.get("PL") or os.path.join(tempfile.gettempdir(), "pl")) / "llama.cpp"
if LL.exists():
    head = subprocess.run(["git", "-C", str(LL), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    if head != CL["commit"]: fail("clone is not at the pinned commit")
    for k, e in CL["src"].items():
        lines = (LL / e["file"]).read_text().split("\n")[e["start"] - 1: e["end"]]
        if "\n".join(lines) != e["text"]: fail(f"excerpt {k} differs from the clone")
else:
    print("note: clone not present, excerpts checked against out/excerpts.json only")
def get(path):
    o = CL
    for k in path.split("."):
        if isinstance(o, list): o = o[int(k)]
        elif isinstance(o, dict) and k in o: o = o[k]
        else: return None
    return o
refs = 0
for f in sorted(P.glob("*")):
    if not re.match(r"(13_tabs_cl|5\d_)", f.name) or f.name == "50_js_cl_1core.js": continue
    t = f.read_text()
    for attr in ("data-clv", "data-out", "data-m"):
        for path in re.findall(attr + r'="([\w.]+)"', t):
            if attr == "data-m" and not path.startswith(("out.", "v.", "bench.")): continue
            refs += 1
            if get(path) is None: fail(f"{f.name}: {attr}={path} does not resolve")
    for k in re.findall(r'data-ex="(\w+)"', t) + re.findall(r"ex:'(\w+)'", t):
        refs += 1
        if k not in CL["src"]: fail(f"{f.name}: excerpt {k} missing")
print(f"checked {len(checks)} outputs, {len(CL['src'])} excerpts, {refs} references: {'OK' if not bad else str(bad) + ' problems'}")
sys.exit(1 if bad else 0)
