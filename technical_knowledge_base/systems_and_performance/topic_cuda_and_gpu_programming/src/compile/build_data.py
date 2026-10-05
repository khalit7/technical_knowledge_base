# Build ../parts/32_js_cmp_0data.js from the real compiler outputs in out/.
# Run after run_all.sh (or compile_all.sh + the Triton step). Plain python3, no dependencies.
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "occ"))
from parse_lib import parse_ptxas, parse_ptx, parse_sass_lines
from occ import occupancy, ARCH
import notes

OUT = os.path.join(HERE, "out")
ARCHS = ["sm_80", "sm_90a", "sm_100a", "sm_120"]
rd = lambda p: open(os.path.join(OUT, p)).read() if os.path.exists(os.path.join(OUT, p)) else None

# opcode descriptions: NVIDIA CUDA Binary Utilities v13.4, instruction-set tables (Blackwell and Rubin table first,
# then Hopper, then Ampere/Ada); category is this page's grouping.
OPS_DOC = json.load(open(os.path.join(HERE, "inputs", "sass_opcodes.json")))
CAT = {}
for c, ops in {
    "mem": "LDG STG LDS STS LDL STL LDSM LDGSTS UTMALDG UTMASTG ATOMG ATOMS RED REDG LDTM STTM LD ST ATOM UBLKCP".split(),
    "fp": "FFMA FADD FMUL FMNMX FMNMX3 MUFU FSETP FSEL FCHK HFMA2 HADD2 HMUL2 F2F F2FP I2F F2I FRND FSWZADD".split(),
    "tc": "HMMA HGMMA QMMA OMMA IMMA UTCHMMA UTCQMMA UTCOMMA UTCIMMA".split(),
    "sync": "BAR SYNCS WARPSYNC MEMBAR FENCE DEPBAR ERRBAR UTCBAR SHFL VOTE VOTEU ELECT WARPGROUP CCTL UTCATOMSWS ACQBULK".split(),
    "ctl": "BRA EXIT BSSY BSYNC RET CALL NOP YIELD BMOV JMP BREAK".split(),
}.items():
    for o in ops:
        CAT[o] = c
# extra plain-words notes for the instructions this tab talks about
NOTE = {
    "LDG": "One load per thread from global memory (HBM or GDDR), through the L1 and L2 caches. .E means 64-bit addressing; .128 or .64 means a vector load of 16 or 8 bytes",
    "STG": "One store per thread to global memory",
    "LDS": "Load from the block's shared memory on the SM (about as fast as L1)",
    "STS": "Store to the block's shared memory",
    "LDL": "Load from local memory: per-thread space in global memory, used here for register spills",
    "STL": "Store to local memory: this is a register spill (or a per-thread array the compiler could not keep in registers)",
    "FFMA": "d = a x b + c in FP32, one per thread, rounded once",
    "FADD": "FP32 add, one per thread",
    "HMMA": "Warp-wide tensor-core matrix multiply-accumulate; .16816 means m16 n8 k16, i.e. 2,048 multiply-adds per warp instruction",
    "HGMMA": "Hopper warpgroup tensor-core MMA (from wgmma.mma_async): operands read from shared memory via descriptors (gdesc)",
    "QMMA": "Warp-wide FP8 tensor-core MMA; .16832 means m16 n8 k32 = 4,096 multiply-adds",
    "UTCHMMA": "Blackwell tcgen05 MMA issued by one thread: A and B via shared-memory descriptors, accumulator in Tensor Memory (tmem)",
    "LDTM": "Copy accumulator values from Tensor Memory into registers (tcgen05.ld)",
    "UTCATOMSWS": "Tensor Memory allocation bookkeeping (tcgen05.alloc / dealloc)",
    "UTCBAR": "Signal an mbarrier when the issued tensor-core work completes (tcgen05.commit)",
    "UTMALDG": "TMA: one instruction asks the copy engine for a whole tile, global to shared memory",
    "SYNCS": "Hardware mbarrier operations in shared memory (arrive, wait on phase, transaction counts)",
    "SHFL": "Warp shuffle: each thread reads a register of another thread in its warp, no memory involved",
    "BAR": "Block-wide barrier (__syncthreads): every warp of the block waits here",
    "S2R": "Read a special register such as threadIdx.x (SR_TID.X) into a register",
    "S2UR": "Read a special register such as blockIdx.x (SR_CTAID.X) into a uniform register (one value shared by the warp)",
    "LDC": "Load from constant memory; kernel arguments live in constant bank 0, c[0x0][...]",
    "ULDC": "Load a constant into a uniform register (one copy per warp instead of one per thread)",
    "IMAD": "Integer multiply-add; used for index and address arithmetic (IMAD.WIDE produces a 64-bit address)",
    "ISETP": "Integer compare, sets a predicate register (P0...) used to guard later instructions",
    "EXIT": "Thread finishes (guarded by a predicate here, @P0, for out-of-range threads)",
    "MUFU": "Special-function unit: approximate exp2, rcp, rsqrt, sin...; __expf becomes FMUL by log2(e) then MUFU.EX2",
    "F2FP": "Convert and pack floating-point formats; F2FP.F16.E4M3.UNPACK_B unpacks FP8 (e4m3) into FP16",
    "R2UR": "Move a per-thread register into a uniform register",
    "ELECT": "Elect one leader thread in the warp",
    "DEPBAR": "Wait until outstanding scoreboard-tracked operations finish",
    "FMNMX": "FP32 min or max",
    "HFMA2": "Two FP16 fused multiply-adds packed in one 32-bit register; ptxas also uses HFMA2.MMA as a fast register move",
    "LDSM": "Load matrix fragments from shared memory into registers in the tensor-core layout (ldmatrix)",
    "LDGSTS": "Asynchronous copy from global straight to shared memory, skipping registers (cp.async, Ampere)",
}

