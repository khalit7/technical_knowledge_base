"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-26 from the Sharpening Tax page as built
before the light pass; adapted from the Context Language Models page's labeller). For every unit not overridden below, the key is the first run
of 8 (then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when
that key sits inside a closed <details> block, volatile when it sits in the dated block "Since the paper", core otherwise.
Units added by hand (NEW) cover the light pass's top, the owner links and the script-drawn charts and tables, keyed to
static text. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/sharpening_tax'
RL = 'models_and_training/topic_rl/rl_for_llms'
SD = 'systems_and_performance/topic_inference_and_serving/sampling_and_decoding'
FAT = {1: 'the old header line ("About 24 min to read The paper tab"), replaced by the measured reading line',
       2: 'the tab bar labels',
       96: 'a citation fragment "(Figure 7)" split off by the sentence splitter; the claims it cites are their own units',
       162: 'a citation fragment "(Appendix F.1)" split off by the sentence splitter; the claim it cites follows'}
KEYS = {36: 'no solved example'}
OWNED = {}  # id -> (label, key): the sentence moved to its owner
NEW = [
 ('core', 'Core sentence: post-training raises pass@1 by polarising tasks; the tax measures lost retry value as a difference of calibrated areas (positive in 36 of 42); PTGS heats hard prompts during RL.', 'a task at either extreme gains nothing from another attempt'),
 ('core', "Hero: the paper's Figure 1 (CC BY 4.0), panels a to c; panel c bars are Table 2 means over the two games.", 'the bars are the means over the two grid games'),
 ('core', 'You need (pass@k debate, PPO and GRPO, temperature) and the new terms: coverage, consistency, cell, crossover, A and S, tax, polarisation, PTGS.', 'the budget where base catches up'),
 ('core', "The paper's Figure 7 (CC BY 4.0) beside PTGS's equations.", 'ptgs in one loop'),
 ('core', 'Figure 7 check, open summary: about 0.8 over 200 splits, not 0.85.', 'the paper\'s 0.85 is one split at the top of the range'),
 ('core', 'Takeaway scoped on 26 October 2026 (takeaway_note).', 'scoped on 26 october 2026'),
 ('owned:' + RL, 'The pass@1 against pass@k debate on math and code (Yue et al.) and its counter-evidence, owned by RL for LLMs section 9.', 'rlvr-trained models beat their base at small k'),
 ('owned:' + SD, 'What temperature does to the distribution (divides the logits), owned by Sampling and Decoding.', 'temperature t divides the logits'),
 ('core', 'Reading: one-task pass@k chart, crossover curves, polarisation animation, retry-value chart, Theorem 2 lab, PTGS temperature chart, Table 2, drawn by script.', 'watch the same tasks move'),
 ('core', 'Replay tab: any cell replayed beside Table 7, tax across budgets, 42-cell map, drawn by script.', 'all 42 cells on one map'),
 ('core', 'Toy tab: one batch through both samplers, ten-seed sweep, traces, live run, drawn by script.', 'one batch, two samplers'),
 ('core', 'Tables tab: checks, Table 7 explorer, Tables 2, 9, 10 as intervals, Table 4, drawn by script.', 'what was checked, and how'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
dated = ' '.join(ledger.norm(d) for d in re.findall(r'<details class="mist" id="s-since">.*?</details>', body, flags=re.S))
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
    tab = 't-tables' if text.startswith('Tables tab') else 't-run' if text.startswith('Replay tab') else 't-toy' if text.startswith('Toy tab') else 't-read'
    n += 1; u.append({'id': n, 'tab': tab, 'section': 'light pass 2026-10-26', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
