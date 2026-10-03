"""Offline data for the Sampling and Decoding page: real logits and real generations.

Run from this folder (threads capped at 2):
  OMP_NUM_THREADS=2 uv run --with torch --with transformers --with regex python make_data.py [lab|degen|beam|json|all]

Models (both small and open, cached by Hugging Face):
  - Qwen/Qwen2.5-0.5B-Instruct (Apache 2.0): the sampler lab and constrained decoding.
  - openai-community/gpt2 (124M, MIT): the degeneration study and the beam tree, the model family
    Holtzman et al. (2019) used (they used GPT-2 Large; this is GPT-2 small).
Outputs go to inputs/*.json. Everything is deterministic (fixed seeds, float32, CPU).
"""
import json, math, os, sys, collections
import torch
torch.set_num_threads(2)
from transformers import AutoTokenizer, AutoModelForCausalLM

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'inputs')
QWEN = 'Qwen/Qwen2.5-0.5B-Instruct'
GPT2 = 'openai-community/gpt2'


def load(name):
    tok = AutoTokenizer.from_pretrained(name)
    m = AutoModelForCausalLM.from_pretrained(name, torch_dtype=torch.float32)
    m.eval()
    return tok, m


def r2(x):
    return round(float(x), 2)


@torch.no_grad()
def next_logits(m, ids):
    return m(torch.tensor([ids])).logits[0, -1].float()


def tail_hist(lg, top_idx, bins=160):
    """Histogram of every logit outside the top-K: counts and bin centres, so the page can
    approximate the tail's softmax mass at any temperature."""
    mask = torch.ones_like(lg, dtype=torch.bool)
    mask[top_idx] = False
    rest = lg[mask]
    lo, hi = float(rest.min()), float(rest.max())
    edges = torch.linspace(lo, hi + 1e-6, bins + 1)
    cnt = torch.histc(rest, bins=bins, min=lo, max=hi + 1e-6)
    # use the mean logit inside each bin as its centre (exact softmax mass at T=1 needs log-mean-exp; keep both)
    centres, lme = [], []
    for b in range(bins):
        sel = rest[(rest >= edges[b]) & (rest < edges[b + 1])]
        if len(sel) == 0:
            continue
        centres.append([r2(sel.mean()), int(len(sel))])
    return centres


def tokstr(tok, i):
    s = tok.decode([i])
    return s


# ---------------------------------------------------------------- lab
def lab():
    tok, m = load(QWEN)
    prompts = [
        ('capital', 'What is the capital of Australia? Answer in one short sentence.'),
        ('story', 'Write the opening sentence of a short story about a lighthouse keeper.'),
        ('cat', 'Suggest one name for a grey kitten. Reply with just the name and one reason.'),
        ('pattern', 'Continue this pattern for three more items: red, blue, red, blue, red,'),
    ]
    K = 200
    out = {'model': QWEN, 'note': 'Next-token logits at each of the first 8 positions of the greedy reply, '
           'chat template applied (default system prompt). Top-200 logits per position; the other '
           'tokens summarised as a histogram [mean logit, count] for tail mass.', 'vocab': None, 'prompts': []}
    for key, text in prompts:
        msgs = [{'role': 'user', 'content': text}]
        ids = tok.apply_chat_template(msgs, add_generation_prompt=True)
        ids = list(ids if isinstance(ids, list) else ids['input_ids'])
        n_prompt = len(ids)
        pos = []
        for step in range(8):
            lg = next_logits(m, ids)
            out['vocab'] = int(lg.shape[0])
            v, ix = torch.topk(lg, K)
            cnt = collections.Counter(ids)
            p1 = torch.softmax(lg, -1)
            ent = float(-(p1 * torch.log(p1.clamp_min(1e-30))).sum())
            pos.append({
                'so_far': tok.decode(ids[n_prompt:]),
                'tok': [tokstr(tok, int(i)) for i in ix],
                'id': [int(i) for i in ix],
                'lg': [r2(x) for x in v],
                'ctx': [cnt.get(int(i), 0) for i in ix],
                'tail': tail_hist(lg, ix),
                'H': round(ent, 4),
                'p_top': round(float(p1[ix[0]]), 6),
                'mass_topK': round(float(p1[ix].sum()), 6),
            })
            ids = ids + [int(ix[0])]
        out['prompts'].append({'key': key, 'text': text, 'pos': pos,
                               'greedy_reply': tok.decode(ids[n_prompt:])})
    json.dump(out, open(os.path.join(OUT, 'lab_logits.json'), 'w'), ensure_ascii=True)
    print('lab', os.path.getsize(os.path.join(OUT, 'lab_logits.json')))


