"""Rebuild Stage A of the winning recipe (paper v4, section 4.4 and Algorithm 1) at reduced scale, on CPU,
and measure it with the paper's own metric (bits per byte on 200 FineWeb-Edu texts, 512-token chunks).

What is the same as the paper: the donor (GPT-2 small is the paper's main donor, weight 0.725), the 28
contexts of Appendix B (Table 5), the log-probability clip of +-25, the averaging of per-context
log-softmaxes, the unigram anchor u = column mean, the rank-671 randomized SVD with oversampling 32,
one power iteration and a fixed seed, and the logits u/T_u + rank-r part/T_b.
What differs: one donor instead of six, uniform context weights instead of the variance/naturalness row
weights, no Stage B, and the logits are computed directly instead of through the 14-layer target
(the paper says the target computes approximately the same thing, section 4.4). The text sample is a
different 200-text FineWeb-Edu sample (theirs is not pinned).

usage:  OMP_NUM_THREADS=3 uv run --with torch --with transformers python stage_a.py [bench|all]
Writes model/stage_a.json (all measurements) and model/stage_a.log; large matrices go to $AGORA_DATA.
"""
import json, math, os, sys, time
import numpy as np
import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

torch.set_num_threads(int(os.environ.get('OMP_NUM_THREADS', '3')))
torch.manual_seed(0)
HERE = os.path.dirname(os.path.abspath(__file__))
D = os.environ.get('AGORA_DATA', os.path.expanduser('~/.cache/agora_toy'))
OUT = os.path.join(HERE, 'model', 'stage_a.json')
LOG = open(os.path.join(HERE, 'model', 'stage_a.log'), 'a')
V = 50257
RANK, OVER = 671, 32
T_B, T_U = 0.9314, 1.00459          # the paper's tuned temperatures (Table 5)


def log(*a):
    s = time.strftime('%H:%M:%S ') + ' '.join(str(x) for x in a)
    print(s, flush=True); LOG.write(s + '\n'); LOG.flush()


def load_res():
    return json.load(open(OUT)) if os.path.exists(OUT) else {}


def save_res(r):
    json.dump(r, open(OUT, 'w'), indent=1)


tok = GPT2TokenizerFast.from_pretrained('openai-community/gpt2')
model = GPT2LMHeadModel.from_pretrained('openai-community/gpt2').eval()

# The 28 contexts of Appendix B, Table 5
SINGLE = [' ', '\n', '.', ',', '?', '!', ';', ':', '"', ' the', ' of', ' a', ' to', ' in', ' is', ' and', ' for', ' on', ' it',
          ' that', ' was', ' I']
TWO = ['. The', ', and', '. This', ', or']
CTX28 = [[], [50256]] + [tok.encode(s) for s in SINGLE] + [tok.encode(s) for s in TWO]
assert all(len(c) == 1 for c in CTX28[2:24]) and all(len(c) == 2 for c in CTX28[24:]), [len(c) for c in CTX28]
CTX = {'c1': [[]], 'c28': CTX28}


@torch.no_grad()
def rows_logsoftmax(ctxs, v0, v1):
    """Mean over contexts of clip(log softmax GPT2(p + [v]), +-25) for source tokens v0..v1-1, as float32."""
    vs = torch.arange(v0, v1)
    acc = torch.zeros(v1 - v0, V)
    for p in ctxs:
        ids = torch.cat([torch.tensor(p, dtype=torch.long).repeat(len(vs), 1), vs[:, None]], 1)
        h = model.transformer(input_ids=ids).last_hidden_state[:, -1]
        lg = model.lm_head(h)
        acc += torch.log_softmax(lg.float(), -1).clamp(-25, 25)
    return acc / len(ctxs)


