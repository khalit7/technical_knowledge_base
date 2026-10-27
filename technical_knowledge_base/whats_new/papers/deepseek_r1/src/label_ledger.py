"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the DeepSeek-R1 page before the light pass;
adapted from the Chinchilla and QLoRA labellers). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block or in the tables tab, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/deepseek_r1'
RL = 'models_and_training/topic_rl/rl_for_llms'
TTC = 'models_and_training/topic_llm_landscape/test_time_compute_and_reasoning'
DIS = 'models_and_training/topic_llm_training_and_post_training/distillation_and_small_language_models'
FAT = {1: 'old reading-time line, replaced by the measured subtitle'}
VOLATILE = {240: '$0.55 per million input tokens', 262: 'deepseek-r1-0528 raised aime 2025'}
OWNED = {22: (RL, "its score's distance from the group mean"), 25: (RL, 'grpo done right')}
KEYS = {}
NEW = [
 ('core', '', 'Core sentence: reward only the final answer of checkable questions, GRPO on a strong base; R1-Zero 15.6% to 77.9% AIME, 28 times longer answers; cold start plus three stages give R1; 800K samples distil better than RL on small models.', 'the idea in one sentence: reward only whether'),
 ('core', '', "Hero: the paper's Figure 2 (Nature, CC BY 4.0), the multistage pipeline: R1-Zero as one RL run, R1 restarting from V3-Base twice.", 'reaches the next model as fine-tuning data'),
 ('core', '', 'New terms: R1-Zero and R1, rule (verifiable) reward, cold start, Dev1 to Dev3, rejection sampling, pass@1 and cons@k.', 'rejection sampling : sample many answers'),
 ('owned:' + RL, '', 'The GRPO group advantage worked by hand, PPO against GRPO and the later fixes are taught on RL for LLMs.', 'a group of four, worked'),
 ('owned:' + TTC, '', 'How often a GRPO group gives no signal (the zero-signal share) is on Test-time compute and reasoning.', 'zero-signal share'),
 ('owned:' + TTC, '', 'What RLVR adds: sharpening at pass@1, not widening at large pass@k (Yue et al.), drawn on Test-time compute and reasoning.', 'rlvr sharpens; it does not extend'),
 ('owned:' + DIS, '', 'Distillation as a technique (logit, sequence-level, reasoning traces) is taught on Distillation and small language models, which cites R1 Table 16.', 'distillation against rl on the same 32b base'),
 ('depth', '', 'The 46 checks of numbers in the text (script-rendered from inputs/recompute.json) sit in a closed block of the Tables tab.', '46 checks by recompute.py'),
 ('depth', '', 'The decoded-figure calibration table (ticks and residuals per axis, script-rendered) sits in a closed block of the Tables tab.', 'the calibration of every axis'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
i0 = body.index('id="t-tables"'); i1 = body.index('id="t-more"')
tables = ledger.norm(body[i0:i1])
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
    for k in ('note',):
        x.pop(k, None)
    if x['id'] in FAT:
        x['label'], x['key'], x['note'] = 'fat', '', FAT[x['id']]; continue
    if x['id'] in VOLATILE:
        x['label'], x['key'] = 'volatile', VOLATILE[x['id']]; x['note'] = 'dated closed block "Later, as of 25 October 2026" in Why it matters'; continue
    if x['id'] in OWNED:
        o, k = OWNED[x['id']]; x['label'], x['key'] = 'owned:' + o, k; continue
    k = KEYS.get(x['id']) or find_key(x['text'])
    if not k:
        print('UNPLACED', x['id'], x['tab'], x['text'][:110]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k; x['label'] = 'depth' if (k in det or x['tab'] == 't-tables' or (k in tables and k not in vis.replace(tables, ''))) else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, where, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-25', 'text': text, 'label': lab, 'key': key, 'where': where, 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
