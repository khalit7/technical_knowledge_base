# Recompute every number on the Information theory page. Standard library only.
# usage: python3 src/recompute.py   (writes src/inputs/numbers.json; check_js.mjs compares the page's JavaScript with it)
import json, math, os, heapq, itertools
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = {}
def put(k, v, nd=4):
    OUT[k] = round(v, nd) if isinstance(v, float) else v
LN2 = math.log(2)
def H(p, base=2):
    return -sum(x * math.log(x, base) for x in p if x > 0)
def CE(p, q, base=2):
    return -sum(a * math.log(b, base) for a, b in zip(p, q) if a > 0)
def KL(p, q, base=2):
    return sum(a * math.log(a / b, base) for a, b in zip(p, q) if a > 0)
def softmax(z):
    m = max(z); e = [math.exp(v - m) for v in z]; s = sum(e); return [v / s for v in e]

# ---- 1. units and Shannon's grouping example (Shannon 1948, Fig. 6) ----
put('nat_in_bits', 1 / LN2)
put('bit_in_nats', LN2)
put('g_H3', H([1/2, 1/3, 1/6])); put('g_H2', H([1/2, 1/2])); put('g_Hsub', H([2/3, 1/3]))
put('g_rhs', H([1/2, 1/2]) + 0.5 * H([2/3, 1/3]))

# ---- 2. the root's tiny model: z = (2, 1, 0), p = softmax(z) (root numbers.json) ----
p = softmax([2, 1, 0])
put('p', [round(x, 3) for x in p])
put('s_bits', [round(-math.log2(x), 3) for x in p])
put('s_nats', [round(-math.log(x), 3) for x in p])
put('H_tiny_bits', H(p)); put('H_tiny_nats', H(p, math.e)); put('H_unif3', math.log2(3))
put('loss_sat_nats', -math.log(p[2])); put('loss_sat_bits', -math.log2(p[2]))

# ---- entropy examples ----
weather = [0.5, 0.25, 0.25]; wq = [0.25, 0.5, 0.25]
put('w_H', H(weather)); put('w_CE', CE(weather, wq)); put('w_KL', KL(weather, wq)); put('w_KLrev', KL(wq, weather))
put('coin09', H([0.9, 0.1])); put('coin09_terms', [round(-0.9*math.log2(0.9), 3), round(-0.1*math.log2(0.1), 3)])
put('kl_fair_09', KL([0.5, 0.5], [0.9, 0.1])); put('kl_09_fair', KL([0.9, 0.1], [0.5, 0.5]))
put('ce_07', -math.log(0.7)); put('ce_07_bits', -math.log2(0.7)); put('ce_099', -math.log(0.99)); put('ce_001', -math.log(0.01))
put('nats2_bits', 2 / LN2)
# binary entropy curve points
put('hb', [[x, round(H([x, 1-x]), 4)] for x in [0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5]])
# differential entropy of a Gaussian, sigma = 1: 0.5 ln(2 pi e)
put('h_gauss1_nats', 0.5 * math.log(2 * math.pi * math.e)); put('h_gauss1_bits', 0.5 * math.log2(2 * math.pi * math.e))

# ---- 3. Huffman on the tiny model's bet, on blocks of 1, 2, 3 symbols ----
def huffman(probs):
    h = [[w, i, {i: ''}] for i, w in enumerate(probs)]; heapq.heapify(h); c = len(h)
    if len(h) == 1: return {0: '0'}
    while len(h) > 1:
        a = heapq.heappop(h); b = heapq.heappop(h)
        d = {s: '0' + v for s, v in a[2].items()}; d.update({s: '1' + v for s, v in b[2].items()})
        heapq.heappush(h, [a[0] + b[0], c, d]); c += 1
    return h[0][2]
code = huffman(p)
put('huff_tiny_len', [len(code[i]) for i in range(3)])
put('huff_tiny_L', sum(p[i] * len(code[i]) for i in range(3)))
blk = []
for n in (1, 2, 3, 4):
    probs = [math.prod(t) for t in itertools.product(p, repeat=n)]
    cd = huffman(probs); L = sum(probs[i] * len(cd[i]) for i in range(len(probs)))
    blk.append([n, round(L / n, 4)])
put('huff_blocks', blk)
put('kraft_tiny', sum(2 ** -len(code[i]) for i in range(3)))
# ideal (non-integer) lengths and Shannon code ceil lengths
put('shannon_len', [math.ceil(-math.log2(x)) for x in p]); put('shannon_L', sum(x * math.ceil(-math.log2(x)) for x in p))

