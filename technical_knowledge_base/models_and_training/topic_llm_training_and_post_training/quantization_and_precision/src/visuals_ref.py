"""Python reference for the Reading visuals added on 2026-10-23 and 2026-11-10 (parts/22_js_qviz.js); check_visuals.mjs compares the two.
  ../../../../../.venv/bin/python3 visuals_ref.py   (numpy; writes visuals_ref.json beside this file and prints the numbers the prose quotes)"""
import json, base64, os, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
js = open(os.path.join(HERE, 'parts', '21_js_qdata.js')).read()
D = json.loads(js[js.index('window.QD=') + 10:].rstrip().rstrip(';'))
bf = lambda s: (np.frombuffer(base64.b64decode(s), dtype='<u2').astype(np.uint32) << 16).view(np.float32).astype(np.float64)
rel = lambda A, B: float(np.linalg.norm(A - B) / np.linalg.norm(B))
out = {}
# hero: row 0, input columns 0..31, INT4 symmetric absmax (15 levels), scale = amax / 7
R = bf(D['rows_bf16']).reshape(len(D['rows']), D['K']); v = R[D['rows'].index(0)][:32]
def q4(v, a): s = a / 7; return np.clip(np.round(v / s), -7, 7) * s
t, b = q4(v, D['w_absmax']), q4(v, np.abs(v).max())
out['hero'] = dict(tzero=int(((t == 0) & (v != 0)).sum()), bzero=int(((b == 0) & (v != 0)).sum()), terr=rel(t, v), berr=rel(b, v),
                   tscale=D['w_absmax'] / 7, bscale=float(np.abs(v).max() / 7), bamax=float(np.abs(v).max()))
# rotation: the slice, a 64 x 64 Sylvester Hadamard matrix scaled by 1/8
S = D['slice']
X = np.frombuffer(base64.b64decode(S['x_f32']), dtype='<f4').astype(np.float64).reshape(16, 64); W = bf(S['w_bf16']).reshape(8, 64)
H = np.array([[1.]])
while H.shape[0] < 64: H = np.block([[H, H], [H, -H]])
H /= 8; Y = X @ W.T
def qrow(A, bits):
    qm = 2 ** (bits - 1) - 1; s = np.abs(A).max(1, keepdims=True) / qm; s[s == 0] = 1; return np.clip(np.round(A / s), -qm, qm) * s
out['rot'] = {}
for k, Rm in (('plain', np.eye(64)), ('hadamard', H)):
    Xr, Wr = X @ Rm, W @ Rm; cm = np.abs(Xr).max(0)
    out['rot'][k] = dict(xmax=float(np.abs(Xr).max()), med=float(np.median(cm)), ratio=float(np.abs(Xr).max() / np.median(cm)),
                         prodDiff=float(np.abs(Xr @ Wr.T - Y).max()), a4=rel(qrow(Xr, 4) @ Wr.T, Y), w4a4=rel(qrow(Xr, 4) @ qrow(Wr, 4).T, Y),
                         a8=rel(qrow(Xr, 8) @ Wr.T, Y), x4err=rel(qrow(Xr, 4), Xr))
# GPTQ on one illustrative row: H = 2 X^T X + 1% of its mean diagonal, U = upper Cholesky factor of H^-1 (Frantar et al. 2022, Algorithm 1)
w0 = np.array([0.60, -0.88, -0.76, 0.20]); step = 0.25
Xg = np.array([[1.0, 0.9, 0.2, -0.3], [0.8, 1.0, -0.1, 0.4], [-0.6, -0.7, 0.5, 0.1], [0.3, 0.2, 0.9, -0.8], [-1.0, -0.8, -0.3, 0.2], [0.5, 0.6, 0.7, 0.6]])
Hg = 2 * Xg.T @ Xg; Hg += 0.01 * np.mean(np.diag(Hg)) * np.eye(4); U = np.linalg.cholesky(np.linalg.inv(Hg)).T
w = w0.copy(); Q = np.zeros(4); cur = [w.copy().tolist()]
for j in range(4):
    Q[j] = np.round(w[j] / step) * step; e = (w[j] - Q[j]) / U[j, j]; w[j + 1:] -= e * U[j, j + 1:]; cur.append(w.copy().tolist())
rtn = np.round(w0 / step) * step
oe = lambda q: float(np.linalg.norm(Xg @ (q - w0)) / np.linalg.norm(Xg @ w0)); we = lambda q: float(np.linalg.norm(q - w0) / np.linalg.norm(w0))
out['gptq'] = dict(Q=Q.tolist(), rtn=rtn.tolist(), cur=cur, outRTN=oe(rtn), outGPTQ=oe(Q), wRTN=we(rtn), wGPTQ=we(Q))

