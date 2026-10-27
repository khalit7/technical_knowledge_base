"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-26 from the on-/off-policy distillation page before the light pass;
adapted from the MoE memory bottlenecks page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key
sits in a closed <details> block, volatile when it sits in the dated "Same weeks, beyond the paper" block, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/on_policy_or_off_policy_learning'
DIST = 'models_and_training/topic_llm_training_and_post_training/distillation_and_small_language_models'
RL = 'models_and_training/topic_rl/rl_for_llms'
LF = 'models_and_training/topic_ml_fundamentals/loss_functions'
FAT = {}
OWNED = {}
KEYS = {37: 'classic distillation is teacher text with forward kl', 38: 'teacher text with reverse kl, or student text with forward kl'}  # the old 2 x 2 card's caption, now the hero's cell tags
NEW = [
 ('core', 'Core sentence: change only who writes the rollouts and the on-policy advantage mostly disappears; for 1B students on short answers KL direction and learning rate decide; forward KL 71 to 73% whoever writes, reverse KL needs student rollouts (72% against 35% at the lower rate), forgetting follows the learning rate.', 'change only who writes the distillation rollouts'),
 ('core', 'Hero: the 2 x 2 of rollout policy and KL direction with accuracy and OOD change at both learning rates; forward KL within two points; reverse KL 35 to 72% with a sign flip; forgetting 11 to 14 points at the higher rate; SEMs 2.8 to 9.1.', 'the kl direction and the learning rate move the results'),
 ('core', 'New terms: rollout policy, OffPD and OnPD, crossed pairing, pi_lambda, update sparsity.', 'the model that writes the text the teacher grades'),
 ('core', 'Takeaway softened (2026-10-26): scoped to 1B students, about 100-token answers, three seeds; reverse KL needs student rollouts only at the lower rate and is erratic at the higher; one RL seed; long traces untested.', 'long reasoning traces were not tested at scale'),
 ('owned:' + DIST, 'Distillation in general and on-policy distillation as the RL-like fix for exposure mismatch (Agarwal et al.).', 'on-policy distillation fixes it the way rl does'),
 ('owned:' + DIST, 'Forward KL is mass-covering, reverse KL mode-seeking: the two shapes animated.', 'mass-covering against mode-seeking'),
 ('owned:' + RL, 'pass@1 as the chance a single sample solves a problem, against pass@k under RL.', 'the chance that a single sample solves'),
 ('owned:' + LF, "Cross-entropy's gradient on the logits is p - y, the same shape as forward KL's.", 'the gradient p − y'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
m = re.search(r'<details class="mist" id="later">.*?</details>', body, flags=re.S); dated = ledger.norm(m.group(0)) if m else ''
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
    if x.get('added'):
        continue
    if x['id'] in FAT:
        x['label'], x['key'], x['note'] = 'fat', '', FAT[x['id']]; continue
    k = KEYS.get(x['id']) or find_key(x['text'])
    if not k:
        print('UNPLACED', x['id'], x['text'][:160]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['note'] = 'dated closed block "Same weeks, beyond the paper" (read 19 October 2026)'
    else:
        x['label'] = 'depth' if k in det else 'core'
for x in u:
    if x['id'] in OWNED:
        x['label'], x['key'] = 'owned:' + OWNED[x['id']][0], OWNED[x['id']][1]
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-26', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