# ---- the animation: 4 symbols, p dyadic, code for p vs code for q ----
pa = [1/2, 1/4, 1/8, 1/8]; qa = [1/8, 1/2, 1/4, 1/8]
la = [1, 2, 3, 3]; lq = [3, 1, 2, 3]
seq = 'ABACABADABACABDA'  # 16 symbols: 8 A, 4 B, 2 C, 2 D, exactly p
cnt = {s: seq.count(s) for s in 'ABCD'}
put('an_counts', [cnt[s] for s in 'ABCD'])
put('an_bits_own', sum(la['ABCD'.index(s)] for s in seq)); put('an_bits_wrong', sum(lq['ABCD'.index(s)] for s in seq))
put('an_H', H(pa)); put('an_CE', CE(pa, qa)); put('an_KL', KL(pa, qa)); put('an_KLrev', KL(qa, pa)); put('an_Hq', H(qa))

# ---- 4. joint, conditional, mutual information ----
J = [[0.4, 0.1], [0.1, 0.4]]
HXY = H([0.4, 0.1, 0.1, 0.4]); put('mi_HXY', HXY); put('mi_I', 2 - HXY); put('mi_HXgY', HXY - 1)
put('mi_HXY_terms', [round(2*0.4*-math.log2(0.4), 3), round(2*0.1*-math.log2(0.1), 3)])
put('mi_kl_form', KL([0.4, 0.1, 0.1, 0.4], [0.25] * 4))
put('mi_xsq', H([2/3, 1/3]))
# chain rule example on the weather: X = weather, Y = umbrella? use the 2x2 table above: H(X)+H(Y|X)
# data processing: X fair bit -> Y (flip 0.1) -> Z (flip 0.1)
put('dpi_IXY', 1 - H([0.9, 0.1])); put('dpi_flipXZ', 2 * 0.1 * 0.9); put('dpi_IXZ', 1 - H([0.18, 0.82]))

# ---- 5. InfoNCE ----
put('nce3_loss', -math.log(p[0])); put('nce3_bound', math.log(3) + math.log(p[0]))
p4 = math.exp(2) / (math.exp(2) + 3)
put('nce4_p', p4); put('nce4_loss', -math.log(p4)); put('nce4_bound', math.log(4) + math.log(p4)); put('nce4_bound_bits', (math.log(4) + math.log(p4)) / LN2)
put('ln4', math.log(4)); put('ln3', math.log(3))
put('clip_ceiling_nats', math.log(32768)); put('clip_ceiling_bits', math.log2(32768))

# seeded RNG shared with the page (mulberry32, as in the JavaScript)
def mulberry32(a):
    s = [a & 0xFFFFFFFF]
    def imul(x, y): return ((x & 0xFFFFFFFF) * (y & 0xFFFFFFFF)) & 0xFFFFFFFF
    def r():
        s[0] = (s[0] + 0x6D2B79F5) & 0xFFFFFFFF; a_ = s[0]
        t = imul(a_ ^ (a_ >> 15), 1 | a_)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return r
def gauss(r):
    u1 = r(); u2 = r()
    return math.sqrt(-2 * math.log(1 - u1)) * math.cos(2 * math.pi * u2)
