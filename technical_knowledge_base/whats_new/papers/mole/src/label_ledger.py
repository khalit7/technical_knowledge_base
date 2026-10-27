"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the MOLE page before the light pass;
adapted from the StateM page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is volatile when
that key sits in the dated "Since the paper" block, depth when it sits in any other closed <details> block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/mole'
RP = 'agents_and_retrieval/topic_rag_and_retrieval/retrieval_pipeline'
ES = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
FAT = {1: 'old header reading line, replaced by the measured one', 4: 'old card note, rewritten for the softened takeaway (2026-10-25)', 9: 'navigation bar', 34: 'heading fragment; the sentence before the closed block carries the content', 185: 'gap closed: the Agent security page now exists and is linked in Connections'}
OWNED = {}
KEYS = {}
NEW = [
 ('core', 'Core sentence: MOLE grades the defender, not the agent; a monitor ranks every account each day and a team reviews the top 10; the best monitor caught 24 of 45 completed harms; what it may read can matter as much as which model it is.', 'mole grades the defender , not the agent'),
 ('core', 'Hero: the 45 completed harms of the GPT-5.3 single-day test period as squares, caught in the daily top 10 by a random queue (about 3.2, derived), GPT-4.1-nano 2, FACADE 10, GPT-5.5 23, Claude Opus 4.7 24; 21 missed by the best.', 'leaves 21 of 45 completed harms unreviewed'),
 ('core', 'New terms: account-day, completed harm, R@K/day and budget-AUC, classical and semantic monitors, observability level, generator, single-day and multiday.', 'the unit that is scored'),
 ('owned:' + RP, 'Reciprocal rank fusion: each ranked list adds 1 / (k + rank) per item; MOLE fuses the LLM ranking with the z-score ranking at k = 60.', '1 / (k + rank)'),
 ('owned:' + ES, 'Exact (Clopper-Pearson) binomial intervals and how they compare with Wilson and Bayes intervals at small n.', 'clopper-pearson'),
 ('core', 'Script-drawn (RQ1 reveal, Table 11): 24 models never refuse yet complete 20% to 100%; refusal and completion correlate across 39 models (Spearman -0.73, recompute.py); most of the shortfall is no attempt, not refusal.', 'never refusing does not mean completing'),
 ('core', 'Script-drawn (RQ2 reveal, Figure 4): all 40 monitors as k of 45 with exact 95% intervals; most overlap, only the ends of the ranking are clearly apart.', 'every value is whole account-days out of 45'),
 ('core', 'Script-drawn (trace viewer): the elicitation prefix is in all 478 harmful sessions; data-poisoning triggers sit past the 600-character clip.', 'the data-poisoning blind spot is partly the renderer'),
 ('core', "Script-drawn (threat explorer, Tables 1 and 4 with Figure 6): each threat's objective, completion condition, techniques and six monitors' recall.", 'the twelve threats'),
 ('core', 'Takeaway softened (2026-10-25): refusal and completion are linked across models (Spearman -0.73); the 72% is under a harmless-sandbox, do-not-refuse preamble; best monitor 24 of 45; single runs on few positives.', 'the top two monitors differ by one account-day'),
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
        x['label'] = 'volatile'; x['note'] = 'dated closed block "Since the paper" (sources read 3 October 2026)'
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
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-25', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