# ---------------------------------------------------------------- degeneration (GPT-2)
def passages():
    """Four paragraphs of Jerome K. Jerome, Three Men in a Boat (1889, public domain, Project Gutenberg #308).
    Em-dashes in the source are replaced by commas (the knowledge base uses none)."""
    p = os.path.join(OUT, 'three_men_in_a_boat_passages.json')
    return json.load(open(p))


def filt(lg, T=1.0, top_k=0, top_p=1.0, min_p=0.0):
    """HF transformers order: temperature, top-k, top-p, min-p (each on the renormalised survivors)."""
    x = lg / T
    if top_k:
        kth = torch.topk(x, top_k).values[-1]
        x = torch.where(x < kth, torch.full_like(x, -float('inf')), x)
    if top_p < 1.0:
        s, ix = torch.sort(x, descending=True)
        c = torch.softmax(s, -1).cumsum(-1)
        rm = c - torch.softmax(s, -1) >= top_p  # keep the smallest prefix whose mass reaches p
        s[rm] = -float('inf')
        x = torch.full_like(x, -float('inf')).scatter(0, ix, s)
    if min_p > 0:
        p = torch.softmax(x, -1)
        x = torch.where(p < min_p * p.max(), torch.full_like(x, -float('inf')), x)
    return x


@torch.no_grad()
def sample_cont(m, ids, n_new, g, **kw):
    past = None
    out = []
    cur = torch.tensor([ids])
    lp_raw = 0.0
    for _ in range(n_new):
        o = m(cur, past_key_values=past, use_cache=True)
        past = o.past_key_values
        lg = o.logits[0, -1].float()
        if kw.get('greedy'):
            t = int(lg.argmax())
        else:
            x = filt(lg, kw.get('T', 1.0), kw.get('top_k', 0), kw.get('top_p', 1.0), kw.get('min_p', 0.0))
            t = int(torch.multinomial(torch.softmax(x, -1), 1, generator=g))
        lp_raw += float(torch.log_softmax(lg, -1)[t])
        out.append(t)
        cur = torch.tensor([[t]])
    return out, lp_raw


@torch.no_grad()
def score(m, ctx, cont):
    ids = torch.tensor([ctx + cont])
    lg = m(ids).logits[0, len(ctx) - 1:-1].float()
    return float(torch.log_softmax(lg, -1).gather(1, torch.tensor(cont)[:, None]).sum())


def ngrams(t, n):
    return [tuple(t[i:i + n]) for i in range(len(t) - n + 1)]


