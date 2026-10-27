"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-24 from the DDPM page before the light pass;
copied from the T5 page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import html, json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/ddpm'
G = 'models_and_training/topic_generative_and_multimodal/'
DFZ, FM, LD, EV = G + 'diffusion_from_zero', G + 'flow_matching', G + 'latent_diffusion_and_dits', G + 'evaluating_generative_models'
VI = 'engineering_foundations/topic_math/variational_inference_and_generative_models'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 24: 'animation manners line, replaced by "Nothing moves until you press play or step"'}
VOLATILE = {}
KEYS = {32: 'try: drag t', 40: 'l t = kl( q ( x t | x 0 )', 58: "the toy's learned score", 76: 'return x 0', 125: 'rewritten as eq. 16'}  # id -> key chosen by hand where the automatic run of words fails
NEW = [
 ('core', '', 'Core sentence: a fixed chain of small Gaussian noise steps, one network trained to predict the added noise with a plain squared error, 1,000 reverse steps from noise; the parameterisation took diffusion to FID 3.17 on CIFAR10.', 'destroy data with a fixed chain of small gaussian noise steps'),
 ('core', '', "Hero: the paper's Figure 2 redrawn on the toy Swiss roll, x_T, x_500, x_250, x_100, x_0 on one scale, q dashed right to left (fixed), p_theta solid left to right (learned); training jumps to a random t.", 'two chains over the same points'),
 ('core', '', 'You need and new terms: the ELBO and Gaussian KL; beta_t, alpha-bar_t, epsilon, epsilon_theta, mu-tilde_t, L_simple, FID.', 'the share of the signal'),
 ('owned:' + DFZ, '', 'Schedules (linear against cosine, SNR) in general are taught on Diffusion from zero.', "which is the cosine schedule's whole motivation"),
 ('owned:' + DFZ, '', 'Prediction targets (epsilon, x0, v) and loss weighting after DDPM are taught on Diffusion from zero.', 'target and loss weighting (section 3)'),
 ('owned:' + VI, '', 'The ELBO derivation of Eq. 3 and 5 step by step lives on the variational inference maths page.', 'its elbo (ho et al. eq. 3 and 5) telescopes'),
 ('owned:' + EV, '', 'How FID is computed and where it fails belongs to Evaluating generative models.', 'fréchet between gaussians (fid)'),
 ('owned:' + LD, '', 'The U-Net and its DiT successor in general belong to Latent diffusion and DiTs.', 'the u-net, dit and mmdit'),
 ('owned:' + FM, '', 'Flow matching and rectified flow are taught on Flow matching.', 'paths, pairings, reflow, distillation'),
 ('depth', '', 'Every derived number checked (tables tab, drawn by script): recompute.py reproduces each derived number on the page.', 'the recomputations behind every derived number on the page'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
def find_key(text):
    w = ledger.norm(text).split(' ')
    for n in (8, 6, 4):
        for i in range(0, max(1, len(w) - n + 1)):
            k = ' '.join(w[i:i + n])
            if len(k) >= 18 and k in vis and not re.fullmatch(r'[\W\d ]+', k):
                return k
    return ''
bad = 0
for x in u:
    if x['id'] in FAT:
        x['label'], x['key'], x['note'] = 'fat', '', FAT[x['id']]; continue
    if x['id'] in VOLATILE:
        x['label'], x['key'] = 'volatile', VOLATILE[x['id']]; x['note'] = 'dated closed block "Where the checkpoints are used now" (checked 2 October 2026)'; continue
    if x.get('added'):
        continue
    k = KEYS.get(x['id']) or find_key(x['text'])
    if not k:
        print('UNPLACED', x['id'], x['text'][:100]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k; x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, _, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-24', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
