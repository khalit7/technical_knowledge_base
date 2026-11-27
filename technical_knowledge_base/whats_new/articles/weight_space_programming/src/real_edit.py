"""Measure Astra's Qwen3.5-0.8B edit (Experiment 8, run p50c) from the released diff and the public base weights.

usage (from this src/ folder; needs numpy; downloads about 15 MB into the scratch folder given, nothing into the repo):
  python3 real_edit.py <scratch dir>        -> writes inputs/real_edit.json (small; the page's Figure 3 reads it)

Inputs (both public):
  - the edit: github.com/RikiyaT/lm_understand-logs, exp8_math/runs/p50c/edit/{edit.npz,manifest.json} (CC BY 4.0);
    edit.npz holds the changed bfloat16 entries (t<i>_idx flat indices, t<i>_val new bit patterns);
  - the base tensors: Qwen/Qwen3.5-0.8B at revision 2fc0636..., read with HTTP range requests from its single
    safetensors file (only the two mlp.down_proj tensors, 1024 x 3584 bfloat16 each, 7.3 MB each).
What it computes, per edited layer (15 and 19): delta = edited - base; the direction u (top left singular vector of
delta, so delta ~ -u c^T); how close delta is to rank one; for every MLP neuron j (column w_j of down_proj, the vector
that neuron writes into the residual stream) the component u.w_j before and after; the rank of the 64 edited columns
among all 3,584 by |u.w_j|. The next article builder: delete this file unless your article has released weights.
"""
import hashlib, json, os, struct, sys, urllib.request
import numpy as np

REV = '2fc06364715b967f1860aea9cf38778875588b17'
ST = 'https://huggingface.co/Qwen/Qwen3.5-0.8B/resolve/%s/model.safetensors-00001-of-00001.safetensors' % REV
LOGS = 'https://raw.githubusercontent.com/RikiyaT/lm_understand-logs/main/exp8_math/runs/p50c/edit/'


def get(url, rng=None):
    rq = urllib.request.Request(url, headers={'User-Agent': 'kb-check'})
    if rng: rq.add_header('Range', 'bytes=%d-%d' % rng)
    return urllib.request.urlopen(rq, timeout=120).read()


def bf(bits):
    return (bits.astype(np.uint32) << 16).view(np.float32).astype(np.float64)


def main(scr):
    os.makedirs(scr, exist_ok=True)
    for f in ('edit.npz', 'manifest.json'):
        p = os.path.join(scr, f)
        if not os.path.exists(p): open(p, 'wb').write(get(LOGS + f))
    man = json.load(open(os.path.join(scr, 'manifest.json')))
    z = np.load(os.path.join(scr, 'edit.npz'))
    n = struct.unpack('<Q', get(ST, (0, 7)))[0]
    head = json.loads(get(ST, (8, 8 + n - 1)))
    out = {'source': 'lm_understand-logs exp8_math/runs/p50c/edit + Qwen/Qwen3.5-0.8B@' + REV[:7], 'layers': []}
    for i, t in enumerate(man['tensors']):
        info = head[t['name']]
        a, b = info['data_offsets']
        p = os.path.join(scr, t['name'] + '.bin')
        if not os.path.exists(p): open(p, 'wb').write(get(ST, (8 + n + a, 8 + n + b - 1)))
        raw = open(p, 'rb').read()
        assert hashlib.sha256(raw).hexdigest() == t['base_sha256'], 'base tensor hash differs'
        base = np.frombuffer(raw, dtype=np.uint16).reshape(info['shape'])
        ed = base.copy().reshape(-1); ed[z['t%d_idx' % i]] = z['t%d_val' % i]; ed = ed.reshape(base.shape)
        assert hashlib.sha256(ed.tobytes()).hexdigest() == t['edited_sha256'], 'edited tensor hash differs'
        W, E = bf(base), bf(ed)
        D = E - W
        cols = np.where(np.abs(D).sum(0) > 0)[0]
        U, S, Vt = np.linalg.svd(D[:, cols], full_matrices=False)
        u = U[:, 0]
        before, after = u @ W, u @ E                      # component of every neuron's write vector along u
        if np.dot(before[cols], -(S[0] * Vt[0])) < 0: u, before, after = -u, -before, -after
        frac = (before[cols] - after[cols]) / before[cols]   # share of each edited column's u-component removed
        rank = np.argsort(-np.abs(before))
        pos = {int(c): int(np.where(rank == c)[0][0]) for c in cols}
        norm = np.linalg.norm(W, axis=0)
        L = {'name': t['name'], 'shape': info['shape'], 'edited_columns': len(cols),
             'touched_weights': int(len(cols) * W.shape[0]), 'changed_bf16_entries': t['changed_entries'],
             'rank1_energy': float(S[0] ** 2 / (S ** 2).sum()),
             'removed_share_median': float(np.median(frac)), 'removed_share_min': float(frac.min()), 'removed_share_max': float(frac.max()),
             'edited_in_top64_by_abs_u': int(sum(1 for c in cols if pos[int(c)] < 64)),
             'edited_rank_max': int(max(pos.values())),
             'abs_u_all_median': float(np.median(np.abs(before))), 'abs_u_edited_median': float(np.median(np.abs(before[cols]))),
             'cos_edited_median_before': float(np.median(np.abs(before[cols]) / norm[cols])),
             'cos_edited_median_after': float(np.median(np.abs(after[cols]) / np.linalg.norm(E[:, cols], axis=0))),
             'rel_change_tensor': float(np.linalg.norm(D) / np.linalg.norm(W)),
             # for the figure: |u.w_j| of every neuron before the edit, sorted, rounded (3,584 numbers), and which are edited
             'abs_u_sorted': [round(float(x), 4) for x in np.abs(before)[rank]],
             'edited_sorted_pos': sorted(pos.values())}
        out['layers'].append(L)
        print(t['name'], {k: v for k, v in L.items() if k not in ('abs_u_sorted', 'edited_sorted_pos')})
    json.dump(out, open('inputs/real_edit.json', 'w'), separators=(',', ':'))


if __name__ == '__main__':
    main(sys.argv[1])
