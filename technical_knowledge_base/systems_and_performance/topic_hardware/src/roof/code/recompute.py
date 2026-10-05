"""Python reference for every number the Roofline lab computes in the browser.
Writes out/expected.json: test vectors the page's JavaScript (window.ROOFX) must reproduce
(checked by ../check/check_page.mjs), and prints the figures quoted in the tab's prose."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
D = json.load(open(os.path.join(ROOT, "out", "data.json")))
BYTES = {"fp32": 4, "tf32": 4, "bf16": 2, "fp16": 2, "fp8": 1, "fp4": 0.5}


def op_cost(op, p, s):
    """flops and bytes moved to and from memory, each operand read once and each output written once."""
    if op == "vadd":
        n = p["n"]; return n, 3 * n * s
    if op == "softmax":
        r, c = p["r"], p["c"]; return 5 * r * c, 2 * r * c * s
    if op == "linear":
        M, K, N = p["M"], p["K"], p["N"]; return 2 * M * K * N, s * (M * K + K * N + M * N)
    if op == "attn_dec":
        B, H, g, L, d = p["B"], p["H"], p["g"], p["L"], p["d"]
        return 4 * B * H * L * d, s * (2 * B * (H // g) * L * d + 2 * B * H * d)
    if op == "attn_pre":
        H, L, d = p["H"], p["L"], p["d"]; return 4 * H * L * L * d, 4 * s * H * L * d
    raise ValueError(op)


def roof(chip, prec, ai):
    P = chip["peaks"][prec] * 1e3  # GFLOP/s
    bw = chip["bw"]                # GB/s
    att = min(P, ai * bw)
    return {"P": P, "bw": bw, "ridge": P / bw, "att": att, "bound": "memory" if ai * bw < P else "compute"}


chips = {c["id"]: c for c in D["chips"]}
tests = []
OPS = [("vadd", {"n": 134217728}), ("softmax", {"r": 16384, "c": 4096}),
       ("linear", {"M": 1, "K": 8192, "N": 8192}), ("linear", {"M": 64, "K": 8192, "N": 8192}),
       ("linear", {"M": 512, "K": 8192, "N": 8192}), ("linear", {"M": 2048, "K": 2048, "N": 2048}),
       ("attn_dec", {"B": 1, "H": 32, "g": 1, "L": 4096, "d": 128}), ("attn_dec", {"B": 8, "H": 32, "g": 8, "L": 32768, "d": 128}),
       ("attn_pre", {"H": 32, "L": 2048, "d": 128})]
for cid, c in chips.items():
    for prec in c["peaks"]:
        for op, p in OPS:
            f, b = op_cost(op, p, BYTES[prec])
            r = roof(c, prec, f / b)
            tests.append({"chip": cid, "prec": prec, "op": op, "p": p, "flops": f, "bytes": b, "ai": f / b,
                          "att": r["att"], "ridge": r["ridge"], "bound": r["bound"],
                          "t_s": max(f / (r["P"] * 1e9), b / (r["bw"] * 1e9))})

# measured cases: check the recorded AI matches the formula for the same shapes
cs = {c["name"]: c for c in D["cases"]}
chk = []
for c in D["cases"]:
    if c["name"].startswith("y = x W^T"):
        f, b = op_cost("linear", {"M": c["batch"], "K": 8192, "N": 8192}, 2)
        chk.append((c["name"], abs(f / b - c["ai"]) < 1e-9))
f, b = op_cost("attn_dec", {"B": 1, "H": 32, "g": 1, "L": 4096, "d": 128}, 2)
chk.append(("attn decode", abs(f / b - cs[[k for k in cs if k.startswith("attention decode")][0]]["ai"]) < 1e-9))
f, b = op_cost("attn_pre", {"H": 32, "L": 2048, "d": 128}, 2)
chk.append(("attn prefill", abs(f / b - cs[[k for k in cs if k.startswith("attention prefill")][0]]["ai"]) < 1e-9))
f, b = op_cost("softmax", {"r": 16384, "c": 4096}, 4)
chk.append(("softmax", abs(f / b - cs[[k for k in cs if k.startswith("softmax")][0]]["ai"]) < 1e-9))
assert all(ok for _, ok in chk), chk

m1 = chips["m1g"]; get = lambda pre: next(c for c in D["cases"] if c["name"].startswith(pre))
fig = {}
fig["m1_peak32"] = m1["peaks"]["fp32"] * 1e3; fig["m1_peak16"] = m1["peaks"]["fp16"] * 1e3; fig["m1_bw"] = m1["bw"]
fig["m1_ridge16"] = fig["m1_peak16"] / fig["m1_bw"]
fig["peak_vs_theory"] = fig["m1_peak32"] / 5308
fig["bw_vs_apple"] = fig["m1_bw"] / 200
fig["rolled_ratio"] = get("FMA fp32, same work")["gf"] / fig["m1_peak32"]
fig["mfu_mlx4096_meas"] = get("matmul MLX library (fp16, 4096)")["gf"] / fig["m1_peak16"]
fig["mfu_mlx4096_theory"] = get("matmul MLX library (fp16, 4096)")["gf"] / 5308
fig["naive_frac"] = get("matmul naive")["gf"] / fig["m1_peak32"]
fig["tiled_frac"] = get("matmul tiled")["gf"] / fig["m1_peak32"]
fig["mlx32_frac"] = get("matmul MLX library (fp32, 2048)")["gf"] / fig["m1_peak32"]
fig["tiled_vs_naive"] = get("matmul tiled")["gf"] / get("matmul naive")["gf"]
fig["naive_nocache_bound"] = 0.25 * fig["m1_bw"]   # 2 loads of 4 bytes per FMA (2 flops)
fig["tiled_nocache_bound"] = 4 * fig["m1_bw"]      # 16x16 tiles: each load reused 16 times -> 2*16/(2*4) = 4 flop/byte
b1, b64 = get("y = x W^T, batch 1 "), get("y = x W^T, batch 64 ")
fig["b1_ms"] = b1["s"] * 1e3; fig["b64_ms"] = b64["s"] * 1e3
fig["b1_gbs_frac"] = b1["gbs"] / fig["m1_bw"]
fig["b64_vs_b1_time"] = b64["s"] / b1["s"]
fig["b64_per_token_speedup"] = (b1["s"] * 64) / b64["s"]
fig["dec_gbs_frac"] = get("attention decode")["gbs"] / fig["m1_bw"]
fig["softmax_gbs_frac"] = get("softmax")["gbs"] / fig["m1_bw"]
fig["vadd_gbs_frac"] = get("vector add")["gbs"] / fig["m1_bw"]
fig["prefill_frac"] = get("attention prefill")["gf"] / fig["m1_peak16"]
for cid in ("h100", "b200", "rtx5090", "mi300x", "v6e", "v7"):
    c = chips[cid]; fig[f"ridge_{cid}_bf16"] = c["peaks"]["bf16"] * 1e3 / c["bw"]
fig["ridge_b200_fp8"] = 4500e3 / 8000
fig["h100_m1_bw_ratio"] = 3350 / fig["m1_bw"]; fig["h100_m1_flop_ratio"] = 989.5e3 / fig["m1_peak16"]
fig["h100_bf16_over_fp32"] = 989.5 / 67
fig["llama3_mfu"] = [r["tflops"] / 989.5 for r in D["llama3"]["rows"]]
fig["llama3_tok_per_gpu"] = 430e12 / (6 * 405e9)
fig["cpu_ridge"] = D["cpu"]["p8"]["median"] / D["cpu"]["bw8"]["median"]
for k, v in fig.items():
    print(f"{k:26s} {v}")
json.dump({"tests": tests, "fig": fig}, open(os.path.join(ROOT, "out", "expected.json"), "w"), indent=0)
print(len(tests), "test vectors;", len(chk), "measured-shape checks passed")