def build(name, B=256):
    """Write M (V x V float32) to a memmap; return its path, the column mean u and sum of squared entries."""
    path = os.path.join(D, 'M_%s.f32' % name)
    done = os.path.join(D, 'M_%s.done.npz' % name)
    if os.path.exists(done):
        z = np.load(done); return path, z['u'], float(z['sq'])
    M = np.lib.format.open_memmap(path + '.npy', mode='w+', dtype=np.float32, shape=(V, V))
    colsum = np.zeros(V, np.float64); sq = 0.0; t0 = time.time()
    for v0 in range(0, V, B):
        v1 = min(V, v0 + B)
        R = rows_logsoftmax(CTX[name], v0, v1).numpy()
        M[v0:v1] = R; colsum += R.sum(0, dtype=np.float64); sq += float((R.astype(np.float64) ** 2).sum())
        if (v0 // B) % 20 == 0:
            el = time.time() - t0; log('build', name, v1, '/', V, '%.0fs elapsed, eta %.0fs' % (el, el / v1 * (V - v1)))
    M.flush(); del M
    u = (colsum / V).astype(np.float32)
    np.savez(done, u=u, sq=sq)
    return path, u, sq


def randsvd(name, path, u, B=2048):
    """Randomized SVD of C = M - 1 u^T (Halko et al. 2011): rank 671, oversampling 32, one power iteration, seed 0."""
    out = os.path.join(D, 'svd_%s.npz' % name)
    if os.path.exists(out):
        z = np.load(out); return z['U'], z['S'], z['Vt']
    M = np.load(path + '.npy', mmap_mode='r')
    k = RANK + OVER
    rng = np.random.default_rng(0)
    Om = rng.standard_normal((V, k)).astype(np.float32)
    ut = torch.from_numpy(u)

    def C_times(X):            # C @ X, streamed over row blocks
        Xt = torch.from_numpy(X); Y = np.empty((V, X.shape[1]), np.float32)
        for a in range(0, V, B):
            blk = torch.from_numpy(np.ascontiguousarray(M[a:a + B])) - ut
            Y[a:a + B] = (blk @ Xt).numpy()
        return Y

    def Ct_times(Y):           # C^T @ Y, streamed over row blocks
        Z = torch.zeros(V, Y.shape[1]); Yt = torch.from_numpy(Y)
        for a in range(0, V, B):
            blk = torch.from_numpy(np.ascontiguousarray(M[a:a + B])) - ut
            Z += blk.T @ Yt[a:a + B]
        return Z.numpy()

    t0 = time.time()
    Y = C_times(Om); log('svd', name, 'C@Omega done %.0fs' % (time.time() - t0))
    Q, _ = np.linalg.qr(Y)
    Z = Ct_times(Q); Z, _ = np.linalg.qr(Z); log('svd', name, 'power iteration half 1 %.0fs' % (time.time() - t0))
    Y = C_times(Z); Q, _ = np.linalg.qr(Y); log('svd', name, 'power iteration half 2 %.0fs' % (time.time() - t0))
    Bm = Ct_times(Q).T            # B = Q^T C  (k x V)
    Ub, S, Vt = np.linalg.svd(Bm, full_matrices=False)
    U = (Q @ Ub)[:, :RANK].astype(np.float32); S = S[:RANK].astype(np.float32); Vt = Vt[:RANK].astype(np.float32)
    np.savez(out, U=U, S=S, Vt=Vt)
    log('svd', name, 'done %.0fs, top singular values' % (time.time() - t0), S[:5])
    return U, S, Vt


def eval_chunks():
    texts = json.load(open(os.path.join(D, 'eval_texts.json')))
    nbytes = sum(len(t.encode('utf-8')) for t in texts)
    chunks = []
    for t in texts:
        ids = tok.encode(t)
        for a in range(0, len(ids), 512):
            c = ids[a:a + 512]
            if len(c) >= 2: chunks.append(c)
    return chunks, nbytes


@torch.no_grad()
def eval_gpt2(chunks, nbytes):
    nats = 0.0; n = 0
    for c in chunks:
        ids = torch.tensor([c])
        lg = model(input_ids=ids).logits[0, :-1].float()
        nats += float(torch.nn.functional.cross_entropy(lg, ids[0, 1:], reduction='sum')); n += len(c) - 1
    return nats / math.log(2) / nbytes, n


def bigram_pairs(chunks):
    prev = np.concatenate([np.array(c[:-1]) for c in chunks]); nxt = np.concatenate([np.array(c[1:]) for c in chunks])
    return prev, nxt


def eval_rows(row_logits_fn, prev, nxt, nbytes, B=1024):
    """Sum of -log2 p(next | prev) where row_logits_fn(vs) gives the logits rows for source tokens vs."""
    uniq, inv = np.unique(prev, return_inverse=True)
    bits = np.zeros(len(prev))
    for a in range(0, len(uniq), B):
        vs = uniq[a:a + B]
        L = torch.log_softmax(torch.from_numpy(row_logits_fn(vs)).double(), -1).numpy()
        sel = np.where((inv >= a) & (inv < a + B))[0]
        bits[sel] = -L[inv[sel] - a, nxt[sel]] / math.log(2)
    return float(bits.sum() / nbytes), bits


def main(mode):
    res = load_res()
    if mode == 'bench':
        t0 = time.time(); rows_logsoftmax(CTX['c28'][:4], 0, 256); dt = time.time() - t0
        log('bench: 4 contexts x 256 tokens %.2fs -> full c28 build eta %.0f min' % (dt, dt / 4 * 28 * V / 256 / 60)); return
    chunks, nbytes = eval_chunks()
    prev, nxt = bigram_pairs(chunks)
    res['sample'] = {'texts': 200, 'bytes': nbytes, 'chunks': len(chunks), 'predicted_tokens': int(len(prev)),
                     'bytes_per_token': nbytes / len(prev)}
    res['uniform_bpb'] = math.log2(V) * len(prev) / nbytes
    log('sample', res['sample'], 'uniform bpb %.4f' % res['uniform_bpb'])
    if 'gpt2_bpb' not in res:
        t0 = time.time(); res['gpt2_bpb'], _ = eval_gpt2(chunks, nbytes); log('gpt2 full-context bpb %.4f (%.0fs)' % (res['gpt2_bpb'], time.time() - t0))
        save_res(res)
    for name in ('c1', 'c28'):
        key = 'stage_a_' + name
        if key in res and 'ranks' in res[key]: continue
        path, u, sq = build(name)
        M = np.load(path + '.npy', mmap_mode='r')
        cn2 = sq - V * float((u.astype(np.float64) ** 2).sum())          # ||C||_F^2
        U, S, Vt = randsvd(name, path, u)
        r = {'contexts': len(CTX[name]), 'C_fro2': cn2}
        r['energy'] = {str(k): float((S[:k].astype(np.float64) ** 2).sum() / cn2) for k in (1, 4, 16, 64, 256, 671)}
        # unigram anchor alone, the full (unfactorized) table, then the factorized model at several ranks
        r['unigram_bpb'], _ = eval_rows(lambda vs: np.tile(u, (len(vs), 1)), prev, nxt, nbytes)
        r['full_bpb'], _ = eval_rows(lambda vs: np.ascontiguousarray(M[vs]), prev, nxt, nbytes)
        r['ranks'] = {}
        for k in (1, 4, 16, 64, 256, 671):
            for tag, tb, tu in (('T1', 1.0, 1.0), ('Tpaper', T_B, T_U)):
                f = lambda vs, k=k, tb=tb, tu=tu: u[None, :] / tu + ((U[vs, :k] * S[:k]) @ Vt[:k]) / tb
                r['ranks'].setdefault(str(k), {})[tag], _ = eval_rows(f, prev, nxt, nbytes)
            log(name, 'rank', k, r['ranks'][str(k)])
        log(name, 'unigram %.4f full %.4f' % (r['unigram_bpb'], r['full_bpb']))
        res[key] = r; save_res(res)
    save_res(res); log('all done')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'all')