def opdesc(op):
    for t in ("Table 8. Blackwell and Rubin Instruction Set", "Table 8. Hopper Instruction Set", "Table 7. NVIDIA Ampere GPU and Ada Instruction Set"):
        tab = OPS_DOC.get(t) or {}
        if op in tab and tab[op]:
            return tab[op]
    return None

# ---------------- kernels ----------------
KERNELS = [
    dict(id="k1_vadd", fn="vadd", title="1. Vector add", block=256,
         about="One thread per element: two global loads, one add, one store. The simplest possible kernel, and pure memory traffic: 12 bytes moved per FP32 add."),
    dict(id="k2_matmul_naive", fn="matmul_naive", title="2. Matmul, naive", block=256,
         about="One thread per element of C, launched as 16 x 16 thread blocks; every multiply-add reads both operands from global memory."),
    dict(id="k3_matmul_tiled", fn="matmul_tiled", title="3. Matmul, tiled in shared memory", block=1024, fixedBlock=True,
         about="32 x 32 threads per block stage 32 x 32 tiles of A and B in shared memory (2 x 4 KB = 8,192 bytes), so each global load is reused 32 times."),
    dict(id="k4_reduce_warp", fn="reduce_sum", title="4. Sum reduction with warp shuffles", block=256,
         about="Each warp sums 32 values with five register shuffles, one value per warp goes through shared memory, and one atomic per block adds the block total."),
    dict(id="k5_softmax", fn="softmax_rows", title="5. Row softmax (three passes)", block=256, fixedBlock=True,
         about="One block of 256 threads per row: a max pass, a sum-of-exponentials pass and a normalise pass, each reduction done with warp shuffles plus 8 floats of shared memory."),
    dict(id="k6_wmma", fn="matmul_wmma", title="6. Tensor-core matmul (WMMA, FP16)", block=32,
         about="One warp computes a 16 x 16 tile of C with the WMMA API (FP16 inputs, FP32 accumulators). Same source for every target."),
    dict(id="k7_mma_fp8", fn="mma_fp8_tile", title="7. One FP8 mma.sync (inline PTX)", block=32,
         about="A single warp-wide m16n8k32 FP8 (e4m3) tensor-core instruction written directly in PTX. Compiled, not run."),
    dict(id="k8_wgmma", fn="wgmma_tile", title="8. Hopper wgmma (64 x 64 x 16)", block=128, fixedBlock=True,
         about="Four warps (a warpgroup) issue one asynchronous 64 x 64 x 16 FP16 MMA reading A and B from shared memory through 64-bit descriptors. sm_90a only. Compiled, not run; numerical result not verified."),
    dict(id="k9_tcgen05", fn="tcgen05_tile", title="9. Blackwell tcgen05 (128 x 64 x 16 into TMEM)", block=128, fixedBlock=True,
         about="One thread issues a 128 x 64 x 16 FP16 MMA whose accumulator lives in Tensor Memory; the warps then copy it to registers with tcgen05.ld. sm_100a only. Compiled, not run; numerical result not verified."),
    dict(id="k11_tma", fn="tma_tile", title="10. TMA tile load in a 2-block cluster", block=128, fixedBlock=True,
         about="One thread asks the Tensor Memory Accelerator to copy a 32 x 32 FP32 tile from global to shared memory, tracked by an mbarrier; the kernel is launched as 2-block clusters. Compiled, not run."),
    dict(id="k10_spill", fn="acc256", title="11. Register pressure ladder (section 5)", block=128, fixedBlock=True, hidden=True,
         about="Each thread keeps 256 running sums in registers (the register-pressure ladder of section 5, at N = 256), with __launch_bounds__(128)."),
]
SPILL_NS = [16, 32, 64, 128, 192, 256, 320, 384]


