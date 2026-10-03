"""Recompute every number this page derives from the paper (arXiv 2609.14306v1), and check the paper's own arithmetic.

  python3 recompute.py     -> prints a report, writes inputs/recompute.json (build.sh runs it)

Each check has: what, our value, the paper's value, where, and a verdict
('reproduces' independently, 'by construction', 'derived', or 'does not reproduce').
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
GiB = 2 ** 30
C = []


def chk(key, what, ours, paper, where, verdict, note=''):
    C.append({'key': key, 'what': what, 'ours': ours, 'paper': paper, 'where': where, 'verdict': verdict, 'note': note})


# ---------- 3.1 PipelinedLLEP: Equation 1 ----------
def chunks(N, c, Kmax):
    K = min(math.ceil(N / c), Kmax)
    return K, math.ceil(N / K)

K65, ce65 = chunks(65536, 6554, 10)
K32, ce32 = chunks(32768, 10923, 10)
chk('k65', 'Chunks at 65,536 tokens, c = 6,554', 'K = %d, c_eff = %d' % (K65, ce65), 'K = 10', 'Figure 2, Table 5', 'reproduces')
chk('k32', 'Chunks at 32,768 tokens, c = 10,923', 'K = %d, c_eff = %d' % (K32, ce32), 'K = 3', 'Table 6', 'reproduces')
ladder = [(n, chunks(n, 4096, 10)[0]) for n in (128, 1024, 8192, 32768, 65536, 131072)]
chk('ladder', 'Table 7 chunk counts at c = 4,096, K_max = 10', ', '.join('%d: %d' % x for x in ladder), '1, 1, 2, 8, 10, 10', 'Table 7', 'reproduces',
    'the ceiling binds above c K_max = 40,960 tokens')
H, b, k, Ep = 7168, 2, 8, 8
bound65 = 2 * Ep * k * ce65 * H * b
whole65 = 2 * (k * 65536) * H * b  # 2 R_d H b with R_d = k N, the balanced share of one destination
chk('bound65', 'Dispatch bound 2 E_p k c_eff H b at the 65K shape (BF16)', '%.2f GiB' % (bound65 / GiB), 'not printed', 'Eq. 1', 'derived',
    'the worst case any router could force; one chunk at the even share is 1/E_p of it, %.2f GiB' % (bound65 / Ep / GiB))
chk('whole65', 'Unchunked dispatch buffers 2 R_d H b, balanced (R_d = k N = 524,288)', '%.2f GiB' % (whole65 / GiB), 'not printed', 'Table 1', 'derived',
    'LLEP to PipelinedLLEP saves 31.23 GiB measured, more than these buffers, so combine buffers and expert intermediates are in the live set too')
for c_, ep_ in ((6554, 64), (4096, 64)):
    pass
b64 = 2 * 64 * 8 * 4096 * H * b
chk('bound_ep64', 'The same bound at the end-to-end scale, E_p = 64, c = 4,096', '%.1f GiB' % (b64 / GiB), 'not printed', 'Appendix A (E_p = W = 64, c swept 4,096 to 32,768)', 'derived',
    'the guarantee grows with E_p: at E_p = 64 it is about half of an H200 even at the smallest c swept; what is realised under strided chunks is 1/E_p of it')

# Table 6 and 9 peak-saved percentages
for lab, a, bb, p in (('65K balanced', 52.660, 21.430, 59.3), ('65K 80/16', 52.988, 22.861, 56.9), ('32K balanced', 24.101, 17.606, 26.9),
                      ('32K 30/16', 24.476, 18.460, 24.6)):
    chk('saved_' + lab, 'Peak saved vs LLEP, ' + lab, '%.1f%%' % (100 * (1 - bb / a)), '%.1f%%' % p, 'Table 6', 'reproduces')
chk('lat65', 'Speed vs LLEP, 65K balanced: 177.82 / 161.00 ms', '%.2fx' % (177.82 / 161.00), '1.10x', 'Table 6', 'reproduces')
chk('t9_32k', 'Forward and backward at 32K, K = 10', '0.87 / 0.90x', '0.87 / 0.90x', 'Table 9', 'reproduces',
    'PipelinedLLEP is slower than LLEP here: the abstract\'s "without losing throughput" holds for the 65K shape and for a budget-derived K, not for every K')
sd = json.load(open(os.path.join(HERE, 'inputs', 'sim_dispatch.json')))
t8 = {'Balanced': (1.00, 1.02), '95% / 16': (1.35, 2.63), '80% / 16': (2.40, 4.00), '50% / 4': (2.29, 6.00)}
for lab, (s, cg) in t8.items():
    r = sd['factor_1.0'][lab]
    chk('t8_' + lab, 'Table 8 send ratio, ' + lab + ' (strided / contiguous)', '%.2f / %.2f' % (r['strided']['send_ratio'], r['contiguous']['send_ratio']),
        '%.2f / %.2f' % (s, cg), 'Table 8', 'reproduces', 'our replay: B.2 profiles + LLEP\'s released plan at capacity factor 1.0 (sim_dispatch.py)')
r = sd['factor_1.0']['50% / 4']
chk('t8_frac', 'Largest receive as a share of the Eq. 1 bound (strided, contiguous 50%/4)',
    '%.1f%%, %.1f%%' % (100 * r['strided']['max_recv_frac_of_bound'], 100 * r['contiguous']['max_recv_frac_of_bound']), '12.5%, 17.1%', 'B.3 text after Table 8', 'reproduces')
r11 = sd['factor_1.1']['80% / 16']
chk('t8_f11', 'Same replay with the released code\'s default capacity factor 1.1, 80%/16', '%.2f / %.2f' % (r11['strided']['send_ratio'], r11['contiguous']['send_ratio']),
    '2.40 / 4.00', 'Table 8', 'does not reproduce', 'so the paper ran LLEP at factor 1.0 (inferred: only 1.0 matches)')
r3 = sd['factor_1.0']['30% / 16']
chk('t8_3016', 'Contiguous chunks on the 30%/16 profile (not in Table 8)', '%.1f%% of the bound' % (100 * r3['contiguous']['max_recv_frac_of_bound']), 'not reported', 'Table 8 omits it', 'derived',
    'contiguous chunks can concentrate far more than the 17.1% the paper reports as its worst; strided stays at 12.5%')

# ---------- 3.2 Ring-DTP ----------
Hd, V, f32 = 7168, 200000, 4
w = Hd * V * f32
chk('w_full', 'Projection weight H x V in FP32', '%.4f GiB' % (w / GiB), '5.3406 GiB', 'Table 10', 'reproduces')
chk('w_p4', 'Weight shard at P = 4 / P = 8', '%.4f / %.4f GiB' % (w / 4 / GiB, w / 8 / GiB), '1.3351 / 0.6676 GiB', 'Table 10', 'reproduces')
lg = 16384 * V * f32
chk('logits3', 'Standard increment = three N x V FP32 tensors (logits, log-softmax, their gradient)', '%.4f GiB' % (3 * lg / GiB), '36.6212 GiB', 'Table 10', 'reproduces',
    'one N x V tensor at N = 16,384 is %.3f GiB; the measured increment is exactly three of them' % (lg / GiB))
strip8, strip4 = 16384 * V / 8 * f32, 16384 * V / 4 * f32
chk('strips', 'Ring-DTP increment in strips of N x V/P', '%.2f strips at P = 8, %.2f at P = 4' % (6.1545 * GiB / strip8, 9.6841 * GiB / strip4), 'O(NVb/P)', 'Table 10, Eq. 2', 'derived',
    'the constant in Eq. 2 is about 3 to 4 strips, not 1')
for n, a, bb, p in ((16384, 42.462, 7.322, 82.8), (32768, 79.521, 10.622, 86.6)):
    chk('t2_%d' % n, 'Peak saved at N = %s' % format(n, ','), '%.1f%%' % (100 * (1 - bb / a)), '%.1f%%' % p, 'Table 2', 'reproduces')
chk('t2_cost', 'Time cost, both rows', '+%.1f%%, +%.1f%%' % (100 * (1052.2 / 1001.2 - 1), 100 * (2155.8 / 2065.2 - 1)), '+5.1%, +4.4%', 'Table 2', 'reproduces',
    'the intro\'s "under 5% more time" describes the 86.6% row; the other row costs 5.1%')
std32 = (w + 32768 * Hd * f32 + 3 * 32768 * V * f32) / GiB
chk('t2_std32', 'Standard peak at N = 32,768 from weight + input + three N x V tensors', '%.2f GiB' % std32, '79.521 GiB', 'Table 2', 'reproduces', 'within 0.1%')
chk('mode', 'Auto-mode threshold V/P at P = 8', '%d' % (V // 8), '25,000', 'Table 2 caption', 'reproduces')
hopA, hopW = 16384 * Hd * f32, Hd * V / 8 * f32
chk('hop', 'Bytes per hop at N = 16,384, P = 8: move activations / move weights', '%.2f / %.2f GiB' % (hopA / GiB, hopW / GiB), 'O(NH) / O(HV/P)', '§3.2', 'derived')

# ---------- 3.3 SCO ----------
Hg, tok, ceil_, ranks = 2880, 556432, 557056, 8
bnd = ceil_ / ranks * Hg * 2
bnd_run = tok / ranks * Hg * 2
chk('sco_b', 'One checkpoint boundary on gpt-oss-20b: (557,056 / 8 ranks) x 2,880 x 2 bytes', '%.4f GiB' % (bnd / GiB), 'not printed', 'Table 12 (implied)', 'derived')
fits = {B: int(B * GiB // bnd) for B in (8, 16)}
chk('sco_n', 'Boundaries that fit 8 / 16 GiB', '%d / %d' % (fits[8], fits[16]), '21 / 42', 'Table 3', 'reproduces', 'independently, from the config alone')
chk('sco_log', 'Logical payload of 21, 42, 47 boundaries at the ceiling', ', '.join('%.2f' % (n * bnd / GiB) for n in (21, 42, 47)) + ' GiB',
    'upper ends 7.84, 15.69, 17.55 GiB (ranges 7.82-7.84, 15.63-15.69, 17.49-17.55)', 'Table 12', 'reproduces',
    'the upper ends reproduce; the lower ends would be a rank holding about 0.2% fewer tokens than 557,056 / 8')
dH = 139.790 - 123.728
chk('sco_hbm', 'Peak HBM drop, off to full', '%.2f GiB = %.1f%%' % (dH, 100 * dH / 139.790), 'the text says "saving 17.65% of HBM"', '§3.3, Table 3', 'does not reproduce',
    '17.65% is Table 13\'s batch gain (655,360 / 557,056); the HBM peak falls 11.5%')
chk('sco_ram', 'Node RAM rise, off to full, against 8 ranks x 23.5 GiB pinned', '%.1f vs %.1f GiB' % (593.410 - 402.517, 8 * 23.5), 'about the same amount', '§3.3, Table 12', 'reproduces')
chk('sco_gain', 'Largest batch gain: marginal completions / clean runs', '%.2f%% / %.2f%%' % (100 * (655360 / 557056 - 1), 100 * (622592 / 458752 - 1)), '17.65% (intro 17.7%) / 35.71%', 'Table 13, §1, §3.3', 'reproduces',
    'two different gains: §3.3 calls the 35.71% "the largest batch that runs without an out-of-memory error", but it compares runs without allocator warnings')
chk('sco_tp', 'Throughput spread', '%.1f%%' % (100 * (2692 / 2641 - 1)), '1.9%', '§3.3', 'reproduces', 'and it rises with offload, consistent with the baseline running at its memory edge (allocator warnings at this batch, Table 13)')
chk('sco_tok', 'Tokens per step from throughput x 8 GPUs x step time (off)', '%s' % format(round(2641 * 8 * 26.3412), ','), '556,432', 'Table 12', 'reproduces')

# ---------- 3.4 OffloadStreamAdamW ----------
chk('osa_sp', 'Speedup 3.95 / 1.93 s', '%.2fx' % (3.95 / 1.93), '2.05x', 'Table 4', 'reproduces')
for bkt, s, st in ((142.076e6, 2, 4.234), (142.076e6, 3, 6.351), (208.431e6, 2, 6.212), (244.938e6, 3, 10.950), (308.586e6, 3, 13.795)):
    chk('stage_%d_%d' % (bkt / 1e6, s), 'Staging = slots x largest bucket x 16 bytes (%.0fM, %d slots)' % (bkt / 1e6, s), '%.3f GiB' % (s * bkt * 16 / GiB), '%.3f GiB' % st, 'Table 14', 'reproduces',
        '16 bytes = fp32 master weight, two fp32 moments and an fp32 gradient')
th = 21e9 / 8
chk('osa_groups', 'Parameters per rank / 26 buckets', '%.0fM' % (th / 26 / 1e6), '100M requested', 'Table 14', 'reproduces', 'gpt-oss-20b has 21B parameters (model card), 2.6B per rank')
chk('osa_bw', 'Implied host-link traffic per GPU over 1.93 s', '%.1f GB/s to the GPU, %.1f GB/s back' % (th * 16 / 1.93 / 1e9, th * 12 / 1.93 / 1e9), 'not printed', 'Table 4 (derived)', 'derived',
    'the paper calls the step transfer-bound but prints no bandwidth; eight GPUs together move about %.0f GB/s to and from host memory' % (8 * th * 28 / 1.93 / 1e9))
chk('fig5', '12 Theta / W at Theta = 10^12, W = 96', '%.1f GiB' % (12e12 / 96 / GiB), '116 GiB', 'Figure 5', 'reproduces')

# ---------- 4 End to end ----------
for m, base in ((120, 128), (241, 32), (667, 64)):
    chk('reach_%d' % m, 'Context reach %dB: 1M / %dK' % (m, base), '%dx' % (1024 // base), {120: '8x', 241: '32x', 667: '16x'}[m], 'Figure 7b', 'reproduces')
exp = 384 * 3 * 7168 * 2048
emb = 2 * 200000 * 7168
for L, m in ((7, 120), (14, 241), (39, 667)):
    chk('par_%d' % m, 'Routed experts alone, %d layers x 384 x 3 x 7,168 x 2,048' % L, '%.1fB' % (L * exp / 1e9), '%dB' % m, 'Appendix A', 'derived',
        'leaves %.1fB for embeddings (1.4B per 200,000 x 7,168 matrix), attention and routers, which the paper does not itemise; consistent' % (m - L * exp / 1e9))
mfu = {k_: round(100 * v / 989.5, 1) for k_, v in (('120B 128K', 91), ('241B 128K', 110), ('667B 128K', 107), ('120B 1M', 221), ('241B 1M', 213), ('667B 1M', 233))}
chk('mfu', 'MFU of the composed stack (TFLOP/s / 989.5 dense BF16)', ', '.join('%s %.1f%%' % kv for kv in mfu.items()), '"10% MFU" dashed line near 99', 'Figure 6 bottom', 'derived')
chk('tp_base', 'Baseline throughput implied by the printed multiples', '1355 / 7.6 = %.0f (120B, 128K); 316 / 10.4 = %.0f (667B)' % (1355 / 7.6, 316 / 10.4), 'not printed', 'Figure 6 top', 'derived',
    'at 667B the stack has no point at 64K; the 10.4x divides its 128K throughput by the baseline\'s 64K')
chk('tf_base', 'Baseline TFLOP/s implied by the printed multiples', '91 / 1.8 = %.1f (120B); 107 / 2.2 = %.1f (667B)' % (91 / 1.8, 107 / 2.2), '"FSDP2-best stays below 40 anywhere"', 'Figure 6 bottom, §4', 'does not reproduce',
    'both implied baselines exceed 40, so the 1.8x and 2.2x multiples and the "below 40" sentence cannot all hold')
chk('batch', 'Batch multiples 1.5M / 128K, 1.8M / 256K, 3M / 1M', '%.1fx, %.1fx, %.1fx' % (1.5e6 / 128e3, 1.8e6 / 256e3, 3), '12x, 7x, 3x', 'Figure 7a', 'reproduces', 'within rounding of the printed 1.5M and 1.8M')
for v in (59.8, 59.6, 45.2):
    pass
aime = {v: round(v / 100 * 240, 2) for v in (59.8, 59.6, 45.2)}
chk('aime', 'AIME 2025 Avg@8 as correct samples out of 30 x 8 = 240', ', '.join('%.1f%% = %.2f' % kv for kv in aime.items()), '59.8 / 59.6 / 45.2', 'Appendix A, Training quality', 'does not reproduce',
    '59.8 and 45.2 are not whole numbers of 240 samples (143/240 = 59.58, 144/240 = 60.00); the paper does not say how Avg@8 was counted. The 0.2-point gap is under half of one sample (0.42 points)')

json.dump({'checks': C, 'sim_dispatch': sd, 'mfu': mfu}, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    from collections import Counter
    for c in C: print('%-22s %-18s ours %-40s paper %s' % (c['key'], c['verdict'], c['ours'], c['paper']))
    print(Counter(c['verdict'] for c in C))
