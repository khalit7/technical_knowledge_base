"""Recompute every worked number of the Notation decoder independently (plain Python, no numpy)
and compare with equations.json (written by build_equations.py), with the numbers the page's
JavaScript produced for the attention animation (page_numbers.json, written by check_page.mjs),
and with the text of the built page (each card must show its formatted numbers).

Run: python3 recompute.py   (after build_equations.py, ../build.sh and node check_page.mjs)
"""
import json, math, os, re, html

HERE = os.path.dirname(os.path.abspath(__file__))
EQ = {e["id"]: e for e in json.load(open(os.path.join(HERE, "equations.json")))["equations"]}
bad = n = 0


def close(a, b, tol=1e-9):
    if isinstance(a, (list, tuple)):
        return len(a) == len(b) and all(close(x, y, tol) for x, y in zip(a, b))
    if isinstance(a, dict):
        return all(close(a[k], b[k], tol) for k in a)
    return abs(a - b) <= tol * max(1, abs(b))


def check(name, mine, theirs, tol=1e-9):
    global bad, n
    n += 1
    if not close(mine, theirs, tol):
        bad += 1
        print("MISMATCH", name, mine, theirs)


def mm(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]


def T(A):
    return [list(r) for r in zip(*A)]


def sm(r):
    m = max(r); e = [math.exp(v - m) for v in r]; s = sum(e)
    return [v / s for v in e]


# attention
Q = [[1, 0, 1, 0], [0, 2, 0, 1], [1, 1, 1, 1]]; K = [[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 0, 0]]; V = [[1, 0], [0, 1], [1, 1]]
S = mm(Q, T(K)); Ss = [[v / 2 for v in r] for r in S]; W = [sm(r) for r in Ss]; O = mm(W, V)
Wu = [sm(r) for r in S]; Ou = mm(Wu, V)
c = EQ["attn"]["checks"]
check("attn QKT", S, c["QKT"]); check("attn scaled", Ss, c["scaled"]); check("attn W", W, c["weights"]); check("attn out", O, c["out"])
check("attn W unscaled", Wu, c["weights_unscaled"]); check("attn out unscaled", Ou, c["out_unscaled"])
pn = os.path.join(HERE, "page_numbers.json")
if os.path.exists(pn):
    P = json.load(open(pn))["att"]
    check("JS scaled S", Ss, P["s"]["Sc"], 1e-12); check("JS W", W, P["s"]["W"], 1e-12); check("JS out", O, P["s"]["O"], 1e-12)
    check("JS unscaled W", Wu, P["u"]["W"], 1e-12); check("JS unscaled out", Ou, P["u"]["O"], 1e-12)
else:
    print("page_numbers.json missing: run node check_page.mjs")

# multi-head attention
X = [[1, 0, 2, 0], [0, 1, 0, 2]]
def head(cols):
    P_ = [[r[c] for c in cols] for r in X]
    sc = [[v / math.sqrt(2) for v in r] for r in mm(P_, T(P_))]
    return mm([sm(r) for r in sc], P_)
H1, H2 = head([0, 1]), head([2, 3])
C = [a + b for a, b in zip(H1, H2)]
WO = [[0.5, 0, 0.5, 0], [0, 0.5, 0, 0.5], [0.5, 0, 0.5, 0], [0, 0.5, 0, 0.5]]
c = EQ["mha"]["checks"]
check("mha h1", H1, c["head1"]); check("mha h2", H2, c["head2"]); check("mha concat", C, c["concat"]); check("mha out", mm(C, WO), c["out"])

# layer norm
a = [2, 4, 6, 8]; mu = sum(a) / 4; sig = math.sqrt(sum((x - mu) ** 2 for x in a) / 4)
z = [(x - mu) / sig for x in a]; g = [1, 0.5, 1, 2]; b = [0, 0, 1, 0]
c = EQ["ln"]["checks"]
check("ln mu", mu, c["mu"]); check("ln sigma", sig, c["sigma"]); check("ln z", z, c["z"])
check("ln h", [gi * zi + bi for gi, zi, bi in zip(g, z, b)], c["h"]); check("ln sigma H-1", math.sqrt(20 / 3), c["sigma_bessel"])

# language-model objective
pc = math.exp(1) / (math.exp(2) + math.exp(1) + 1); ps = math.exp(3) / (1 + math.e + math.exp(3))
L1 = math.log(pc) + math.log(ps); nll = -L1 / 2
c = EQ["lm"]["checks"]
check("lm", [pc, ps, L1, nll, nll / math.log(2), math.exp(nll)], [c["p_cat"], c["p_sat"], c["L1"], c["nll"], c["bits"], c["ppl"]])

# Adam on f = theta^2
th, m, v, rows = 1.0, 0.0, 0.0, []
for t in (1, 2):
    gt = 2 * th; m = 0.9 * m + 0.1 * gt; v = 0.999 * v + 0.001 * gt * gt
    mh = m / (1 - 0.9 ** t); vh = v / (1 - 0.999 ** t); th = th - 0.1 * mh / (math.sqrt(vh) + 1e-8)
    rows.append({"t": t, "g": gt, "m": m, "v": v, "mh": mh, "vh": vh, "th": th})
c = EQ["adam"]["checks"]
for r, s in zip(rows, c["steps"]):
    check("adam step %d" % r["t"], r, s)
check("adam no bias corr", 0.1 * 0.2 / (math.sqrt(0.004) + 1e-8), c["no_bias_correction_step"])