def ptx_for(kid, arch, fn):
    txt = rd(f"{kid}.{arch}.ptx")
    if not txt:
        return None, None
    files = dict(re.findall(r'\.file\s+(\d+)\s+"([^"]+)"', txt))
    mine = [k for k, v in files.items() if v.endswith(kid + ".cu")]
    header, ents = parse_ptx(txt)
    lines = ents.get(fn)
    if lines is None:
        return header, None
    # keep only source lines of this kernel's own file: re-parse .loc with file index
    out, loc, inl = [], [], {}
    cur = False
    depth = 0
    for raw in txt.splitlines():
        if not cur:
            if re.match(r"\s*\.visible \.entry " + fn + r"\(", raw):
                cur = True
                out.append([raw.rstrip(), []])
            continue
        s = raw.rstrip()
        m = re.match(r"\s*\.loc\s+(\d+)\s+(\d+)\s+(\d+)(.*)", s)
        if m:
            f, ln = m.group(1), int(m.group(2))
            mi = re.search(r"inlined_at\s+(\d+)\s+(\d+)\s+(\d+)", m.group(4))
            locs = []
            if f in mine and ln > 0:
                locs.append(ln)
            if mi and mi.group(1) in mine:
                at = int(mi.group(2))
                locs.append(at)
                if f in mine and ln > 0:
                    inl[ln] = at
                if at in inl:
                    locs.append(inl[at])
            loc = sorted(set(locs))
            continue
        if re.match(r"\s*\$L__(func_begin|tmp|func_end)\d*:", s) or s.strip().startswith(".file"):
            continue
        out.append([s.replace("\t", "    "), loc])
        depth += s.count("{") - s.count("}")
        if s.strip() == "}" and depth <= 0:
            break
    return header, out


def sass_for(kid, arch, fn):
    txt = rd(f"{kid}.{arch}.sassline.txt")
    if not txt:
        return None
    # nvdisasm -gi: '//## File "<path>", line N inlined at "<path>", line M' ; keep lines of this kernel's file
    out, loc, cur = [], [], None
    for line in txt.splitlines():
        m = re.match(r"\s*\.text\.(\w+):", line)
        if m:
            cur = m.group(1)
            loc = []
            continue
        if cur != fn:
            continue
        if "//## File" in line:
            locs = []
            for path, ln in re.findall(r'"([^"]+)", line (\d+)', line):
                if path.endswith(kid + ".cu"):
                    locs.append(int(ln))
            loc = sorted(set(locs))
            continue
        m = re.match(r"\s*/\*([0-9a-f]{4,})\*/\s+(.*?)\s*;\s*$", line) or re.match(r"\s*/\*([0-9a-f]{4,})\*/\s+(.*?)\s*$", line)
        if m:
            ins = re.sub(r"\s+", " ", m.group(2).strip().rstrip(";").strip())
            out.append([ins, list(loc)])
            continue
        m = re.match(r"^\.(L_x_\d+):", line)
        if m:
            out.append(["." + m.group(1) + ":", []])
    # drop the padding after the final EXIT: a branch-to-self and NOPs
    while out and (out[-1][0] == "NOP" or re.match(r"\.L_x_\d+:$", out[-1][0])):
        out.pop()
    if out and re.match(r"BRA `\(\.L_x_\d+\)$", out[-1][0]):
        lab = re.search(r"\.L_x_\d+", out[-1][0]).group(0)
        if len(out) > 1 and out[-2][0] == lab + ":":
            out = out[:-2]
    return out


def opof(ins):
    t = re.sub(r"^@!?U?P[T0-9]+\s+", "", ins)
    m = re.match(r"([A-Z0-9_]+)", t)
    return m.group(1) if m else ""


def short_err(txt):
    for line in txt.splitlines():
        if "error" in line:
            m = re.search(r"error\s*:\s*(.*)$", line) or re.search(r"error:\s*(.*)$", line)
            if m:
                return m.group(1).strip()
    return "error"


def clean_err(txt):
    keep = [l for l in txt.splitlines() if l.strip() and not l.startswith("exit=")]
    keep = [re.sub(r"/tmp/tmpxft_[0-9a-f_]+-\d+_", "", l) for l in keep]
    return "\n".join(keep[:12])


def build_kernels():
    ks = []
    for k in KERNELS:
        src = open(os.path.join(HERE, "kernels", k["id"] + ".cu")).read().rstrip("\n").split("\n")
        K = dict(id=k["id"], title=k["title"], block=k["block"], about=k["about"], arch={})
        for key in ("fixedBlock", "hidden"):
            if k.get(key):
                K[key] = True
        if not k.get("hidden"):
            K["src"] = src
        for a in ARCHS:
            pt = rd(f"{k['id']}.{a}.ptxas.txt") or ""
            ok = "exit=0" in pt and os.path.exists(os.path.join(OUT, f"{k['id']}.{a}.cubin"))
            R = dict(ok=ok)
            if ok:
                res = parse_ptxas(pt).get(k["fn"])
                R["res"] = dict(regs=res["regs"], smem=res["smem"], spillSt=res["spillSt"], spillLd=res["spillLd"],
                                stack=res["stack"], bars=res["barriers"])
                sass = sass_for(k["id"], a, k["fn"])
                ops = [opof(l[0]) for l in sass]
                tcs = sorted(set(re.match(r"[A-Z0-9_.x]+", re.sub(r"^@!?U?P[T0-9]+\s+", "", l[0])).group(0)
                                 for l in sass if CAT.get(opof(l[0])) == "tc"))
                if tcs:
                    R["tc"] = ", ".join(tcs)
                if not k.get("hidden"):
                    R["sass"] = sass
                    R["pad"] = 0
            else:
                R["err"] = clean_err(pt)
                R["errShort"] = short_err(pt)
            if not k.get("hidden"):
                hdr, ptx = ptx_for(k["id"], a, k["fn"])
                if ptx:
                    R["ptx"] = [[l[0], l[1]] for l in ptx]
            K["arch"][a] = R
        ks.append(K)
    return ks


