"""Numbers for the 2026-10-24 additions: backprop by hand through a two-layer network, and the vanishing and
exploding gradient toy. Writes two_layer.json; check_new.mjs runs the page's JavaScript against it.

usage: uv run --no-project --with numpy --with torch python src/two_layer.py   (torch only for the autograd check;
       without torch it still writes the hand-computed numbers and says the check was skipped)
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- 1. Two-layer network on the tiny model: x -> a = W1 x -> h = ReLU(a) -> z = W2 h -> p = softmax(z) -> L = -ln p[sat]
x = [2.0, 1.0]
# the root page's Gradient lab network (engineering_foundations/topic_math, src/parts/32_js_grad_core.js, M0):
# illustrative weights chosen so the logits come out (2, 1, 0), the running example; hidden unit 3 is off
W1 = [[0.5, 0.0], [0.0, 1.0], [1.0, -3.0]]
W2 = [[2.0, 0.0, 1.0], [0.0, 1.0, 0.0], [-1.0, 1.0, 0.0]]
y = 2                                       # the right next word is sat

mv = lambda A, v: [sum(a * b for a, b in zip(r, v)) for r in A]
mtv = lambda A, v: [sum(A[i][j] * v[i] for i in range(len(A))) for j in range(len(A[0]))]
outer = lambda u, v: [[a * b for b in v] for a in u]


def forward(W1, W2):
    a = mv(W1, x)
    h = [max(0.0, t) for t in a]
    z = mv(W2, h)
    m = max(z)
    e = [math.exp(t - m) for t in z]
    s = sum(e)
    p = [t / s for t in e]
    return a, h, z, p, -math.log(p[y])


a, h, z, p, L = forward(W1, W2)
gz = [p[k] - (1.0 if k == y else 0.0) for k in range(3)]
gW2 = outer(gz, h)
gh = mtv(W2, gz)
ga = [gh[i] * (1.0 if a[i] > 0 else 0.0) for i in range(3)]
gW1 = outer(ga, x)
gx = mtv(W1, ga)
lr = 0.1
W1n = [[W1[i][j] - lr * gW1[i][j] for j in range(2)] for i in range(3)]
W2n = [[W2[i][j] - lr * gW2[i][j] for j in range(3)] for i in range(3)]
_, _, _, p_new, L_new = forward(W1n, W2n)
two = dict(x=x, W1=W1, W2=W2, y=y, a=a, h=h, z=z, p=p, loss=L, gz=gz, gW2=gW2, gh=gh, ga=ga, gW1=gW1, gx=gx,
           lr=lr, p_new=p_new, loss_new=L_new)

check = "skipped (no torch)"
try:
    import torch
    tx = torch.tensor(x, dtype=torch.float64, requires_grad=True)
    t1 = torch.tensor(W1, dtype=torch.float64, requires_grad=True)
    t2 = torch.tensor(W2, dtype=torch.float64, requires_grad=True)
    tl = torch.nn.functional.cross_entropy((t2 @ torch.relu(t1 @ tx))[None], torch.tensor([y]))
    tl.backward()
    err = max(abs(tl.item() - L),
              max(abs(u - v) for u, v in zip(tx.grad.tolist(), gx)),
              max(abs(u - v) for r, s in zip(t1.grad.tolist(), gW1) for u, v in zip(r, s)),
              max(abs(u - v) for r, s in zip(t2.grad.tolist(), gW2) for u, v in zip(r, s)))
    check = "torch %s autograd max abs difference %.1e" % (torch.__version__, err)
    assert err < 1e-12, check
except ImportError:
    pass
two["check"] = check

# ---- 2. Vanishing and exploding gradients: a chain of n layers of width d, weights N(0, g^2/d), seeded.
# The same generator as parts/22c_js_new.js (mulberry32 plus Box-Muller), so the page and this script agree.
def mulberry32(a):
    def f():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return f


def normals(seed, count):
    r, out = mulberry32(seed), []
    while len(out) < count:
        u1, u2 = r(), r()
        u1 = max(u1, 1e-12)
        rad = math.sqrt(-2 * math.log(u1))
        out += [rad * math.cos(2 * math.pi * u2), rad * math.sin(2 * math.pi * u2)]
    return out[:count]


N_LAYERS, D = 30, 64
Z = normals(7, N_LAYERS * D * D + 2 * D)
h0 = Z[N_LAYERS * D * D: N_LAYERS * D * D + D]
u = Z[N_LAYERS * D * D + D:]
nu = math.sqrt(sum(t * t for t in u))
u = [t / nu for t in u]


def chain(g, act):
    s = g / math.sqrt(D)
    Ws = [[[s * Z[k * D * D + i * D + j] for j in range(D)] for i in range(D)] for k in range(N_LAYERS)]
    hs = [h0]
    for k in range(N_LAYERS):
        pre = mv(Ws[k], hs[-1])
        hs.append([math.tanh(t) for t in pre] if act == "tanh" else pre)
    gb = u[:]
    norms = [1.0]
    for k in range(N_LAYERS, 0, -1):
        if act == "tanh":
            gb = [gb[i] * (1 - hs[k][i] ** 2) for i in range(D)]
        gb = mtv(Ws[k - 1], gb)
        norms.append(math.sqrt(sum(t * t for t in gb)))
    return norms[::-1]   # norms[k] = |gradient at h_k|, k = 0 .. N_LAYERS


vanish = {"n": N_LAYERS, "d": D, "seed": 7,
          "runs": {str(g): {"linear": chain(g, "linear"), "tanh": chain(g, "tanh")} for g in (0.5, 0.9, 1.0, 1.1, 1.5, 2.0)}}

out = dict(two=two, vanish=vanish)
json.dump(out, open(os.path.join(HERE, "two_layer.json"), "w"), indent=1)
print("two-layer: L = %.4f, after one step %.4f; %s" % (L, L_new, check))
for g, r in vanish["runs"].items():
    print("g %s: |grad at h0| linear %.3g, tanh %.3g" % (g, r["linear"][0], r["tanh"][0]))
