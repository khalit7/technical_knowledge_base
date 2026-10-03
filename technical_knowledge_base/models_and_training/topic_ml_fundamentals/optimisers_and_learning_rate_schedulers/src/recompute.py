"""Every derived number on the page, recomputed. Run from src/: python3 recompute.py
Writes parts/41_js_mem_data.js (parameter groups from the four config.json files in inputs/) and prints each check."""
import json, math, os
here = os.path.dirname(os.path.abspath(__file__))
out = []
def show(name, value, note=''):
    out.append((name, value, note)); print(f'{name}: {value}  {note}')

# ---- Adam without bias correction: step / lr for a steady gradient = (1 - b1^t) / sqrt(1 - b2^t) ----
for b2 in (0.999, 0.95):
    r = [(1 - 0.9 ** t) / math.sqrt(1 - b2 ** t) for t in range(1, 3001)]
    tmax = max(range(len(r)), key=lambda i: r[i]) + 1
    show(f'Adam no-correction, beta2={b2}: first step / lr', round(r[0], 3), '(1-0.9)/sqrt(1-b2)')
    show(f'Adam no-correction, beta2={b2}: peak step / lr', f'{r[tmax-1]:.2f} at t={tmax}')
    show(f'Adam no-correction, beta2={b2}: step / lr at t=100, 1000', f'{r[99]:.2f}, {r[999]:.2f}')
    show(f'Adam no-correction, beta2={b2}: first step from which it stays within 10%', next(t + 1 for t in range(3000) if all(abs(x - 1) <= 0.1 for x in r[t:])))

# ---- Transformer Eq. 3 peak ----
show('Transformer peak LR (d=512, warmup 4000)', f'{512 ** -0.5 * 4000 ** -0.5:.3e}', 'd^-0.5 * warmup^-0.5 at step = warmup')
# ---- final LR as a share of peak ----
show('DeepSeek-V3 cosine end / peak', 2.2e-5 / 2.2e-4); show('DeepSeek-V3 final / peak', round(7.3e-6 / 2.2e-4, 4))
show('Llama 3 405B end / peak', 8e-7 / 8e-5); show('Kimi K2 cosine end / peak', 2e-5 / 2e-4); show('Kimi K2 anneal end / peak', 7e-6 / 2e-4)
# ---- headline ratios ----
show('Muon: 52% of AdamW FLOPs as a speed-up', round(1 / 0.52, 2), '1/0.52 (derived)')
show('SOAP: >40% fewer iterations as a speed-up', round(1 / 0.6, 2), '1/(1-0.4), at least (derived)')
show('Sophia: 50% fewer steps as a speed-up', 2.0)
show('Muon FLOP overhead, speedrun (Tm/B)', f'{5 * 768 / 524288:.4f}'); show('Muon FLOP overhead, Llama 405B', f'{5 * 16384 / 16e6:.4f}')
show('ZeRO mixed-precision Adam bytes/param', 2 + 2 + 4 + 4 * 2, '2 (bf16 w) + 2 (bf16 g) + 4 (fp32 master) + 4 x 2 states')
show('8-bit Adam state bytes/param', 2, '2 states x 1 byte (Dettmers et al.: 8 -> 2)')
# ---- WSD compute for three endpoints (the Reading animation) ----
T = [250, 500, 1000]
show('cosine: steps for three endpoints', sum(T)); show('WSD: steps for three endpoints', int(0.8 * T[-1] + sum(0.2 * t for t in T)))
show('schedule-free: steps for three endpoints', T[-1])