def find_loop(sass):
    """The backward-branch loop with the most FFMA instructions: returns (first, last) indices into sass."""
    labels = {l[0][:-1]: i for i, l in enumerate(sass) if re.match(r"\.L_x_\d+:$", l[0])}
    best = None
    for j, l in enumerate(sass):
        m = re.search(r"BRA\S*[^`]*`\((\.L_x_\d+)\)", l[0])
        if m and m.group(1) in labels and labels[m.group(1)] < j:
            body = [x[0] for x in sass[labels[m.group(1)] + 1: j + 1]]
            n = sum(1 for x in body if opof(x) == "FFMA")
            if best is None or n > best[0]:
                best = (n, (labels[m.group(1)] + 1, j))
    return best[1] if best else None


def build_spill():
    data, caps = {}, {}
    pt = {a: parse_ptxas(rd(f"k10_spill.{a}.ptxas.txt") or "") for a in ARCHS}
    for n in SPILL_NS:
        data[n] = {}
        for a in ARCHS:
            r = pt[a][f"acc{n}"]
            sass = sass_for("k10_spill", a, f"acc{n}")
            stl = [l[0] for l in sass if opof(l[0]) == "STL"]
            ldl = [l[0] for l in sass if opof(l[0]) == "LDL"]
            ffma = sum(1 for l in sass if opof(l[0]) == "FFMA")
            snip = []
            if stl or ldl:
                idx = [i for i, l in enumerate(sass) if opof(l[0]) in ("STL", "LDL")]
                for i in idx[:6] + idx[-4:]:
                    if sass[i][0] not in snip:
                        snip.append(sass[i][0])
            data[n][a] = dict(regs=r["regs"], spillSt=r["spillSt"], spillLd=r["spillLd"], stack=r["stack"],
                              stl=len(stl), ldl=len(ldl), ffma=ffma, snip=snip)
    return dict(ns=SPILL_NS, data=data, caps=caps)


def occ_cases(kernels, spill):
    cases = []
    for K in kernels:
        for a in ARCHS:
            R = K["arch"][a]
            if not R["ok"]:
                continue
            blocks = [K["block"]] if K.get("fixedBlock") else list(range(32, 1025, 32))
            for b in blocks:
                cases.append((a, R["res"]["regs"], R["res"]["smem"], b, R["res"]["bars"]))
    for n in spill["ns"]:
        for a in ARCHS:
            for b in (128, 256, 512):
                cases.append((a, spill["data"][n][a]["regs"], 0, b, 0))
    # a synthetic sweep so every limit binds somewhere: regs 16..255, smem 0..48 KB
    for a in ARCHS:
        for regs in (16, 32, 40, 64, 72, 96, 128, 168, 200, 255):
            for smem in (0, 4096, 12288, 32768, 48000):
                for b in (64, 128, 256, 384, 512, 768, 1024):
                    cases.append((a, regs, smem, b, 1))
    seen, out = set(), []
    for c in cases:
        if c not in seen:
            seen.add(c)
            out.append(c)
    with open(os.path.join(HERE, "occ", "cases.txt"), "w") as f:
        for a, regs, smem, b, bars in out:
            A = ARCH[a]
            f.write(f"{a} {A['cc'][0]} {A['cc'][1]} {A['maxW']} {A['smemSM']} {A['smemBlock']} {regs} {smem} {b} {bars}\n")
    return out


def check_occ(cases):
    p = os.path.join(OUT, "occ_nvidia.json")
    if not os.path.exists(p):
        return dict(n=0, match=0, mism=[])
    rows = [json.loads(l) for l in open(p) if l.strip()]
    match, mism = 0, []
    for r in rows:
        mine = occupancy(r["arch"], r["regs"], r["smem"], r["block"], 0, r["bars"])
        if mine["blocks"] == r["blocks"]:
            match += 1
        else:
            mism.append(dict(r, mine=mine["blocks"]))
    return dict(n=len(rows), match=match, mism=mism[:20])


def window(lines, hl_pred, ctx=3, maxn=26):
    """lines: list of str. Returns [[text, highlighted]] covering the highlighted lines with context."""
    idx = [i for i, l in enumerate(lines) if hl_pred(l)]
    if not idx:
        return [[l, False] for l in lines[:maxn]]
    a, b = max(0, idx[0] - ctx), min(len(lines), idx[-1] + ctx + 1)
    seg = [[lines[i], i in idx] for i in range(a, b)]
    if len(seg) > maxn:
        seg = seg[:maxn - 1] + [["...", False]]
    return seg


def strip_loc(s):
    return re.sub(r"\s+loc\([^()]*(\([^()]*\))?[^()]*\)", "", s)


