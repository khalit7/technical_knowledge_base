"""Recompute every number the page shows, independently of its JavaScript, and compare.

1. Every activation and its derivative on 2,401 points in [-12, 12] (never exactly 0): the page's JS (check/js_core.json,
   written by check_core.mjs) against torch.nn.functional in float64, derivatives by autograd.
2. Normal-input statistics (mean, E[f^2], gain 1/sqrt(E[f^2]), E[f'^2]) against scipy.integrate.quad; gains against
   torch.nn.init.calculate_gain; SELU's fixed point (mean 0, variance 1).
3. Minimum of each non-monotone curve (GELU, SiLU, Mish, QuickGELU) against scipy.optimize.
4. Approximation errors: GELU tanh form and x*sigmoid(1.702x) against exact GELU; SiLU against GELU.
5. FFN widths: Llama's rounding rule against the released config.json files; parameter matching at d = 768 and 576.
6. Softmax identities; the real-model token records (SwiGLU product, GELU) recomputed from the stored vectors.
7. Dead-ReLU toy: the summary numbers quoted on the page.
Run: node check_core.mjs && OMP_NUM_THREADS=2 uv run --with torch --with scipy --with numpy python recompute.py
"""
import json, math, os
import numpy as np, torch, torch.nn.functional as F
from scipy import integrate, optimize, stats as sst

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
js = json.load(open(os.path.join(HERE, "check/js_core.json")))
fails, rows = 0, []
def check(name, got, want, tol, rel=False):
    global fails
    err = abs(got - want) / (abs(want) if rel and want else 1)
    ok = bool(err <= tol); got, want, err = float(got), float(want), float(err)
    fails += (not ok)
    rows.append(dict(name=name, got=got, want=want, err=err, ok=ok))
    if not ok: print("FAIL", name, got, want, err)

x = torch.tensor(js["xs"], dtype=torch.float64, requires_grad=True)
TF = {
    "sigmoid": torch.sigmoid, "tanh": torch.tanh, "relu": F.relu, "leaky": lambda v: F.leaky_relu(v, 0.01),
    "prelu": lambda v: F.prelu(v, torch.tensor([0.25], dtype=torch.float64)), "elu": F.elu, "selu": F.selu,
    "relu2": lambda v: F.relu(v) ** 2, "gelu": F.gelu, "gelut": lambda v: F.gelu(v, approximate="tanh"),
    "qgelu": lambda v: v * torch.sigmoid(1.702 * v), "silu": F.silu, "mish": F.mish, "softplus": F.softplus,
}
for k, fn in TF.items():
    y = fn(x); g, = torch.autograd.grad(y.sum(), x)
    ef = np.max(np.abs(np.array(js["f"][k]) - y.detach().numpy()) / np.maximum(1, np.abs(y.detach().numpy())))
    ed = np.max(np.abs(np.array(js["d"][k]) - g.numpy()) / np.maximum(1, np.abs(g.numpy())))
    check(f"f {k} vs torch (max rel err)", float(ef), 0.0, 1e-12)
    check(f"f' {k} vs autograd (max rel err)", float(ed), 0.0, 1e-12)
for xv, e in js["erf"]:
    check(f"erf({xv:.2f})", e, math.erf(xv), 1e-14)

# 2. normal-input statistics, as numpy functions
SA, SL = 1.6732632423543772848170429916717, 1.0507009873554804934193349852946
sig = lambda v: 0.5 * (1 + math.tanh(v / 2))
NP = {
    "sigmoid": (sig, lambda v: sig(v) * (1 - sig(v))), "tanh": (math.tanh, lambda v: 1 - math.tanh(v) ** 2),
    "relu": (lambda v: max(v, 0), lambda v: 1.0 * (v > 0)), "leaky": (lambda v: v if v > 0 else 0.01 * v, lambda v: 1 if v > 0 else 0.01),
    "prelu": (lambda v: v if v > 0 else 0.25 * v, lambda v: 1 if v > 0 else 0.25),
    "elu": (lambda v: v if v > 0 else math.expm1(v), lambda v: 1 if v > 0 else math.exp(v)),
    "selu": (lambda v: SL * v if v > 0 else SL * SA * math.expm1(v), lambda v: SL if v > 0 else SL * SA * math.exp(v)),
    "relu2": (lambda v: max(v, 0) ** 2, lambda v: 2 * v if v > 0 else 0),
    "gelu": (lambda v: v * sst.norm.cdf(v), lambda v: sst.norm.cdf(v) + v * sst.norm.pdf(v)),
    "silu": (lambda v: v * sig(v), lambda v: sig(v) * (1 + v * (1 - sig(v)))),
    "softplus": (lambda v: math.log1p(math.exp(v)) if v < 30 else v, sig),
}
def E(fn):
    a = integrate.quad(lambda v: fn(v) * sst.norm.pdf(v), -40, 0, limit=200, epsabs=1e-13)[0]
    b = integrate.quad(lambda v: fn(v) * sst.norm.pdf(v), 0, 40, limit=200, epsabs=1e-13)[0]
    return a + b
