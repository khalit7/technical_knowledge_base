"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the SA-MRPO page as committed before the light pass;
adapted from the WSM page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, volatile when it sits in the dated block of 2026 multi-reward methods, core otherwise.
Units added by hand (NEW) cover the light pass's top, the owner links, and the script-drawn claim list whose caption carries a key.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/learn_whats_left_not_whats_mastered'
RL = 'models_and_training/topic_rl/rl_for_llms'
EV = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
FAT = {33: 'wind-up ("Three things to see."); the hero caption and the one paragraph after the animation carry the three points'}
KEYS = {161: '2026 produced a family of ways to combine several rewards',
        # re-pointed in the 2026-11-13 layout rollout (the Figure 1 animation became Stage 1, the method's steps Stage 2's list)
        28: 'stage 1 sends the same group through each recipe', 29: 'bars are drawn to one scale across all three recipes', 44: 'four steps ( §4.1 , algorithm 1 ), run in stage 2', 190: 'all methods, 8 seeds each final accuracy and length reward of every method'}
NEW = [
 ('core', 'Core sentence: standardise each reward within its group, then multiply each weight by (1 - s)^γ, so the update stops polishing nearly solved objectives and goes to those with headroom left.', 'so the update stops polishing objectives that are nearly solved'),
 ('core', "Hero: the paper's own Figure 1 (CC BY 4.0), rollouts 2 and 3 boxed: GRPO ties them, GDPO ranks the zero-correctness answer higher (+0.61 against +0.20), SA-MRPO turns it negative.", 'only sa-mrpo stops rewarding an answer for perfect format'),
 ('core', 'You need and new terms: GRPO linked to RL for LLMs; scalarisation, GDPO, saturation, γ, Exceed.', 'the exponent that sets how hard saturated objectives are discounted'),
 ('owned:' + RL, 'GRPO standardises each reward against its group of answers (mean and standard deviation), worked through by hand on the owner page.', 'correct response gets 0.75 / 0.433 = +1.732'),
 ('owned:' + EV, 'Training-seed noise is invisible to the item standard error of a benchmark; seed variance in general.', 'noise the item standard error does not see'),
 ('core', 'Tables tab: 13 claims checked; 7 hold, 4 in part, 2 do not (the γ the main table used, the epoch count).', '13 claims: 7 hold, 4 hold only in part, 2 do not'),
 ('core', 'Stage 2 (method on one toy batch): the graded-length toy, SA-MRPO γ = 0.5, seed 1, step 80, 32 questions × 8 answers; four groups drawn, the first of each kind (only correctness varies, both, only length, neither).', 'the first in which only correctness varies, both vary'),
 ('core', 'Stage 2: a reward with no spread in a group is silent there; one long answer among seven short ones gets a large negative length advantage.', 'one answer that ran long among seven short ones'),
 ('core', 'Stage 2: the batch saturations, correctness s = 0.40 and length s = 0.95, over all 256 answers.', 'correctness s = 0.40, length s = 0.95'),
 ('core', 'Stage 2: weights at γ = 0.5 are 0.77 (correctness) and 0.22 (length); at step 1 the saturations were 0.30 and 0.36 and the weights 0.84 and 0.80.', 'the gauges read 0.30 and 0.36'),
 ('core', "Stage 2: the correct answer that ran long ends at +0.27 under SA-MRPO against −1.49 under GDPO on the same batch; length's share of the update falls from 40.0% to 5.2%.", 'falls from 40.0% under gdpo to 5.2%'),
 ('core', 'Stage 1 SA-MRPO list: the saturation gauges at s = 0.98 (format) and 0.02 (correctness), the two values Figure 1 states.', 'fills its glass gauge: format at s = 0.98'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
m = re.search(r'The 2026 family of multi-reward methods \(dated.*?</details>', body, flags=re.S); dated = ledger.norm(m.group(0)) if m else ''
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
        print('UNPLACED', x['id'], x['tab'], x['text'][:200]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['note'] = 'dated closed block "The 2026 family of multi-reward methods (dated: checked 25 October 2026)" in Why it matters'
    else:
        x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-tables' if text.startswith('Tables tab') else 't-read', 'section': 'light pass 2026-10-25', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