def build_pipe(kernels):
    k1 = next(k for k in kernels if k["id"] == "k1_vadd")
    src = k1["src"]
    R = k1["arch"]["sm_90a"]
    ptx = [l for l in R["ptx"] if l[0].strip()]
    pt = [l.replace("ptxas info    : ", "ptxas info : ") for l in (rd("k1_vadd.sm_90a.ptxas.txt") or "").splitlines()
          if l.startswith("ptxas") or l.startswith("    ")]
    fat = (rd("fat_vadd.list.txt") or "").strip().splitlines()
    cuda = [
        dict(name="CUDA C++", tool="you write it", kind="src", text=[[l, i == 4] for i, l in enumerate(src)],
             cap="The kernel as written. The highlighted line is the one we follow: load <code>a[i]</code> and <code>b[i]</code>, add, store <code>c[i]</code>. Everything else computes <code>i</code> and checks bounds."),
        dict(name="PTX", tool="nvcc front end (NVVM)", kind="ir",
             text=[[l[0], 5 in l[1]] for l in ptx],
             cap="nvcc splits the file: host code goes to the host C++ compiler, device code to NVVM (NVIDIA's LLVM-based compiler), which emits <b>PTX</b>. PTX is an assembly language for a virtual GPU: registers are unlimited (<code>%f1</code>, <code>%rd8</code>...), and it is stable across generations. Our line became two <code>ld.global.f32</code>, one <code>add.f32</code> and one <code>st.global.f32</code>, plus 64-bit address arithmetic."),
        dict(name="SASS", tool="ptxas, for sm_90a", kind="ir",
             text=[[l[0], 5 in l[1]] for l in R["sass"]],
             cap="<b>ptxas</b> turns PTX into <b>SASS</b>, the real machine code of one GPU generation: it allocates physical registers (<code>R0</code>...<code>R9</code>), schedules instructions and picks encodings. The add is now <code>FADD</code>, the loads <code>LDG.E</code>; kernel arguments are read from constant memory (<code>c[0x0][0x210]</code>...). This listing, not your source, is what a profiler shows."),
        dict(name="Resource report", tool="ptxas -v", kind="ir", text=[[l, "Used" in l or "spill" in l] for l in pt],
             cap="The same step prints what the kernel costs each thread: registers, shared memory, spills, stack. These numbers decide how many threads fit on an SM at once (section 7)."),
        dict(name="Fat binary", tool="nvcc + fatbinary", kind="ir", text=[[l, "sm_90a" in l] for l in fat],
             cap="A shipped library carries several compiled versions in one file: here real SASS for four targets plus PTX for compute_120 (listing from <code>cuobjdump -lelf -lptx</code> of an object built with four <code>-gencode</code> flags). PyTorch wheels do the same for the architectures they support."),
        dict(name="Load and run", tool="CUDA driver", kind="run",
             text=[["# at module load, for the GPU actually present:", False],
                   ["# 1. a cubin with the same major and an equal or lower minor version? use it", True],
                   ["#    (sm_90a and sm_100a cubins run only on exactly 9.0 and 10.0)", False],
                   ["# 2. otherwise PTX with an equal or lower version? JIT-compile it, cache the result", True],
                   ["# 3. otherwise: 'no kernel image is available for execution on the device'", False]],
             cap="The driver chooses at load time (an explanation, not program output; rules from <a href=\"https://docs.nvidia.com/cuda/cuda-programming-guide/01-introduction/cuda-platform.html\" target=\"_blank\" rel=\"noopener noreferrer\">Programming Guide 1.3.4</a>). Since compute capability 10.0 the driver can also re-finalize a cubin for another chip of the same family."),
    ]
    T = os.path.join(OUT, "triton")
    tsrc = open(os.path.join(HERE, "triton", "kernels_tl.py")).read().split("\n")
    s0 = next(i for i, l in enumerate(tsrc) if l.startswith("def vadd"))
    s1 = next(i for i, l in enumerate(tsrc) if i > s0 and l.startswith("@triton.jit"))
    py = tsrc[s0 - 1: s1 - 1]
    while py and not py[-1].strip():
        py.pop()
    def body(fn_txt, start_pat):
        L = fn_txt.split("\n")
        return [strip_loc(l) for l in L if l.strip() and not l.startswith("#loc")]
    ttir = body(open(os.path.join(T, "vadd.sm_90a.ttir")).read(), "tt.func")
    ttgir = body(open(os.path.join(T, "vadd.sm_90a.ttgir")).read(), "tt.func")
    llir = [l for l in open(os.path.join(T, "vadd.sm_90a.llir")).read().split("\n")
            if l.strip() and not l.startswith("!") and not l.startswith("attributes") and not l.startswith("declare")]
    llir = [re.sub(r",?\s*!dbg !\d+", "", l) for l in llir]
    tptx = [l.replace("\t", "    ") for l in open(os.path.join(T, "vadd.sm_90a.ptx")).read().split("\n")
            if l.strip() and not l.strip().startswith(".loc") and not l.strip().startswith("//") and not l.strip().startswith(".file")]
    tsass = [l[0] for l in sass_triton("vadd", "sm_90a")]
    triton = [
        dict(name="Python", tool="you write it", kind="src", text=[[l, "a + b" in l] for l in py],
             cap="The Triton version describes a whole block of 1,024 elements at once: <code>tl.arange</code> makes the 1,024 offsets, <code>tl.load</code> loads them all, <code>a + b</code> adds two 1,024-element blocks. Nothing says which thread does what."),
        dict(name="Triton IR", tool="Triton front end (MLIR)", kind="ir", text=window(ttir, lambda l: "arith.addf" in l or "tt.load" in l or "tt.store" in l, 2, 30),
             cap="The Python is parsed into <b>Triton IR</b>, an MLIR dialect that still talks about whole tensors: <code>tensor&lt;1024xf32&gt;</code>. The <code>tt.divisibility = 16</code> hints come from the launch: Triton specialises each compiled kernel on whether pointers and integer arguments are multiples of 16."),
        dict(name="TritonGPU IR", tool="layout assignment", kind="ir", text=window(ttgir, lambda l: "#blocked =" in l or "arith.addf" in l, 2, 30),
             cap="The key step: every tensor gets a <b>layout</b> saying which thread holds which elements. <code>#blocked</code> here gives each thread 4 consecutive floats (16 bytes), 32 threads per warp, 4 warps: 512 elements per pass, so each thread handles the 1,024-element block in two pieces of 4."),
        dict(name="LLVM IR", tool="lowering to LLVM", kind="ir", text=window(llir, lambda l: " fadd " in l, 6, 30),
             cap="Now per-thread code: each thread does 8 scalar <code>fadd</code>s. The layout has been spelled out into explicit loads, adds and stores."),
        dict(name="PTX", tool="LLVM NVPTX backend", kind="ir", text=window(tptx, lambda l: "add.f32" in l or "ld.global" in l or "st.global" in l, 2, 34),
             cap="The same PTX language nvcc produces. Note <code>ld.global.v4.b32</code>: 128-bit vector loads, 4 floats per instruction, possible because of the alignment hints and the layout's 4 consecutive elements per thread."),
        dict(name="SASS", tool="ptxas, for sm_90a", kind="ir", text=window(tsass, lambda l: opof(l) in ("FADD", "LDG", "STG"), 2, 34),
             cap="The machine code: <code>LDG.E.128</code> loads and <code>STG.E.128</code> stores, 8 <code>FADD</code>s per thread. Compare the CUDA C++ path: one 4-byte <code>LDG.E</code> per input per thread there, four 16-byte loads here. Both are correct; Triton's version launches an eighth as many threads (8 elements each) and issues fewer, wider memory instructions."),
    ]
    return dict(cuda=cuda, triton=triton)


