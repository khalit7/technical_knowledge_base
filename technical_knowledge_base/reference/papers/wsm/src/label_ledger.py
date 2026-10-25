"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the WSM page as committed before the light pass;
adapted from the DeepSeekMath page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, volatile when it sits in the dated block "Since the paper", core otherwise.
Units added by hand (NEW) cover the light pass's top, the owner links, and script-drawn tables whose captions carry a key.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/wsm'
OPT = 'models_and_training/topic_ml_fundamentals/optimisers_and_learning_rate_schedulers'
FAT = {}
KEYS = {79: 'moe load balancing'}
NEW = [
 ('core', 'Core sentence: averaging the last stretch of checkpoints is the same as applying a decay schedule to the updates between them, so a flat LR plus merging gives the effect of a decay with nothing to plan or roll back.', 'averaging the last stretch of checkpoints is the same as applying a decay schedule'),
 ('core', 'Hero (drawn by script, static): ten equal merge weights give the updates 0.9 down to 0.1 of the LR, a linear decay; on Ling-mini at 400B tokens the flat run scores 60.32, WSD 62.67 and the mean merge 63.85 (+1.18 matched; best merged 63.95 at 425B).', 'the merge weights are a decay schedule in disguise'),
 ('core', 'You need and new terms: the schedule page linked; WSM, merge duration, 1-sqrt, Ling-mini.', 'how much training the merged checkpoints span'),
 ('owned:' + OPT, 'Cosine needs one run per run length; WSD branches cooldowns off one shared run: the schedule family compared in general.', 'cosine needs one run per length'),
 ('owned:' + OPT, 'WSD in general: a stable phase with cooldowns branched from it.', 'wsd branches cooldowns off one shared run'),
 ('core', 'Tables tab: figure values read from the vector PDFs, every marker mapped through its panel gridlines (calibration residual under 0.01 point).', 'calibration residual under 0.01 point'),
 ('core', 'Tables tab: Tables 8 and 9 after SFT with every average recomputed.', 'with every average recomputed'),
 ('core', 'Tables tab: Figures 5(a) and 5(b) plot the same decays with two different results.', 'the same decays, two different results'),
 ('core', 'Tables tab: Ling-mini recounted from the released Ling-mini-2.0 config.', 'ling-mini, recounted'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
m = re.search(r'Since the paper</b> \(dated.*?</details>', body, flags=re.S); dated = ledger.norm(m.group(0)) if m else ''
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
        print('UNPLACED', x['id'], x['tab'], x['text'][:160]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['note'] = 'dated closed block "Since the paper (dated: checked 25 October 2026)" in Why it matters'
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
