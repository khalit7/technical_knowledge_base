"""out/ -> parts/22_js_data.js (window.CSD): the only data the page embeds. Every listing is copied from a recorded
output; nothing is typed by hand. Paths are cleaned so no machine path reaches the page."""
import json, os, re, glob, statistics

HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, ".."); OUT = os.path.join(SRC, "out")
NV = os.path.join(OUT, "nvcc"); TC = os.path.join(OUT, "tc")
rd = lambda *p: open(os.path.join(OUT, *p)).read()
D = {}
LOGPFX = re.compile(r"^[VIWE]\d{4} [\d:.]+ \d+ \S+\] (\[[^\]]*\] )?\[[^\]]*\] ?")


def clean(s):
    s = s.replace("/opt/venv/lib/python3.12/site-packages/", "").replace("/work/code/", "").replace("/usr/local/cuda/bin/../", "$CUDA/")
    s = re.sub(r"/tmp/tmpxft_[0-9a-f_]+-(\d+)_", r"<tmp>-\1_", s)
    return s


def strip_log(text, tag=None):
    out = []
    for ln in text.splitlines():
        if tag and "[__" + tag + "]" not in ln: continue
        out.append(LOGPFX.sub("", ln))
    return out


def sass_funcs(path):
    """cuobjdump -sass text -> {function: [instruction text]} without NOPs, the trailing self-branch and encodings"""
    fs, cur = {}, None
    for ln in open(path):
        m = re.search(r"Function : (\S+)", ln)
        if m: cur = m.group(1); fs[cur] = []; continue
        m = re.search(r"/\*([0-9a-f]{4})\*/\s+(.*?)\s*;", ln)
        if m and cur:
            ins = re.sub(r"\s+", " ", m.group(2)).strip()
            if ins.startswith("NOP"): continue
            if ins.startswith("BRA") and fs[cur] and fs[cur][-1].startswith("EXIT") or (fs[cur] and fs[cur][-1].startswith("BRA") and ins.startswith("BRA")): continue
            fs[cur].append(ins)
    for k in fs:
        while fs[k] and fs[k][-1].startswith("BRA"): fs[k].pop()
    return fs


# ---- 1. nvcc phases (dryrun) ----
def dry_steps(name):
    return [clean(l[3:]) for l in rd("nvcc", name).splitlines() if re.match(r'#\$ (gcc|cudafe\+\+|"\$CICC_PATH/cicc"|ptxas|fatbinary|nvlink|rm) ', l)]
D["dryrun"] = dry_steps("dryrun_sm90a.txt")
D["dryrun_sm90"] = dry_steps("dryrun_arch_sm90.txt")
D["f100_images"] = [l.split("image3=")[1] for l in rd("nvcc", "dryrun_sm100f_images.txt").splitlines()]
D["keep"] = [l.split("\t") for l in rd("nvcc", "keep_files.tsv").splitlines()]
D["native"] = rd("nvcc", "arch_native.txt").strip().splitlines()
D["gpu_codes"] = rd("nvcc", "list_gpu_code.txt").split()
D["nvcc_version"] = rd("nvcc", "version.txt").strip().splitlines()[-2:]
fat = {}
for f in sorted(glob.glob(os.path.join(NV, "fat_*.txt"))):
    k = os.path.basename(f)[4:-4]; lines = open(f).read().splitlines()
    fat[k] = {"flags": lines[0][7:], "bytes": int(lines[1].split()[1]),
              "images": [[("SASS" if l.startswith("ELF") else "PTX"), re.search(r"\.(sm_\w+)\.(cubin|ptx)", l).group(1)] for l in lines[2:] if re.match(r"(ELF|PTX) file", l)]}
D["fat"] = fat
fm = {}
for l in rd("nvcc", "feature_matrix.tsv").splitlines():
    k, a, e, msg = (l.split("\t") + [""])[:4]
    fm.setdefault(k, {})[a] = [int(e), clean(msg)]
D["feature"] = fm
D["ptxas_levels"] = [[int(a), int(re.search(r"\d+", b).group()), int(c)] for a, b, c in (l.split("\t") for l in rd("nvcc", "ptxas_levels.tsv").splitlines())]
D["old_ptxas"] = [clean(l) for l in rd("nvcc", "old_ptxas.txt").splitlines()]
D["gotcha"] = [clean(l) for l in rd("nvcc", "arch_specific_gotcha.txt").splitlines()]
D["default_arch"] = rd("nvcc", "default_arch.txt").strip().splitlines()

