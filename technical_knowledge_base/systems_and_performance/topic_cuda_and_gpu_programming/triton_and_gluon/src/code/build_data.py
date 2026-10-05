"""Turn ../out/ into ../parts/22_js_data.js (window.TGD), the only data the page embeds.
IR excerpts: debug locations stripped; long IR keeps its layout definitions and the lines that carry the
operations the page discusses (each excerpt says how many lines the full file has).
Run: python3 build_data.py (no dependencies)."""
import os, re, json, ast

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
IR = os.path.join(OUT, "ir")
J = lambda f: json.load(open(os.path.join(OUT, f)))
comp, glu, interp, exp = J("compile.json"), J("gluon.json"), J("interp.json"), J("expected.json")
passes = J("passes.json")
NV = ["sm_80", "sm_90a", "sm_100a", "sm_120"]
AMD = ["gfx942", "gfx950"]


def clean_mlir(t):
    out = []
    for l in t.splitlines():
        if l.startswith("#loc") or not l.strip():
            continue
        l = re.sub(r"\s*loc\((#loc\d*|\"[^\"]*\"(\(#loc\d*\))?(:\d+:\d+)?|unknown|callsite\([^)]*\))\)", "", l)
        out.append(l.rstrip())
    return out


def short(l, n=150):
    l = l.replace("/opt/venv/lib/python3.12/site-packages/", "")
    return l if len(l) <= n else l[:n - 1] + "…"


KEYS = {
    "ttir": r"tt\.(dot|load|store|reduce|make_range|get_program_id|addptr)|scf\.for|tt\.func|math\.exp|arith\.(addf|maxnumf)",
    "ttgir": r"^#|tt\.dot|warp_group_dot|tc_gen5_mma|tmem_|local_alloc|async_copy_global_to_local|async_wait|convert_layout|tt\.load|tt\.store|scf\.for|tt\.reduce|ttg\.local_load|amdg\.|init_barrier|wait_barrier",
    "llir": r"define |call .*@llvm\.(nvvm|amdgcn)|ld\.global|cp\.async|mma|wgmma|tcgen05|shfl|bar\.|addrspace\(3\)|load <|store <|ex2",
    "ptx": r"^\.(version|target|address_size)|\.entry|ld\.global|st\.global|cp\.async|mma|wgmma|tcgen05|shfl|bar\.sync|ex2|mbarrier|\.shared",
    "amdgcn": r"\.amdgcn_target|v_mfma|global_load|global_store|buffer_load|buffer_store|ds_read|ds_write|s_barrier|v_exp_f32|s_waitcnt vmcnt|\.(vgpr|sgpr|agpr)_count|group_segment_fixed_size",
    "sass": r"HMMA|HGMMA|UTCHMMA|LDGSTS|LDG|STG|LDSM|LDS|STS|SHFL|BAR\.SYNC|MUFU|SYNCS|LDTM|STTM|WARPGROUP|UTMALDG",
}


def excerpt(lines, stage, cap):
    if len(lines) <= cap:
        return lines
    pat = re.compile(KEYS[stage])
    keep, seen = [], set()
    for i, l in enumerate(lines):
        if pat.search(l):
            key = re.sub(r"%\w+|U?R\d+|U?P\d+|0x[0-9a-f]+|\d+", "#", l)
            if key in seen and stage in ("sass", "ptx", "amdgcn", "llir"):
                continue      # one line per distinct instruction form
            seen.add(key)
            keep.append(l)
        if len(keep) >= cap:
            break
    return keep


def sass_lines(path):
    out = []
    for l in open(path).read().splitlines():
        m = re.search(r"/\*([0-9a-f]{4,})\*/\s+(.*?;)", l)
        if m:
            out.append(m.group(1) + "  " + re.sub(r"\s+", " ", m.group(2)))
    return out


ir = {}
for kern in ("vadd", "softmax", "matmul", "attn"):
    for t in NV + AMD:
        rec = {}
        stem = os.path.join(IR, f"{kern}.{t}")
        for stage in ("ttir", "ttgir", "llir", "ptx", "amdgcn", "sass"):
            p = stem + "." + stage
            if not os.path.exists(p):
                continue
            if stage == "ttir" and t not in ("sm_90a", "gfx942"):
                continue      # TTIR does not depend on the NVIDIA target; one NVIDIA and one AMD copy
            if stage in ("ttir", "ttgir"):
                lines = clean_mlir(open(p).read())
            elif stage == "sass":
                lines = sass_lines(p)
            else:
                lines = [l for l in open(p).read().splitlines() if l.strip() and not l.strip().startswith((";", "//", "!"))]
            cap = {"ttir": 60, "ttgir": 24, "llir": 10, "ptx": 24, "amdgcn": 24, "sass": 24}[stage]
            if kern == "vadd" and stage in ("ttir", "ttgir"):
                cap = 80
            ex = excerpt(lines, stage, cap)
            rec[stage] = {"n": len(lines), "full": len(ex) == len(lines), "x": [short(l, 120 if stage in ("llir", "ttgir") else 150) for l in ex]}
        ir[f"{kern}.{t}"] = rec

main = []
for r in comp["main"]:
    m = {k: r.get(k) for k in ("key", "target", "regs", "stack", "shared", "num_stages", "num_warps", "vgpr", "sgpr", "agpr", "lds", "scratch",
                              "ttir_lines", "ttgir_lines", "llir_lines", "ptx_lines", "sass_lines")}
    m["ops"] = r.get("sass") or r.get("amd")
    m["ptxops"] = {k: v for k, v in (r.get("ptx") or {}).items() if v}
    main.append({k: v for k, v in m.items() if v is not None})

