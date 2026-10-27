"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Constitutional AI page before the
light pass; adapted from the CLIP page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when
that key sits inside a closed <details> block, volatile when it sits in the dated "Later work" block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/constitutional_ai'
AL = 'models_and_training/topic_llm_training_and_post_training/alignment_sft_rlhf_dpo_rlvr'
RH = 'models_and_training/topic_llm_training_and_post_training/reward_hacking'
JU = 'measurement/topic_evaluation_and_llm_judges/llm_as_judge'
AR = 'measurement/topic_benchmarks/human_preference_and_arenas'
SH = 'measurement/topic_benchmarks/safety_and_honesty'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 33: 'animation manners line, replaced by "Nothing moves until you press play or step"'}
KEYS = {140: 'when it pays off. when the behaviour you want'}  # id -> key chosen by hand where the automatic run of words fails
NEW = [
 ('core', 'Core sentence: principles replace every human harmlessness label; self-critique and revision, then AI preference labels for RL; less harmful at equal helpfulness and non-evasive.', 'replace every human harmlessness label with a short written list of principles'),
 ('core', "Hero: the paper's Figure 1 (CC BY 4.0) with a caption on where people appear in the pipeline.", 'people appear nowhere in the harmlessness path'),
 ('core', 'You need and new terms: constitution, red-team prompt, SL-CAI, feedback model, RLAIF and RL-CAI, evasive, HH RLHF.', 'refusing or deflecting without engaging'),
 ('core', "Figure 2 shown as the paper's own image beside the frontier claim, with what to notice.", 'notice the two rlhf curves bending left or down'),
 ('owned:' + AL, 'RLAIF in general: the pipeline kept, the labeller swapped for a strong model; later labellers and results.', 'rlaif keeps the pipeline and swaps the labeller for a strong model'),
 ('owned:' + AL, 'The preference-model form and loss (Bradley-Terry) in general.', 'by the bradley-terry model'),
 ('owned:' + AR, 'How pairwise votes become an Elo or Bradley-Terry score.', 'one strength per model fitted to all votes at once'),
 ('owned:' + JU, 'LLM judges and reward models as judges in general.', 'reward models are a scalar head trained on preference pairs'),
 ('owned:' + SH, 'Measuring refusals together with over-refusals.', 'the over-refusals beside the refusals'),
 ('owned:' + RH, 'Reward over-optimisation in general (the Gao et al. curve).', 'the proxy keeps climbing after the goal has turned over'),
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
        print('UNPLACED', x['id'], x['text'][:140]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['note'] = 'dated closed block "Later work and product use" (sources fetched 2 October 2026)'
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
