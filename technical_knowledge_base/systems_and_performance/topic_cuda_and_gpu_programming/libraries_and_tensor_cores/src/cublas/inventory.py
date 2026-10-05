"""Summarises the cuBLAS 13.8.0.4 kernel inventory (CUDA 13.4.2) from the raw listings made by scan.sh
(kept outside the repo; pass their folder) into out/cublas_inventory.json."""
import json, os, re, sys, collections
RAW = sys.argv[1]; H = os.path.dirname(os.path.abspath(__file__))
def rows(fn):
    r = []
    for line in open(os.path.join(RAW, fn)):
        m = re.match(r"SASS text section \d+ : x-(.*)\.(sm_\d+[af]?)\.elf\.bin", line.strip())
        if m: r.append(m.groups())
    return r
lt, blas = rows("ltext_lt.txt"), rows("ltext_blas.txt")
ARCH = ["sm_75", "sm_80", "sm_86", "sm_89", "sm_90", "sm_90a", "sm_100", "sm_100a", "sm_103", "sm_110", "sm_110a", "sm_120", "sm_121"]
out = {"library": "libcublasLt.so.13.8.0.4 and libcublas.so.13.8.0.4 from CUDA 13.4.2 (kb-gpu-lab:1)",
       "lt_total": len(lt), "blas_total": len(blas),
       "lt_by_arch": {a: sum(1 for _, b in lt if b == a) for a in ARCH},
       "blas_by_arch": {a: sum(1 for _, b in blas if b == a) for a in ARCH},
       "lt_hidden_by_arch": {a: sum(1 for n, b in lt if b == a and re.search(r"-\d+$", n)) for a in ARCH}}
out["splitkreduce_by_arch"] = {a: sum(1 for n, b in lt if b == a and "splitKreduce" in n) for a in ARCH}
h = [n for n, b in lt if b == "sm_90a" and n.startswith("sm90_xmma_gemm")]
out["sm90_gemm_n"] = len(h)
out["sm90_tiles"] = collections.Counter(re.search(r"tilesize(\d+x\d+x\d+)", n).group(1) for n in h if "tilesize" in n).most_common(12)
tok = collections.Counter()
for n in h:
    for t in ["bias", "relu", "drelu", "gelu", "dgelu", "bgrad", "aux", "split_k", "segment_k_on", "segment_k_off", "cgasize"]:
        if re.search(r"(^|_)" + t + r"(_|$)", n) or (t in ("cgasize",) and t in n): tok[t] += 1
out["sm90_tokens"] = dict(tok)
out["sm90_types"] = collections.Counter(re.match(r"sm90_xmma_gemm_([a-z0-9]+_[a-z0-9]+_[a-z0-9]+)", n).group(1) for n in h).most_common(10)
pick = ["sm90_xmma_gemm_bf16bf16_bf16f32_f32_tn_n_tilesize128x128x64_warpgroupsize1x1x1_execute_segment_k_off_kernel__5x_cublas"]
out["examples"] = [n for n in h if "gelu" in n and "bf16bf16_bf16f32" in n][:2] + [n for n in h if n in pick] + \
    [n for n, b in lt if b == "sm_80" and n.startswith("ampere_bf16_s16816gemm")][:2] + [n for n, b in lt if b == "sm_100" and re.search(r"-\d+$", n)][:2]
ops = {}
for a in ["sm_80", "sm_89", "sm_90a", "sm_100", "sm_120"]:
    p = os.path.join(RAW, "ops_%s.tsv" % a)
    if not os.path.exists(p): continue
    c = collections.Counter(); n = 0
    for line in open(p):
        parts = line.rstrip("\n").split("\t"); n += 1
        for o in set(parts[2].split()) if len(parts) > 2 else []: c[o] += 1
    ops[a] = {"kernels": n, "with": dict(c)}
out["opcodes"] = ops
names = [l.strip() for l in open(os.path.join(RAW, "cutlass3x_names.txt")) if l.strip()]
c3 = {"total": len(names), "by_arch": dict(collections.Counter(re.match(r"cutlass3x_(sm\d+[a-z]?)_", n).group(1) for n in names))}
s100 = [n for n in names if n.startswith("cutlass3x_sm100_")]
c3["sm100_tokens"] = {t: sum(1 for n in s100 if t in n) for t in ("stream_k", "2sm", "1sm", "gelu", "dgelu", "bias", "relu", "block_scaled", "ue4m3xe2m1", "e4m3", "bf16")}
c3["sm100_kinds"] = dict(collections.Counter(re.match(r"cutlass3x_sm100_([a-z]+)", n).group(1) for n in s100))
c3["example"] = [n for n in s100 if "ue4m3xe2m1" in n and "2sm_bias_bf16_gelu" in n and n.endswith("stream_k")][:1]
out["cutlass3x"] = c3
ptx = {}
for line in open(os.path.join(RAW, "ptx_summary.txt")):
    f = line.split()
    if len(f) >= 9: ptx[f[0]] = {"entries": int(f[2]), "mma_sync": int(f[4]), "wgmma": int(f[6]), "tcgen05": int(f[8])}
out["ptx"] = ptx
json.dump(out, open(os.path.join(H, "out", "cublas_inventory.json"), "w"), indent=1)
print(json.dumps({k: out[k] for k in ("lt_total", "lt_by_arch", "lt_hidden_by_arch", "sm90_gemm_n", "sm90_tokens")}, indent=0)[:1500])
print(json.dumps(ops, indent=0)[:1500])
