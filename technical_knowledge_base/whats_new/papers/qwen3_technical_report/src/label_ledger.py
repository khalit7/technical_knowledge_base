"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Qwen3 page before the light pass;
adapted from the Chinchilla and QLoRA labellers). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block or in the tables tab, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/qwen3_technical_report'
RL = 'models_and_training/topic_rl/rl_for_llms'
TTC = 'models_and_training/topic_llm_landscape/test_time_compute_and_reasoning'
DIS = 'models_and_training/topic_llm_training_and_post_training/distillation_and_small_language_models'
FAT = {1: 'old reading-time line, replaced by the measured subtitle'}
VOLATILE = {208: 'qwen3-coder (480b-a35b)'}
OWNED = {102: (TTC, 'budget forcing: stop the thinking at the budget'), 274: (TTC, 'budget forcing')}
KEYS = {}
NEW = [
 ('core', '', 'Core sentence: one checkpoint thinks or answers directly on a /think or /no_think flag, thinking cut at a token budget (AIME 42 at 1K to 87 at 32K, 40.1 without); flagships get four stages, the six smaller models are distilled.', 'the idea in one sentence: train one checkpoint'),
 ('core', '', "Hero: redrawn Figure 1 and section 4.3 as an HTML diagram (the report is not CC BY): flagship four stages, small models off- then on-policy distillation, the two modes and the budget.", 'two routes to one kind of checkpoint'),
 ('core', '', 'New terms: thinking mode fusion, thinking budget, strong-to-weak distillation, QK-Norm.', 'thinking mode fusion : stage 3'),
 ('owned:' + RL, '', 'GRPO is taught on RL for LLMs; the page says what Qwen3 did with it (3,995 problems, large batches, entropy kept stable).', 'a group of four, worked'),
 ('owned:' + DIS, '', 'On-policy distillation and forward against reverse KL in general are taught on Distillation and small language models, which also carries Table 21.', 'the teacher\'s text against the student\'s own'),
 ('owned:' + TTC, '', 'Budget forcing and how other labs expose a thinking budget are on Test-time compute and reasoning.', 'budget forcing: stop the thinking at the budget'),
 ('depth', '', 'The 34 checked counts (script-rendered from inputs/recompute.json) sit in a closed block of the Tables tab.', '34 rows by recompute.py'),
 ('depth', '', 'Tables 23, 24 to 35 and 37, 1 and 2 (script-rendered) sit in closed blocks of the Tables tab.', 'tables 24 to 35 and 37: languages'),
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
