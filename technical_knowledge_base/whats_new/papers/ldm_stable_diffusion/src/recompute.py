"""Every derived number on the page, recomputed from the paper's printed values (tables.json) and the toy's logs.
Writes inputs/recompute.json: {'checks': [...], 'derived': {...}, 'toy': {...}}. build.sh runs it first.
Each check: id, claim (what the paper says), where, printed, computed, verdict ('holds', 'does not hold', 'inconsistent', 'misprint').
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
MD = os.path.join(HERE, 'model')
checks, D = [], {}


def chk(i, claim, where, printed, computed, verdict, note=''):
    checks.append(dict(id=i, claim=claim, where=where, printed=printed, computed=computed, verdict=verdict, note=note))


# ---- latent sizes (Sec. 3.1, Tab. 13) ----
Z = {1: (256, 256, 3), 2: (128, 128, 2), 4: (64, 64, 3), 8: (32, 32, 4), 16: (16, 16, 8), 32: (8, 8, 32)}
px = 256 * 256 * 3
D['latent'] = {f: dict(shape=list(z), numbers=z[0] * z[1] * z[2], positions=z[0] * z[1], ratio=round(px / (z[0] * z[1] * z[2]), 2),
                       pos_ratio=round(256 * 256 / (z[0] * z[1]), 1)) for f, z in Z.items()}
D['sd_v1'] = dict(pixels=512 * 512 * 3, latent=64 * 64 * 4, ratio=512 * 512 * 3 / (64 * 64 * 4))
chk('z-shape-32', 'Table 13 prints the LDM-32 latent shape as "88 × 8 × 32"', 'A5.T13', '88 × 8 × 32',
    '256 / 32 = 8, so 8 × 8 × 32 (a typo: 88 for 8)', 'misprint')

# ---- Table 13: batch size at a fixed budget (one A100, same steps, about the same parameters) ----
B = {1: 7, 2: 9, 4: 40, 8: 64, 16: 112, 32: 112}
D['t13_batch'] = {f: dict(batch=b, x=round(b / B[1], 1)) for f, b in B.items()}

# ---- Table 6: inpainting efficiency, LDM-1 against LDM-4 ----
T6 = {'LDM-1': (0.11, 0.26, 0.07, 20.66, 24.74), 'KL w/ attn': (0.32, 0.97, 0.34, 7.66, 15.21),
      'VQ w/ attn': (0.33, 0.97, 0.34, 7.04, 14.99), 'VQ w/o attn': (0.35, 0.99, 0.36, 6.66, 15.95)}
b = T6['LDM-1']
rows = {}
for k, v in T6.items():
    if k == 'LDM-1':
        continue
    rows[k] = dict(train=round(v[0] / b[0], 2), s256=round(v[1] / b[1], 2), s512=round(v[2] / b[2], 2), epoch=round(b[3] / v[3], 2), fid=round(b[4] / v[4], 3))
D['t6'] = rows
mins = {m: min(r[m] for r in rows.values()) for m in ('train', 's256', 's512', 'epoch', 'fid')}
chk('t6-speed', '"a speed-up of at least 2.7× between pixel- and latent-based diffusion models"', 'S4.SS5', '≥ 2.7×',
    'smallest ratio over the three LDM-4 rows and four speed columns: %.2f× (hours per epoch, KL); train throughput %.2f×; sampling %.2f× at 256², %.2f× at 512²' % (mins['epoch'], mins['train'], mins['s256'], mins['s512']),
    'holds')
chk('t6-fid', '"while improving FID scores by a factor of at least 1.6×"', 'S4.SS5', '≥ 1.6×',
    'KL w/ attn %.3f×, VQ w/ attn %.3f×, VQ w/o attn %.3f× (24.74 / 15.95)' % (rows['KL w/ attn']['fid'], rows['VQ w/ attn']['fid'], rows['VQ w/o attn']['fid']),
    'does not hold' if mins['fid'] < 1.6 else 'holds', 'true for the two attention rows; the attention-free row falls to 1.55×')

# ---- the 5-day claim: 50k samples on one A100 (Sec. 1, citing ADM) against Table 18's ADM throughput ----
days = 50000 / 0.12 / 86400
chk('5days', '"producing 50k samples takes approximately 5 days [15] on a single A100"', 'S1', 'about 5 days',
    '50,000 / 0.12 samples per second (ADM, 250 steps, Table 18) = %.1f days' % days, 'holds', 'independent: Table 18 takes the throughput from ADM')
D['adm_days'] = days

# ---- Table 18: compute and its conversion ----
T18 = {'Churches LDM-8': (18, 18, 6.80, '256M'), 'Bedrooms ADM': (232, 232, 0.03, '552M'), 'Bedrooms LDM-4': (60, 55, 1.07, '274M'),
       'CelebA LDM-4': (14.4, 14.4, 0.43, '274M'), 'FFHQ LDM-4': (26, 26, 1.07, '274M'), 'ImageNet ADM-G 250': (916 + 46, 962, 0.07, '608M'),
       'ImageNet LDM-4-G': (271, 271, 0.4, '400M'), 'ImageNet LDM-8-G': (79 + 12, 91, 1.93, '506M')}
D['a100_days'] = {k: round(v[1] / 2.2, 1) for k, v in T18.items()}
chk('t18-bed', 'Table 18, LSUN-Bedrooms LDM-4: generator compute 60, overall compute 55 V100-days (no classifier)', 'A6.T18', '60 and 55',
    'overall should equal generator + classifier = 60', 'misprint')
chk('bed-4x', '"close to ADM, despite utilizing half its parameters and requiring 4-times less train resources"', 'S4.SS2', 'half, 4×',
    'parameters 274M / 552M = %.2f; compute 232 / 60 = %.2f× (or 232 / 55 = %.2f×)' % (274 / 552, 232 / 60, 232 / 55), 'holds')
chk('in-adm', 'ImageNet: LDM-4-G beats ADM-G "while significantly reducing computational requirements and parameter count"', 'S4.SS3.SSS1',
    '3.60 against 4.59', 'compute 962 / 271 = %.2f× less; parameters 400M against 608M (%.0f%% fewer); throughput 0.4 / 0.07 = %.1f×' % (962 / 271, 100 * (1 - 400 / 608), 0.4 / 0.07), 'holds')
chk('single-a100', 'Tables 13 and 15: all models "trained on a single NVIDIA A100" (inpainting on eight V100)', 'A5.T15',
    'one A100', 'ImageNet LDM-4-G at 271 V100-days is 271 / 2.2 = %.0f A100-days: about four months on one GPU' % (271 / 2.2), 'holds',
    'consistent arithmetic, but the 1.45B text-to-image model has no compute figure anywhere in the paper')

# ---- consistency between tables, figures and text ----
chk('celeba-fid', 'CelebA-HQ LDM-4 FID: Table 1 and Table 18 print 5.11 (500 DDIM steps); Figure 28 says "500 DDIM steps and η = 0 (FID = 5.15)"', 'A8.F28', '5.11 / 5.15',
    'two values for what reads as the same sampler setting', 'inconsistent')
chk('church-fid', 'LSUN-Churches LDM-8: Table 1 "200-s" FID 4.02; Table 18 "100 steps, 410K" FID 4.02; Table 12 500k iterations; Figure 30 "200 DDIM steps ... (FID = 4.48)"', 'A8.F30',
    '4.02 / 4.48; 100 / 200 steps; 410k / 500k', 'the same model is described with two step counts, two training lengths and two FIDs', 'inconsistent')
chk('church-params', 'LSUN-Churches LDM-8 parameters: Table 12 294M; Table 18 256M', 'A5.T12', '294M / 256M', 'two parameter counts', 'inconsistent')
chk('in8-steps', 'ImageNet LDM-8-G: Table 10 "200 DDIM steps"; Table 18 "(ours, 100, 2.9M)"', 'A4.T10', '200 / 100', 'two sampling step counts for the same FID 8.11', 'inconsistent')
chk('fid-impl', 'Sec. E.3.1: two FID implementations give 7.76 against 7.77 (ImageNet) and 2.95 against 3.0 (LSUN-Bedrooms)', 'A5.SS3.SSS1',
    '7.76 / 7.77, 2.95 / 3.0', 'implementation noise of about 0.01 to 0.05 FID; the authors flag it themselves', 'holds')

# ---- Table 2: text-to-image ----
chk('t2-onpar', '"the guided LDM-KL-8-G is on par with the recent state-of-the-art AR [26] and diffusion models [59] ... while substantially reducing parameter count"', 'S4.T2',
    '12.63 (1.45B) against 12.24 (GLIDE, 6B) and 11.84 (Make-A-Scene, 4B)',
    'LDM is %.2f and %.2f FID behind; it has %.0f%% and %.0f%% of their parameters' % (12.63 - 12.24, 12.63 - 11.84, 100 * 1.45 / 6, 100 * 1.45 / 4), 'holds',
    '"on par" means slightly worse: Make-A-Scene\'s 11.84 is the bold best; both rivals\' numbers are copied from [26], not rerun')
chk('glide-6b', 'Table 2 lists GLIDE at 6B parameters', 'S4.T2', '6B',
    'the GLIDE paper describes a 3.5B text-conditional model plus a 1.5B upsampler (5B in all); the old page said 5B', 'inconsistent')
D['t2_guidance'] = dict(fid=[23.31, 12.63], drop=round(100 * (1 - 12.63 / 23.31), 1))

# ---- Table 7 and Table 5 ----
chk('t7-sota', 'Inpainting "sets a new state of the art FID" (big, w/o attn, w/ ft)', 'S4.T7', '1.50 against LaMa 2.21 (2.23 recomputed) and CoModGAN 1.82',
    'FID lower by %.2f than CoModGAN and %.2f than LaMa; LPIPS 0.137 against LaMa\'s 0.134 (worse, as the text says)' % (1.82 - 1.50, 2.21 - 1.50), 'holds',
    'the winning row is the bigger 387M model fine-tuned at 512²; the like-for-like 215M rows (2.15, 2.37) sit at LaMa\'s 2.21 to 2.23')
chk('sr-study', 'Old page: super-resolution "preferred in a user study" over SR3', 'S4.T4', 'Table 4 compares against Pixel-DM (f1)',
    'the SR user study is LDM-4 against the paper\'s own pixel-space baseline, not SR3 (Sec. 4.4)', 'does not hold')
chk('sr-fid', 'LDM-SR "outperforms SR3 in FID while SR3 has a better IS"', 'S4.T5', '2.8 (val features) / 4.8 (train features) against 5.2',
    'better under both feature sets; IS 166.3 against 180.1', 'holds')

# ---- Table 3/10 guidance ----
D['t3'] = dict(ldm_g=3.60, admg=4.59, adm_gu=3.85, cdm=4.88)

# ---- Table 4: Task 2 sums to 100% ----
D['t4'] = dict(sr=29.4 + 70.6, inp=31.9 + 68.1)

# ---- the toy (model/*.json written by train.py and export.py) ----
toy = {}
for name in ('pix', 'f2', 'f4', 'f8', 'f16', 'f4long'):
    p = os.path.join(MD, 'dm_%s_log.json' % name)
    if os.path.exists(p):
        j = json.load(open(p))
        toy[name] = dict(params=j['params'], macs=j['macs'], sec_per_step=j['sec_per_step'], enc_sec=j['enc_sec'], evals=j['evals'],
                         log=[[r['step'], round(r['loss'], 5)] for r in j['log']])
for f in (2, 4, 8, 16):
    p = os.path.join(MD, 'ae%d_log.json' % f)
    if os.path.exists(p):
        j = json.load(open(p))
        toy['ae%d' % f] = dict(params=j['params'], scale=j['scale'], sec=j['sec'], log=[[r['step'], round(r['rec_l1_per_px'], 5)] for r in j['log']])
for fn in ('eval_report.json', 'quant_report8.json', 'quant_report6.json', 'check_forward.json'):
    p = os.path.join(MD, fn)
    if os.path.exists(p):
        toy[fn.split('.')[0]] = json.load(open(p))

json.dump(dict(checks=checks, derived=D, toy=toy), open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
bad = [c for c in checks if c['verdict'] != 'holds']
print('recompute: %d checks, %d hold, %d flagged' % (len(checks), len(checks) - len(bad), len(bad)))
