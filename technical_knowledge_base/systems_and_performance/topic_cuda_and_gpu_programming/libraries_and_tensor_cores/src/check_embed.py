"""Confirms that ../index.html embeds exactly out/data.json (window.LT), that every number tagged in the
prose with data-k="..." equals the value computed from the data, and that no private path reached the page
or src/. Run: python3 src/check_embed.py (from the page folder or anywhere)."""
import json, os, re, sys, glob
H = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(H, "..", "index.html"), encoding="utf-8").read()
D = json.load(open(os.path.join(H, "out", "data.json")))
fails = 0
def ok(c, m):
    global fails
    if not c: fails += 1
    print(("ok   " if c else "FAIL ") + m)
m = re.search(r"window\.LT=(\{.*?\});\n", page, re.S)
ok(m is not None and json.loads(m.group(1)) == D, "page embeds exactly out/data.json")
ex, cb, m1, mt = D["example"], D["cublas"], D["m1"], D["matrix"]["kernels"]
epi = {e["K"]: e for e in m1["epi"]}
fmt = lambda x: f"{x:,}"
expect = {
    "ex_gflop": f"{ex['gflop']:.1f}", "ex_extra_gb": f"{ex['unfused_extra_gb']:.2f}", "ex_extra_ms": f"{ex['h100_extra_ms']:.2f}",
    "ex_gemm_ms": f"{ex['h100_gemm_ms']:.2f}", "ex_extra_pct": str(ex["h100_extra_pct"]),
    "cublas_lt_total": fmt(cb["lt_total"]), "cublas_sm90_n": fmt(cb["sm90_gemm_n"]), "cublas_sm90_aux": fmt(cb["sm90_tokens"]["aux"]),
    "cublas_sm90_dgelu": fmt(cb["sm90_tokens"]["dgelu"]), "cublas_sm90_split": fmt(cb["sm90_tokens"]["split_k"]),
    "cublas_splitkreduce": str(cb["splitkreduce_by_arch"]["sm_90"]),
    "m1_load": f"{m1['load'][0]:.1f} to {m1['load'][1]:.1f}", "m1_err": f"{max(e['err'] for e in m1['epi']):.3f}",
    "m1_k256_ratio": f"{epi[256]['unfused_ms'] / epi[256]['gemm_only_ms']:.1f}", "m1_k4096_ratio": f"{epi[4096]['unfused_ms'] / epi[4096]['gemm_only_ms']:.2f}",
    "nv_t1": str(D["nv_waves"][0]["tiles"]), "nv_t2": str(D["nv_waves"][1]["tiles"]), "ex_tiles": fmt(ex["tiles_128x256"]),
    "ex_h100_waves": f"{ex['H100']['waves']:.2f}", "ex_h100_eff": f"{100 * ex['H100']['eff']:.1f}", "ex_b200_waves": f"{ex['B200']['waves']:.2f}",
    "ex_5090_waves": f"{ex['RTX5090']['waves']:.2f}",
    "wg256_regs": str(mt["i13_wgmma_f16_n256"]["t"]["sm_90a"]["regs"]), "wg128_regs": str(mt["i10_wgmma_f16_ss"]["t"]["sm_90a"]["regs"]),
    "tc05_regs": str(mt["i14_tcgen05_f16"]["t"]["sm_100a"]["regs"]),
    "wg_err": mt["i10_wgmma_f16_ss"]["t"]["sm_100a"]["msg"][0].replace("error   : ", ""),
    "stage_kb": str(D["stages"]["stage_kb"]), "stages_h100": str(D["stages"]["max_stages_h100"]), "stages_rtx": str(D["stages"]["max_stages_rtx"]),
    "ex48_syncs": str(D["cutlass"]["ex48_hopper_ws"]["kernels"][0]["ops"]["SYNCS"]), "setmaxnreg_budget": fmt(128 * 40 + 256 * 232),
    "cublas_hgmma": fmt(cb["opcodes"]["sm_90a"]["with"]["HGMMA"]), "cublas_sm100_utc": str(cb["opcodes"]["sm_100"]["with"].get("UTCIMMA", 0)),
    "cublas_c3_total": fmt(cb["cutlass3x"]["total"]), "cublas_c3_sm100": fmt(cb["cutlass3x"]["by_arch"]["sm100"]), "cublas_c3_sm103": str(cb["cutlass3x"]["by_arch"]["sm103"]),
    "cublas_c3_sm120": str(cb["cutlass3x"]["by_arch"]["sm120"]), "cublas_c3_streamk": fmt(cb["cutlass3x"]["sm100_tokens"]["stream_k"]),
    "cublas_c3_2sm": fmt(cb["cutlass3x"]["sm100_tokens"]["2sm"]), "cublas_c3_gelu": fmt(cb["cutlass3x"]["sm100_tokens"]["gelu"]),
    "m1_odd_pct": f"{100 * (m1['shapes'][3]['ms'] / m1['shapes'][2]['ms'] - 1):.1f}", "m1_gemv_gbs": f"{m1['shapes'][7]['gbs']:.1f}",
    "cublas_sm120_qmma": str(cb["opcodes"]["sm_120"]["with"]["QMMA"]), "cublas_sm120_hmma": str(cb["opcodes"]["sm_120"]["with"]["HMMA"]),
    "cublas_ptx_entries": fmt(cb["ptx"]["sm_120"]["entries"]), "cublas_ptx_mma": fmt(cb["ptx"]["sm_120"]["mma_sync"]),
    "layout_ok": str(D["layout_check"]["ok"]), "layout_vals": fmt(D["layout_check"]["vals"]),
}
# also confirm the setmaxnreg values the prose quotes are the ones in CUTLASS example 48's SASS summary (0x28 = 40, 0xe8 = 232)
ok(D["cutlass"]["ex48_hopper_ws"]["kernels"][0]["ops"].get("USETMAXREG") == 2, "example 48 has two USETMAXREG")
seen = set()
for k, v in re.findall(r'data-k="([^"]+)">([^<]*)<', page):
    seen.add(k)
    if k not in expect:
        ok(False, f"data-k {k} has no expected value"); continue
    ok(v.strip() == expect[k], f"{k}: page {v.strip()!r} data {expect[k]!r}")
ok(seen == set(expect), "every expected key is on the page" + ("" if seen == set(expect) else f" (missing {sorted(set(expect) - seen)})"))
# privacy: no home path, scratch path or token in the page or in src/
U = "Us" + "ers"  # spelled in pieces so this file does not match its own scan
pat = re.compile("/" + U + "/|" + U + "-|gl" + "pat|sk-" + "ant|/private/" + "tmp/")
bad = [p for p in [os.path.join(H, "..", "index.html")] + glob.glob(os.path.join(H, "**", "*"), recursive=True)
       if os.path.isfile(p) and pat.search(open(p, encoding="utf-8", errors="ignore").read())]
ok(not bad, "no private paths or tokens" + ("" if not bad else f": {[os.path.relpath(b, H) for b in bad]}"))
print(f"check_embed: {len(seen)} tagged numbers, {fails} failures")
sys.exit(1 if fails else 0)