# ---- parameter groups from config.json ----
def groups(c, name):
    """Returns list of (label, rows, cols, count) for 2-D matrices and the number of 1-D parameters."""
    h, L, V = c['hidden_size'], c['num_hidden_layers'], c['vocab_size']
    nh, nkv = c['num_attention_heads'], c.get('num_key_value_heads') or c['num_attention_heads']
    hd = c.get('head_dim') or h // nh
    mats = [('embedding', V, h, 1)]
    if not c.get('tie_word_embeddings'): mats.append(('output head', V, h, 1))
    vec = h  # final norm
    if c.get('q_lora_rank'):  # DeepSeek-V3 style MLA + MoE (Kimi K2)
        ql, kl, dn, dr, dv = c['q_lora_rank'], c['kv_lora_rank'], c['qk_nope_head_dim'], c['qk_rope_head_dim'], c['v_head_dim']
        mats += [('attention q down', ql, h, L), ('attention q up', nh * (dn + dr), ql, L), ('attention kv down', kl + dr, h, L),
                 ('attention kv up', nh * (dn + dv), kl, L), ('attention out', h, nh * dv, L)]
        vec += L * (ql + kl + 2 * h)  # q_a_layernorm, kv_a_layernorm, two block norms
        kd = c['first_k_dense_replace']; I = c['intermediate_size']; mi = c['moe_intermediate_size']
        E = c['n_routed_experts']; S = c['n_shared_experts']
        mats += [('dense FFN', I, h, 3 * kd)]
        mats += [('expert FFN', mi, h, 3 * (L - kd) * (E + S))]
        mats += [('router', E, h, L - kd)]
        vec += (L - kd) * E  # router bias (e_score_correction_bias)
    else:
        I = c['intermediate_size']
        mats += [('attention q', nh * hd, h, L), ('attention k', nkv * hd, h, L), ('attention v', nkv * hd, h, L),
                 ('attention out', h, nh * hd, L), ('FFN', I, h, 3 * L)]
        vec += L * 2 * h
        if 'olmo' in name.lower(): vec += L * (nh * hd + nkv * hd)  # OLMo 2 QK-norm over the full projections
    return mats, vec
models = [('SmolLM3 3B', 'cfg_HuggingFaceTB_SmolLM3-3B-Base.json', '3B', 'https://huggingface.co/HuggingFaceTB/SmolLM3-3B-Base/blob/main/config.json'),
          ('OLMo 2 7B', 'cfg_allenai_OLMo-2-1124-7B.json', '7B', 'https://huggingface.co/allenai/OLMo-2-1124-7B/blob/main/config.json'),
          ('Llama 3.1 405B', 'cfg_unsloth_Meta-Llama-3.1-405B-bnb-4bit.json', '405B', 'https://huggingface.co/unsloth/Meta-Llama-3.1-405B-bnb-4bit/blob/main/config.json'),
          ('Kimi K2', 'cfg_moonshotai_Kimi-K2-Base.json', '1.04T', 'https://huggingface.co/moonshotai/Kimi-K2-Base/blob/main/config.json')]
data = []
for name, f, pub, url in models:
    c = json.load(open(os.path.join(here, 'inputs', f)))
    mats, vec = groups(c, f)
    tot = sum(r * k * n for _, r, k, n in mats) + vec
    show(f'{name} parameters from config', f'{tot / 1e9:.2f}B', f'published {pub}')
    data.append({'name': name, 'url': url, 'pub': pub, 'mats': mats, 'vec': vec, 'total': tot})
# optimiser state per model (floats), computed the same way in JS; printed here for the check
def state(d, opt):
    s = 0
    for lab, r, k, n in d['mats']:
        mn = r * k; io = lab in ('embedding', 'output head')
        if opt == 'sgd': s += 0
        elif opt in ('mom', 'lion'): s += mn * n
        elif opt == 'adam': s += 2 * mn * n
        elif opt == 'adam8': s += 0.5 * mn * n
        elif opt == 'adafactor': s += (r + k) * n
        elif opt == 'muon': s += (2 if io else 1) * mn * n
        elif opt == 'soap': s += (2 * mn + sum(2 * x * x for x in (r, k) if x <= 10000)) * n
    v = d['vec']
    s += {'sgd': 0, 'mom': v, 'lion': v, 'adam': 2 * v, 'adam8': 0.5 * v, 'adafactor': v, 'muon': 2 * v, 'soap': 2 * v}[opt]
    return s
for d in data:
    print(d['name'], {o: round(state(d, o) / d['total'], 3) for o in ('sgd', 'mom', 'adam', 'adam8', 'adafactor', 'lion', 'muon', 'soap')})
with open(os.path.join(here, 'parts', '41_js_mem_data.js'), 'w') as fh:
    fh.write('// generated by recompute.py from inputs/cfg_*.json: matrices [label, rows, cols, count] and 1-D parameter count\n')
    fh.write('window.MEM_MODELS=' + json.dumps(data) + ';\n')
json.dump(out, open(os.path.join(here, 'recompute_output.json'), 'w'), indent=1)
