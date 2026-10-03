"""Quantise one real layer of Qwen2.5-0.5B every way the page discusses, measured on real activations.
  uv run --with torch --with transformers --with numpy python quant_lab.py [layer name]
Calibration: inputs/calib_pride_and_prejudice.txt (GPTQ's Hessian, AWQ's and SmoothQuant's channel statistics).
Evaluation: inputs/eval_tale_of_two_cities.txt (a different text, so calibration is not graded on itself).
Position 0 of each text is left out: the first token carries 'massive activations' (Sun et al. 2024).
Writes inputs/lab_<layer>.json (whole-layer results) and, for the chosen layer, inputs/layer_sample.json (what the page ships)."""
import json, os, sys, base64, torch, numpy as np
from transformers import AutoModelForCausalLM, AutoTokenizer
import qformats as qf
HERE = os.path.dirname(os.path.abspath(__file__))
M = 'Qwen/Qwen2.5-0.5B'
LAYER = sys.argv[1] if len(sys.argv) > 1 else 'model.layers.7.self_attn.q_proj'
tok = AutoTokenizer.from_pretrained(M); model = AutoModelForCausalLM.from_pretrained(M, dtype=torch.float32).eval()
mod = dict(model.named_modules())[LAYER]

def acts(fn, n=512):
    text = open(os.path.join(HERE, 'inputs', fn)).read().split('\n', 1)[1]
    ids = tok(text, return_tensors='pt').input_ids[:, :n]
    box = {}
    h = mod.register_forward_hook(lambda m, i, o: box.__setitem__('x', i[0][0].detach().numpy().astype(np.float64)))
    with torch.no_grad(): model(ids)
    h.remove()
    return box['x'][1:], tok.convert_ids_to_tokens(ids[0])[1:]

Xc, _ = acts('calib_pride_and_prejudice.txt'); Xe, toks_e = acts('eval_tale_of_two_cities.txt')
W = mod.weight.detach().numpy().astype(np.float64)  # (N, K); checkpoint is bf16, so these are exact bf16 values
N, K = W.shape
Y = Xe @ W.T
def oerr(Wq, X=None):
    X = Xe if X is None else X
    return float(np.linalg.norm(X @ Wq.T - Y) / np.linalg.norm(Y))
def werr(Wq): return float(np.linalg.norm(Wq - W) / np.linalg.norm(W))
def sqnr(Wq): return float(10 * np.log10((W ** 2).sum() / ((Wq - W) ** 2).sum()))

res = {}
for name, s in qf.SCHEMES.items():
    s = dict(s); 
    if s['g'] == 0: s['bpw'] = s['bpw'] * 896 / K  # recompute per-channel overhead for this K
    Wq = qf.quantise(W, name)
    res[name] = dict(label=s['label'], bpw=s['bpw'], w_relerr=werr(Wq), sqnr_db=sqnr(Wq), out_relerr=oerr(Wq))