# Fig. 2 (2026-11-10): the four shipped rows, input columns 0 to 63, under five scopes; the quantisers are qformats.py's
import qformats as qf
C = 64; ORDER = [223, 222, 448, 0]; wmax = D['w_absmax']
def q4sym(v, a): s = a / 7; return np.clip(np.round(v / s), -7, 7) * s
def scope_row(kind, g, v, row_amax):
    out = []
    for c0 in range(0, C, g or C):
        seg = v[c0:c0 + (g or C)]
        if kind == 'tensor': out.append(q4sym(seg, wmax))
        elif kind == 'row': out.append(q4sym(seg, row_amax))
        elif kind == 'b32': out.append(q4sym(seg, np.abs(seg).max()))
        elif kind == 'mx':
            X = 2.0 ** (np.floor(np.log2(np.abs(seg).max())) - 2); out.append(qf.round_float(seg / X, 'e2m1') * X)
        elif kind == 'nv':
            st = wmax / (448 * 6); sb = float(qf.round_float(np.abs(seg).max() / 6 / st, 'e4m3')) or 1.0; out.append(qf.round_float(seg / (sb * st), 'e2m1') * sb * st)
    return np.concatenate(out)
out['scope'] = {}
for kind, g in (('tensor', 0), ('row', 0), ('b32', 32), ('mx', 32), ('nv', 16)):
    res = []
    for r in ORDER:
        full = R[D['rows'].index(r)]; v = full[:C]; q = scope_row(kind, g, v, np.abs(full).max())
        res.append(dict(row=r, err=rel(q, v), zeros=int(((q == 0) & (v != 0)).sum())))
    out['scope'][kind] = res
# Fig. 4 and the migration widget (2026-11-10): SmoothQuant W8A8 and AWQ INT4 on the slice, each against its plain method
def qint_asym(r, bits):
    qm = 2 ** bits - 1; lo, hi = min(r.min(), 0), max(r.max(), 0); s = (hi - lo) / qm or 1.0; z = np.round(-lo / s)
    return (np.clip(np.round(r / s) + z, 0, qm) - z) * s
def mig(mode, alpha):
    xcm, xme, wcm = np.array(S['xc_max']), np.array(S['xc_mean']), np.array(S['w_colmax']); s = np.ones(64)
    if mode == 'sq': s = xcm ** alpha / wcm ** (1 - alpha)
    if mode == 'awq': s = xme ** alpha; s = s / np.sqrt(s.max() * s.min())
    Xs, Ws = X / s, W * s
    if mode in ('w8', 'sq'):
        dx = (xcm / s).max() / 127; Xq = np.clip(np.round(Xs / dx), -127, 127) * dx
        sw = np.abs(Ws).max(1, keepdims=True) / 127; Wq = np.clip(np.round(Ws / sw), -127, 127) * sw
        coarse = float((np.abs(Xs) < 4 * dx).mean())
    else:
        Xq = Xs; Wq = np.array([qint_asym(r, 4) for r in Ws]); dx = 0.0; coarse = 0.0
    return dict(err=rel((Xq * s) @ (Wq / s).T, Y), coarse=coarse, dx=float(dx), xmax=float(np.abs(Xs).max()), wmax=float(np.abs(Ws).max()))
out['mig'] = {}
for name, m, a in (('w8', 'w8', 0.75), ('sq', 'sq', 0.75), ('sq50', 'sq', 0.5), ('w4', 'w4', 0.5), ('awq', 'awq', 0.5)): out['mig'][name] = dict(mig(m, a), alpha=a)
json.dump(out, open(os.path.join(HERE, 'visuals_ref.json'), 'w'), indent=1)
h, r, g = out['hero'], out['rot'], out['gptq']
print('hero: per-tensor step %.4f, %d of 32 zeroed, error %.1f%%; own scale step %.4f, %d zeroed, error %.1f%%' % (h['tscale'], h['tzero'], 100 * h['terr'], h['bscale'], h['bzero'], 100 * h['berr']))
for k in r: print('rot %-8s largest %.1f median channel peak %.2f ratio %.1f; A4 per token %.1f%%, W4A4 %.1f%%, A8 %.2f%%; product max diff %.1e' % (k, r[k]['xmax'], r[k]['med'], r[k]['ratio'], 100 * r[k]['a4'], 100 * r[k]['w4a4'], 100 * r[k]['a8'], r[k]['prodDiff']))
print('gptq: RTN %s out %.1f%% w %.1f%%; GPTQ %s out %.1f%% w %.1f%%' % (rtn, 100 * g['outRTN'], 100 * g['wRTN'], Q, 100 * g['outGPTQ'], 100 * g['wGPTQ']))
print('gptq states', np.round(cur, 3).tolist())
for k, v in out['scope'].items(): print('scope %-6s' % k, '  '.join('row %d %.1f%% %d zero' % (x['row'], 100 * x['err'], x['zeros']) for x in v))
for k, v in out['mig'].items(): print('mig %-5s alpha %.2f slice error %.2f%%, within 4 steps of zero %.0f%%, largest activation %.2f' % (k, v['alpha'], 100 * v['err'], 100 * v['coarse'], v['xmax']))