def infonce(rho, N, pairs=2048, seed=7):
    r = mulberry32(seed); c = math.sqrt(1 - rho * rho); tot = 0.0; cntb = 0
    for _ in range(max(1, pairs // N)):
        xs = []; ys = []
        for i in range(N):
            x = gauss(r); y = rho * x + c * gauss(r); xs.append(x); ys.append(y)
        for i in range(N):
            f = [-(ys[j] - rho * xs[i]) ** 2 / (2 * c * c) + ys[j] ** 2 / 2 for j in range(N)]
            m = max(f); lse = m + math.log(sum(math.exp(v - m) for v in f))
            tot += f[i] - lse + math.log(N); cntb += 1
    return tot / cntb
NCE_N = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]
NCE_RHO = [0.5, 0.9, 0.99, 0.999, 0.99999]
put('nce_N', NCE_N); put('nce_rho', NCE_RHO)
put('nce_trueI', [round(-0.5 * math.log(1 - r_ * r_), 4) for r_ in NCE_RHO])
put('nce_est', [[round(infonce(r_, N), 4) for N in NCE_N] for r_ in NCE_RHO])
put('rng_check', [round(mulberry32(7)() , 10), round(gauss(mulberry32(7)), 10)])

# ---- 6. perplexity, bits per byte (old illustrative example; the Pile; the root's " sat") ----
put('old_ppl_A', math.exp(2.0)); put('old_ppl_B', math.exp(1.6)); put('old_bpb', 2000 / (4000 * LN2))
put('pile_bpb', 0.29335 * 2.0 / LN2); put('sat_bpb', -math.log2(p[2]) / 4)
M = json.load(open(os.path.join(HERE, 'inputs', 'measured.json')))
g = M['texts']['en']['models']['openai-community/gpt2']; nb = M['texts']['en']['bytes']; nc = M['texts']['en']['chars']
put('en_gpt2_bpt', nb / g['n_tokens']); put('en_gpt2_bpb_conv', g['ce'] / (LN2 * nb / g['n_tokens']))
put('en_gpt2_ppl_word', math.exp(g['total_nats'] / g['words'])); put('en_gpt2_ppl_pair', math.exp(g['total_nats'] / math.ceil(g['n_tokens'] / 2)))
put('en_gpt2_ppl_byte', 2 ** g['bpb']); put('en_gpt2_bpc_conv', g['bpb'] * nb / nc)
put('en_gpt2_total_bits', g['total_nats'] / LN2)
for key, t in M['texts'].items():
    for name, m in t['models'].items():
        sh = name.split('/')[1]
        assert abs(math.exp(m['ce']) - m['ppl']) / m['ppl'] < 1e-3
        assert abs(m['total_nats'] / LN2 / t['bytes'] - m['bpb']) < 1e-3
        put('meas_%s_%s' % (key, sh), [m['n_tokens'], round(t['bytes'] / m['n_tokens'], 3), m['ce'], m['ppl'], m['bpb'], m['bpc']])
# loss floor: Chinchilla E (Hoffmann et al. 2022 Eq. 10 fit) and refit (Besiroglu et al. 2024), in bits
put('E_chin_bits', 1.69 / LN2); put('E_besi_bits', 1.82 / LN2); put('E_chin_ppl', math.exp(1.69)); put('E_besi_ppl', math.exp(1.82))
# Delétang et al. 2023: rates to bits per byte
put('del_enwik9_70b_bpb', 0.083 * 8); put('del_gzip_enwik9_bpb', 0.323 * 8)

# ---- 7. forward vs reverse KL: one Gaussian fitted to a two-peaked mixture (grid integration) ----
GX = [-8 + 0.02 * i for i in range(801)]; DX = 0.02
def npdf(x, m, s): return math.exp(-(x - m) ** 2 / (2 * s * s)) / (s * math.sqrt(2 * math.pi))
MIX = [0.5 * npdf(x, -2, 0.6) + 0.5 * npdf(x, 2, 0.6) for x in GX]
def kl_grid(a, b): return sum(x * math.log(x / y) * DX for x, y in zip(a, b) if x > 1e-300 and y > 0)
def qg(m, ls): return [max(npdf(x, m, math.exp(ls)), 1e-300) for x in GX]
def fit(direction, m0=1.0, ls0=math.log(1.0), lr=0.1, steps=200):
    m, ls = m0, ls0; traj = [[m, math.exp(ls)]]
    def obj(m, ls):
        q = qg(m, ls); return kl_grid(MIX, q) if direction == 'fwd' else kl_grid(q, MIX)
    for _ in range(steps):
        e = 1e-4
        gm = (obj(m + e, ls) - obj(m - e, ls)) / (2 * e); gs = (obj(m, ls + e) - obj(m, ls - e)) / (2 * e)
        m -= lr * gm; ls -= lr * gs; traj.append([m, math.exp(ls)])
    return m, math.exp(ls), traj
fm, fs, ftr = fit('fwd'); rm, rs, rtr = fit('rev')
put('fit_fwd', [round(fm, 3), round(fs, 3)]); put('fit_rev', [round(rm, 3), round(rs, 3)])
put('fit_fwd_exact_sigma', math.sqrt(0.36 + 4))
put('fit_fwd_KLs', [round(kl_grid(MIX, qg(fm, math.log(fs))), 3), round(kl_grid(qg(fm, math.log(fs)), MIX), 3)])
put('fit_rev_KLs', [round(kl_grid(MIX, qg(rm, math.log(rs))), 3), round(kl_grid(qg(rm, math.log(rs)), MIX), 3)])
put('fit_traj_steps', [0, 10, 25, 50, 100, 200])
put('fit_fwd_traj', [[round(ftr[i][0], 3), round(ftr[i][1], 3)] for i in [0, 10, 25, 50, 100, 200]])
put('fit_rev_traj', [[round(rtr[i][0], 3), round(rtr[i][1], 3)] for i in [0, 10, 25, 50, 100, 200]])
put('valley_mass_p', sum(v * DX for x, v in zip(GX, MIX) if abs(x) < 0.5))
put('valley_mass_fwd', sum(npdf(x, fm, fs) * DX for x in GX if abs(x) < 0.5))

# ---- 8. f-divergences on the weather pair (natural log, nats) ----
def fdiv(p_, q_, f): return sum(b * f(a / b) for a, b in zip(p_, q_))
fd = {
    'KL': fdiv(weather, wq, lambda u: u * math.log(u)),
    'revKL': fdiv(weather, wq, lambda u: -math.log(u)),
    'chi2': fdiv(weather, wq, lambda u: (u - 1) ** 2),
    'hell2': fdiv(weather, wq, lambda u: (math.sqrt(u) - 1) ** 2),
    'TV': fdiv(weather, wq, lambda u: 0.5 * abs(u - 1)),
}
mix = [(a + b) / 2 for a, b in zip(weather, wq)]
fd['JS'] = 0.5 * KL(weather, mix, math.e) + 0.5 * KL(wq, mix, math.e)
put('fdiv', {k: round(v, 4) for k, v in fd.items()}); put('ln2', LN2)
put('js_disjoint', 0.5 * KL([1, 0], [0.5, 0.5], math.e) + 0.5 * KL([0, 1], [0.5, 0.5], math.e))
put('kl_vs_TV_pinsker', math.sqrt(fd['KL'] / 2))

# ---- 9. KL-regularised RL: optimal policy pi* = pi_ref exp(r/beta) / Z on the tiny model ----
ref = p; rew = [0, 0, 1]
rl = {}
for beta in (2.0, 1.0, 0.5, 0.25):
    w = [a * math.exp(r_ / beta) for a, r_ in zip(ref, rew)]; Z = sum(w); pi = [v / Z for v in w]
    rl[str(beta)] = {'pi': [round(v, 3) for v in pi], 'Z': round(Z, 4), 'ER': round(sum(a * b for a, b in zip(pi, rew)), 4),
                     'KL': round(KL(pi, ref, math.e), 4), 'obj': round(sum(a * b for a, b in zip(pi, rew)) - beta * KL(pi, ref, math.e), 4),
                     'betalogZ': round(beta * math.log(Z), 4)}
put('rl', rl)
# KL estimators k1, k2, k3 (Schulman 2020) on the tiny model: q = pi*(beta=1) sampling, p = ref; exact expectations
piq = [v / sum([a * math.exp(r_) for a, r_ in zip(ref, rew)]) for v in [a * math.exp(r_) for a, r_ in zip(ref, rew)]]
rr = [a / b for a, b in zip(ref, piq)]
put('k_true', KL(piq, ref, math.e))
put('k1', sum(q_ * -math.log(r_) for q_, r_ in zip(piq, rr))); put('k2', sum(q_ * 0.5 * math.log(r_) ** 2 for q_, r_ in zip(piq, rr)))
put('k3', sum(q_ * ((r_ - 1) - math.log(r_)) for q_, r_ in zip(piq, rr)))
put('k_samples', [[round(-math.log(r_), 4), round(0.5 * math.log(r_) ** 2, 4), round((r_ - 1) - math.log(r_), 4)] for r_ in rr])

# ---- 10. VAE: KL(N(mu, s^2) || N(0, 1)) = 0.5 (s^2 + mu^2 - 1 - ln s^2) ----
put('vae_kl', 0.5 * (0.25 + 1 - 1 - math.log(0.25))); put('vae_kl0', 0.0)

# ---- 11. estimating entropy from samples: plug-in bias, Miller-Madow (Paninski 2003 Eq. 4.6) ----
def plugin_sim(m, N, reps=200, seed=11):
    r = mulberry32(seed); tot = 0.0; tmm = 0.0
    for _ in range(reps):
        c = [0] * m
        for _ in range(N): c[int(r() * m)] += 1
        h = -sum(k / N * math.log(k / N) for k in c if k); tot += h; tmm += h + (sum(1 for k in c if k) - 1) / (2 * N)
    return tot / reps, tmm / reps
PB_N = [25, 50, 100, 200, 400, 1000, 4000]
pb = [plugin_sim(100, N) for N in PB_N]
put('pb_N', PB_N); put('pb_true', math.log(100)); put('pb_plugin', [round(a, 4) for a, b in pb]); put('pb_mm', [round(b, 4) for a, b in pb])
put('pb_formula', [round(-(100 - 1) / (2 * N), 4) for N in PB_N])
def mi_sim(m, N, reps=200, seed=13):
    r = mulberry32(seed); tot = 0.0
    for _ in range(reps):
        c = {}; cx = [0] * m; cy = [0] * m
        for _ in range(N):
            x = int(r() * m); y = int(r() * m); c[(x, y)] = c.get((x, y), 0) + 1; cx[x] += 1; cy[y] += 1
        tot += sum(k / N * math.log(k * N / (cx[x] * cy[y])) for (x, y), k in c.items())
    return tot / reps
MI_N = [50, 100, 200, 500, 1000, 5000]
put('mib_N', MI_N); put('mib_est', [round(mi_sim(10, N), 4) for N in MI_N]); put('mib_formula', [round(81 / (2 * N), 4) for N in MI_N])
FN = json.load(open(os.path.join(HERE, 'inputs', 'darwin_fn.json')))
put('fn_book', FN['book']['F']); put('fn_sample', FN['sample']['F'])
put('shannon51', {'F0': math.log2(26), 'F1': 4.14, 'F2': 3.56, 'upper100': 1.3, 'lower100': 0.6})

# ---- 12. compression ladder (measured) ----
put('order0_H', M['order0']['H_bits_per_byte']); put('order0_huff', M['order0']['huffman_bits_per_byte'])

json.dump(OUT, open(os.path.join(HERE, 'inputs', 'numbers.json'), 'w'), indent=0)
for k, v in OUT.items():
    if k not in ('nce_est', 'hb', 'fn_book', 'fn_sample'): print(k, v)
print('nce_est', OUT['nce_est'])

# ---- additions (section 2) ----
for th in (0.99, 0.95, 0.7, 0.6): OUT['hb_%s' % th] = round(H([th, 1 - th]), 4)
OUT['h_gauss01_nats'] = round(0.5 * math.log(2 * math.pi * math.e) + math.log(0.1), 4)
OUT['infogain'] = round(1 - H([0.8, 0.2]), 4)

OUT['fgan_js_generator'] = round(sum(b * (-(a/b + 1) * math.log((1 + a/b) / 2) + (a/b) * math.log(a/b)) for a, b in zip(weather, wq)), 4)
OUT['gpt2_tok_per_byte'] = {k: round(M['texts'][k]['models']['openai-community/gpt2']['n_tokens'] / M['texts'][k]['bytes'], 4) for k in ('en', 'fr', 'code')}
OUT['ws_code'] = {k.split('/')[1]: [m['ws_tokens'], m['ws_mean'], m['nonws_mean']] for k, m in M['texts']['code']['models'].items()}
OUT['fr_bpc_qwen_conv'] = round(M['texts']['fr']['models']['Qwen/Qwen2.5-0.5B']['bpb'] * M['texts']['fr']['bytes'] / M['texts']['fr']['chars'], 4)
OUT['gpt2_params_fp16_ratio'] = round(124439808 * 2 / 10376)
OUT['ac_width'] = round(0.090 * 0.665 * 0.665, 4); OUT['ac_bits'] = round(-math.log2(p[2] * p[0] * p[0]), 3)
OUT['rl_r_cat'] = round(ref[0] / piq[0], 4); OUT['rl_r_sat'] = round(ref[2] / piq[2], 4)
json.dump(OUT, open(os.path.join(HERE, 'inputs', 'numbers.json'), 'w'), indent=0)
print({k: OUT[k] for k in ('fgan_js_generator','gpt2_tok_per_byte','ws_code','fr_bpc_qwen_conv','gpt2_params_fp16_ratio','ac_width','ac_bits','rl_r_cat','rl_r_sat','hb_0.99', 'hb_0.95', 'hb_0.7', 'hb_0.6', 'h_gauss01_nats', 'infogain')})
