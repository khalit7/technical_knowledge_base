"""Every number the page reproduces, recomputed from the paper's own algorithms and tables.

  python3 recompute.py        (build.sh runs it; writes inputs/recompute.json, prints a report)

1. HBM traffic of each algorithm, counted line by line from Algorithms 0 to 4 (elements read or
   written in HBM), and evaluated for Figure 2's GPT-2 medium configuration.
2. FLOPs of the matrix multiplies, to set against Figure 2's GFLOPs column.
3. Online softmax (Algorithm 1) run on random inputs in plain Python against the standard
   formula: the maximum difference (it is exact up to rounding).
4. The toy workload of the Run the kernel tab (N = 32, d = 4, blocks of 8), so the page's own
   JavaScript counters can be checked against an independent implementation.
5. Every derived number in the text checked against the tables (tables.json).
"""
import json, math, random, os

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
ceil = lambda a, b: -(-a // b)


# ---- 1. HBM accesses (elements), Algorithms 0 to 4 ----
def std_fwd(N, d, md=False):
    """Algorithm 0: read Q,K write S; read S write P; read P,V write O. Masking and dropout as
    separate elementwise passes add a read and a write of the N x N matrix each (section 2.2)."""
    return 4 * N * d + 4 * N * N + (4 * N * N if md else 0)


def std_bwd(N, d):
    """Algorithm 3, lines 1 to 5: N^2 terms 1+1+2+1+1+1 = 7, Nd terms 2+2+0+2+2 = 8."""
    return 7 * N * N + 8 * N * d


def fa_fwd(N, d, Bc, Br):
    """Algorithm 1: initialise O, l, m in HBM (Nd + 2N writes); K_j, V_j read once (2Nd);
    for each of T_c outer steps, every Q_i, O_i, l_i, m_i read and O_i, l_i, m_i written (3Nd + 4N)."""
    Tc = ceil(N, Bc)
    return (N * d + 2 * N) + 2 * N * d + Tc * (3 * N * d + 4 * N)


def fa_bwd(N, d, Bc, Br):
    """Algorithm 4: dQ, dK, dV initialised (3Nd); K_j, V_j read once (2Nd); dK_j, dV_j written once (2Nd);
    for each of T_c outer steps, Q_i, O_i, dO_i, dQ_i, l_i, m_i read and dQ_i written (5Nd + 2N)."""
    Tc = ceil(N, Bc)
    return 3 * N * d + 2 * N * d + 2 * N * d + Tc * (5 * N * d + 2 * N)


def fa2_fwd(N, d, Bc, Br):
    """FlashAttention-2's loop order (Q outer): Q_i read once, K_j and V_j read once per row block,
    O_i and the logsumexp L_i written once at the end (FlashAttention-2, Algorithm 1)."""
    Tr = ceil(N, Br)
    return N * d + Tr * 2 * N * d + N * d + N


# Figure 2: GPT-2 medium, N = 1024, d = 64, 16 heads, batch 64, A100, forward + backward, fp16
N, d, BH, by = 1024, 64, 16 * 64, 2
M_A100 = 192 * 1024 // by          # 192 KB of SRAM per SM (section 2.1), counted in 2-byte values
Bc, Br = ceil(M_A100, 4 * d), min(ceil(M_A100, 4 * d), d)
GB = 1e9
fig2 = {
    'N': N, 'd': d, 'BH': BH, 'bytes': by, 'M_values': M_A100, 'Bc': Bc, 'Br': Br, 'Tc': ceil(N, Bc), 'Tr': ceil(N, Br),
    'std_GB': (std_fwd(N, d) + std_bwd(N, d)) * BH * by / GB,
    'std_md_GB': (std_fwd(N, d, True) + std_bwd(N, d) + 4 * N * N) * BH * by / GB,
    'fa_GB': (fa_fwd(N, d, Bc, Br) + fa_bwd(N, d, Bc, Br)) * BH * by / GB,
    'attn_matrix_GB': N * N * BH * by / GB,
    'printed': {'std_GB': 40.3, 'fa_GB': 4.4, 'std_gflops': 66.6, 'fa_gflops': 75.2, 'std_ms': 41.7, 'fa_ms': 7.3},
}
# which number of passes over Q and O would give the printed 4.4 GB under this count
base = (fa_fwd(N, d, N, Br) + fa_bwd(N, d, N, Br)) - (3 * N * d + 4 * N) - (5 * N * d + 2 * N)
per = (3 * N * d + 4 * N) + (5 * N * d + 2 * N)
fig2['Tc_for_printed'] = (4.4 * GB / (BH * by) - base) / per
fig2['fa_GB_by_Bc'] = {str(b): (fa_fwd(N, d, b, Br) + fa_bwd(N, d, b, Br)) * BH * by / GB for b in (64, 128, 256, 384, 512, 1024)}
fig2['fa_fwd_GB_by_Bc'] = {str(b): fa_fwd(N, d, b, Br) * BH * by / GB for b in (64, 128, 256, 384, 512, 1024)}
# ---- 2. FLOPs of the matrix multiplies ----
mm = 2 * N * N * d * BH                 # one N x N x d matrix multiply over all heads and the batch
fig2['std_matmul_gflops'] = 6 * mm / 1e9   # forward QK^T, PV; backward dV, dP, dQ, dK
fig2['fa_matmul_gflops'] = 7 * mm / 1e9    # plus recomputing S = QK^T in the backward pass
fig2['fwd_matmul_gflops'] = 2 * mm / 1e9
fig2['ratio_printed_gflops'] = 75.2 / 66.6
fig2['ratio_matmul'] = 7 / 6
fig2['io_ms_std_printed'] = 40.3 / 1.5     # GB / (TB/s) = ms, at the A100's 1.5 TB/s (section 2.1)
fig2['io_ms_fa_printed'] = 4.4 / 1.5
fig2['compute_ms_std_peak'] = fig2['std_matmul_gflops'] / 312   # A100 fp16 tensor peak 312 TFLOPS (NVIDIA A100 datasheet)
fig2['compute_ms_fa_peak'] = fig2['fa_matmul_gflops'] / 312
# Theorem 2's two terms at this size
fig2['thm2_std'] = N * d + N * N
fig2['thm2_fa'] = N * N * d * d / M_A100


# ---- 3. Online softmax, exact ----
def attn_std(Q, K, V):
    out = []
    for q in Q:
        s = [sum(a * b for a, b in zip(q, k)) for k in K]
        m = max(s); e = [math.exp(x - m) for x in s]; l = sum(e)
        out.append([sum(e[j] * V[j][c] for j in range(len(K))) / l for c in range(len(V[0]))])
    return out


def attn_flash(Q, K, V, Bc, Br):
    n, dd = len(Q), len(V[0])
    O = [[0.0] * dd for _ in range(n)]; l = [0.0] * n; m = [-math.inf] * n
    for j0 in range(0, n, Bc):
        for i0 in range(0, n, Br):
            for i in range(i0, min(n, i0 + Br)):
                s = [sum(a * b for a, b in zip(Q[i], K[j])) for j in range(j0, min(n, j0 + Bc))]
                mt = max(s); p = [math.exp(x - mt) for x in s]; lt = sum(p)
                mn = max(m[i], mt); ln = math.exp(m[i] - mn) * l[i] + math.exp(mt - mn) * lt
                pv = [sum(p[t] * V[j0 + t][c] for t in range(len(p))) for c in range(dd)]
                O[i] = [(l[i] * math.exp(m[i] - mn) * O[i][c] + math.exp(mt - mn) * pv[c]) / ln for c in range(dd)]
                l[i], m[i] = ln, mn
    return O


rnd = random.Random(7)
worst = 0.0
for trial in range(20):
    n, dd = 32, 4
    Q = [[rnd.gauss(0, 1.5) for _ in range(dd)] for _ in range(n)]
    K = [[rnd.gauss(0, 1.5) for _ in range(dd)] for _ in range(n)]
    V = [[rnd.gauss(0, 1) for _ in range(dd)] for _ in range(n)]
    a, b = attn_std(Q, K, V), attn_flash(Q, K, V, 8, 8)
    worst = max(worst, max(abs(x - y) for r1, r2 in zip(a, b) for x, y in zip(r1, r2)))
exact = {'trials': 20, 'N': 32, 'd': 4, 'max_abs_diff': worst}

# ---- 4. The toy workload of the Run the kernel tab ----
toy = {}
for B in (4, 8, 16):
    n, dd = 32, 4
    toy[str(B)] = {'std': std_fwd(n, dd), 'std_md': std_fwd(n, dd, True), 'fa': fa_fwd(n, dd, B, B), 'fa2': fa2_fwd(n, dd, B, B),
                   'std_extra': 2 * n * n, 'fa_extra': 2 * n, 'fa2_extra': n}

# ---- 5. Every number in the text, checked ----
checks = []
def chk(claim, where, printed, value, fmt, ok, note=''):
    checks.append({'claim': claim, 'at': where, 'printed': printed, 'value': fmt % value if value is not None else '', 'ok': ok, 'note': note})

t1 = 20.0 / 17.4
chk('BERT-large 15% faster than the MLPerf 1.1 record', 'S4.T1', '15%', (t1 - 1) * 100, '%.1f%% (20.0 / 17.4)', 'yes')
se = math.sqrt(1.5 ** 2 / 10 + 1.4 ** 2 / 10)
chk('BERT gap against its run-to-run spread (10 runs each, ± read as standard deviation)', 'S4.T1', 'not given', 2.6 / se, '%.1f standard errors', 'yes', 'holds if both sides ran on matching hardware; the baseline is the time Nvidia reported, not a rerun (E.1)')
r = {x[0]: float(x[2].split()[0]) for x in T['t2']['rows']}
chk('GPT-2 small 3.5x over HuggingFace', 'S4.T2', '3.5×', r['GPT-2 small - Huggingface [87]'] / r['GPT-2 small - FlashAttention'], '%.2f× (9.5 / 2.7)', 'yes')
chk('GPT-2 medium 3.0x over HuggingFace', 'S4.T2', '3.0×', r['GPT-2 medium - Huggingface [87]'] / r['GPT-2 medium - FlashAttention'], '%.2f× (21.0 / 6.9)', 'yes')
s_meg = r['GPT-2 small - Megatron-LM [77]'] / r['GPT-2 small - FlashAttention']
m_meg = r['GPT-2 medium - Megatron-LM [77]'] / r['GPT-2 medium - FlashAttention']
chk('Table 2 caption: up to 1.7x over Megatron-LM', 'S4.T2', '1.7×', s_meg, '%.2f× small (4.7 / 2.7), ' + '%.2f× medium (11.5 / 6.9)' % m_meg, 'yes')
chk('Section 4 summary: 1.8x over Megatron', 'S4', '1.8×', m_meg, 'no row gives it: %.2f× medium; 1.8× is Megatron\'s own speedup over HuggingFace on medium', 'no', 'the abstract avoids it; the old page repeated it as "1.7-1.8x"')
chk('Same perplexity as the baselines', 'S4.T2', '18.2 / 14.3', None, '', 'nearly', 'medium: HuggingFace 14.2, Megatron and FlashAttention 14.3')
t4 = {x[1]: (float(x[2]), float(x[3].split()[0])) for x in T['t4']['rows'][1:]}
chk('GPT-2 small at 4K context still 30% faster than Megatron at 1K', 'S4.T4', '30%', (4.7 / t4['4k'][1] - 1) * 100, '%.0f%% (4.7 / 3.6)', 'yes')
chk('0.7 better perplexity at 4K', 'S4.T4', '0.7', 18.2 - t4['4k'][0], '%.1f (18.2 - 17.5)', 'yes')
t5 = {x[0]: [float(v) for v in x[1:]] for x in T['t5']['rows']}
mi, ec = t5['MIMIC-III [47]'], t5['ECtHR [6]']
chk('MIMIC: 16K beats 512 by 4.3 points', 'S4.T6', '4.3', mi[5] - mi[0], '%.1f', 'yes', 'the text calls this table "Table 6"; it is Table 5')
chk('ECtHR: 8K beats 512 by 8.5 points', 'S4.T6', '8.5', ec[4] - ec[0], '%.1f', 'yes', 'ECtHR falls again at 16K (79.2)')
chk('6.4 points of lift on long-document classification', 'S4.T6', '6.4', (mi[5] - mi[0] + ec[4] - ec[0]) / 2, '%.1f (mean of the two best-length lifts)', 'yes', 'each dataset at its best of six lengths; at a common 16K the mean is %.1f' % ((mi[5] - mi[0] + ec[5] - ec[0]) / 2))
avg = []
for x in T['t3']['rows']:
    v = [float(c) for c in x[1:6]]; a = sum(v) / 5
    avg.append({'model': x[0], 'printed': float(x[6]), 'recomputed': a})
bad = [a for a in avg if abs(round(a['recomputed'] + 1e-9, 1) - a['printed']) > 0.01]
chk('Table 3 averages', 'S4.T3', '9 rows', len(avg) - len(bad), '%d of 9 recompute exactly', 'nearly', '; '.join('%s: %.2f printed %.1f' % (a['model'], a['recomputed'], a['printed']) for a in bad))
chk('LRA speedups 2.4x and 2.8x', 'S4.T3', '2.4× / 2.8×', None, '', 'cannot check', 'geometric mean of per-task speedups (E.3); the per-task times are not printed')
f2 = fig2
chk('Up to 9x fewer HBM accesses (Figure 2)', 'S3.F2', '9×', 40.3 / 4.4, '%.1f× (40.3 / 4.4)', 'yes')
chk('Figure 2 runtime', 'S3.F2', '41.7 vs 7.3 ms', 41.7 / 7.3, '%.1f× faster', 'yes')
chk('Figure 2 standard HBM traffic from Algorithms 0 and 3', 'S3.F2', '40.3 GB', f2['std_GB'], '%.1f GB from Algorithms 0 and 3 alone; ' + '%.1f GB if masking and dropout each make a separate pass over the N × N matrix, forward and backward' % f2['std_md_GB'], 'nearly', 'reconstruction: the paper does not say how it measured 40.3 GB or whether this run used masking and dropout')
chk('Figure 2 FlashAttention HBM traffic from Algorithms 1 and 4', 'S3.F2', '4.4 GB', f2['fa_GB'], '%.1f GB with B_c = 384 from 192 KB of SRAM', 'nearly', 'reconstruction: 4.4 GB corresponds to %.1f passes over Q and O under this count; the paper does not give its block sizes' % f2['Tc_for_printed'])
chk('Figure 2 GFLOPs', 'S3.F2', '66.6 / 75.2', f2['std_matmul_gflops'], '%.0f / ' + '%.0f GFLOP for the matrix multiplies alone' % f2['fa_matmul_gflops'], 'no', 'the printed values are about 12 times smaller than the matrix multiplies of the stated configuration; their ratio (%.2f) is close to the 7/6 = %.2f that recomputation adds' % (f2['ratio_printed_gflops'], f2['ratio_matmul']))
b = T['bench']
pt, fa, bs = b['11']['rows']['PyTorch Attention'], b['11']['rows']['FlashAttention'], b['11']['rows']['Block-Sparse FlashAttention']
sp = [pt[i] / fa[i] for i in range(5)]
chk('Up to 3x faster than PyTorch for N = 128 to 2K (forward + backward, dropout and masking)', 'A5.T11', '3×', max(sp), '%.2f× at most (' + ', '.join('%.2f' % x for x in sp) + ')', 'yes')
mem = b['21']['rows']
chk('Up to 20x more memory-efficient than exact baselines', 'A5.T21', '20×', mem['PyTorch Attention'][5] / mem['FlashAttention'][5], '%.1f× at 4K (17,024 / 836 MB)', 'yes')
chk('2x more memory-efficient than Linformer at 64K', 'A5.T21', '2×', mem['Linformer'][9] / mem['FlashAttention'][9], '%.2f× (26,252 / 13,376 MB)', 'yes')
approx = ['Reformer', 'Local Attention', 'Linformer', 'Smyrf', 'LSformer']
cross = None
for i, n in enumerate(b['11']['N']):
    if any(b['11']['rows'][a][i] is not None and b['11']['rows'][a][i] < fa[i] for a in approx):
        cross = n; break
chk('Approximate attention crosses over between 512 and 1024', 'S4.SS3', '512 to 1024', cross, 'first faster approximate method at N = %d (Linformer)', 'yes')
others = [k for k in b['11']['rows'] if k not in ('FlashAttention', 'Block-Sparse FlashAttention')]
allfast = all(bs[i] < min([b['11']['rows'][k][i] for k in others if b['11']['rows'][k][i] is not None] or [math.inf]) for i in range(10))
chk('Block-sparse FlashAttention faster than every other method at every length', 'A5.T11', 'all lengths', None, '', 'yes' if allfast else 'no', 'true against every baseline in Table 11 (dense FlashAttention itself is 0.01 ms faster at 128)')
t7 = {x[0]: [float(v) for v in x[1:]] for x in T['t7']['rows']}
fm, fl = t7['Apex FMHA forward + backward'], t7['FlashAttention forward + backward']
chk('Against Apex FMHA: 4% slower at 128, 8% faster at 256, 5% faster at 512', 'A5.T7', '4% / 8% / 5%', None, '%s' % ', '.join('%+.0f%%' % ((f / g - 1) * 100) for f, g in zip(fm, fl)), 'yes', 'positive = FlashAttention faster (FMHA time / FlashAttention time - 1)')
checks[-1]['value'] = ', '.join('%+.1f%%' % ((f / g - 1) * 100) for f, g in zip(fm, fl))
chk('A100 SRAM an order of magnitude faster than HBM, many orders smaller', 'S2.SS1', '19 vs 1.5 to 2.0 TB/s', 19 / 1.5, '%.1f× the bandwidth; 108 × 192 KB = ' + '%.2f MiB against 40 to 80 GB' % (108 * 192 / 1024), 'yes')
chk('Figure 1: 7.6x on the GPT-2 attention computation', 'S1.F1', '7.6×', None, '', 'cannot check', 'a bar chart image with no table behind it')

R = {'fig2': fig2, 'exact': exact, 'toy': toy, 'checks': checks, 't3avg': avg,
     'bench_sp': {'N': b['11']['N'], 'pt_over_fa': [pt[i] / fa[i] if pt[i] else None for i in range(10)]}}
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
print('Figure 2 config: Bc %d Br %d Tc %d; standard %.1f GB (printed 40.3; with mask and dropout %.1f); FA %.2f GB (printed 4.4; Tc for printed %.2f)' % (Bc, Br, fig2['Tc'], fig2['std_GB'], fig2['std_md_GB'], fig2['fa_GB'], fig2['Tc_for_printed']))
print('matmul GFLOP standard %.1f FA %.1f (printed 66.6, 75.2); attention matrix %.2f GB' % (fig2['std_matmul_gflops'], fig2['fa_matmul_gflops'], fig2['attn_matrix_GB']))
print('FA GB by Bc', {k: round(v, 2) for k, v in fig2['fa_GB_by_Bc'].items()})
print('online softmax max abs diff over 20 trials: %.2e' % worst)
print('toy', toy)
for c in checks: print('[%s] %s: printed %s, recomputed %s %s' % (c['ok'], c['claim'], c['printed'], c['value'], ('(' + c['note'] + ')') if c['note'] else ''))