# ---- 2. PTX of the running example, the source it came from ----
D["src_softmax"] = open(os.path.join(SRC, "..", "..", "src", "compile", "kernels", "k5_softmax.cu")).read()
ptx = rd("nvcc", "softmax.sm_90a.keep.ptx").splitlines()
D["ptx_softmax"] = [l.rstrip() for i, l in enumerate(ptx) if not l.strip().startswith(".file") and (i < 8 or not l.strip().startswith("//"))]
regs = {m.group(1): int(m.group(2)) for m in re.finditer(r"\.reg \.(\w+)\s+%\w+<(\d+)>", "\n".join(ptx))}
D["ptx_regs"] = regs
res = rd("nvcc", "softmax.sm_90a.res.txt")
D["res_sm90a"] = re.sub(r"\s+", " ", res.strip().splitlines()[-1]).strip()

# ---- 3. e^x four ways, inline PTX, templates ----
ex = {}
for tag in ("default", "use_fast_math"):
    fs = sass_funcs(os.path.join(NV, f"exp_{tag}.sass.txt"))
    ex[tag] = {k: v for k, v in fs.items()}
D["exp"] = ex
D["exp_ptx"] = {}
for tag in ("default", "use_fast_math"):
    body = rd("nvcc", f"exp_{tag}.ptx")
    for fn in ("k_expf", "k_fast", "k_inline"):
        m = re.search(r"\.entry " + fn + r"\(.*?\n\{(.*?)\n\}", body, re.S)
        D["exp_ptx"][tag + ":" + fn] = [l.strip() for l in m.group(1).splitlines() if re.search(r"ex2|mul\.|fma\.|add\.f32|cvt|setp\.\w+\.f32|selp\.f32|shl\.b32|mov\.b32 +%f", l)]
D["inline_ptx"] = [l.strip() for l in rd("nvcc", "inline.ptx").splitlines() if re.search(r"%smid|%laneid|%globaltimer|ld\.global\.cs", l)]
D["inline_sass"] = [i for i in sass_funcs(os.path.join(NV, "inline.sass.txt"))["where_am_i"] if re.search(r"SR_|LDG", i)]
D["templ"] = [[a.strip(": ").strip(), b.strip(": ").strip()] for a, b in zip(rd("nvcc", "templ_funcs.txt").splitlines(), rd("nvcc", "templ_demangled.txt").splitlines())]

# ---- 4. NVRTC ----
nj = json.loads(rd("nvrtc", "nvrtc.json"), strict=False)   # the lowered names are tab-separated
gen = sass_funcs(os.path.join(OUT, "nvrtc", "generic.sm_90a.sass.txt"))["scale_rows"]
spe = sass_funcs(os.path.join(OUT, "nvrtc", "special4096.sm_90a.sass.txt"))["scale_rows"]
D["nvrtc"] = {"version": nj["nvrtc_version"], "ms_cubin": nj["ms_to_cubin"], "ms_ptx": nj["ms_to_ptx"],
              "med_cubin": statistics.median(nj["ms_to_cubin"]), "med_ptx": statistics.median(nj["ms_to_ptx"]),
              "lowered": [x.split("\t") for x in nj["lowered"]], "generic": gen, "special": spe,
              "load": rd("nvrtc", "loadavg.txt").split()[:3], "noinclude": [l for l in rd("nvrtc", "noinclude.txt").splitlines() if l.strip()]}
D["err_enum"] = [clean(l.split("-", 1)[1] if re.match(r"\d+-", l) else l.split(":", 1)[1]).strip() for l in rd("nvrtc", "error_enum.txt").splitlines()]

# ---- 5. CUDA Tile IR ----
tj = json.load(open(os.path.join(OUT, "tile", "tile.json")))
tile = {"version": tj["cuda_tile"], "bc_bytes": tj["bytecode_bytes"], "ir": rd("tile", "vector_add.tileir.txt").strip().splitlines(), "targets": {}}
for sm in ("sm_80", "sm_90", "sm_100", "sm_120"):
    fs = sass_funcs(os.path.join(OUT, "tile", f"vector_add.{sm}.sass.txt")); f = list(fs.values())[0]
    ops = {}
    for i in f:
        op = i.split()[0] if not i.startswith("@") else i.split()[1]
        ops[op] = ops.get(op, 0) + 1
    tile["targets"][sm] = {"n": len(f), "cubin": tj[sm]["cubin_bytes"], "mem": {k: v for k, v in ops.items() if re.match(r"(LDG|STG|LDS|STS|UTMA|UBLKCP|LDGSTS|UBLKRED)", k)}}
D["tile"] = tile

# ---- 6. SASS with decoded control bits (sass_decode.py) ----
SJ = json.load(open(os.path.join(OUT, "sass.json")))
D["sass_check"] = {k: [v["n"], v["violations"], v["consumers_protected"], v["consumers"], v["max_live_gpr"]] for k, v in SJ["kernels"].items()}
D["sass_neg"] = SJ["negative_control"]
D["sass"] = {}
for k in ("softmax.sm_90a", "softmax.sm_100a", "k3_matmul_tiled.sm_90a", "k8_wgmma.sm_90a"):
    D["sass"][k] = [[r["off"], r["pred"], r["op"], clean(r["args"]), r["stall"], r["yield"], r["wbar"], r["rbar"], r["wait"], r["reuse"], r["live"][0], r["hi"]] for r in SJ["kernels"][k]["rows"]]