# ---- GPTQ (Frantar et al. 2022), int4 asymmetric g128, on the calibration Hessian
def gptq(W, X, g=128, actorder=False, damp=0.01):
    W = W.copy(); H = 2 * X.T @ X / len(X)
    dead = np.diag(H) == 0; H[dead, dead] = 1; W[:, dead] = 0
    perm = np.argsort(-np.diag(H)) if actorder else np.arange(K)
    W = W[:, perm]; H = H[perm][:, perm]
    H += damp * np.mean(np.diag(H)) * np.eye(K)
    Hinv = np.linalg.cholesky(np.linalg.inv(H)).T
    Q = np.zeros_like(W)
    # group boundaries follow the ORIGINAL column order when act-order is on (static groups), else sequential
    gid = (perm // g) if actorder else (np.arange(K) // g)
    params = {}
    for i in range(K):
        gi = gid[i]
        if gi not in params:
            cols = np.where(gid == gi)[0]
            blk = W[:, cols]
            lo = np.minimum(blk.min(1), 0); hi = np.maximum(blk.max(1), 0)
            sc = (hi - lo) / 15; sc[sc == 0] = 1; z = np.round(-lo / sc)
            params[gi] = (sc, z)
        sc, z = params[gi]
        w = W[:, i]
        q = (np.clip(np.round(w / sc) + z, 0, 15) - z) * sc
        Q[:, i] = q
        err = (w - q) / Hinv[i, i]
        W[:, i + 1:] -= np.outer(err, Hinv[i, i + 1:])
    inv = np.argsort(perm)
    return Q[:, inv]
for nm, ao in (('gptq_g128', False), ('gptq_g128_actorder', True)):
    Wq = gptq(W, Xc, actorder=ao)
    res[nm] = dict(label='GPTQ INT4 g128' + (' act-order' if ao else ''), bpw=4.25, w_relerr=werr(Wq), sqnr_db=sqnr(Wq), out_relerr=oerr(Wq))

# ---- AWQ (Lin et al. 2023): scale input channels by s = mean|x|^alpha before int4 g128, fold 1/s into the input
sx = np.abs(Xc).mean(0)
best = None; awq_curve = []
for a in np.arange(0, 1.0001, 0.05):
    s = sx ** a; s = s / np.sqrt(s.max() * s.min())
    Wq = qf.quantise(W * s, 'int4_g128') / s
    e = float(np.linalg.norm(Xc @ Wq.T - Xc @ W.T) / np.linalg.norm(Xc @ W.T))
    awq_curve.append([round(float(a), 2), e, oerr(Wq)])
    if best is None or e < best[0]: best = (e, a, Wq)
Wq = best[2]
res['awq_g128'] = dict(label='AWQ INT4 g128 (alpha %.2f from calibration)' % best[1], bpw=4.25, w_relerr=werr(Wq), sqnr_db=sqnr(Wq), out_relerr=oerr(Wq), alpha=float(best[1]))

# ---- W8A8: activations quantised too
def qa_int8(X, per_token):
    G = X if per_token else X.reshape(1, -1)
    return qf.q_int(G, 8, 0).reshape(X.shape)
def w8a8(Wq, Xq): return float(np.linalg.norm(Xq @ Wq.T - Y) / np.linalg.norm(Y))
Wc = qf.quantise(W, 'int8_channel')
xmax_c = np.abs(Xc).max(0)  # static calibration of the per-tensor activation scale
def static_int8(X, amax):
    s = amax / 127; return np.clip(np.round(X / s), -127, 127) * s
w8 = {}
w8['int8_tensor_static'] = w8a8(Wc, static_int8(Xe, xmax_c.max()))
w8['int8_tensor_dynamic'] = w8a8(Wc, qa_int8(Xe, False))
w8['int8_token_dynamic'] = w8a8(Wc, qa_int8(Xe, True))
def fp8_tok(X):
    s = np.abs(X).max(1, keepdims=True) / 448; return qf.round_float(X / s, 'e4m3') * s
def fp8_ten(X):
    s = np.abs(X).max() / 448; return qf.round_float(X / s, 'e4m3') * s
Wf = qf.quantise(W, 'fp8_channel')
w8['fp8_tensor'] = w8a8(qf.quantise(W, 'fp8_tensor'), fp8_ten(Xe))
w8['fp8_dynamic'] = w8a8(Wf, fp8_tok(Xe))
sq = []
wmax = np.abs(W).max(0)
for a in np.arange(0, 1.0001, 0.05):
    s = xmax_c ** a / wmax ** (1 - a)
    Ws = W * s; Xs = Xe / s
    e_t = w8a8(qf.quantise(Ws, 'int8_channel'), static_int8(Xs, (xmax_c / s).max()))
    sq.append([round(float(a), 2), e_t])
w8['smoothquant_curve'] = sq

# ---- outlier statistics of the activations and the weights
cmax = np.abs(Xe).max(0)
order = np.argsort(-cmax)
stats = dict(K=K, N=N, tokens_eval=len(Xe), tokens_calib=len(Xc), x_absmax=float(cmax.max()), x_chan_median=float(np.median(cmax)),
             top_channels=[[int(c), float(cmax[c]), float(np.abs(Xc[:, c]).max())] for c in order[:8]],
             frac_tokens_top_is_max=float(np.mean(np.abs(Xe).argmax(1) == order[0])),
             w_absmax=float(np.abs(W).max()), w_std=float(W.std()), w_kurtosis=float(((W - W.mean()) ** 4).mean() / W.var() ** 2),
             w_row_absmax_med=float(np.median(np.abs(W).max(1))),
             awq_curve=awq_curve)
out = dict(model=M, layer=LAYER, schemes=res, w8a8=w8, stats=stats)
json.dump(out, open(os.path.join(HERE, 'inputs', 'lab_%s.json' % LAYER.replace('model.layers.', 'L').replace('.', '_')), 'w'), indent=1)
for k, v in res.items(): print('%-22s bpw %.3f  werr %.4f  sqnr %5.1f  out %.4f' % (k, v['bpw'], v['w_relerr'], v['sqnr_db'], v['out_relerr']))
for k, v in w8.items():
    if k != 'smoothquant_curve': print('%-22s %.4f' % (k, v))
print('smoothquant', [(a, round(e, 4)) for a, e in sq[::2]])
print('awq', [(a, round(e, 4)) for a, e, _ in awq_curve[::4]], 'best', best[1])
print({k: v for k, v in stats.items() if k != 'awq_curve'})
