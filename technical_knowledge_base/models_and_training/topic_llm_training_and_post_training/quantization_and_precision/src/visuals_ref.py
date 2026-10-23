"""Python reference for the Reading visuals added on 2026-10-23 (parts/22_js_qviz.js); check_visuals.mjs compares the two.
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
json.dump(out, open(os.path.join(HERE, 'visuals_ref.json'), 'w'), indent=1)
h, r, g = out['hero'], out['rot'], out['gptq']
print('hero: per-tensor step %.4f, %d of 32 zeroed, error %.1f%%; own scale step %.4f, %d zeroed, error %.1f%%' % (h['tscale'], h['tzero'], 100 * h['terr'], h['bscale'], h['bzero'], 100 * h['berr']))
for k in r: print('rot %-8s largest %.1f median channel peak %.2f ratio %.1f; A4 per token %.1f%%, W4A4 %.1f%%, A8 %.2f%%; product max diff %.1e' % (k, r[k]['xmax'], r[k]['med'], r[k]['ratio'], 100 * r[k]['a4'], 100 * r[k]['w4a4'], 100 * r[k]['a8'], r[k]['prodDiff']))
print('gptq: RTN %s out %.1f%% w %.1f%%; GPTQ %s out %.1f%% w %.1f%%' % (rtn, 100 * g['outRTN'], 100 * g['wRTN'], Q, 100 * g['outGPTQ'], 100 * g['wGPTQ']))
print('gptq states', np.round(cur, 3).tolist())
