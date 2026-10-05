"""Second derivatives and forward against reverse mode, measured with torch.func on CPU (2 threads, float64).
Part 1: Hessian-vector products (double backward; forward-over-reverse) against the explicit Hessian.
Part 2: full Jacobians of f: R^n -> R^m by forward mode (jacfwd) and reverse mode (jacrev)."""
import json, os, time, statistics
import torch
from torch.func import grad, jvp, hessian, jacfwd, jacrev

torch.set_num_threads(2)
torch.set_default_dtype(torch.float64)


def med(fn, reps=7):
    fn()
    ts = []
    for _ in range(reps):
        t0 = time.perf_counter(); fn(); ts.append(time.perf_counter() - t0)
    return statistics.median(ts)


def make_loss(k, m=None, N=1024, seed=0):
    m = m or k
    g = torch.Generator().manual_seed(seed)
    X = torch.randn(N, m, generator=g)
    y = torch.randn(N, generator=g)
    def loss(theta):
        W1 = theta[: k * m].view(k, m)
        w2 = theta[k * m:]
        return ((torch.tanh(X @ W1.t() / m ** 0.5) @ w2 - y) ** 2).mean()
    theta = torch.randn(k * m + k, generator=g) * 0.5
    return loss, theta


res = {"torch": torch.__version__, "hvp": [], "jac_scalar_out": [], "jac_scalar_in": []}
for k in [10, 20, 40, 80, 160, 320]:
    loss, th = make_loss(k)
    n = th.numel()
    v = torch.randn(n, generator=torch.Generator().manual_seed(2))
    t_loss = med(lambda: loss(th))
    t_grad = med(lambda: grad(loss)(th))
    def dbl():
        t = th.detach().requires_grad_()
        g1, = torch.autograd.grad(loss(t), t, create_graph=True)
        h, = torch.autograd.grad(g1 @ v, t)
        return h
    t_dbl = med(dbl)
    t_for = med(lambda: jvp(grad(loss), (th,), (v,))[1])
    row = dict(k=k, n=n, t_loss=t_loss, t_grad=t_grad, t_hvp_double_backward=t_dbl, t_hvp_fwd_over_rev=t_for)
    hv1 = dbl(); hv2 = jvp(grad(loss), (th,), (v,))[1]
    row["hvp_methods_maxdiff"] = float((hv1 - hv2).abs().max())
    if n <= 1700:
        t_H = med(lambda: hessian(loss)(th), reps=3 if n > 2000 else 5)
        H = hessian(loss)(th)
        row.update(t_hessian=t_H, hessian_bytes=n * n * 8, hv_vs_H_maxdiff=float((H @ v - hv1).abs().max()),
                   H_symmetric_maxdiff=float((H - H.t()).abs().max()))
    res["hvp"].append(row)
    print(row, flush=True)

# forward vs reverse: f(x) = B tanh(A x), hidden 256
for n, m in [(1, 1), (16, 1), (256, 1), (4096, 1), (1, 16), (1, 256), (1, 4096)]:
    g = torch.Generator().manual_seed(3)
    A = torch.randn(256, n, generator=g) / n ** 0.5
    Bm = torch.randn(m, 256, generator=g) / 16
    f = lambda x: Bm @ torch.tanh(A @ x)
    x = torch.randn(n, generator=g)
    tf = med(lambda: jacfwd(f)(x)); tr = med(lambda: jacrev(f)(x)); t0 = med(lambda: f(x))
    J1, J2 = jacfwd(f)(x), jacrev(f)(x)
    row = dict(n=n, m=m, t_f=t0, t_jacfwd=tf, t_jacrev=tr, agree=float((J1 - J2).abs().max()))
    (res["jac_scalar_out"] if m == 1 else res["jac_scalar_in"]).append(row)
    print(row, flush=True)

os.makedirs("out", exist_ok=True)
json.dump(res, open("out/hvp.json", "w"), indent=1)
print("DONE")
