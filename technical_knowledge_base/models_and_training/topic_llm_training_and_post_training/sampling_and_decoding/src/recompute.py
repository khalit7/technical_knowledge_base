"""Recompute every number the page states, from inputs/*.json, and check the page's tail approximation
against the exact full-vocabulary result.

  python3 recompute.py            # from the saved data only (stdlib)
  OMP_NUM_THREADS=2 uv run --with torch --with transformers python recompute.py --exact
                                  # also re-runs Qwen2.5-0.5B-Instruct for exact full-vocabulary counts

The sampler here is a port of the page's JS (parts/25_js_sampler.js): top 100 tokens exact, the other
151,836 summarised as [logit, count] bins (make_page_data.py).
"""
import json, math, os, sys
H = os.path.dirname(os.path.abspath(__file__))
I = lambda f: json.load(open(os.path.join(H, 'inputs', f)))


def page_pos(x, NK=60):
    import collections
    tail = collections.defaultdict(int)
    for lg in x['lg'][NK:]:
        tail[round(lg * 20) / 20] += 1
    for lg, c in x['tail']:
        tail[round(lg * 10) / 10] += c
    E = [{'l': l, 'n': 1, 'c': c} for l, c in zip(x['lg'][:NK], x['ctx'][:NK])]
    E += [{'l': l, 'n': n, 'c': 0} for l, n in sorted(tail.items(), key=lambda kv: -kv[0])]
    return E


def probs(E, z, keep):
    m = max(z[i] for i in range(len(E)) if keep[i] > 0)
    w = [keep[i] * math.exp(z[i] - m) for i in range(len(E))]
    s = sum(w)
    return [x / s for x in w]  # mass of each entry (all its kept tokens)


def run(E, T=1.0, top_k=0, top_p=1.0, min_p=0.0, typ=1.0, order='hf'):
    keep = [e['n'] for e in E]
    z = [e['l'] for e in E]
    if order == 'hf':
        z = [v / T for v in z]

    def f_topk():
        if not top_k: return
        left = top_k
        for i in sorted(range(len(E)), key=lambda i: -z[i]):
            k = min(keep[i], left); keep[i] = k; left -= k

    def f_topp():
        if top_p >= 1: return
        P = probs(E, z, keep); cum = 0
        for i in sorted(range(len(E)), key=lambda i: -z[i]):
            if keep[i] == 0: continue
            per = P[i] / keep[i]
            if cum >= top_p: keep[i] = 0; continue
            need = math.ceil((top_p - cum) / per - 1e-9)
            k = min(keep[i], max(1, need)); cum += per * k; keep[i] = k

    def f_minp():
        if min_p <= 0: return
        P = probs(E, z, keep)
        pmax = max(P[i] / keep[i] for i in range(len(E)) if keep[i])
        for i in range(len(E)):
            if keep[i] and P[i] / keep[i] < min_p * pmax: keep[i] = 0

    def f_typ():
        if typ >= 1: return
        P = probs(E, z, keep)
        Hn = -sum(P[i] * math.log(P[i] / keep[i]) for i in range(len(E)) if keep[i])
        cum = 0
        for i in sorted([i for i in range(len(E)) if keep[i]], key=lambda i: abs(-math.log(P[i] / keep[i]) - Hn)):
            per = P[i] / keep[i]
            if cum >= typ: keep[i] = 0; continue
            need = math.ceil((typ - cum) / per - 1e-9)
            k = min(keep[i], max(1, need)); cum += per * k; keep[i] = k

    seq = [f_topk, f_topp, f_minp, f_typ] if order == 'hf' else [f_topk, f_typ, f_topp, f_minp]
    pre = probs(E, z, [e['n'] for e in E])
    for f in seq: f()
    if order != 'hf':
        z = [v / T for v in z]
    kept = sum(keep)
    mass = sum(pre[i] * keep[i] / E[i]['n'] for i in range(len(E)))
    P = probs(E, z, keep)
    Hf = -sum(P[i] * math.log(P[i] / keep[i]) for i in range(len(E)) if keep[i])
    return {'kept': kept, 'mass': mass, 'eff': math.exp(Hf)}


def lab_checks():
    lab = I('lab_logits.json')
    print('== Sampler lab: stored data')
    for p in lab['prompts']:
        for j, x in enumerate(p['pos']):
            E = page_pos(x)
            r = run(E)
            # T=1 mass of the top token from the page approximation against the exact stored value
            z = [e['l'] for e in E]
            m = max(z); s = sum(e['n'] * math.exp(e['l'] - m) for e in E)
            approx_top = math.exp(E[0]['l'] - m) / s
            assert abs(approx_top - x['p_top']) < 2e-3, (p['key'], j, approx_top, x['p_top'])
    print('top-token probability at T=1 from the binned tail matches the exact softmax within 0.002 at all 32 positions')
    print('== Reading animation defaults (story position 1, capital position 5)')
    for key, j in [('story', 1), ('capital', 5)]:
        x = [p for p in lab['prompts'] if p['key'] == key][0]['pos'][j]
        E = page_pos(x)
        for T in (1.0, 1.5, 2.0):
            a = run(E, T=T, top_p=0.9); b = run(E, T=T, min_p=0.1)
            print(f'  {key:8s} T={T}: top-p 0.9 keeps {a["kept"]:>7} tokens (eff {a["eff"]:.1f}); '
                  f'min-p 0.1 keeps {b["kept"]:>4} (eff {b["eff"]:.1f})')
    print('== Order matters: llama.cpp defaults (top-k 40, top-p 0.95, min-p 0.05, T 0.8 last) against the same values temperature-first')
    for key, j in [('story', 1), ('cat', 2)]:
        x = [p for p in lab['prompts'] if p['key'] == key][0]['pos'][j]
        E = page_pos(x)
        for T in (0.8, 1.5, 3.0):
            a = run(E, T=T, top_k=40, top_p=0.95, min_p=0.05, order='llama')
            b = run(E, T=T, top_k=40, top_p=0.95, min_p=0.05, order='hf')
            print(f'  {key} T={T}: temperature last keeps {a["kept"]}, temperature first keeps {b["kept"]}')


