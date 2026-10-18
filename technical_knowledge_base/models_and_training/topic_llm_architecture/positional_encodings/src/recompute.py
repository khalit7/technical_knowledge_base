# Recomputes every number the page shows from configs in inputs/ and the formulas of the papers and of
# Hugging Face's modeling_rope_utils.py (ported line by line; see inputs/code_extracts.py).
# Writes inputs/recompute.json, which parts/21_js_data.js embeds (export_data.py) and check_page.mjs compares against.
import json, math, os
H = os.path.dirname(os.path.abspath(__file__))
I = os.path.join(H, 'inputs')
cfg = lambda f: json.load(open(os.path.join(I, f)))
out = {}

# ---------- RoPE spectra and the extension methods (ports of transformers' _compute_*_parameters) ----------
def base_inv(base, dim):
    return [1.0 / (base ** (2 * i / dim)) for i in range(dim // 2)]

def pi_inv(base, dim, s):
    return [f / s for f in base_inv(base, dim)]

def ntk_inv(base, dim, s):
    b2 = base * s ** (dim / (dim - 2))
    return base_inv(b2, dim), b2

def dyn_ntk_inv(base, dim, s, seq, L):
    # transformers: base * ((factor * seq_len / max_pos) - (factor - 1)) ** (dim/(dim-2)), seq_len >= max_pos
    seq = max(seq, L)
    b2 = base * ((s * seq / L) - (s - 1)) ** (dim / (dim - 2))
    return base_inv(b2, dim), b2

def yarn_inv(base, dim, s, L, beta_fast=32, beta_slow=1, truncate=True):
    def corr(rot):
        return (dim * math.log(L / (rot * 2 * math.pi))) / (2 * math.log(base))
    low, high = corr(beta_fast), corr(beta_slow)
    if truncate:
        low, high = math.floor(low), math.ceil(high)
    low, high = max(low, 0), min(high, dim - 1)
    if low == high:
        high += 0.001
    inv = []
    ramp = []
    for i in range(dim // 2):
        r = min(1, max(0, (i - low) / (high - low)))  # 0 = keep (extrapolate), 1 = interpolate
        ext = 1 - r
        f = base ** (-2 * i / dim)
        inv.append(f / s * (1 - ext) + f * ext)
        ramp.append(r)
    return inv, (low, high), ramp

def yarn_mscale(s, m=1.0):
    return 1.0 if s <= 1 else 0.1 * m * math.log(s) + 1.0

def llama3_inv(base, dim, factor, low_ff, high_ff, L):
    inv = base_inv(base, dim)
    lw, hw = L / low_ff, L / high_ff
    res = []
    for f in inv:
        wl = 2 * math.pi / f
        if wl < hw:
            res.append(f)
        elif wl > lw:
            res.append(f / factor)
        else:
            sm = (L / wl - low_ff) / (high_ff - low_ff)
            res.append((1 - sm) * f / factor + sm * f)
    return res

def longrope_inv(base, dim, factors):
    return [1.0 / (factors[i] * base ** (2 * i / dim)) for i in range(dim // 2)]

def classify(inv0, inv1, tol=1e-9):
    kept = sum(1 for a, b in zip(inv0, inv1) if abs(a / b - 1) < 1e-6)
    return kept

# ---------- the presets (one per real config) ----------
l31 = cfg('llama31_8b_config.json'); q3 = cfg('qwen3_8b_config.json'); dv3 = cfg('deepseek_v3_config.json')
phi = cfg('phi3_mini_128k_config.json'); oss = cfg('gptoss120b_config.json'); l4 = cfg('llama4_scout_unsloth_config.json')['text_config']
g3 = cfg('gemma3_27b_config.json')['text_config']
presets = {
  'llama31': dict(name='Llama 3.1 8B', base=l31['rope_theta'], dim=l31['head_dim'], L=l31['rope_scaling']['original_max_position_embeddings'],
                  s=l31['rope_scaling']['factor'], method='llama3', low=l31['rope_scaling']['low_freq_factor'], high=l31['rope_scaling']['high_freq_factor'],
                  maxpos=l31['max_position_embeddings']),
  'qwen3': dict(name='Qwen3-8B', base=q3['rope_theta'], dim=q3['head_dim'], L=32768, s=4.0, method='yarn', maxpos=131072,
                note='rope_scaling from the model card (factor 4, original 32,768); config.json ships rope_scaling null'),
  'dsv3': dict(name='DeepSeek-V3 (decoupled key)', base=dv3['rope_theta'], dim=dv3['qk_rope_head_dim'], L=dv3['rope_scaling']['original_max_position_embeddings'],
               s=dv3['rope_scaling']['factor'], method='yarn', beta_fast=dv3['rope_scaling']['beta_fast'], beta_slow=dv3['rope_scaling']['beta_slow'],
               mscale_all_dim=dv3['rope_scaling']['mscale_all_dim'], maxpos=dv3['max_position_embeddings']),
  'oss': dict(name='gpt-oss-120b', base=oss['rope_theta'], dim=oss['head_dim'], L=oss['rope_scaling']['original_max_position_embeddings'],
              s=oss['rope_scaling']['factor'], method='yarn', truncate=oss['rope_scaling']['truncate'], maxpos=oss['max_position_embeddings']),
  'phi3': dict(name='Phi-3-mini-128k', base=phi['rope_theta'], dim=phi['hidden_size'] // phi['num_attention_heads'], L=phi['original_max_position_embeddings'],
               s=phi['max_position_embeddings'] / phi['original_max_position_embeddings'], method='longrope',
               long=phi['rope_scaling']['long_factor'], short=phi['rope_scaling']['short_factor'], maxpos=phi['max_position_embeddings']),
  'gemma3': dict(name='Gemma 3 27B (global layers)', base=g3['rope_theta'], dim=g3['head_dim'], L=32768, s=g3['rope_scaling']['factor'], method='pi', maxpos=g3['max_position_embeddings']),
  'llama4': dict(name='Llama 4 Scout (RoPE layers)', base=l4['rope_theta'], dim=l4['head_dim'], L=l4['rope_scaling']['original_max_position_embeddings'],
                 s=l4['rope_scaling']['factor'], method='llama3', low=l4['rope_scaling']['low_freq_factor'], high=l4['rope_scaling']['high_freq_factor'], maxpos=l4['max_position_embeddings']),
}

def all_methods(p, s=None):
    s = s or p['s']; b, d, L = p['base'], p['dim'], p['L']
    m = {'plain': base_inv(b, d), 'pi': pi_inv(b, d, s)}
    m['ntk'], ntkb = ntk_inv(b, d, s)
    m['yarn'], rng, _ = yarn_inv(b, d, s, L, p.get('beta_fast', 32), p.get('beta_slow', 1), p.get('truncate', True))
    m['llama3'] = llama3_inv(b, d, s, p.get('low', 1.0), p.get('high', 4.0), L)
    if 'long' in p:
        m['longrope'] = longrope_inv(b, d, p['long'])
    return m, ntkb, rng

def unseen(inv_train, inv_new, L, delta):
    """pairs whose angle at distance delta was never reached by any distance < L in training"""
    n = 0
    for f0, f1 in zip(inv_train, inv_new):
        seen = L * f0  # largest angle reached in training (radians)
        if seen >= 2 * math.pi:
            continue
        # rotations are periodic: what matters is the angle modulo one turn
        if math.fmod(delta * f1, 2 * math.pi) > seen + 1e-9:
            n += 1
    return n

P = {}
for k, p in presets.items():
    m, ntkb, rng = all_methods(p)
    b, d, L, s = p['base'], p['dim'], p['L'], p['s']
    plain = m['plain']
    wl = [2 * math.pi / f for f in plain]
    row = dict(name=p['name'], base=b, dim=d, L=L, s=s, target=L * s, maxpos=p['maxpos'], method=p['method'],
               full_turn_pairs=sum(1 for f in plain if L * f >= 2 * math.pi),
               longest_wavelength=round(wl[-1]), shortest_wavelength=round(wl[0], 3),
               ntk_base=round(ntkb), yarn_ramp=[round(rng[0], 3), round(rng[1], 3)],
               yarn_temp=round(yarn_mscale(s), 4), yarn_logit_mult=round(yarn_mscale(s) ** 2, 4))
    for mk, inv in m.items():
        stretch = [a / b_ for a, b_ in zip(plain, inv)]
        row['kept_' + mk] = sum(1 for x in stretch if abs(x - 1) < 1e-6)
        row['full_' + mk] = sum(1 for x in stretch if abs(x - s) < 1e-6 * s)
        row['unseen_at_target_' + mk] = unseen(plain, inv, L, L * s)
        row['max_stretch_' + mk] = round(max(stretch), 4)
        row['min_stretch_' + mk] = round(min(stretch), 4)
    if 'long' in p:
        row['longrope_attn'] = round(math.sqrt(1 + math.log(s) / math.log(L)), 4)
        row['long_factor_range'] = [round(min(p['long']), 4), round(max(p['long']), 4)]
        row['short_factor_range'] = [round(min(p['short']), 4), round(max(p['short']), 4)]
    P[k] = row
out['presets'] = P

# YaRN band counts, truncate as each config says (compare: Architecture Gallery says gpt-oss 9 kept / 9 ramp / 14 interpolated)
def bands(p):
    _, (lo, hi), ramp = yarn_inv(p['base'], p['dim'], p['s'], p['L'], p.get('beta_fast', 32), p.get('beta_slow', 1), p.get('truncate', True))
    return dict(kept=sum(1 for r in ramp if r == 0), ramp=sum(1 for r in ramp if 0 < r < 1), interp=sum(1 for r in ramp if r == 1), low=round(lo, 3), high=round(hi, 3))
out['yarn_bands'] = {k: bands(presets[k]) for k in ('oss', 'dsv3', 'qwen3')}

# DeepSeek temperature in the paper and the code: V2 config mscale 0.707 -> sqrt(t) = 0.0707 ln s + 1 (V2 paper); V3 mscale 1 -> 0.1 ln s + 1
dv2 = cfg('deepseek_v2_config.json')['rope_scaling']
out['deepseek_temp'] = dict(v2_sqrt_t=round(yarn_mscale(40, dv2['mscale_all_dim']), 4), v2_logit_mult=round(yarn_mscale(40, dv2['mscale_all_dim']) ** 2, 4),
                            v3_sqrt_t=round(yarn_mscale(40, 1.0), 4), v3_logit_mult=round(yarn_mscale(40, 1.0) ** 2, 4))
out['yarn_temp_table'] = {str(s): dict(sqrt_inv_t=round(yarn_mscale(s), 4), logit_mult=round(yarn_mscale(s) ** 2, 4)) for s in (2, 4, 8, 16, 32, 40)}

# Llama 3.1: which pairs are kept, smoothed, divided by 8 (wavelength boundaries L/high = 2,048 and L/low = 8,192)
p = presets['llama31']; inv = base_inv(p['base'], p['dim'])
wl = [2 * math.pi / f for f in inv]
out['llama31_bands'] = dict(kept=sum(1 for w in wl if w < p['L'] / p['high']), divided=sum(1 for w in wl if w > p['L'] / p['low']),
                            smoothed=sum(1 for w in wl if p['L'] / p['high'] <= w <= p['L'] / p['low']), boundary_wavelengths=[p['L'] / p['high'], p['L'] / p['low']])

# Plain RoPE past the trained length, per preset: pairs with unseen angles at 1x, 1.5x, 2x, 4x
out['plain_unseen'] = {k: {str(x): unseen(base_inv(pp['base'], pp['dim']), base_inv(pp['base'], pp['dim']), pp['L'], pp['L'] * x) for x in (1, 1.5, 2, 4, 8)} for k, pp in presets.items()}

# NTK-aware: Llama 2-style example (base 10,000, d 128, s 4) and the lowest pair's stretch equals s exactly
b2 = 10000 * 4 ** (128 / 126)
out['ntk_example'] = dict(base=10000, dim=128, s=4, new_base=round(b2), lowest_pair_stretch=round((b2 / 10000) ** (126 / 128), 6), highest_pair_stretch=1.0)

# ---------- T5 relative buckets (port of _relative_position_bucket) and the real T5-base biases ----------
def t5_bucket(rel, bidirectional, nb=32, maxd=128):
    b = 0
    if bidirectional:
        nb //= 2
        if rel > 0:
            b += nb
        rel = abs(rel)
    else:
        rel = -min(rel, 0)
    me = nb // 2
    if rel < me:
        return b + rel
    large = me + int(math.log(rel / me) / math.log(maxd / me) * (nb - me))
    return b + min(large, nb - 1)

dec = [t5_bucket(-k, False) for k in range(0, 1025)]
ranges = {}
for k, bk in enumerate(dec):
    ranges.setdefault(bk, [k, k]); ranges[bk][1] = k
out['t5_decoder_buckets'] = {str(b): r for b, r in sorted(ranges.items())}
out['t5_last_bucket_starts'] = ranges[31][0]
t5 = cfg('t5_base_relative_bias.json')
D = t5['decoder.block.0.layer.0.SelfAttention.relative_attention_bias.weight']
out['t5_bias_bucket31_range'] = [min(D[31]), max(D[31])]
out['t5_bias_other_range'] = [min(min(r) for r in D[:31]), max(max(r) for r in D[:31])]

# ---------- ALiBi slopes ----------
out['alibi_8'] = [2 ** (-(h + 1)) for h in range(8)]
out['alibi_16'] = [2 ** (-(h + 1) / 2) for h in range(16)]
# MPT-7B uses alibi_bias_max 8 with 32 heads: slopes 2^(-8 h / n) for h = 1..n
mpt = cfg('mpt7b_config.json')
nh = mpt['n_heads']; mx = mpt['attn_config']['alibi_bias_max']
out['alibi_mpt'] = dict(heads=nh, bias_max=mx, first=2 ** (-mx / nh), last=2 ** (-mx))

# ---------- layer patterns for the table ----------
smol = cfg('smollm3_config.json'); cmd = cfg('command_a_config.json')
out['layers'] = dict(
  llama4=dict(n=l4['num_hidden_layers'], rope=[int(x) for x in l4['no_rope_layers'][:l4['num_hidden_layers']]], chunk=l4['attention_chunk_size']),
  smollm3=dict(n=smol['num_hidden_layers'], rope=[int(x) for x in smol['no_rope_layers'][:smol['num_hidden_layers']]]),
  command_a=dict(n=cmd['num_hidden_layers'], pattern=cmd['sliding_window_pattern'], window=cmd['sliding_window']),
  gemma3=dict(n=g3['num_hidden_layers'], pattern=g3['sliding_window_pattern'], window=g3['sliding_window']),
  gptoss=dict(n=oss['num_hidden_layers'], types=oss['layer_types'], window=oss['sliding_window']))
out['partial'] = dict(gptneox=cfg('gptneox20b_config.json')['rotary_pct'], phi2=cfg('phi2_config.json')['partial_rotary_factor'],
                      glm45=cfg('glm45_config.json')['partial_rotary_factor'], glm45_head=cfg('glm45_config.json')['head_dim'],
                      dsv3_rope=dv3['qk_rope_head_dim'], dsv3_nope=dv3['qk_nope_head_dim'],
                      dsv3_share=dv3['qk_rope_head_dim'] / (dv3['qk_rope_head_dim'] + dv3['qk_nope_head_dim']),
                      qwen2vl=cfg('qwen2vl_7b_config.json')['rope_scaling']['mrope_section'])
# Llama 4's NoPE-layer temperature: 1 + attn_scale * log(floor((pos+1)/floor_scale) + 1)
out['llama4_temp'] = {str(p_): round(1 + l4['attn_scale'] * math.log(math.floor((p_ + 1) / l4['floor_scale']) + 1), 4) for p_ in (8191, 65535, 262143, 1048575, 10485759)}
out['factor_x_original'] = {k: pp['L'] * pp['s'] for k, pp in presets.items()}

json.dump(out, open(os.path.join(I, 'recompute.json'), 'w'), indent=1)
for k, v in out.items():
    print(k, json.dumps(v)[:400])