# opcode meanings: NVIDIA's own instruction-set tables (CUDA Binary Utilities), as collected by the parent page
OPT = json.load(open(os.path.join(SRC, "..", "..", "src", "compile", "inputs", "sass_opcodes.json")))
used = set()
for rows in D["sass"].values():
    for r in rows: used.add(r[2].split(".")[0])
for k in ("default", "use_fast_math"):
    for f in D["exp"][k].values():
        for i in f: used.add((i.split()[1] if i.startswith("@") else i.split()[0]).split(".")[0])
opd = {}
for tname in ("Table 8. Blackwell and Rubin Instruction Set", "Table 8. Hopper Instruction Set", "Table 7. NVIDIA Ampere GPU and Ada Instruction Set", "Table 6. Turing Instruction Set"):
    for op, desc in OPT[tname].items():
        if op in used and op not in opd: opd[op] = desc
D["opdesc"] = opd
D["opdesc_missing"] = sorted(used - set(opd))
res_all = {}
for a in ("sm_80", "sm_90a", "sm_100a", "sm_120"):
    t = rd("nvcc", f"softmax.{a}.res.txt"); m = re.search(r"REG:(\d+)", t); res_all[a] = int(m.group(1)) if m else None
D["sass_regs"] = res_all

# ---- 7. torch.compile (CPU, torch 2.14.1) ----
T = {}
T["graph"] = [clean(l) for l in strip_log(open(os.path.join(TC, "graph.log")).read(), "graph_code") if l.strip() and "TRACED GRAPH" not in l and "=====" not in l and "_lazy_graph_module" not in l]
guards = [clean(l) for l in strip_log(open(os.path.join(TC, "graph.log")).read(), "guards") if re.search(r"(TENSOR_MATCH|GLOBAL_STATE|DEFAULT_DEVICE|TORCH_FUNCTION_MODE|LAMBDA_GUARD|TYPE_MATCH|ID_MATCH|EQUALS_MATCH|DIMENSION_DYNAMIC)", l)]
guards = [re.sub(r"\s+#.*$", "", g) for g in guards]
T["guards"] = guards
T["explain"] = json.load(open(os.path.join(TC, "explain.json")))["explain"]
T["fullgraph"] = json.load(open(os.path.join(TC, "fullgraph.json")))["errors"]
T["recompile_ms"] = json.load(open(os.path.join(TC, "recompile.json")))["calls_ms"]
T["recompile_log"] = [clean(l).strip() for l in strip_log(open(os.path.join(TC, "recompile.log")).read()) if re.search(r"Recompiling|guard failure|size mismatch|marking .* as dynamic|create_symbol", l)]
sc = strip_log(open(os.path.join(TC, "scalar.log")).read())
T["scalar"] = [re.sub(r"\s+#.*$", "", clean(l)).strip() for l in sc if re.search(r"EQUALS_MATCH: L\['s'\]|Recompiling|s == 0.125|TYPE_MATCH: ___check_type_id\(L\['s'\]|isnan\(L\['s'\]\)  #|LAMBDA_GUARD: not math.isnan", l)]
aot = strip_log(open(os.path.join(TC, "aot.log")).read(), "aot_graphs")
def graph_block(lines, title):
    out, on = [], False
    for l in lines:
        if title in l: on = True; continue
        if on and ("=====" in l or "TRACED GRAPH" in l) and out: break
        if on and l.strip() and "_lazy_graph_module" not in l and "<eval_with_key>" not in l: out.append(clean(l).rstrip())
    return [re.sub(r";\s+\w+(\s*=\s*\w+)*\s*=\s*None$", "", l) for l in out]
