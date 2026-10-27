"""Evaluate the toy Qwen3 variants (train.py) and export them for the page.

  uv run --with torch --with numpy python train.py eval     # model/results.json
  uv run --with torch --with numpy python train.py export   # parts/20_model_data.js and model/<v>_q.pt (6-bit weights)

Every number the page quotes about the toy comes from model/results.json, measured on the held-out test set
(train.test_set: 200 problems per length n = 1..12, drawn with their own seed; overlap with training measured).
Evaluation uses the exported 6-bit weights, the ones the page runs, unless --float is given.
"""
import base64, json, math, os, random, sys
import numpy as np
import torch
import train as T

HERE = T.HERE
VARS = list(T.VARIANTS)
BUDGETS = list(range(0, T.NMAX + 1))


def load(name, quant=True):
    p = os.path.join(HERE, 'model', name + ('_q.pt' if quant else '.pt'))
    ck = torch.load(p, weights_only=False)
    m = T.TinyQwen(ck['cfg']); m.load_state_dict(ck['state']); m.eval()
    return m, ck


def by_n(qs):
    d = {}
    for q in qs: d.setdefault(len(q), []).append(q)
    return d


def run(m, qs, mode, budget=None):
    res = []
    for n, group in sorted(by_n(qs).items()):
        outs = T.batched_decode(m, group, mode, budget)
        for q, o in zip(group, outs):
            p = T.psums(q); o = dict(o); o['q'] = q; o['correct'] = o['ans'] == p[-1]
            o['think_ok'] = o['think'] == p[:len(o['think'])]
            res.append(o)
    return res


def summary(res):
    n = len(res)
    return dict(acc=round(sum(r['correct'] for r in res) / n, 4), n=n,
                mean_think=round(sum(len(r['think']) for r in res) / n, 3),
                think_ok=round(sum(r['think_ok'] for r in res) / n, 4),
                bad=sum(r['bad'] is not None for r in res))


def per_n(res):
    out = {}
    for n in range(1, T.NMAX + 1):
        rr = [r for r in res if len(r['q']) == n]
        out[n] = round(sum(r['correct'] for r in rr) / len(rr), 4)
    return out


def evaluate(quant=True):
    test = T.test_set()
    R = {'test': dict(per_n=200, lengths=[1, T.NMAX], seed=T.TEST_SEED), 'budgets': BUDGETS, 'variants': {}}
    for v in VARS:
        m, ck = load(v, quant)
        V = {'params': ck.get('params') or T.nparams(m), 'overlap': ck.get('test_overlap'), 'mix': T.VARIANTS[v], 'log': ck.get('log')}
        modes = {}
        nothink = run(m, test, 'nothink')
        for mode in ('think', 'default'):
            r = run(m, test, mode); modes[mode] = dict(summary(r), per_n=per_n(r))
        modes['nothink'] = dict(summary(nothink), per_n=per_n(nothink))
        V['modes'] = modes
        nt_ans = {tuple(r['q']): r['ans'] for r in nothink}
        sweep = []
        for b in BUDGETS:
            r = run(m, test, 'think', b)
            # 'cut' = the page closed the thinking before the chain was complete (a chain of n running sums)
            cut = [x for x in r if x['cut'] and len(x['think']) < len(x['q'])]; fin = [x for x in r if not (x['cut'] and len(x['think']) < len(x['q']))]
            row = dict(b=b, acc=round(sum(x['correct'] for x in r) / len(r), 4), per_n=per_n(r),
                       cut=len(cut), finished=len(fin),
                       acc_finished=round(sum(x['correct'] for x in fin) / len(fin), 4) if fin else None,
                       acc_cut=round(sum(x['correct'] for x in cut) / len(cut), 4) if cut else None,
                       # among cut-off answers: equal to the last running sum written (the model "stops where it is"),
                       # and equal to its own non-thinking answer to the same question
                       cut_eq_last=round(sum(x['ans'] == (x['think'][-1] if x['think'] else None) for x in cut) / len(cut), 4) if cut else None,
                       cut_eq_nothink=round(sum(x['ans'] == nt_ans[tuple(x['q'])] for x in cut) / len(cut), 4) if cut else None,
                       mean_think=round(sum(len(x['think']) for x in r) / len(r), 3))
            # the honest baseline for a cut answer: "finish the sum from the last partial sum" needs the remaining digits;
            # compare cut accuracy with the non-thinking accuracy on problems of the remaining length (n - b + 1)
            sweep.append(row)
        V['sweep'] = sweep
        R['variants'][v] = V
        print(v, 'think', modes['think']['acc'], 'nothink', modes['nothink']['acc'], 'b0', sweep[0]['acc'], 'b4', sweep[4]['acc'], 'b12', sweep[-1]['acc'], flush=True)
    json.dump(R, open(os.path.join(HERE, 'model', 'results.json' if quant else 'results_float.json'), 'w'), indent=1)