for k, (f, d) in NP.items():
    s = js["stats"][k]
    m, m2, d2 = E(f), E(lambda v: f(v) ** 2), E(lambda v: d(v) ** 2)
    check(f"E[{k}(z)]", s["mean"], m, 1e-9); check(f"E[{k}(z)^2]", s["m2"], m2, 1e-9); check(f"E[{k}'(z)^2]", s["d2"], d2, 1e-9)
check("ReLU gain = calculate_gain('relu')", js["stats"]["relu"]["gain"], torch.nn.init.calculate_gain("relu"), 1e-9)
check("leaky gain = calculate_gain('leaky_relu', 0.01)", js["stats"]["leaky"]["gain"], torch.nn.init.calculate_gain("leaky_relu", 0.01), 1e-9)
check("SELU mean (fixed point 0)", js["stats"]["selu"]["mean"], 0.0, 1e-9)
check("SELU second moment (fixed point 1)", js["stats"]["selu"]["m2"], 1.0, 1e-9)
gains_torch = {k: torch.nn.init.calculate_gain(n) for k, n in [("sigmoid", "sigmoid"), ("tanh", "tanh"), ("relu", "relu"), ("selu", "selu")]}
gains_torch["leaky"] = torch.nn.init.calculate_gain("leaky_relu", 0.01)

# 3. minima
for k, fn in [("gelu", lambda v: v * sst.norm.cdf(v)), ("silu", lambda v: v * sig(v)), ("mish", lambda v: v * math.tanh(math.log1p(math.exp(v)))), ("qgelu", lambda v: v * sig(1.702 * v))]:
    r = optimize.minimize_scalar(fn, bounds=(-4, 0), method="bounded", options={"xatol": 1e-10})
    check(f"min of {k} (value)", js["mins"][k]["v"], r.fun, 1e-7); check(f"min of {k} (at x)", js["mins"][k]["x"], r.x, 2e-4)

# 4. approximation errors on [-6, 6]
g = torch.linspace(-6, 6, 120001, dtype=torch.float64)
ex = F.gelu(g)
approx = {
    "tanh GELU minus exact GELU": (F.gelu(g, approximate="tanh") - ex).abs().max().item(),
    "x*sigmoid(1.702x) minus exact GELU": (g * torch.sigmoid(1.702 * g) - ex).abs().max().item(),
    "SiLU minus exact GELU": (F.silu(g) - ex).abs().max().item(),
}
# 5. FFN widths
cfg = json.load(open(os.path.join(HERE, "inputs/configs.json")))
for k in ["llama1_7b", "llama3_8b", "llama2_70b", "llama31_405b", "llama32_1b", "llama32_3b"]:
    check(f"Llama rounding rule {k} vs config.json intermediate_size", js["llama"][k], cfg[k]["intermediate_size"], 0)
check("Shazeer: 2 x 768 x 3072 = 3 x 768 x 2048", 2 * 768 * 3072, 3 * 768 * 2048, 0)
check("SmolLM2-135M: 1536 = 8/3 x 576", cfg["smollm2_135m"]["intermediate_size"], 8 / 3 * 576, 1e-9)
check("SmolLM2 plain-FFN match: 2 x 576 x 2304 = 3 x 576 x 1536", 2 * 576 * 2304, 3 * 576 * 1536, 0)