T["aot_fwd"] = graph_block(aot, "Forward graph 0"); T["aot_bwd"] = graph_block(aot, "Backward graph 0")
oc = strip_log(open(os.path.join(TC, "aot.log")).read(), "output_code")
T["aot_kernels"] = sorted(set(re.findall(r"cpp_fused_\w+", "\n".join(oc))))
ind = strip_log(open(os.path.join(TC, "inductor_cpu.log")).read())
txt = "\n".join(ind)
m = re.search(r"(cpp_fused_\w+) = async_compile.cpp_pybinding\(.*?r'''\n(.*?)\n'''\)", txt, re.S)
T["cpp_name"], T["cpp_kernel"] = m.group(1), m.group(2).splitlines()
m = re.search(r"    def call\(self, args\):\n(.*?)\n\n", txt, re.S)
T["cpp_call"] = [l for l in m.group(1).splitlines() if l.strip()]
T["fusion_log"] = [l for l in ind if re.match(r"(=====|fusing |cannot fuse|completed fusion|found \d+ possible)", l.strip())]
tt = "\n".join(strip_log(open(os.path.join(TC, "triton_train.log")).read(), "output_code"))
m = re.search(r"(@triton\.jit\ndef (triton_\w+)\(.*?)\n'''", tt, re.S)
T["triton_name"], T["triton_kernel"] = m.group(2), [l for l in m.group(1).splitlines()]
m = re.search(r"((?:@triton_heuristics\.\w+\(\n(?:.*\n)*?)\))\n@triton\.jit", tt)
T["triton_deco"] = m.group(1).splitlines() if m else []
T["triton_err"] = json.load(open(os.path.join(TC, "triton_train.json")))["error"]
T["modes"] = json.load(open(os.path.join(TC, "modes.json")))
T["cold"] = [json.load(open(os.path.join(TC, f"cold_{r}.json"))) for r in (1, 2, 3)]
T["warm"] = [json.load(open(os.path.join(TC, f"warm_{r}.json"))) for r in (1, 2, 3)]
T["load"] = rd("tc", "loadavg.txt").split()[:3]
br = strip_log(open(os.path.join(TC, "breakrun.log")).read())
def bc_block(title):
    out, on = [], False
    for l in strip_log(open(os.path.join(TC, "breakrun.log")).read(), "bytecode"):
        if title in l: on = True; continue
        if on and ("BYTECODE" in l): break
        if on and l.strip(): out.append(clean(l).rstrip())
    return out
T["bc_orig"] = bc_block("ORIGINAL BYTECODE with_print")
T["bc_mod"] = bc_block("MODIFIED BYTECODE with_print")
T["bc_resume_orig"] = bc_block("ORIGINAL BYTECODE torch_dynamo_resume_in_with_print_at_13")
gl = strip_log(open(os.path.join(TC, "breakrun.log")).read(), "graph_code")
T["break_graphs"] = [clean(l).rstrip() for l in gl if l.strip() and "_lazy_graph_module" not in l]
T["break_reason"] = [clean(l).strip() for l in strip_log(open(os.path.join(TC, "breakrun.log")).read(), "graph_breaks") if re.search(r"Graph break in user code|Explanation:|Failed to trace|Hint:", l)][:6]
src = open(os.path.join(HERE, "tc_programs.py")).read()
T["src"] = {m.group(1): m.group(0).rstrip().splitlines() for m in re.finditer(r"^def (\w+)\(.*?(?=^\S)", src, re.S | re.M)}
m = re.search(r'    def scaled\(x, s\).*', src); T["src"]["scaled"] = [m.group(0).strip()]
T["full_log"] = {k: len(open(os.path.join(TC, k + ".log")).read().splitlines()) for k in ("graph", "recompile", "aot", "inductor_cpu", "breakrun", "scalar", "triton_train")}
D["tc"] = T

# ---- 8. PyTorch 2.14 wheel targets (inputs/pytorch_v2.14.0_build_env_setup.py) ----
pt = open(os.path.join(SRC, "inputs", "pytorch_v2.14.0_build_env_setup.py")).read()
import ast
tab = {}
for node in ast.parse(pt).body:
    if isinstance(node, ast.AnnAssign) and getattr(node.target, "id", "") == "TORCH_CUDA_ARCH_LIST_TABLE":
        tab = {k: {a: sorted(v) for a, v in d.items()} for k, d in ast.literal_eval(node.value).items()}
D["torch_wheels"] = tab
D["torch_ptx"] = sorted(int(x) for x in re.findall(r"\d+", re.search(r"_PTX_ARCHES: set\[int\] = \{([^}]*)\}", pt).group(1)))
D["triton_ptx_head"] = [l for l in open(os.path.join(SRC, "inputs", "triton_attn_sm_90a_ptx_head.txt")).read().splitlines()]

CE = json.load(open(os.path.join(OUT, "compat_expected.json")))
D["compat_n"] = len(CE["cases"])
js = "window.CSC=" + json.dumps({"fat": CE["fat"], "gpus": CE["gpus"]}, separators=(",", ":")) + ";\n"
js += "window.CSD=" + json.dumps(D, separators=(",", ":"), ensure_ascii=False) + ";\n"
for bad in ("/Users/", "Users-", "/private/tmp"):
    assert bad not in js, bad
open(os.path.join(SRC, "parts", "22_js_data.js"), "w").write(js)
print("22_js_data.js", len(js), "bytes;", {k: len(json.dumps(v)) for k, v in D.items() if len(json.dumps(v)) > 4000})