# ---- export: matrices 6-bit per row (one base64 character per weight), vectors float16 (reference page's format) ----
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def tensor_order(c):
    names = ['emb.weight']
    for i in range(c['L']):
        p = 'blocks.%d.' % i
        names += [p + x + '.weight' for x in ('n1', 'q', 'k', 'v', 'qn', 'kn', 'o', 'n2', 'g', 'up', 'dn')]
    return names + ['nf.weight']


def quantise(state, c):
    mq, sq, vb, tmax, deq = [], [], bytearray(), [], {}
    for n in tensor_order(c):
        w = state[n].float().numpy()
        if w.ndim == 2:
            amax = float(np.abs(w).max()); tm = float('%.5g' % (amax * 1.0001)); tmax.append(tm)
            rows = []
            for row in w:
                ra = max(float(np.abs(row).max()), 1e-12)
                code = min(63, max(0, int(math.floor(-8 * math.log2(ra / tm)))))
                while code > 0 and tm * 2 ** (-code / 8) < ra: code -= 1
                s = tm * 2 ** (-code / 8) / 31
                q = np.clip(np.round(row / s), -31, 31).astype(int)
                sq.append(B64[code]); mq.append(''.join(B64[v + 32] for v in q))
                rows.append(q * s)
            deq[n] = torch.tensor(np.array(rows), dtype=torch.float32)
        else:
            h = w.astype(np.float16); vb += h.tobytes()
            deq[n] = torch.tensor(h.astype(np.float32))
    assert set(deq) == set(state), set(state) ^ set(deq)
    return ''.join(mq), ''.join(sq), base64.b64encode(bytes(vb)).decode(), tmax, deq


SHIP = ('fused', 'budget')  # weights shipped to the page; 'think' behaves like 'fused' when cut off and is measured offline only


def export():
    out = {'vocab': T.VOCAB, 'cfg': {k: T.CFG[k] for k in ('d', 'hq', 'hkv', 'hd', 'L', 'ff', 'rope')}, 'nmax': T.NMAX, 'variants': {}}
    for name in VARS:
        ck = torch.load(os.path.join(HERE, 'model', name + '.pt'), weights_only=False)
        mq, sq, vb, tmax, deq = quantise(ck['state'], ck['cfg'])
        mm = T.TinyQwen(ck['cfg']); mm.load_state_dict(deq); mm.eval()
        q = dict(ck); q['state'] = mm.state_dict()
        qp = os.path.join(HERE, 'model', name + '_q.pt')
        if not os.path.exists(qp): torch.save(q, qp)  # deterministic: an existing file is identical
        if name in SHIP:
            out['variants'][name] = {'tmax': tmax, 'm': mq, 's': sq, 'v': vb}
        print(name, 'exported', len(mq) + len(sq) + len(vb), 'chars')
    js = '// Generated by train.py export: the toy Qwen3 vocabulary, configuration and weights.\n' \
         '// Matrices are 6-bit, one base64 character per weight, with one scale character per row; vectors are float16.\n' \
         'window.TQW=' + json.dumps(out, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, 'parts', '20_model_data.js'), 'w').write(js)
    print('wrote parts/20_model_data.js', len(js), 'bytes')


def main(cmd):
    torch.set_num_threads(2)
    if cmd == 'export': export()
    else: evaluate(quant='--float' not in sys.argv)