# LoRA
W0x = [1, 4, 3]; Ax = 0.5 * 1 - 0.5 * 3; BAx = [Ax, 0, 2 * Ax]
c = EQ["lora"]["checks"]
check("lora", [W0x, Ax, BAx, [p + q for p, q in zip(W0x, BAx)]], [c["W0x"], c["Ax"], c["BAx"], c["h"]])
check("lora pct", 100 * 8 * 8192 / 4096 ** 2, c["pct"])

# Chinchilla
def ch(N, D):
    return [1.69 + 406.4 / N ** 0.34 + 410.7 / D ** 0.28, 406.4 / N ** 0.34, 410.7 / D ** 0.28]
c = EQ["chin"]["checks"]
check("chinchilla", ch(70e9, 1.4e12), c["chinchilla"]); check("gopher", ch(280e9, 300e9), c["gopher"])

# InfoNCE
f_ = [math.exp(2), math.exp(0.5), math.exp(-1)]; pp = f_[0] / sum(f_)
c = EQ["nce"]["checks"]
check("nce", [f_, pp, -math.log(pp), math.log(3) + math.log(pp)], [c["f"], c["p_pos"], c["loss"], c["bound"]])

# DDPM: linear schedule beta_1 = 1e-4 .. beta_1000 = 0.02, abar_200
ab = 1.0
for s_ in range(1, 201):
    ab *= 1 - (1e-4 + (0.02 - 1e-4) * (s_ - 1) / 999)
sa, sb = math.sqrt(ab), math.sqrt(1 - ab)
c = EQ["ddpm"]["checks"]
check("ddpm abar", [ab, sa, sb], [c["abar200"], c["sqrt_abar"], c["sqrt_1m"]])
check("ddpm xt", [sa * 0.5 + sb * 1.0, sa * -0.2 + sb * -0.5], c["xt"]); check("ddpm loss", 0.1 ** 2 + 0.2 ** 2, c["loss"])

# RLHF
c = EQ["rlhf"]["checks"]
check("rlhf", [math.log(2), 1.5 - 0.02 * math.log(2), 27.8 * -2.0], [c["log_ratio"], c["penalised"], c["gamma_term"]])

# PPO
def ppo(r, A, e=0.2):
    cl = min(max(r, 1 - e), 1 + e) * A
    return {"r": r, "A": A, "unclipped": r * A, "clipped": cl, "min": min(r * A, cl)}
cs = [ppo(1.5, 2.0), ppo(0.5, -1.0), ppo(1.5, -1.0)]
c = EQ["ppo"]["checks"]
for i in range(3):
    check("ppo case %d" % i, cs[i], c["cases"][i])
check("ppo mean", sum(x["min"] for x in cs) / 3, c["mean"])

# DPO
marg = 0.1 * ((-10 + 11) - (-12 + 11.5)); sg = 1 / (1 + math.exp(-marg))
c = EQ["dpo"]["checks"]
check("dpo", [marg, sg, -math.log(sg), math.log(2)], [c["margin"], c["sigmoid"], c["loss"], c["loss_at_start"]])

# GRPO advantage
r = [1, 0, 0, 1]; mn = sum(r) / 4
sp = math.sqrt(sum((x - mn) ** 2 for x in r) / 4); ss = math.sqrt(sum((x - mn) ** 2 for x in r) / 3)
c = EQ["grpo"]["checks"]
check("grpo", [mn, sp, ss, [(x - mn) / sp for x in r], [(x - mn) / ss for x in r]], [c["mean"], c["std_pop"], c["std_sample"], c["A_pop"], c["A_sample"]])

# KL estimator
pt, pr = [0.5, 0.3, 0.2], [0.4, 0.4, 0.2]
rho = [b_ / a_ for a_, b_ in zip(pt, pr)]; k3 = [x - math.log(x) - 1 for x in rho]
KL = sum(p * math.log(p / q) for p, q in zip(pt, pr))
c = EQ["kl3"]["checks"]
check("kl3", [rho, k3, sum(p * k for p, k in zip(pt, k3)), KL, sum(p * -math.log(x) for p, x in zip(pt, rho))],
      [c["rho"], c["k3"], c["E_k3"], c["KL"], c["E_k1"]])
check("kl3 unbiased", sum(p * k for p, k in zip(pt, k3)), KL, 1e-12)

# conventions panel numbers
check("norms of (3,4)", [math.hypot(3, 4), 7, 4, 25], [5, 7, 4, 25])
check("die mean", sum(range(1, 7)) / 6, 3.5)
check("nats to bits", [1 / math.log(2), 0.788 / math.log(2)], [1.443, 1.137], 1e-3)
u, x = [1, 2], [3, 4, 5]
check("layout u x^T", [[ui * xj for xj in x] for ui in u], [[3, 4, 5], [6, 8, 10]])
Wt = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
Lf = lambda W_: sum(u[i] * W_[i][j] * x[j] for i in range(2) for j in range(3))
W2 = [r[:] for r in Wt]; W2[0][1] += 0.01
check("layout nudge W12", (Lf(W2) - Lf(Wt)) / 0.01, 4, 1e-9)

# every card shows its own formatted step numbers on the built page
page = open(os.path.join(HERE, "..", "..", "index.html")).read()
for eid, e in EQ.items():
    i = page.find('id="nd-eq-%s"' % eid); j = page.find("</article>", i)
    card = page[i:j]
    nums = set(re.findall(r"<mn[^>]*>([^<]+)</mn>", card))
    for s in e["steps"]:
        for tok in re.findall(r"-?\d+\.\d+", s["tex"]):
            n += 1
            if tok.lstrip("-") not in nums:
                bad += 1; print("NOT ON PAGE", eid, tok)
print(f"{n} checks, {bad} mismatches")