def sass_triton(name, arch):
    txt = open(os.path.join(OUT, "triton", f"{name}.{arch}.sassline.txt")).read()
    out = []
    for line in txt.splitlines():
        m = re.match(r"\s*/\*([0-9a-f]{4,})\*/\s+(.*?)\s*;\s*$", line)
        if m:
            out.append([re.sub(r"\s+", " ", m.group(2).strip()), []])
        elif re.match(r"^\.L_x_\d+:", line):
            out.append([line.strip(), []])
    while out and (out[-1][0] == "NOP" or re.match(r"\.L_x_\d+:$", out[-1][0])):
        out.pop()
    if out and re.match(r"BRA `\(\.L_x_\d+\)$", out[-1][0]):
        out = out[:-2]
    return out


def build_triton():
    summ = json.load(open(os.path.join(OUT, "triton", "summary.json")))
    rows = [("vadd", "Vector add (BLOCK = 1024, 4 warps)"),
            ("softmax", "Row softmax (one row of up to 1,024 per program)"),
            ("matmul_fp32", "Matmul, FP32 inputs (64 x 64 x 32 tiles)"),
            ("matmul_fp16", "Matmul, FP16 inputs (128 x 128 x 32 tiles)"),
            ("matmul_fp16_nohints", "Same FP16 matmul, compiled without the launch's alignment hints")]
    out = []
    for name, title in rows:
        r = dict(title=title, arch={})
        for a in ARCHS:
            s = summ["results"].get(f"{name}.{a}")
            if not s or not s["ok"]:
                r["arch"][a] = dict(ok=False, errShort="did not compile")
                continue
            res = open(os.path.join(OUT, "triton", f"{name}.{a}.res.txt")).read()
            regs = int(re.search(r"REG:(\d+)", res).group(1))
            stack = int(re.search(r"STACK:(\d+)", res).group(1))
            sass = sass_triton(name, a)
            ops = {}
            for l in sass:
                full = re.match(r"[A-Z0-9_.x]+", re.sub(r"^@!?U?P[T0-9]+\s+", "", l[0])).group(0)
                o = opof(l[0])
                if CAT.get(o) == "tc" or o in ("LDGSTS", "UTMALDG", "LDG", "STL", "LDL", "FFMA", "LDSM"):
                    key = full if CAT.get(o) == "tc" else (o + (".128" if ".128" in full else ""))
                    ops[key] = ops.get(key, 0) + 1
            stl = ops.get("STL", 0)
            tc = [f"{v} x {k}" for k, v in ops.items() if CAT.get(k.split(".")[0]) == "tc"]
            mem = [f"{v} x {k}" for k, v in ops.items() if k.split(".")[0] in ("LDGSTS", "UTMALDG", "LDG")]
            ins = "; ".join(tc + mem[:2]) + (f"; {stl} STL (spill stores)" if stl else "")
            r["arch"][a] = dict(ok=True, regs=regs, smem=s["shared"], spill=stack if stack else 0, ins=ins)
        out.append(r)
    interp = json.load(open(os.path.join(OUT, "triton_interp.json")))
    return dict(rows=out, interp=interp, version=summ["triton"])


