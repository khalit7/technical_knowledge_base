"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the page before the light pass; adapted from the
Qwen3 labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4) consecutive words of its text
that appears verbatim in the rebuilt page, and the label is depth when that key sits inside a closed <details> block or in the
tables tab's closed blocks, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/encoder_decoder_gemma_and_t5gemma_2'
FAM = 'models_and_training/topic_llm_architecture/families_and_objectives'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 174: 'wind-up sentence ("load-bearing"), replaced by a plainer one',
       36: 'sentence fragment ("UL2 ( Tay et al.") split off unit 37 by the drafter', 104: 'wind-up ("worth knowing"); the variant itself is unit 105'}
VOLATILE = {175: 'as of 23 september 2025'}
OWNED = {12: (FAM, 'bidirectional encoder; causal decoder that also reads the encoder (cross-attention)'),
         37: (FAM, 'mixes three denoisers in one run')}
KEYS = {111: 'turned into ul2 data of at most 16k input'}
NEW = [
 ('core', '', 'Core sentence: copy a decoder-only checkpoint into both halves (encoder switches to bidirectional, cross-attention new), continue up to 2T tokens; level after pretraining, ahead after tuning (2B-2B 46.1 against 39.0); 9B-2B at the 2B latency.', 'the idea in one sentence: turn a pretrained decoder-only'),
 ('core', '', 'Hero: Figure 1 and section 3 redrawn as an HTML diagram (the papers are not CC BY): decoder-only Gemma 2 2B copied into an encoder (mask only) and a decoder (plus new cross-attention), with the two initialisations and the continued training.', 'one decoder-only checkpoint fills both halves'),
 ('core', '', 'New terms: adaptation, balanced and unbalanced, PT and IT score, merged attention.', 'balanced, unbalanced : encoder size, then decoder size'),
 ('owned:' + FAM, '', 'The encoder-decoder family (bidirectional encoder, causal decoder reading it through cross-attention) is taught on Families and objectives; this page keeps one sentence and links it.', 'bidirectional encoder; causal decoder that also reads the encoder (cross-attention)'),
 ('owned:' + FAM, '', 'UL2 as a mixture of denoisers with mode tokens is taught on Families and objectives; this page keeps one sentence (used without distillation) and links it.', 'mixes three denoisers in one run'),
 ('volatile', '', 'Hub check 25 October 2026: Google lists only the three balanced pretrained T5Gemma 2 checkpoints; no unbalanced Gemma 3 pair and no tuned T5Gemma 2.', 'checked 25 october 2026'),
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
    if x.get('added'):
        continue
    x.pop('note', None)
    if x['id'] in FAT:
        x['label'], x['key'], x['note'] = 'fat', '', FAT[x['id']]; continue
    if x['id'] in VOLATILE:
        x['label'], x['key'] = 'volatile', VOLATILE[x['id']]; x['note'] = 'dated closed block "Later, as of 25 October 2026" in Why it matters'; continue
    if x['id'] in OWNED:
        o, k = OWNED[x['id']]; x['label'], x['key'] = 'owned:' + o, k; continue
    k = KEYS.get(x['id']) or find_key(x['text'])
    if not k:
        print('UNPLACED', x['id'], x['tab'], x['text'][:110]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k; x['label'] = 'depth' if k in det else 'core'
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