def degen():
    tok, m = load(GPT2)
    ps = passages()
    NP, NC, NS = 48, 48, 16
    settings = [
        ('greedy', 'Greedy', {'greedy': True}),
        ('beam', 'Beam search, 4 beams', {'beam': 4}),
        ('t07p9', 'T 0.7, top-p 0.9', {'T': 0.7, 'top_p': 0.9}),
        ('pure', 'Pure sampling, T 1', {'T': 1.0}),
        ('k40', 'T 1, top-k 40', {'T': 1.0, 'top_k': 40}),
        ('p95', 'T 1, top-p 0.95', {'T': 1.0, 'top_p': 0.95}),
        ('m01', 'T 1, min-p 0.1', {'T': 1.0, 'min_p': 0.1}),
        ('t15p95', 'T 1.5, top-p 0.95', {'T': 1.5, 'top_p': 0.95}),
        ('t15m01', 'T 1.5, min-p 0.1', {'T': 1.5, 'min_p': 0.1}),
        ('t2p95', 'T 2, top-p 0.95', {'T': 2.0, 'top_p': 0.95}),
        ('t2m01', 'T 2, min-p 0.1', {'T': 2.0, 'min_p': 0.1}),
        ('t3m01', 'T 3, min-p 0.1', {'T': 3.0, 'min_p': 0.1}),
    ]
    res = {'model': GPT2, 'n_prompt_tokens': NP, 'n_new': NC, 'n_samples': NS, 'passages': [], 'settings': []}
    ctxs = []
    for p in ps:
        ids = tok(p['text']).input_ids
        ctx, human = ids[:NP], ids[NP:NP + NC]
        ctxs.append((ctx, human))
        res['passages'].append({'prompt': tok.decode(ctx), 'human': tok.decode(human),
                                'human_lp': score(m, ctx, human) / NC})
    for key, label, kw in settings:
        g = torch.Generator().manual_seed(1234)
        rows = []
        for pi, (ctx, human) in enumerate(ctxs):
            if kw.get('beam'):
                o = m.generate(torch.tensor([ctx]), max_new_tokens=NC, min_new_tokens=NC, num_beams=kw['beam'],
                               do_sample=False, early_stopping=False, pad_token_id=tok.eos_token_id)
                cont = o[0, len(ctx):].tolist()
                samples = [(cont, score(m, ctx, cont))]
            elif kw.get('greedy'):
                samples = [sample_cont(m, ctx, NC, g, greedy=True)]
            else:
                samples = [sample_cont(m, ctx, NC, g, **kw) for _ in range(NS)]
            for cont, lp in samples:
                rows.append({'p': pi, 'text': tok.decode(cont), 'lp': lp / NC,
                             'rep4': 1 - len(set(ngrams(cont, 4))) / max(1, len(ngrams(cont, 4))),
                             'ids': cont})
        # diversity across samples of the same prompt: distinct-2 over the pooled samples
        d2 = []
        for pi in range(len(ctxs)):
            pool = [r['ids'] for r in rows if r['p'] == pi]
            grams = [x for c in pool for x in ngrams(c, 2)]
            d2.append(len(set(grams)) / len(grams))
        res['settings'].append({'key': key, 'label': label, 'kw': kw,
                                'mean_lp': sum(r['lp'] for r in rows) / len(rows),
                                'rep4': sum(r['rep4'] for r in rows) / len(rows),
                                'distinct2': sum(d2) / len(d2),
                                'samples': [{k: v for k, v in r.items() if k != 'ids'} for r in rows]})
        print(key, round(res['settings'][-1]['mean_lp'], 3), round(res['settings'][-1]['rep4'], 3),
              round(res['settings'][-1]['distinct2'], 3))
    print('human', sum(p['human_lp'] for p in res['passages']) / len(ps))
    json.dump(res, open(os.path.join(OUT, 'degeneration.json'), 'w'), ensure_ascii=True)
    print('degen', os.path.getsize(os.path.join(OUT, 'degeneration.json')))


# ---------------------------------------------------------------- beam tree (GPT-2)
@torch.no_grad()
def beam():
    tok, m = load(GPT2)
    ps = passages()
    ctx = tok(ps[0]['text']).input_ids[:48]
    B, W, STEPS = 3, 3, 6
    beams = [(ctx[:], 0.0, -1)]  # ids, cum logprob, parent index in previous step
    steps = []
    for s in range(STEPS):
        cands = []
        for bi, (ids, lp, _) in enumerate(beams):
            l = torch.log_softmax(next_logits(m, ids), -1)
            v, ix = torch.topk(l, W)
            for j in range(W):
                cands.append({'from': bi, 'tok': tokstr(tok, int(ix[j])), 'lp': float(v[j]), 'cum': lp + float(v[j]),
                              'ids': ids + [int(ix[j])]})
        order = sorted(range(len(cands)), key=lambda i: -cands[i]['cum'])
        keep = order[:B]
        for i, c in enumerate(cands):
            c['kept'] = i in keep
            c['rank'] = keep.index(i) if i in keep else None
        steps.append([{k: (round(v, 4) if isinstance(v, float) else v) for k, v in c.items() if k != 'ids'} for c in cands])
        beams = [(cands[i]['ids'], cands[i]['cum'], cands[i]['from']) for i in keep]
    # greedy path over the same steps
    ids, cum, gpath = ctx[:], 0.0, []
    for s in range(STEPS):
        l = torch.log_softmax(next_logits(m, ids), -1)
        t = int(l.argmax())
        cum += float(l[t])
        v3, i3 = torch.topk(l, W)
        gpath.append({'tok': tokstr(tok, t), 'lp': round(float(l[t]), 4), 'cum': round(cum, 4),
                      'alt': [[tokstr(tok, int(i3[j])), round(float(v3[j]), 4)] for j in range(W)]})
        ids.append(t)
    # longer runs: greedy and beam over 80 tokens to show the loop
    long = {}
    g = m.generate(torch.tensor([ctx]), max_new_tokens=80, do_sample=False, pad_token_id=tok.eos_token_id)
    long['greedy'] = tok.decode(g[0, len(ctx):])
    b = m.generate(torch.tensor([ctx]), max_new_tokens=80, num_beams=4, do_sample=False, pad_token_id=tok.eos_token_id)
    long['beam4'] = tok.decode(b[0, len(ctx):])
    gs = torch.Generator().manual_seed(7)
    cont, _ = sample_cont(m, ctx, 80, gs, T=1.0, top_p=0.95)
    long['p95'] = tok.decode(cont)
    out = {'model': GPT2, 'prompt': tok.decode(ctx), 'B': B, 'W': W, 'steps': steps, 'greedy': gpath, 'long': long}
    json.dump(out, open(os.path.join(OUT, 'beam_tree.json'), 'w'), ensure_ascii=True)
    print('beam final', [round(x[1], 3) for x in beams], 'greedy', round(cum, 3))