def build_tc(kernels):
    K = {k["id"]: k for k in kernels}
    def cell(kid, pick=None):
        d = {}
        for a in ARCHS:
            R = K[kid]["arch"][a]
            if not R["ok"]:
                d[a] = "error: " + R["errShort"]
            else:
                d[a] = True if not pick else pick(R, a)
        return d
    def fp8(R, a):
        t = R.get("tc", "")
        return True if t.startswith("QMMA") else "compiles, but as F2FP unpack to FP16 + 2 x " + t
    avail = [
        dict(ptx="mma.sync m16n8k16 (FP16, via WMMA)", sass="HMMA.16816.F32", arch=cell("k6_wmma")),
        dict(ptx="mma.sync m16n8k32 (FP8 e4m3)", sass="QMMA.16832 on sm_120", arch=cell("k7_mma_fp8", fp8)),
        dict(ptx="wgmma.mma_async m64n64k16", sass="HGMMA.64x64x16.F32", arch=cell("k8_wgmma")),
        dict(ptx="tcgen05.mma kind::f16 (+ alloc, ld)", sass="UTCHMMA, LDTM, UTCBAR", arch=cell("k9_tcgen05")),
        dict(ptx="cp.async.bulk.tensor (TMA) + cluster", sass="UTMALDG.2D, SYNCS", arch=cell("k11_tma")),
    ]
    rows = [
        dict(name="FFMA (FP32, CUDA cores)", macs=32, col="var(--c1)",
             cap="one fused multiply-add per thread, so 32 per warp instruction. Every GPU since the first CUDA GPUs; it is what the naive and tiled matmuls above run."),
        dict(name="HMMA.16816 (mma.sync, FP16)", macs=16 * 8 * 16, col="var(--c6)",
             cap="one warp-wide instruction multiplies a 16 x 16 tile by a 16 x 8 tile: 2,048 multiply-adds, 64 times an FFMA. Operands sit in the 32 threads' registers. Present on all four targets (section 6): the portable tensor-core path. On sm_120, which has neither wgmma nor tcgen05, warp-level mma.sync (HMMA, QMMA and their block-scaled variants) is how the tensor cores are reached."),
        dict(name="QMMA.16832 (mma.sync, FP8)", macs=16 * 8 * 32, col="var(--c5)",
             cap="the FP8 version: twice the K, 4,096 multiply-adds. Only sm_120 compiled it to a native QMMA; on sm_90a and sm_100a the same PTX became FP8-to-FP16 conversions plus two HMMA (see the table). On Hopper and datacenter Blackwell, native FP8 matrix math goes through wgmma or tcgen05."),
        dict(name="HGMMA 64x64x16 (wgmma)", macs=64 * 64 * 16, maxMacs=64 * 256 * 16, col="var(--c4)",
             cap="issued by a warpgroup of 4 warps, asynchronously, with A and B read from shared memory: 65,536 multiply-adds for this tab's 64 x 64 x 16 (dashed: the largest shape, 64 x 256 x 16 = 262,144, PTX ISA 9.4). sm_90a only."),
        dict(name="UTCHMMA 128x64x16 (tcgen05)", macs=128 * 64 * 16, maxMacs=128 * 256 * 16, col="var(--c2)",
             cap="issued by one thread; reads shared memory, accumulates in Tensor Memory: 131,072 multiply-adds for this tab's shape (dashed: 128 x 256 x 16 = 524,288 for one CTA; a CTA pair goes to 256 x 256 x 16). sm_100a only."),
    ]
    note = ("Multiply-adds per instruction are derived from the shapes (m x n x k); they say how much work one issue starts, not how fast it finishes, which depends on the chip's tensor-core throughput (see <a href='https://app.notion.com/p/3c65c17b0d0d8118beeefaed56da6f8e' target='_blank' rel='noopener noreferrer'>Topic: hardware</a>). "
            "Availability is from this tab's real compiles. The FP8 row is a finding worth knowing: the same <code>mma.sync</code> FP8 PTX is native on sm_120 but emulated on sm_90a and sm_100a (exact, since every e4m3 value is representable in FP16, but two HMMAs and 12 conversions instead of one instruction).")
    return dict(rows=rows, avail=avail, note=note)


