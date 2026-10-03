"""Independent recomputation of every number the page derives, against the page's JavaScript (check/js_out.json
from check_core.mjs) and the stored inputs. InfoNCE losses and gradients use torch.nn.functional.cross_entropy and
autograd on the stored cosines. Writes check/recompute.json; exits 1 on any failure.
Run: node check_core.mjs && OMP_NUM_THREADS=2 uv run --with torch --with numpy --with scipy python recompute.py"""
import json, math, sys
import numpy as np, torch, torch.nn.functional as F
from scipy.special import i0

torch.set_num_threads(2)
res, fails = [], 0
def chk(name, got, want, tol):
    global fails
    ok = abs(got - want) <= tol
    fails += not ok
    res.append(dict(name=name, got=got, want=want, tol=tol, ok=bool(ok)))

rb = json.load(open('inputs/real_batch.json'))
js = json.load(open('check/js_out.json'))
M = {'bert': np.array(rb['models']['bert:first_last_avg']['batch_cos']), 'simcse': np.array(rb['models']['simcse:cls']['batch_cos'])}
# the page stores cosines x1000 rounded; compare the JS against PyTorch on the same rounded values
Mr = {k: np.round(v * 1000) / 1000 for k, v in M.items()}
for e in js['loss']:
    S = torch.tensor(Mr[e['m']][:e['n'], :e['n']] / e['t'])
    tgt = torch.arange(e['n'])
    L = F.cross_entropy(S, tgt).item()
    if e['sym']: L = 0.5 * (L + F.cross_entropy(S.T, tgt).item())
    chk(f"loss {e['m']} N={e['n']} tau={e['t']} sym={e['sym']}", e['L'], L, 1e-9)
    acc = float((S.argmax(1) == tgt).double().mean())
    chk(f"top-1 {e['m']} N={e['n']} tau={e['t']}", e['acc'], acc, 1e-12)
for e in js['grad']:
    s = torch.tensor(Mr[e['m']][30], requires_grad=True)
    L = F.cross_entropy((s / e['t'])[None], torch.tensor([30])); L.backward()
    chk(f"max |grad diff| {e['m']} tau={e['t']} anchor 31", float(np.abs(np.array(e['g']) - s.grad.numpy()).max()), 0.0, 1e-9)
for e in js['share']:
    S = torch.tensor(Mr[e['m']] / e['t']); P = F.softmax(S, 1).numpy()
    sh = np.mean([max(np.delete(P[i], i)) / (1 - P[i, i]) for i in range(48)])
    chk(f"hardest-negative share {e['m']} tau={e['t']}", e['mean_top1_share'], float(sh), 1e-9)
# numbers quoted in the text
sh = {(e['m'], e['t']): e['mean_top1_share'] for e in js['share']}
chk('quoted 44% (SimCSE, tau 0.05)', round(100 * sh[('simcse', 0.05)]), 44, 0)
chk('quoted 20% (BERT, tau 0.05)', round(100 * sh[('bert', 0.05)]), 20, 0)
chk('quoted 3% (SimCSE, tau 1)', round(100 * sh[('simcse', 1)]), 3, 0)
ls = {(e['m'], e['n'], e['t'], e['sym']): e['L'] for e in js['loss']}
chk('quoted loss 0.29 BERT N=48 tau=0.05', round(ls[('bert', 48, 0.05, False)], 2), 0.29, 0)
chk('quoted loss 0.04 SimCSE N=48 tau=0.05', round(ls[('simcse', 48, 0.05, False)], 2), 0.04, 0)
for m in ('bert', 'simcse'):
    wrong = [i for i in range(48) if M[m][i].argmax() != i]
    chk(f'only anchor 31 wrong ({m})', len(wrong) == 1 and wrong[0] == 30, True, 0)
chk('false-negative cosine 0.92 (SimCSE)', round(M['simcse'][30, 41], 2), 0.92, 0)
chk('own positive cosine 0.87 (SimCSE)', round(M['simcse'][30, 30], 2), 0.87, 0)
mods = rb['models']
chk('STS-B Spearman unsup-SimCSE vs paper 76.85', mods['simcse:cls']['spearman_x100'], 76.85, 0.015)
chk('STS-B Spearman BERT first-last vs Su et al. 59.04', mods['bert:first_last_avg']['spearman_x100'], 59.04, 0.005)
chk('STS-B Spearman BERT embedding+last vs SimCSE Table 5 53.87', mods['bert:emb_last_avg']['spearman_x100'], 53.87, 0.005)
chk('mean cosine random, BERT 0.62', round(mods['bert:first_last_avg']['mean_cos_random'], 2), 0.62, 0)
chk('mean cosine random, SimCSE 0.32', round(mods['simcse:cls']['mean_cos_random'], 2), 0.32, 0)
chk('alignment BERT 0.17', round(mods['bert:first_last_avg']['align'], 2), 0.17, 0)
chk('alignment SimCSE 0.25', round(mods['simcse:cls']['align'], 2), 0.25, 0)
# derived constants
chk('ln 4096', math.log(4096), 8.318, 5e-4)
chk('uniform circle log(e^-4 I0(4))', math.log(math.exp(-4) * i0(4)), -1.575, 5e-4)
th = np.linspace(0, 2 * np.pi, 200001)[:-1]
chk('uniform circle by integration', float(np.log(np.mean(np.exp(-2 * (2 - 2 * np.cos(th)))))), math.log(math.exp(-4) * i0(4)), 1e-9)
chk('1/sqrt(16)', 1 / math.sqrt(16), 0.25, 0)
# SimSiam std claim: a zero-mean isotropic Gaussian in d = 16 gives std of z/|z| about 1/sqrt(d)
z = torch.randn(200000, 16, generator=torch.Generator().manual_seed(0)); z = F.normalize(z, dim=1)
chk('std of normalised Gaussian, d=16', float(z.std(0).mean()), 0.25, 1e-3)
# toy numbers quoted
tc = json.load(open('inputs/toy_collapse.json')); ts = json.load(open('inputs/toy_sphere.json'))
f = lambda r: tc['runs'][r]['final_seeds'][0]
chk('SimSiam std 0.24', round(f('simsiam')['std'], 2), 0.24, 0)
chk('SimSiam no stop-grad std 0.001', round(f('simsiam_nosg')['std'], 3), 0.001, 0)
chk('VICReg no variance collapsed in all seeds', max(s['std'] for s in tc['runs']['vicreg_novar']['final_seeds']), 0.0, 1e-3)
chk('raw pixels 5-NN 0.90', json.load(open('inputs/raw_knn.json'))['raw_pixels_knn'], 0.90, 0)
chk('untrained encoder 5-NN 0.82', tc['runs']['infonce']['snaps'][0]['knn'], 0.82, 0)
chk('sphere InfoNCE tau 0.5 5-NN about 50%', ts['runs']['infonce_t05']['final_seeds'][0]['knn'], 0.5, 0.07)
chk('DINO no-centering entropy 0', max(s['t_entropy'] for s in tc['runs']['dino_nocenter']['final_seeds']), 0.0, 1e-3)
chk('DINO no-sharpening entropy ln 32', min(s['t_entropy'] for s in tc['runs']['dino_nosharp']['final_seeds']), math.log(32), 2e-3)
mae = json.load(open('inputs/mae.json'))
chk('MAE 75%: 49 visible', mae['ratios']['0.75']['n_visible'], 49, 0)
json.dump(dict(fails=fails, checks=res), open('check/recompute.json', 'w'), indent=1)
print(len(res), 'checks,', fails, 'failures')
for r in res:
    if not r['ok']: print('FAIL', r)
sys.exit(1 if fails else 0)
