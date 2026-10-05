"""1. The built page embeds exactly the data build_data.py makes from out/ (rebuilt here and compared byte for byte).
2. Numbers written by hand in the prose agree with that data. Run from anywhere: python3 check_embed.py"""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, ".."); PAGE = os.path.join(SRC, "..", "index.html")
part = open(os.path.join(SRC, "parts", "22_js_data.js")).read()
subprocess.run([sys.executable, os.path.join(SRC, "code", "build_data.py")], check=True, capture_output=True)
again = open(os.path.join(SRC, "parts", "22_js_data.js")).read()
html = open(PAGE).read()
fails = []
def ok(cond, what):
    print(("ok   " if cond else "FAIL ") + what)
    if not cond: fails.append(what)
ok(part == again, "data part is reproducible from out/ (rebuilt and identical)")
ok(again.strip() in html, "index.html embeds the data part exactly")
D = json.loads(re.search(r"window\.CSD=(.*);\n", again).group(1))
C = json.loads(re.search(r"window\.CSC=(.*);\n", again).group(1))
read = re.sub(r"<[^>]+>", " ", html)
keep = dict((a, int(b)) for a, b in D["keep"])
ok(round(keep["softmax.compute_90.cpp1.ii"] / 1e6, 1) == 1.4 and "1.4 MB for a 32-line kernel" in read, "preprocessed device file 1.4 MB")
ok(D["src_softmax"].count("\n") == 32, "softmax source has 32 lines")
ok(len(D["fat"]["arch_sm90a"]["images"]) == 3 and len(D["fat"]["arch_sm90"]["images"]) == 2, "-arch=sm_90a three images, -arch=sm_90 two")
ok(len(D["dryrun"]) == 11 and len(D["dryrun_sm90"]) == 8 and "11 commands" in read and "8 commands" in read, "11 and 8 nvcc commands")
ok(D["sass_regs"]["sm_90a"] == 18 and "uses 18 real ones" in read, "18 registers on sm_90a")
ok(any("release 12.9" in l for l in D["old_ptxas"]) and any("Unsupported .version 9.4; current version is '8.8'" in l for l in D["old_ptxas"]), "old ptxas 12.9 refuses .version 9.4 (knows 8.8)")
L = {r[0]: r for r in D["ptxas_levels"]}
ok(L[3][2] / L[0][2] < 1 / 3 and (L[0][2] - L[3][2]) / L[0][2] >= 2 / 3, "-O3 has less than a third of -O0's instructions (removes two thirds)")
ok(any(l.startswith(".version 9.4") for l in D["ptx_softmax"]) and "writes <code>.version 9.4</code>" in html, "CUDA 13.4 writes PTX 9.4")
ok(any("LLVM NVPTX" in l for l in D["triton_ptx_head"]) and any(l.startswith(".version 8.8") for l in D["triton_ptx_head"]), "Triton PTX header: LLVM NVPTX, .version 8.8")
nv = os.path.join(SRC, "out", "nvcc")
offs = {a: open(os.path.join(nv, f"softmax.{a}.hex.txt")).read() for a in ("sm_80", "sm_90a", "sm_100a", "sm_120")}
ok("c[0x0][0x170]" in offs["sm_80"] and "c[0x0][0x220]" in offs["sm_90a"] and "c[0x0][0x390]" in offs["sm_100a"] and "c[0x0][0x390]" in offs["sm_120"], "ncols at 0x170 / 0x220 / 0x390 / 0x390")
ok("desc[" not in offs["sm_80"] and all("desc[" in offs[a] for a in ("sm_90a", "sm_100a", "sm_120")), "desc[...] operands on sm_90a and later, not sm_80")
ok(len(D["feature"]["k1_vadd"]) == 14 and "fourteen targets" in read, "fourteen targets in the feature matrix")
ok(min(int(c[3:]) for c in D["gpu_codes"]) == 75, "oldest target sm_75")
ok(D["tile"]["bc_bytes"] == 703 and "703-byte" in read, "Tile IR bytecode 703 bytes")
ok(D["compat_n"] == 660 and "on 660 cases" in read, "660 compatibility cases")
ok(len(D["sass_check"]) == 6 and all(v[1] == 0 and v[2] == v[3] for v in D["sass_check"].values()) and "checks on six kernels" in read, "six kernels decoded, no violations")
ok(min(D["sass_neg"].values()) > 500, "negative control finds many violations")
T = D["tc"]
ok("7 nodes" in T["fusion_log"][0] and "Seven scheduler nodes" in read, "seven scheduler nodes fused")
cf = [c["first_s"] for c in T["cold"]]
ok(3 <= min(cf) and max(cf) <= 4 and "3 to 4 seconds" in read, "cold compile 3 to 4 s")
ok(max(c["second_ms"] for c in T["cold"] + T["warm"]) < 5, "later calls about a millisecond (under 5 ms)")
ok(T["modes"]["torch"].startswith("2.14.1"), "torch 2.14.1")
ok(T["explain"]["with_print"]["breaks"] == 1 and T["explain"]["attn_like"]["breaks"] == 0, "explain: print breaks once, running example none")
ok(T["recompile_ms"][2][1] < 10 and T["recompile_ms"][0][1] > 1000, "recompile: reuse after the dynamic recompile")
ok(D["torch_wheels"]["13.4"]["x86_64"] == [75, 80, 86, 90, 100, 120] and D["torch_ptx"] == [120], "PyTorch 2.14 wheel targets")
ok(D["nvrtc"]["med_cubin"] < 100 and "Tens of milliseconds" in read, "NVRTC compile tens of milliseconds")
ok(len(D["nvrtc"]["special"]) < len(D["nvrtc"]["generic"]), "specialised kernel shorter")
ok(all(v["ok"] if isinstance(v, dict) and "ok" in v else True for v in json.load(open(os.path.join(SRC, "out", "tile", "tile.json"))).values()), "cuTile compiled for all four targets")
for bad in ("/Users/", "Users-", "/private/tmp", "glpat", "sk-ant"):
    ok(bad not in html, "no '%s' in the page" % bad)
print("FAILED:", len(fails) if fails else 0)
sys.exit(1 if fails else 0)
