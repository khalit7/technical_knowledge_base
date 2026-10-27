"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-24 from the T5 page before the light pass;
copied from the ZeRO page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import html, json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/t5'
A = 'models_and_training/topic_llm_architecture/'
NORM, POS, FAM = A + 'normalisation_residuals_and_stability', A + 'positional_encodings', A + 'families_and_objectives'
EXT = 'models_and_training/topic_data_curation_and_datasets/extraction_and_filtering'
MIX = 'models_and_training/topic_data_curation_and_datasets/data_mixing'
PRE = 'models_and_training/topic_llm_training_and_post_training/pretraining'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 2: 'tab labels (the Corrupt a sentence tab is now in Reading)',
       39: 'pointer to the removed Corrupt a sentence tab; the stepper and playground are now inline', 44: 'animation manners line, replaced by "Nothing moves until you press play or step"',
       148: 'restated by the cost chart heading and caption'}
VOLATILE = {136: 'where the checkpoints are used now'}
KEYS = {13: 'the answer is c4', 134: 'details leaked.', 146: 'ported line by line from t5/data/preprocessors.py'}  # id -> key chosen by hand where the automatic run of words fails
NEW = [
 ('core', '', 'Core sentence: every task as text in, text out, so one encoder-decoder, loss and decoding turn objective, architecture, corpus, fine-tuning and scale into knobs; the winners scaled to 11B reached 18 of 24.', 'write every nlp task as text in, text out'),
 ('core', '', "Hero: the paper's Figure 1 (CC BY 4.0), four prefixed inputs into one T5 and four string outputs, including the classification and regression labels as strings.", 'one model, one format, four kinds of task'),
 ('core', '', 'You need and new terms: encoder-decoder with cross-attention, masked and causal objectives; text to text and task prefix, span corruption and sentinel, C4, coordinate ascent.', "the paper's method, change one component of the baseline"),
 ('owned:' + NORM, '', 'What pre-norm against post-norm and RMSNorm do to training in general is taught on Normalisation, residuals and stability.', 'pre-norm / post-norm / sandwich / output norm'),
 ('owned:' + POS, '', 'The T5 bias against sinusoids, ALiBi and RoPE, and that all distances from 128 share one bucket, is taught on Positional encodings.', 'all distances from 128 on share one bucket'),
 ('owned:' + FAM, '', 'Span corruption as one of the standard objectives, beside causal LM, MLM, UL2 and MTP, is taught on Families and objectives.', 'each replaced by one sentinel'),
 ('owned:' + EXT, '', "C4's line and page rules run on real Common Crawl text, beside Gopher's and FineWeb's, on Extraction and filtering.", 'c4 (raffel et al. 2020, section 2.2)'),
 ('owned:' + MIX, '', "How much repetition is safe at today's scale (about four epochs) is on Data mixing.", 'trained four epochs over 44b unique tokens'),
 ('owned:' + PRE, '', "Objectives as a family with the gap within denoising being noise, and scaling laws as the fitted answer to T5's 4x-compute question, are on Pretraining.", 'the gap within denoising is noise'),
 ('core', '', "Ablation grid (tables tab, drawn by script): Tables 1, 2 and 4 to 16 as one sortable grid, delta from the baseline in Table 1's standard deviations, main text or Table 16.", 'on every one of 33 task metrics'),
 ('depth', '', 'Parameter recount (tables tab, drawn by script): Small 60.5M, Base 222.9M and 3B 2.85B reproduce and equal the checkpoints; Large counts to 737.7M against the printed 770M.', "large counts to 737.7m, not 770m"),
 ('depth', '', 'Checks on the tables (drawn by script): 480 of 483 bold cells follow the two-standard-deviation rule; three main-table cells disagree with Table 16; one Table 10 row in the appendix copies another.', 'bold marks against the stated rule, main tables against table 16'),
 ('core', '', 'Table 14 (drawn by script): the five final sizes against the previous best, per task metric.', 'table 14: the final models against the previous best'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
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
    if x['id'] in FAT:
        x['label'], x['key'], x['note'] = 'fat', '', FAT[x['id']]; continue
    if x['id'] in VOLATILE:
        x['label'], x['key'] = 'volatile', VOLATILE[x['id']]; x['note'] = 'dated closed block "Where the checkpoints are used now" (checked 2 October 2026)'; continue
    if x.get('added'):
        continue
    k = KEYS.get(x['id']) or find_key(x['text'])
    if not k:
        print('UNPLACED', x['id'], x['text'][:100]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k; x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, _, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-24', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