def exact_checks():
    import torch
    torch.set_num_threads(2)
    from transformers import AutoTokenizer, AutoModelForCausalLM
    sys.path.insert(0, H)
    from make_data import filt
    lab = I('lab_logits.json')
    tok = AutoTokenizer.from_pretrained(lab['model'])
    m = AutoModelForCausalLM.from_pretrained(lab['model'], dtype=torch.float32).eval()
    print('== Exact full-vocabulary counts (HF order), against the page approximation')
    for key, j in [('story', 1), ('capital', 5)]:
        p = [q for q in lab['prompts'] if q['key'] == key][0]
        ids = tok.apply_chat_template([{'role': 'user', 'content': p['text']}], add_generation_prompt=True)
        ids = list(ids if isinstance(ids, list) else ids['input_ids'])
        ids += tok(p['pos'][j]['so_far'], add_special_tokens=False).input_ids if p['pos'][j]['so_far'] else []
        with torch.no_grad():
            lg = m(torch.tensor([ids])).logits[0, -1].float()
        E = page_pos(p['pos'][j])
        for T in (1.0, 1.5, 2.0):
            for kw in ({'top_p': 0.9}, {'min_p': 0.1}):
                x = filt(lg, T=T, **kw)
                exact = int(torch.isfinite(x).sum())
                approx = run(E, T=T, **kw)['kept']
                print(f'  {key} T={T} {kw}: exact {exact}, page {approx}')


def degen_checks():
    try:
        d = I('degeneration.json')
    except FileNotFoundError:
        print('degeneration.json not yet made'); return
    hum = sum(p['human_lp'] for p in d['passages']) / len(d['passages'])
    print('== Degeneration study (GPT-2 small, 4 passages x 48-token prompts, 48 new tokens)')
    print(f'  human continuation: mean log-prob per token {hum:.3f}, perplexity {math.exp(-hum):.2f}')
    for s in d['settings']:
        print(f'  {s["label"]:24s} logp {s["mean_lp"]:.3f}  ppl {math.exp(-s["mean_lp"]):7.2f}  rep4 {s["rep4"]:.3f}  distinct-2 {s["distinct2"]:.3f}')


def beam_checks():
    b = I('beam_tree.json')
    last = [c for c in b['steps'][-1] if c['kept']]
    best = max(c['cum'] for c in last)
    g = b['greedy'][-1]['cum']
    print('== Beam tree (GPT-2 small, B=3, 6 steps)')
    print(f'  best beam log-prob {best:.3f} (p = {math.exp(best):.2e}); greedy {g:.3f} (p = {math.exp(g):.2e}); ratio {math.exp(best - g):.1f}x')
    assert abs(sum(x['lp'] for x in b['greedy']) - g) < 1e-3


def json_checks():
    j = I('json_constrained.json')
    import re
    print('== Constrained JSON (Qwen2.5-0.5B-Instruct)')
    print('  unconstrained:', repr(j['free']))
    print('  constrained  :', repr(j['constrained']))
    worst = min(j['steps'], key=lambda s: s['mass_allowed'])
    print(f'  {len(j["steps"])} steps; lowest allowed mass {worst["mass_allowed"]} at prefix {worst["prefix"]!r}; '
          f'allowed set sizes {[s["n_allowed"] for s in j["steps"]]} of {j["vocab"]}')
    json.loads(j['constrained'])
    try:
        json.loads(j['free']); print('  unconstrained parses as JSON')
    except Exception as e:
        print('  unconstrained does not parse as JSON:', e)


def spec_formula():
    # Leviathan et al. (2023) eq. 1: expected tokens per target pass with gamma drafted tokens, acceptance alpha
    E = lambda a, g: (1 - a ** (g + 1)) / (1 - a)
    print('== Speculative decoding: expected tokens per target pass, (1 - a^(g+1)) / (1 - a)')
    for a in (0.6, 0.8, 0.9):
        print('  alpha', a, [round(E(a, g), 2) for g in (1, 2, 3, 4, 5, 7)])


if __name__ == '__main__':
    lab_checks(); beam_checks(); json_checks(); degen_checks(); spec_formula()
    if '--exact' in sys.argv:
        exact_checks()
