"""Scaling calculator (tab t-scale): every number the tab shows, recomputed from published inputs.

  python3 scale/recompute.py      (from src/; writes data/scale.json and parts/34_js_scale0_data.js, prints the preset table)

The JS in parts/34_js_scale1_core.js implements the same formulas; scale/check_scale.mjs compares the two.
Sources for every constant are in scale/notes.md (and in the SRC strings below).
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)

# ---------------- constants ----------------
PFD = 1e15 * 24 * 3600   # one petaFLOP/s-day
FITS = {
    # Hoffmann et al. 2022, Approach 3, the unrounded constants from the paper's TeX source (quoted by Besiroglu et al. 2024).
    # These reproduce the paper's 40B at Gopher's budget; the rounded ones printed in Eq. 10 give 32B.
    'hoff': dict(E=1.6934, A=406.401, B=410.7228, al=0.33917084, be=0.2849083, name='Hoffmann et al. 2022, Approach 3 (unrounded constants)'),
    # the same fit with the rounded constants the paper prints (Eq. 10)
    'hoffr': dict(E=1.69, A=406.4, B=410.7, al=0.34, be=0.28, name='Hoffmann et al. 2022, Approach 3 (rounded, as printed in Eq. 10)'),
    # Besiroglu et al. 2024, "Chinchilla Scaling: A replication attempt", refit of Approach 3 on the points read from Figure 4
    'besi': dict(E=1.8172, A=482.01, B=2085.43, al=0.3478, be=0.3658, name='Besiroglu et al. 2024 (Approach 3 refitted)'),
}
# Kaplan et al. 2020: Table 2 joint fit L(N, D) and Table 6 compute-efficient size (C_min in PF-days, C_min = C/2 as Chinchilla D.4 reads it)
KAP = dict(aN=0.076, aD=0.103, Nc=6.4e13, Dc=1.8e13, Ne=1.3e9, pN=0.73)
# Vendor datasheets, dense peak (the datasheets print sparse figures; dense is half). FLOP/s per GPU.
ACC = {
    'a100': dict(name='A100 SXM', bf16=312e12, fp8=None, src='NVIDIA A100 page: BF16 312 TFLOPS dense (624 with sparsity); no FP8'),
    'h100': dict(name='H100 SXM', bf16=1979e12 / 2, fp8=3958e12 / 2, src='NVIDIA H100 page: BF16 1,979 and FP8 3,958 TFLOPS with sparsity; dense is half'),
    'h800': dict(name='H800 SXM', bf16=1979e12 / 2, fp8=3958e12 / 2, src='No NVIDIA datasheet located; assumed equal to H100 SXM (same Hopper die; the export variant cut NVLink, not tensor throughput). Unconfirmed'),
    'b200': dict(name='B200 (HGX)', bf16=36e15 / 8 / 2, fp8=72e15 / 8 / 2, src='NVIDIA HGX page: HGX B200 (8 GPUs) FP16/BF16 36 PFLOPS and FP8 72 PFLOPS sparse; dense is half, per GPU /8'),
}
LL3_8B_TPP = 15e12 / 8030261248   # Llama 3.1 8B tokens per parameter, used by the over-training mode of the animation

# ---------------- presets ----------------
# N: parameters used in 6ND (active ones for an MoE); Ntot: total; D: training tokens; L, dattn, ctx: shape for the attention term
# pubC: published training FLOPs; pubH: published GPU-hours on acc; mfu: lab-stated MFU (else None and the default 0.40 is used)
P = [
 dict(id='gpt3', name='GPT-3 175B', year=2020, N=174.6e9, Ntot=174.6e9, D=300e9, L=96, dattn=12288, ctx=2048, acc='a100', gpus=None,
      pubC=3.14e23, pubC_src='GPT-3 paper, Table D.1 (3.64e3 PF-days)', pubH=None, mfu=None,
      src='https://arxiv.org/abs/2005.14165',
      why='Table D.1 is itself 6ND with attention left out (the table says so), so 6ND lands on it by construction. Trained on V100s, which the calculator does not list; no GPU-hours published.'),
 dict(id='gopher', name='Gopher 280B', year=2021, N=280e9, Ntot=280e9, D=300e9, L=80, dattn=16384, ctx=2048, acc='a100', gpus=None,
      pubC=5.76e23, pubC_src='Rae et al. 2021, as Chinchilla uses it', pubH=None, mfu=None,
      src='https://arxiv.org/abs/2112.11446',
      why='6ND comes out 12% below the published 5.76e23 and the attention term closes only 1 point of it. The published figure is Rae et al.\'s own count, not 6ND; Chinchilla\'s Appendix F count for Gopher is 6.3e23. A counting convention, not a fit to hide. Trained on TPU v3, not listed.'),
 dict(id='chin', name='Chinchilla 70B', year=2022, N=70e9, Ntot=70e9, D=1.4e12, L=80, dattn=8192, ctx=2048, acc='a100', gpus=None,
      pubC=5.76e23, pubC_src='Hoffmann et al. 2022: "the same compute budget as Gopher"', pubH=None, mfu=None,
      src='https://arxiv.org/abs/2203.15556',
      why='6ND gives 5.88e23, 2% above the budget the paper says it matched (5.76e23 is Gopher\'s count). By 6ND, Chinchilla used 17% more compute than Gopher. TPU v3/v4, not listed.'),
 dict(id='l2_70', name='Llama 2 70B', year=2023, N=68976653312, Ntot=68976653312, D=2e12, L=80, dattn=8192, ctx=4096, acc='a100', gpus=None,
      pubC=None, pubH=1720320, pubH_src='Llama 2 paper, Table 2 (A100-80GB)', mfu=None,
      src='https://arxiv.org/abs/2307.09288',
      why='No FLOPs published. The GPU-hours imply 43% MFU by 6ND, a typical figure for A100 clusters in 2023; at the default 40% the calculator is 7% high. N is the exact checkpoint count (68.98B; the name says 70B).'),
 dict(id='l31_8', name='Llama 3.1 8B', year=2024, N=8030261248, Ntot=8030261248, D=15e12, L=32, dattn=4096, ctx=8192, acc='h100', gpus=None,
      pubC=None, pubH=1.46e6, pubH_src='Llama 3.1 model card (H100-80GB)', mfu=None,
      src='https://huggingface.co/meta-llama/Llama-3.1-8B',
      why='The card\'s 1.46M GPU-hours imply only 14% MFU by 6ND on "~15T" tokens. The card counts "total GPU time required for training each model" without splitting pretraining from the rest, and small models use large clusters poorly; the published data does not explain the gap, so it is shown, not absorbed into MFU.'),
 dict(id='l31_70', name='Llama 3.1 70B', year=2024, N=70553706496, Ntot=70553706496, D=15e12, L=80, dattn=8192, ctx=8192, acc='h100', gpus=None,
      pubC=None, pubH=7.0e6, pubH_src='Llama 3.1 model card (H100-80GB)', mfu=None,
      src='https://huggingface.co/meta-llama/Llama-3.1-70B',
      why='7.0M GPU-hours imply 25% MFU by 6ND: the same unexplained shortfall as the 8B, smaller. Tokens are the card\'s "~15T".'),
 dict(id='l31_405', name='Llama 3.1 405B', year=2024, N=405853388800, Ntot=405853388800, D=15.6e12, L=126, dattn=16384, ctx=8192, acc='h100', gpus=16384,
      pubC=3.8e25, pubC_src='Llama 3 paper, Section 3.2.1', pubH=30.84e6, pubH_src='Llama 3.1 model card (H100-80GB)', mfu=0.41,
      mfu_src='Llama 3 paper, Table 4: 400 TFLOPs/GPU, 41% BF16 MFU on 16,384 GPUs (43% on 8,192; 38% at 131K context)',
      src='https://arxiv.org/abs/2407.21783',
      why='6ND reproduces the paper\'s 3.8e25 independently (3.799e25). At the paper\'s own 41% MFU the calculator gives 26.0M GPU-hours against the card\'s 30.84M (16% short): the card counts all GPU time, including 466 job interruptions in 54 days, the 38%-MFU long-context stage, annealing and post-training. The effective rate is 35%.'),
 dict(id='dsv3', name='DeepSeek-V3 (37B active of 671B)', year=2024, N=37e9, Ntot=671e9, D=14.8e12, L=61, dattn=20480, ctx=4096, acc='h800', gpus=2048,
      pubC=None, pubH=2.664e6, pubH_src='DeepSeek-V3 report, Table 1: pre-training 2,664K H800 GPU-hours (2,788K with context extension and post-training)', mfu=None,
      src='https://arxiv.org/abs/2412.19437',
      why='No FLOPs published. Pre-training\'s 2.664M H800 GPU-hours imply 35% of the BF16 peak by 6N_active·D, 41% with the MLA attention term at 4K. Most matmuls ran in FP8: against the FP8 peak the same work is 17 to 20%. MoE routing and communication are not in 6ND; the multi-token-prediction module adds about 4% more. The attention width here is h(d_qk + d_v)/2 = 128 × 160, MLA\'s effective width.'),
 dict(id='olmo7', name='OLMo 2 7B', year=2024, N=7298617344, Ntot=7298617344, D=4.05e12, L=32, dattn=4096, ctx=4096, acc='h100', gpus=None,
      pubC=1.8e23, pubC_src='OLMo 2 paper, Table 6', pubH=None, mfu=None,
      src='https://arxiv.org/abs/2501.00656',
      why='6ND with the released checkpoint\'s N and 4.05T tokens (3.90T pretraining plus three 50B mid-training mixes) gives 1.77e23, within the rounding of the printed 1.8e23. No GPU-hours published, only 391 MWh for the 7B and 13B together.'),
 dict(id='olmo13', name='OLMo 2 13B', year=2024, N=13716198400, Ntot=13716198400, D=5.6e12, L=40, dattn=5120, ctx=4096, acc='h100', gpus=None,
      pubC=4.6e23, pubC_src='OLMo 2 paper, Table 6', pubH=None, mfu=None,
      src='https://arxiv.org/abs/2501.00656',
      why='5T pretraining plus 600B of mid-training: 6ND gives 4.61e23 against the printed 4.6e23.'),
 dict(id='olmo32', name='OLMo 2 32B', year=2025, N=32234279936, Ntot=32234279936, D=6.6e12, L=64, dattn=5120, ctx=4096, acc='h100', gpus=None,
      pubC=1.3e24, pubC_src='OLMo 2 paper, Table 6 (13.0e23)', pubH=None, mfu=None,
      src='https://arxiv.org/abs/2501.00656',
      why='6.06T pretraining plus mid-training, 6.6T in all: 6ND gives 1.28e24 against the printed 1.30e24 (2% short; the paper also says "7T" in one caption).'),
 dict(id='qwen3', name='Qwen3-235B-A22B (22B active)', year=2025, N=22e9, Ntot=235093634560, D=36e12, L=94, dattn=8192, ctx=4096, acc='h100', gpus=None,
      pubC=None, pubH=None, mfu=None,
      src='https://arxiv.org/abs/2505.09388',
      why='Neither FLOPs nor GPU-hours published, so there is nothing to compare against; the row shows what 6N_active·D gives. 36T is "approximately"; the hardware is not stated (H100 is a placeholder). Tokens per active parameter: about 1,600.'),
 dict(id='smol3', name='SmolLM3 3B', year=2025, N=3075098624, Ntot=3075098624, D=11.2e12, L=36, dattn=2048, ctx=4096, acc='h100', gpus=384,
      pubC=None, pubH=384 * 24 * 24, pubH_src='Hugging Face SmolLM3 blog: "384 H100 GPUs for 24 days" (= 221,184 GPU-hours)', mfu=None,
      src='https://huggingface.co/blog/smollm3',
      why='The blog gives GPUs and days, not GPU-hours; 384 x 24 days x 24 h = 221,184 implies 26% MFU by 6ND. Wall-clock days include restarts and evaluation, and a 3B model is small for 384 GPUs.'),
]

DEF = dict(mfu=0.40, usd=2.0, gpus=1024, prec='bf16', fit='hoff', attn=False, Dinf=0.0)


# ---------------- formulas (mirrored in JS) ----------------
def chin_loss(f, N, D):
    return f['E'] + f['A'] / N ** f['al'] + f['B'] / D ** f['be']


def chin_opt(f, C):
    G = (f['al'] * f['A'] / (f['be'] * f['B'])) ** (1 / (f['al'] + f['be']))
    a = f['be'] / (f['al'] + f['be'])
    N = G * (C / 6) ** a
    return N, C / 6 / N


def kap_loss(N, D):
    k = KAP
    return ((k['Nc'] / N) ** (k['aN'] / k['aD']) + k['Dc'] / D) ** k['aD']


def kap_N(C):
    return KAP['Ne'] * (C / 2 / PFD) ** KAP['pN']


def attn_per_token(L, dattn, ctx):
    # training FLOPs per token for QK^T and AV under a causal mask: 3 x (2 + 2) x L x dattn x ctx/2 = 6 L ctx dattn (Kaplan's 2 L n_ctx d_attn forward, x3)
    return 6 * L * ctx * dattn


def iso_D(f, l, N):
    r = l - f['E'] - f['A'] / N ** f['al']
    return (f['B'] / r) ** (1 / f['be']) if r > 0 else float('inf')


def sardana(f, l, Dinf, Nhint):
    """Minimise lifetime FLOPs 6ND + 2N Dinf over the iso-loss curve L(N, D) = l (Sardana et al. 2024, Eq. 3, by a 1-D search in log N)."""
    Nlo = (f['A'] / (l - f['E'])) ** (1 / f['al'])
    lo, hi = math.log(Nlo * 1.0001), math.log(max(Nlo, Nhint) * 1e4)

    def tot(lnN):
        N = math.exp(lnN); D = iso_D(f, l, N)
        return 6 * N * D + 2 * N * Dinf
    for _ in range(200):
        m1 = lo + (hi - lo) / 3; m2 = hi - (hi - lo) / 3
        if tot(m1) < tot(m2): hi = m2
        else: lo = m1
    N = math.exp((lo + hi) / 2); D = iso_D(f, l, N)
    return N, D, 6 * N * D + 2 * N * Dinf


def peak(acc, prec):
    a = ACC[acc]
    return a['fp8'] if prec == 'fp8' and a['fp8'] else a['bf16']


def compute(s):
    f = FITS[s['fit']]
    N, D = s['N'], s['D']
    C6 = 6 * N * D
    Ca = attn_per_token(s['L'], s['dattn'], s['ctx']) * D
    C = C6 + (Ca if s['attn'] else 0)
    pk = peak(s['acc'], s['prec'])
    hours = C / (pk * s['mfu']) / 3600
    n3, d3 = chin_opt(f, C)
    n20 = math.sqrt(C / 120); d20 = 20 * n20
    loss = chin_loss(f, N, D)
    nk = kap_N(C)
    o = dict(C6=C6, Cattn=Ca, C=C, attn_share=Ca / C6, tpp=D / N, tpp_tot=D / s['Ntot'], pfd=C / PFD,
             peak=pk, hours=hours, gpu_days=hours / 24, wall_days=hours / s['gpus'] / 24, usd=hours * s['usd'],
             n3=n3, d3=d3, tpp3=d3 / n3, loss3=chin_loss(f, n3, d3),
             n20=n20, d20=d20, loss20=chin_loss(f, n20, d20),
             loss=loss, loss_kap=kap_loss(N, D), nk=nk, dk=C / 6 / nk,
             size_vs3=N / n3,
             Cinf=2 * N * s['Dinf'])
    o['Clife'] = C + o['Cinf']
    o['inf_share'] = o['Cinf'] / o['Clife']
    # inference-aware optimum at the same predicted loss (training counted as 6ND, attention left out, as Sardana et al. do)
    sn, sd, stot = sardana(f, loss, s['Dinf'], N)
    o.update(sN=sn, sD=sd, sTot=stot, cur_tot=C6 + o['Cinf'], s_saving=1 - stot / (C6 + o['Cinf']))
    cn, cd, ctot = sardana(f, loss, 0, N)   # Chinchilla-optimal model of the same loss (training only)
    o.update(cN=cn, cD=cd, cC=ctot)
    return o


def state_for(p, **kw):
    s = dict(DEF)
    s.update(N=p['N'], Ntot=p['Ntot'], D=p['D'], L=p['L'], dattn=p['dattn'], ctx=p['ctx'], acc=p['acc'],
             mfu=p['mfu'] or DEF['mfu'], gpus=p['gpus'] or DEF['gpus'])
    s.update(kw)
    return s


def residuals(p):
    s = state_for(p); o = compute(s)
    r = dict(C6=o['C6'], Cfull=o['C6'] + o['Cattn'], attn_share=o['attn_share'], tpp=o['tpp'])
    if p['pubC']:
        r['resC6'] = o['C6'] / p['pubC'] - 1; r['resCfull'] = (o['C6'] + o['Cattn']) / p['pubC'] - 1
    if p['pubH']:
        pk = ACC[p['acc']]['bf16']
        r['hours_at_mfu'] = o['hours']; r['resH'] = o['hours'] / p['pubH'] - 1
        r['mfu_implied'] = o['C6'] / (p['pubH'] * 3600 * pk)
        r['mfu_implied_full'] = (o['C6'] + o['Cattn']) / (p['pubH'] * 3600 * pk)
        if ACC[p['acc']]['fp8']: r['mfu_implied_fp8'] = o['C6'] / (p['pubH'] * 3600 * ACC[p['acc']]['fp8'])
        if p['pubC']: r['mfu_implied_pubC'] = p['pubC'] / (p['pubH'] * 3600 * pk)
    return r


# ---------------- animation: one budget, three allocations ----------------
def anim_mode(f, C, mode):
    if mode == 'kap': N = kap_N(C)
    elif mode == 'chin': N = chin_opt(f, C)[0]
    else: N = math.sqrt(C / (6 * LL3_8B_TPP))
    D = C / 6 / N; l = chin_loss(f, N, D)
    cn, cd, cc = sardana(f, l, 0, N)
    be = (C - cc) / (2 * (cn - N)) if cn > N * 1.0001 else None
    return dict(N=N, D=D, tpp=D / N, loss=l, mterm=f['A'] / N ** f['al'], dterm=f['B'] / D ** f['be'], inf=2 * N,
                cN=cn, cC=cc, extra=C / cc - 1, breakeven=be)


ANIM_BUDGETS = [('gopher', 5.76e23, 'Gopher and Chinchilla\'s budget, 5.76e23'), ('l405', 3.8e25, 'Llama 3 405B\'s budget, 3.8e25')]


def main():
    presets_out = []
    for p in P:
        q = dict(p); q['res'] = residuals(p); presets_out.append(q)
    cases = []
    for p in P:   # each preset at its defaults, and with the toggles flipped
        cases.append(dict(name=p['id'], state=state_for(p)))
    p405 = [p for p in P if p['id'] == 'l31_405'][0]; pds = [p for p in P if p['id'] == 'dsv3'][0]; psm = [p for p in P if p['id'] == 'smol3'][0]
    extra = [('405_attn_fp8_b200', state_for(p405, attn=True, prec='fp8', acc='b200', mfu=0.3, usd=3.5, gpus=4096)),
             ('405_besi_inf', state_for(p405, fit='besi', Dinf=1e14)),
             ('ds_fp8_inf', state_for(pds, prec='fp8', Dinf=3e15, attn=True)),
             ('smol_inf', state_for(psm, Dinf=1e13, mfu=0.55)),
             ('a100_fp8_fallback', state_for(psm, acc='a100', prec='fp8')),
             ('tiny', dict(DEF, N=1e8, Ntot=1e8, D=2e9, L=12, dattn=768, ctx=2048, acc='h100', gpus=8, Dinf=1e9)),
             ('huge', dict(DEF, N=2e12, Ntot=2e12, D=1e14, L=200, dattn=32768, ctx=32768, acc='b200', gpus=100000, attn=True, Dinf=1e16, fit='besi'))]
    for nm, s in extra: cases.append(dict(name=nm, state=s))
    for c in cases: c['out'] = compute(c['state'])
    anim = {}
    for fk, f in FITS.items():
        for bk, C, _ in ANIM_BUDGETS:
            anim[fk + '|' + bk] = {m: anim_mode(f, C, m) for m in ('kap', 'chin', 'over')}
    # tokens per parameter on each frontier, for the chart
    front = {fk: [[C, chin_opt(f, C)[1] / chin_opt(f, C)[0]] for C in [10 ** (x / 4) for x in range(76, 109)]] for fk, f in FITS.items()}
    def chin_quality(f, Nc):   # loss of the Chinchilla-optimal model of size Nc
        G = (f['al'] * f['A'] / (f['be'] * f['B'])) ** (1 / (f['al'] + f['be'])); a = f['be'] / (f['al'] + f['be'])
        C = 6 * (Nc / G) ** (1 / a); return chin_loss(f, Nc, C / 6 / Nc), C
    sard = []
    for Nc, Di in ((13e9, 2e12), (7e9, 1e11), (30e9, 1e13)):
        l, C0 = chin_quality(FITS['hoff'], Nc); n_, d_, t_ = sardana(FITS['hoff'], l, Di, Nc)
        sard.append(dict(Nc=Nc, Dinf=Di, N=n_, D_ratio=d_ / (C0 / 6 / Nc), saving=1 - t_ / (C0 + 2 * Nc * Di)))
    facts = dict(sardana_examples=sard, a_hoffr=FITS['hoffr']['be'] / (FITS['hoffr']['al'] + FITS['hoffr']['be']), opt_gopher_hoffr=chin_opt(FITS['hoffr'], 5.76e23), a_hoff=FITS['hoff']['be'] / (FITS['hoff']['al'] + FITS['hoff']['be']),
                 a_besi=FITS['besi']['be'] / (FITS['besi']['al'] + FITS['besi']['be']),
                 opt_gopher_hoff=chin_opt(FITS['hoff'], 5.76e23), opt_gopher_besi=chin_opt(FITS['besi'], 5.76e23),
                 kap_N_1e21=kap_N(1e21), ll3_8b_tpp=LL3_8B_TPP,
                 loss_gopher=chin_loss(FITS['hoff'], 280e9, 300e9), loss_chin=chin_loss(FITS['hoff'], 70e9, 1.4e12))
    data = dict(PFD=PFD, FITS=FITS, KAP=KAP, ACC=ACC, DEF=DEF, LL3_8B_TPP=LL3_8B_TPP, presets=presets_out,
                ANIM_BUDGETS=ANIM_BUDGETS, anim=anim, front=front, facts=facts)
    js = {k: data[k] for k in ('PFD', 'FITS', 'KAP', 'ACC', 'DEF', 'LL3_8B_TPP', 'presets', 'ANIM_BUDGETS')}
    os.makedirs(os.path.join(SRC, 'data'), exist_ok=True)
    json.dump(dict(data, cases=cases), open(os.path.join(SRC, 'data', 'scale.json'), 'w'), indent=1)
    open(os.path.join(SRC, 'parts', '34_js_scale0_data.js'), 'w').write(
        '// Generated by scale/recompute.py: constants and presets for the Scaling calculator. Do not edit by hand.\nwindow.SC_DATA=' + json.dumps(js, separators=(',', ':')) + ';\n')
    print('%-32s %10s %10s %8s %8s | %9s %9s %8s %7s %7s' % ('preset', '6ND', 'published', 'res6ND', '+attn', 'pubH', 'H@mfu', 'resH', 'mfuImp', 'tpp'))
    for p in presets_out:
        r = p['res']
        print('%-32s %10.3e %10s %8s %8s | %9s %9s %8s %7s %7.0f' % (p['name'][:32], r['C6'], '%.3g' % p['pubC'] if p['pubC'] else '-',
              '%+.1f%%' % (100 * r['resC6']) if 'resC6' in r else '-', '%+.1f%%' % (100 * r['resCfull']) if 'resCfull' in r else '-',
              '%.4g' % p['pubH'] if p['pubH'] else '-', '%.4g' % r['hours_at_mfu'] if 'hours_at_mfu' in r else '-',
              '%+.1f%%' % (100 * r['resH']) if 'resH' in r else '-', '%.1f%%' % (100 * r['mfu_implied']) if 'mfu_implied' in r else '-', r['tpp']))
    print(json.dumps(facts, indent=0))
    for k, v in anim.items():
        print(k, {m: '%s N %.3g D %.3g tpp %.0f loss %.4f extra %.3f be %s' % (m, x['N'], x['D'], x['tpp'], x['loss'], x['extra'], '%.3g' % x['breakeven'] if x['breakeven'] else '-') for m, x in v.items()})


if __name__ == '__main__':
    main()
