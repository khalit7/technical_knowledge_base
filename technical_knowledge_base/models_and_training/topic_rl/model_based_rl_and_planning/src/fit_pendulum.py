"""Fit an ensemble of five small neural dynamics models to transitions of the Gymnasium Pendulum-v1 environment.

The true dynamics are Gymnasium's (gymnasium/envs/classic_control/pendulum.py): g = 10, m = l = 1, dt = 0.05,
torque clipped to [-2, 2], angular speed clipped to [-8, 8], theta = 0 upright:
    thdot' = clip(thdot + (3 g / (2 l) sin(th) + 3 / (m l^2) u) dt, -8, 8);  th' = th + thdot' dt
Data: 40 episodes of 50 steps with uniformly random torques from Gymnasium's reset distribution
(th uniform in [-pi, pi], thdot uniform in [-1, 1]): 2,000 transitions, as a model-based agent would have early on.
Each member: inputs (cos th, sin th, thdot / 8, u / 2), two tanh layers of 24, outputs the change in th and in thdot;
trained by full-batch Adam on its own bootstrap resample, as in PETS (Chua et al. 2018) without the
probabilistic output. Weights are exported int8 per output row; the page and recompute.py use the dequantised
weights, so the model on the page is exactly the one measured.

Run: uv run --with numpy python3 fit_pendulum.py
"""
import json, math, os, base64
os.environ.setdefault("OMP_NUM_THREADS", "2"); os.environ.setdefault("OPENBLAS_NUM_THREADS", "2")
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))

def true_step(th, thd, u):
    u = min(2.0, max(-2.0, u))
    nthd = thd + (3*10.0/2.0*math.sin(th) + 3.0*u)*0.05
    nthd = min(8.0, max(-8.0, nthd))
    return th + nthd*0.05, nthd

def collect(rng, eps=40, T=50):
    X, Y = [], []
    for _ in range(eps):
        th = rng.uniform(-math.pi, math.pi); thd = rng.uniform(-1, 1)
        for _ in range(T):
            u = rng.uniform(-2, 2); nth, nthd = true_step(th, thd, u)
            X.append([math.cos(th), math.sin(th), thd/8, u/2]); Y.append([nth - th, nthd - thd])
            th, thd = nth, nthd
    return np.array(X), np.array(Y)

H = 24
def init(rng):
    return {"W1": rng.normal(0, 1/math.sqrt(4), (H, 4)), "b1": np.zeros(H), "W2": rng.normal(0, 1/math.sqrt(H), (H, H)),
            "b2": np.zeros(H), "W3": rng.normal(0, 1/math.sqrt(H), (2, H)), "b3": np.zeros(2)}
OUT_SCALE = np.array([0.4, 1.0])   # outputs are predicted divided by these (typical sizes of the two changes)
def fwd(P, X):
    h1 = np.tanh(X @ P["W1"].T + P["b1"]); h2 = np.tanh(h1 @ P["W2"].T + P["b2"]); return h1, h2, h2 @ P["W3"].T + P["b3"]
def train(P, X, Y, steps=4000, lr=3e-3):
    m = {k: np.zeros_like(v) for k, v in P.items()}; v = {k: np.zeros_like(x) for k, x in P.items()}
    Yn = Y/OUT_SCALE
    for t in range(1, steps+1):
        h1, h2, o = fwd(P, X); d = 2*(o - Yn)/len(X)
        g = {"W3": d.T @ h2, "b3": d.sum(0)}; d2 = (d @ P["W3"])*(1 - h2**2)
        g["W2"] = d2.T @ h1; g["b2"] = d2.sum(0); d1 = (d2 @ P["W2"])*(1 - h1**2)
        g["W1"] = d1.T @ X; g["b1"] = d1.sum(0)
        for k in P:
            m[k] = 0.9*m[k] + 0.1*g[k]; v[k] = 0.999*v[k] + 0.001*g[k]**2
            P[k] -= lr*(m[k]/(1-0.9**t))/(np.sqrt(v[k]/(1-0.999**t)) + 1e-8)
    return float(((fwd(P, X)[2] - Yn)**2).mean())

def quantise(P):
    out = {}
    for k, w in P.items():
        w2 = w if w.ndim == 2 else w[None, :]
        s = np.abs(w2).max(1); s[s == 0] = 1.0; s = s/127.0
        q = np.clip(np.round(w2/s[:, None]), -127, 127).astype(np.int8)
        out[k] = {"shape": list(w.shape), "scale": [float("%.9g" % x) for x in s], "q": base64.b64encode(q.tobytes()).decode()}
    return out

def main():
    rng = np.random.default_rng(11); X, Y = collect(rng)
    members = []; fit = []
    for k in range(5):
        r = np.random.default_rng(100 + k); idx = r.integers(0, len(X), len(X))
        P = init(r); fit.append(train(P, X[idx], Y[idx])); members.append(quantise(P))
        print("member", k, "train mse (scaled)", round(fit[-1], 6), flush=True)
    json.dump({"note": "see fit_pendulum.py", "H": H, "out_scale": OUT_SCALE.tolist(), "n_data": len(X), "train_mse_scaled": fit,
               "members": members}, open(os.path.join(HERE, "inputs", "pendulum_models.json"), "w"))
if __name__ == "__main__":
    main()
