"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-26 from the Just-in-Time Memory page as built before the light pass;
adapted from the Dream-RSI page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, volatile when it sits in the dated block "Since the paper", core otherwise.
Units added by hand (NEW) cover the light pass's top, the owner links, the dated block and the script-drawn charts and tables,
keyed to static text. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/just_in_time_memory'
RL = 'models_and_training/topic_rl/rl_for_llms'
FAT = {1: 'the old header line ("About 17 min to read The paper tab"), replaced by the measured reading line'}
KEYS = {}
NEW = [
 ('core', 'Core sentence: store raw, curate per task once known, graded at once; untrained wins 15 of 17 like for like; most of the headline +16 is RL training.', 'most of the headline +16 points comes from rl-training the curator'),
 ('core', 'Hero (redrawn; arXiv non-exclusive licence): write time against read time on one trajectory, the replay delays (19.5 tasks, 24% never), and the Qwen3-8B gain split (ALFWorld 47.9, +12.6, +16.9, 57%; WebShop 9.8, +1.9, +21.1, 92%) against RL SkillOS.', 'notice the two delays'),
 ('core', 'You need (GRPO, agent memory designs) and the new terms: write-time and read-time curation, curator, payload, executor, quality gate, -base/-gpt/-gemini.', 'the briefing prepended to the executor'),
 ('owned:' + RL, 'GRPO and Dr. GRPO in general: group-relative advantage, mean-centred without the standard-deviation division.', 'dr. grpo gives'),
 ('core', 'Open summary of What it takes to use this.', 'the untrained version can be rebuilt from the paper alone'),
 ('volatile', 'Since the paper, checked 26 October 2026: arXiv still v1 only, non-exclusive licence, no code, weights or trajectories; no official repository found.', 'arxiv still lists only v1'),
 ('core', 'Takeaway scoped on 26 October 2026: the database Takeaway overclaimed timing as the source of the headline gain.', 'scoped on 26 october 2026'),
 ('core', 'Reading, Idea: the read-time against write-time step animation (Figure 3 example), drawn by script.', 'one past trajectory, two later tasks'),
 ('core', 'Reading, Results: bars per executor and metric with whiskers and hollow copied-from-SkillOS bars, drawn by script.', 'hollow bars are numbers that match skillos'),
 ('core', 'Reading, predict reveals: the first-use histogram, the 17 untrained dumbbells and the gain decomposition, drawn by script.', 'each row: read-time (filled dot)'),
 ('core', 'Reading, Ablations: drop-from-parent dot plot from Table 9, drawn by script.', 'drop = parent minus ablation'),
 ('core', 'Replay tab: batches, retrieval links, write-time first-use view, task inspector and 50-ordering statistics, drawn by script.', 'what this shows, and what it cannot'),
 ('core', 'Tables tab: Tables 1 to 9, the significance table, Figures 5 and 6 decoded and every recomputed number, drawn by script.', 'are the gaps bigger than the noise?'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
dated = ' '.join(ledger.norm(d) for d in re.findall(r'<details class="more" id="s-since">.*?</details>', body, flags=re.S))
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
        x['label'] = 'volatile'
    else:
        x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, text, key in NEW:
    if text in have:
        continue
    tab = 't-tables' if text.startswith('Tables tab') else 't-run' if text.startswith('Replay tab') else 't-read'
    n += 1; u.append({'id': n, 'tab': tab, 'section': 'light pass 2026-10-26', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
