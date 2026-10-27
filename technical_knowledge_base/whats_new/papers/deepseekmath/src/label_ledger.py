"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the DeepSeekMath page as committed before the light pass;
adapted from the DeepSeek-V3 page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, volatile when it sits in the dated block "Where GRPO went next, and where to run it", core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/deepseekmath'
RL = 'models_and_training/topic_rl/rl_for_llms'
PG = 'models_and_training/topic_rl/policy_gradients_and_actor_critic'
FAT = {}
OWNED = {185: ('owned:' + RL, 'standard-deviation normalisation (dr. grpo says no)'),
         186: ('owned:' + RL, 'clip-higher: decouple the clip range'),
         188: ('owned:' + RL, 'dr. grpo, dapo, gspo, cispo')}
KEYS = {33: 'is it any good? a controlled test at 1.3b'}
NEW = [
 ('core', 'Core sentence: a 7B open model reaches 51.7% on MATH from a 120B-token corpus mined from Common Crawl and GRPO, PPO with the value model deleted and a group-mean baseline.', 'a 7b open model reaches 51.7% on competition maths'),
 ('core', 'Hero, drawn by script: MATH at Base 36.2, Instruct 46.8, RL 51.7 against GPT-4 52.9 and the best earlier open 37.7; PPO keeps policy, value, reward and reference, GRPO drops the value model.', 'data lifts the base model, grpo adds the last five points'),
 ('core', 'You need and new terms: policy gradients (clip, GAE) and RL for LLMs linked; GRPO, outcome and process supervision, RFT, k3, gradient coefficient, Pass@K and Maj@K.', 'rejection-sampling fine-tuning'),
 ('owned:' + PG, 'PPO\'s clip and GAE in general are taught on Policy gradients and actor-critic.', 'actor-critic and gae'),
 ('owned:' + RL, 'The Pass@K debate since 2025 (Yue et al.) is weighed on RL for LLMs.', 'yue et al. 2025 (neurips 2025 oral)'),
 ('owned:' + RL, 'Dr. GRPO, DAPO and GSPO taught with real rollouts on RL for LLMs.', 'dapo\'s dynamic sampling (section 7) filters such groups'),
 ('core', 'Why it matters: later work found two biases in the objective as written (length normalisation, std division) and added fixes (Clip-Higher, Dynamic Sampling, sequence-level ratios).', 'later work found two biases in the objective as written'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
m = re.search(r'Where GRPO went next, and where to run it.*?</details>', body, flags=re.S); dated = ledger.norm(m.group(0)) if m else ''
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
    if x['id'] in OWNED:
        x['label'], x['key'] = OWNED[x['id']]; continue
    k = KEYS.get(x['id']) or find_key(x['text'])
    if not k:
        print('UNPLACED', x['id'], x['tab'], x['text'][:160]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['where'] = ''; x['note'] = 'dated closed block "Where GRPO went next, and where to run it (checked 3 October 2026)" in Why it matters'
    else:
        x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-25', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
