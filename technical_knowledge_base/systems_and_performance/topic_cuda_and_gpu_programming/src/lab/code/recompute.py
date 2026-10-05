"""Python reference for every derived number the Kernel lab shows. Writes ../out/expected.json, which
check/check_js.mjs compares with the page's JavaScript (window.LABX.calc) on the same data."""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
LAB = os.path.dirname(HERE)
D = json.load(open(os.path.join(LAB, "out", "data.json")))
cases = D["cases"]
find = lambda g, s, N=None: next(c for c in cases if c["group"] == g and c["step"] == s and (N is None or c.get("N") == N))
E = {"gbs": {}, "gflops": {}, "fused_bytes": {}, "attn": {}, "ratios": {}}

R, C = find("softmax", "S6")["R"], find("softmax", "S6")["C"]
minb = 8 * R * C
for c in cases:
    if c["group"] == "softmax":
        E["gbs"][c["name"]] = minb / (c["ms"] / 1e3) / 1e9
    if "flops" in c:
        E["gflops"][c["name"]] = c["flops"] / (c["ms"] / 1e3) / 1e9


def fused_bytes(mode, N, d=64):
    s, v, o = 4 * N * N, 4 * N * d, 4 * N * d
    return {"U": 3 * s + v + o, "F2": 2 * s + v + o, "F1": s + v + o}[mode]


for N in (2048, 4096, 8192):
    for m in ("U", "F2", "F1"):
        E["fused_bytes"][f"{m}.{N}"] = fused_bytes(m, N)
# naive attention peak: one N x N fp32 matrix per head + Q, K, V, O; check the model against the measured peaks
H, d = 4, 64
for N in (512, 1024, 2048, 4096, 8192, 16384):
    model = (H * N * N * 4 + 4 * H * N * d * 4) / 2 ** 20
    try:
        meas = find("attention", "naive", N)["peak_mib"]
    except StopIteration:
        meas = None
    E["attn"][str(N)] = {"naive_model_mib": model, "naive_measured_mib": meas, "flops": 4 * H * N * N * d}
E["attn"]["llama_like_128k_bytes"] = 32 * 131072 ** 2 * 2
E["h100_softmax_floor_ms"] = minb / 3.35e12 * 1e3
E["fa3_16k_ms"] = 4 * 4 * 16384 ** 2 * 64 / 740e12 * 1e3
E["ridge_m1"] = D["roof"]["peak_fp32_gf"] / D["roof"]["copy_gbs"]
E["ridge_h100_bf16"] = 989.5 / 3.35
r = E["ratios"]
r["S1_over_S2"] = find("softmax", "S1")["ms"] / find("softmax", "S2")["ms"]
r["E_over_L"] = find("softmax", "E")["ms"] / find("softmax", "L")["ms"]
r["M7nu_over_M7"] = find("matmul", "M7nu")["ms"] / find("matmul", "M7")["ms"]
r["M2_over_M3"] = find("matmul", "M2")["ms"] / find("matmul", "M3")["ms"]
r["Ulib_over_F1_8192"] = find("fused", "U_lib", 8192)["ms"] / find("fused", "F1", 8192)["ms"]


# online softmax demo row: mulberry32 exactly as the page
def rng(seed):
    st = [seed]
    def nxt():
        st[0] = (st[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = st[0]
        t = ((t ^ (t >> 15)) * (1 | t)) & 0xFFFFFFFF
        t = (t + (((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF) ^ t) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt


g = rng(7)
s, v = [], []
for i in range(32):
    s.append(round((g() * 6 - 2 + (3 if i == 13 else 0) + (4 if i == 27 else 0)) * 100) / 100)
    v.append(round((g() * 2 - 1) * 100) / 100)
m, l, acc = -math.inf, 0.0, 0.0
for k in range(0, 32, 4):
    mt = max(s[k:k + 4]); mn = max(m, mt); a = math.exp(m - mn) if m != -math.inf else 0.0
    l = l * a + sum(math.exp(x - mn) for x in s[k:k + 4]); acc = acc * a + sum(math.exp(x - mn) * v[k + i] for i, x in enumerate(s[k:k + 4])); m = mn
M = max(s); P = [math.exp(x - M) for x in s]
E["demo"] = {"s": s, "v": v, "online_out": acc / l, "naive_out": sum(p * w for p, w in zip(P, v)) / sum(P), "m": M}
json.dump(E, open(os.path.join(LAB, "out", "expected.json"), "w"), indent=1)
print("naive attention peak, model vs measured (MiB):", {k: (round(x["naive_model_mib"], 1), x["naive_measured_mib"]) for k, x in E["attn"].items() if isinstance(x, dict)})
print("demo out", E["demo"]["online_out"], E["demo"]["naive_out"])