# 5b. prose numbers
check("tanh slope 0.01 at |x| (page: 3.0)", math.atanh(math.sqrt(0.99)), 2.993, 1e-3)
check("sigmoid slope 0.01 at |x| (page: 4.6)", math.log((1 + math.sqrt(0.96)) / (1 - math.sqrt(0.96))), 4.585, 1e-3)
check("SiLU dip / GELU dip (page: 64% deeper)", js["mins"]["silu"]["v"] / js["mins"]["gelu"]["v"], 1.638, 1e-3)
check("Qwen2.5-0.5B projection multiply-adds (page: 136 million)", 896 * 151936, 136134656, 0)
check("logits in a batch of 8 x 4,096 (page: 5.0 billion, 19.9 GB)", 8 * 4096 * 151936 * 4 / 1e9, 19.91, 0.01)
check("Shazeer: ReLU minus SwiGLU at 65,536 steps over ReLU's sd (page: about ten)", (1.997 - 1.944) / 0.005, 10.6, 0.05)
check("plain GELU block parameters at d = 768 (page: 4.72 million)", 2 * 768 * 3072, 4718592, 0)
check("SwiGLU block parameters at d = 576 (page: 2.65 million)", 3 * 576 * 1536, 2654208, 0)

# 6. softmax identities
z = torch.tensor([2.0, 1.0, 0.1], dtype=torch.float64)
for i, (want) in enumerate([F.softmax(z, 0), F.softmax(z / 0.5, 0), F.softmax(torch.tensor([1000.0, 999.0, 0.0], dtype=torch.float64), 0)]):
    check(f"softmax case {i}", float(np.max(np.abs(np.array(js["softmax"][i]) - want.numpy()))), 0.0, 1e-15)
xx = torch.linspace(-10, 10, 2001, dtype=torch.float64)
check("softmax([x, 0])_0 = sigmoid(x)", (F.softmax(torch.stack([xx, torch.zeros_like(xx)]), 0)[0] - torch.sigmoid(xx)).abs().max().item(), 0.0, 1e-15)
check("tanh(x) = 2 sigmoid(2x) - 1", (torch.tanh(xx) - (2 * torch.sigmoid(2 * xx) - 1)).abs().max().item(), 0.0, 1e-14)

# 6b. real-model token records
rm_path = os.path.join(HERE, "inputs/real_models.json")
real = {}
if os.path.exists(rm_path):
    rm = json.load(open(rm_path))
    for m in rm["models"]:
        t = m.get("token")
        if not t: continue
        if m["key"] == "smol":
            gt, up, h = map(np.array, (t["gate"], t["up"], t["h"]))
            prod = gt / (1 + np.exp(-gt)) * up
            check("SmolLM2 token: SiLU(gate)*up from stored vectors vs hooked down_proj input (max abs)", float(np.max(np.abs(prod - h))), 0.0, 2e-3 * max(1, np.max(np.abs(h))))
            real["smol_token"] = dict(near0=float(np.mean(np.abs(h) < 0.1 * np.sqrt(np.mean(h ** 2)))), gate_neg=float(np.mean(gt < 0)))
        if m["key"] == "gpt2":
            pre = np.array(t["pre"])
            h = F.gelu(torch.tensor(pre), approximate="tanh").numpy()
            real["gpt2_token"] = dict(near0=float(np.mean(np.abs(h) < 0.1 * np.sqrt(np.mean(h ** 2)))), neg=float(np.mean(h < 0)))
    real["summary"] = {m["key"]: dict(tokens=m["tokens"], zero=[round(l["zero"], 4) for l in m["layers"]], dead=[l["dead"] for l in m["layers"]], neg=[round(l["neg"], 4) for l in m["layers"]]) for m in rm["models"]}

# 7. dead-ReLU toy summary
toy = json.load(open(os.path.join(HERE, "inputs/dead_relu_toy.json")))
summ = {}
for r in toy["runs"]:
    k = f'{r["act"]} {r["lr"]}'
    s = summ.setdefault(k, dict(nan=0, collapsed=0, dead=[], acc=[]))
    if r["nan"]: s["nan"] += 1; continue
    tot = sum(r["dead_layers"]); s["dead"].append(tot); s["acc"].append(round(r["acc"], 4))
    if r["acc"] < 0.2: s["collapsed"] += 1

json.dump(dict(fails=fails, checks=len(rows), rows=rows, approx=approx, gains_torch=gains_torch, stats=js["stats"], mins=js["mins"],
               real=real, toy=summ), open(os.path.join(HERE, "check/recompute.json"), "w"), indent=1)
print("checks", len(rows), "failures", fails)
for k, v in approx.items(): print(k, "%.3g" % v)
for k, v in summ.items(): print(k, v)
if real: print(json.dumps({k: v for k, v in real.items() if k != "summary"}))