UNPACK = """// unpack the compact listings into [text, [source lines]] arrays
(function(D){const un=p=>{const t=p[0].split('\\n'),m=p[1].split(';');return t.map((x,i)=>[x,(m[i]||'').split(',').filter(Boolean).map(Number)])};
D.kernels.forEach(K=>D.archs.forEach(a=>{const R=K.arch[a];if(R.sass)R.sass=un(R.sass);if(R.ptx!==undefined)R.ptx=un(D.ptxPool[R.ptx])}));})(window.CMP);
"""


GPUS = {"sm_80": "A100", "sm_90a": "H100, H200", "sm_100a": "B200, GB200", "sm_120": "RTX 5090"}


def main():
    kernels = build_kernels()
    spill = build_spill()
    cases = occ_cases(kernels, spill)
    occ = check_occ(cases)
    loops, loopstats = {}, {}
    for kid, fn in (("k2_matmul_naive", "matmul_naive"), ("k3_matmul_tiled", "matmul_tiled")):
        loops[kid] = {}
        for a in ARCHS:
            ss = sass_for(kid, a, fn)
            i0, i1 = find_loop(ss)
            loops[kid][a] = dict(r=[i0, i1])
            body = [x[0] for x in ss[i0:i1 + 1] if not re.match(r"\.L_x_\d+:$", x[0])]
            c = {o: sum(1 for x in body if opof(x) == o) for o in ("FFMA", "LDG", "LDS", "STS", "BAR")}
            c["n"] = len(body)
            c["gB"] = sum(notes.width(x) for x in body if opof(x) == "LDG")
            c["sB"] = sum(notes.width(x) for x in body if opof(x) == "LDS")
            loopstats.setdefault(kid, {})[a] = c
    tc = build_tc(kernels)
    tri = build_triton()
    pipe = build_pipe(kernels)
    # opcode table: every opcode that appears anywhere on the page
    seen = set()
    for K in kernels:
        for a in ARCHS:
            for l in K["arch"][a].get("sass", []):
                seen.add(opof(l[0]))
    seen |= {opof(l[0]) for st in pipe["triton"] for l in st["text"]} | {"STL", "LDL"}
    ops = {}
    for o in sorted(x for x in seen if x):
        d = opdesc(o)
        ops[o] = [d or "(not described in NVIDIA's table)", CAT.get(o, "int")] + ([NOTE[o]] if o in NOTE else [])
    archinfo = {a: dict(cc="%d.%d" % ARCH[a]["cc"], maxW=ARCH[a]["maxW"], maxB=ARCH[a]["maxB"], regs=65536, maxR=255,
                        smemSM=ARCH[a]["smemSM"], smemBlock=ARCH[a]["smemBlock"], gpus=GPUS[a]) for a in ARCHS}
    # compact listings: text joined by newlines, source lines as "5,6;;7", identical PTX stored once
    pool, keyidx = [], {}
    def pack(lines):
        t = "\n".join(re.sub(r"(?<=\S)\s{2,}", " ", l[0]) for l in lines)
        m = ";".join(",".join(map(str, l[1])) for l in lines)
        return [t, m]
    for K in kernels:
        for a in ARCHS:
            R = K["arch"][a]
            if "sass" in R:
                R["sass"] = pack(R["sass"])
            if "ptx" in R:
                if not R["ok"]:
                    del R["ptx"]
                    continue
                pk = pack(R["ptx"])
                key = pk[0] + "|" + pk[1]
                if key not in keyidx:
                    keyidx[key] = len(pool)
                    pool.append(pk)
                R["ptx"] = keyidx[key]
    ver = json.load(open(os.path.join(OUT, "versions.json")))
    data = dict(
        meta=dict(nvcc=ver["nvcc"], cuda=ver["cuda_toolkit"], triton=ver["triton"], torch=ver["torch"],
                  tritonPtxas=ver["triton_ptxas"], image=ver["image_id"][:19], base=ver["base"], date=ver["date"],
                  guide=ver["docs"]["programming_guide"], ptxisa=ver["docs"]["ptx_isa"]),
        archs=ARCHS, archinfo=archinfo, ops=ops, kernels=kernels, ptxPool=pool, loops=loops, tc=tc, spill=spill, pipe=pipe,
        triton=dict(rows=tri["rows"], interp=tri["interp"]),
        occCheck=dict(n=occ["n"], match=occ["match"]), loopStats=loopstats,
    )
    # notes need unpacked listings: compute them before packing
    notes.add_notes(data, occupancy)
    del data["loopStats"]
    js = "// Generated by src/compile/build_data.py from the real compiler outputs in src/compile/out/. Do not edit.\nwindow.CMP=" + \
        json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n" + UNPACK
    dst = os.path.join(HERE, "..", "parts", "32_js_cmp_0data.js")
    open(dst, "w").write(js)
    json.dump(dict(occ=occ, n_cases=len(cases)), open(os.path.join(OUT, "occ_check_summary.json"), "w"), indent=1)
    print("wrote", dst, len(js), "bytes; occupancy check", occ["match"], "/", occ["n"])


if __name__ == "__main__":
    main()