# ---------------------------------------------------------------- constrained JSON (Qwen)
@torch.no_grad()
def jsonc():
    import regex
    tok, m = load(QWEN)
    WS = r'[ \n]{0,2}'
    PAT = (r'\{' + WS + r'"name"' + WS + ':' + WS + r'"[A-Za-z .\-]{1,40}"' + WS + ',' + WS +
           r'"age"' + WS + ':' + WS + r'(0|[1-9][0-9]{0,2})' + WS + r'\}')
    rx = regex.compile(PAT)
    text = 'Extract the person as JSON with the keys "name" and "age". Text: Mara Lind, 34, pilots the night ferry between two islands.'
    msgs = [{'role': 'user', 'content': text}]
    ids = tok.apply_chat_template(msgs, add_generation_prompt=True)
    ids = list(ids if isinstance(ids, list) else ids['input_ids'])
    eos = set([tok.eos_token_id, tok.convert_tokens_to_ids('<|im_end|>')])
    vocab = [tok.decode([i]) for i in range(len(tok))]
    V = len(vocab)
    def run(constrained):
        cur, prefix, steps, valid = ids[:], '', [], True
        for s in range(60):
            lg = next_logits(m, cur)[:V]
            p = torch.softmax(lg, -1)
            allowed = torch.zeros(V, dtype=torch.bool)
            if valid:
                done = rx.fullmatch(prefix) is not None
                for i, t in enumerate(vocab):
                    if i in eos:
                        allowed[i] = done
                    elif t and rx.fullmatch(prefix + t, partial=True):
                        allowed[i] = True
            v, ix = torch.topk(lg, 12)
            pick = int(lg.masked_fill(~allowed, -float('inf')).argmax()) if constrained else int(ix[0])
            steps.append({'prefix': prefix, 'valid': valid, 'n_allowed': int(allowed.sum()),
                          'mass_allowed': round(float(p[allowed].sum()), 6),
                          'top': [{'t': vocab[int(i)] if int(i) not in eos else '<end>', 'p': round(float(p[i]), 5),
                                   'ok': bool(allowed[i])} for i in ix],
                          'pick': vocab[pick] if pick not in eos else '<end>', 'pick_p': round(float(p[pick]), 5),
                          'pick_rank': int((lg > lg[pick]).sum()) + 1})
            if pick in eos:
                break
            if valid and not bool(allowed[pick]):
                valid = False
            prefix += vocab[pick]
            cur.append(pick)
        return prefix, steps
    free, fsteps = run(False)
    prefix, steps = run(True)
    out = {'model': QWEN, 'vocab': V, 'request': text, 'pattern': PAT, 'free': free, 'free_steps': fsteps, 'constrained': prefix, 'steps': steps}
    json.dump(out, open(os.path.join(OUT, 'json_constrained.json'), 'w'), ensure_ascii=True)
    print('free:', repr(free)); print('constrained:', repr(prefix), len(steps))


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    for name, f in [('lab', lab), ('degen', degen), ('beam', beam), ('json', jsonc)]:
        if what in (name, 'all'):
            f()