sweep = []
for r in comp["sweep"]:
    s = r.get("sass") or {}
    mma = [k for k in ("HGMMA", "UTCHMMA", "HMMA") if s.get(k)]
    sweep.append({"k": r["key"], "t": r["target"], "ok": r["ok"], "regs": r.get("regs"), "smem": r.get("shared"),
                  "stack": r.get("stack"), "nw": r["num_warps"], "ns": r.get("num_stages"), "cx": r["constexprs"],
                  "mma": mma[0] if mma else "", "nmma": s.get(mma[0]) if mma else 0, "ldgsts": s.get("LDGSTS", 0)})

pz = {}
for key, v in passes.items():
    rows = [[p["arg"] or p["pass"], 1 if p["changed"] else 0, p["lines_before"]] for p in v["passes"]]
    snaps = {}
    want = {"vadd.sm_90a": ["before convert-triton-to-tritongpu", "after convert-triton-to-tritongpu", "after tritongpu-coalesce",
                            "after tritongpu-remove-layout-conversions"],
            "matmul.sm_90a": ["before tritongpu-accelerate-matmul", "after tritongpu-accelerate-matmul", "before tritongpu-pipeline", "after tritongpu-pipeline"]}.get(key, [])
    for name, txt in v["snapshots"].items():
        if name not in want:
            continue
        lines = txt.splitlines()
        if key.startswith("matmul"):
            lines = excerpt(lines, "ttgir", 30)
        snaps[name] = {"n": len(txt.splitlines()), "x": [short(l, 170) for l in lines[:90]]}
    pz[key] = {"rows": rows, "snaps": snaps}


def fn_source(path, names):
    src = open(path).read()
    tree = ast.parse(src)
    lines = src.splitlines()
    out = {}
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name in names:
            start = node.decorator_list[0].lineno - 1 if node.decorator_list else node.lineno - 1
            out[node.name] = "\n".join(lines[start:node.end_lineno])
    return out


srcs = fn_source(os.path.join(HERE, "kernels_tg.py"), ["vadd", "softmax", "matmul", "attn_fwd"])
srcs.update(fn_source(os.path.join(HERE, "gluon_tg.py"), ["memcpy_1d_kernel", "gvadd"]))


def ind_kernel(path):
    t = open(path).read()
    i = t.index("@triton.jit")
    return t[i:].strip()


def ind_call(path):
    t = open(path).read().splitlines()
    i = next(k for k, l in enumerate(t) if "def call(self, args)" in l)
    j = next(k for k in range(i, len(t)) if "return (" in t[k])
    return "\n".join(l[4:] for l in t[i:j + 1] if "assert_size_stride" not in l)


ind = {n: {"kernel": ind_kernel(os.path.join(OUT, "inductor", n + "_kernel.py")),
           "call": ind_call(os.path.join(OUT, "inductor", n + "_module.py"))} for n in ("pointwise", "attn_like")}

gl = {"memcpy": [{"t": r["target"], "R": r["R"], "ld": [o["op"] for o in r["ldst"] if o["op"].startswith("LDG")],
                  "st": [o["op"] for o in r["ldst"] if o["op"].startswith("STG")], "args": [o["args"] for o in r["ldst"] if o["op"].startswith("LDG")][:4]}
                 for r in glu["memcpy"] if r["ok"]],
      "layouts": [{"spt": c["spt"], "tpw": c["tpw"], "wpc": c["wpc"], "order": c["order"], "shape": c["shape"], "printed": c["printed"]} for c in glu["layouts"]],
      "vadd_stages": glu["vadd"].get("stages"),
      "vadd_ttgir": [short(l) for l in clean_mlir(open(os.path.join(IR, "gluon_vadd.sm_90a.ttgir")).read())]}

lay_lines = {}
for k in ("vadd.sm_90a", "vadd_nohints.sm_90a", "vadd_n1000.sm_90a", "softmax.sm_90a", "vadd.gfx942"):
    lay_lines[k] = [l for l in open(os.path.join(IR, k + ".ttgir")).read().splitlines() if l.startswith("#blocked")]
D = {"gl_pub": json.load(open(os.path.join(HERE, "..", "inputs", "gluon_tutorial02_published.json"))), "layout_lines": lay_lines, "versions": {"triton": comp["triton"], "torch": interp["torch"], "cuda": "13.4.2", "image": "kb-gpu-lab:1"},
     "interp": interp, "main": main, "sweep": sweep, "ir": ir, "passes": pz, "src": srcs, "inductor": ind, "gluon": gl,
     "exp": {k: exp[k] for k in ("grouped", "smem_stages", "tutorial_fit_counts", "mma_per_kstep", "mma_static", "causal_tiles_8192_128",
                                 "vadd_elems_per_thread", "vadd_v4_per_input", "tutorial_table_row0")}}
js = "// generated by src/code/build_data.py from src/out/; do not edit\nwindow.TGD=" + json.dumps(D, separators=(",", ":")) + ";\n"
dst = os.path.join(HERE, "..", "parts", "22_js_data.js")
open(dst, "w").write(js)
print("wrote", dst, len(js), "bytes; ir", len(json.dumps(ir)), "passes", len(json.dumps(pz)), "sweep", len(json.dumps(sweep)))
