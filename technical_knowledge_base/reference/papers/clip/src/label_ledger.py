"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-24 from the CLIP page before the light pass;
adapted from the LoRA page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import html, json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/clip'
VE = 'models_and_training/topic_generative_and_multimodal/vision_encoders'
CO = 'models_and_training/topic_ml_fundamentals/contrastive_and_self_supervised_learning'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 46: 'animation manners line, replaced by "Nothing moves until you press play or step"', 96: 'the same', 287: 'the same, for the removed softmax-against-sigmoid animation', 255: 'a bold lead-in split off as its own sentence; its bullet is the next unit'}
OWNED = {286: ('owned:' + VE, "siglip's initial −10 for clip (illustrative)")}
KEYS = {}  # id -> key chosen by hand where the automatic run of words fails
NEW = [
 ('core', 'Core sentence: two encoders trained on 400M web pairs only to pick which caption goes with which image; class names written as sentences become a classifier; zero-shot 76.2% on ImageNet, matching a supervised ResNet-50, and far more robust to shift.', 'only to pick which caption in a batch belongs to which image'),
 ('core', "Hero: the paper's Figure 1 redrawn: an N x N similarity grid with the true pairs on the diagonal (training), and class names as sentences compared with a new image (test).", 'one shared space, used twice'),
 ('core', 'You need and new terms: zero-shot transfer, prompt, linear probe, temperature, effective robustness, WIT.', 'accuracy under distribution shift above what imagenet accuracy predicts'),
 ('owned:' + CO, '', 'InfoNCE and its temperature in general: Contrastive and self-supervised learning.', 'infonce and its temperature'),
 ('owned:' + VE, '', 'Batch size and temperature in CLIP-style training: chance level ln N grows with the batch.', 'chance level ln n grows with it'),
 ('owned:' + VE, '', 'Zero-shot classification with today\'s encoders on real images.', 'zero-shot classification is what a text tower buys'),
 ('owned:' + VE, '', 'Data curation for CLIP-style models (LAION, DataComp, MetaCLIP, DFN) and its measured gains.', "metaclip's vit-b/32 goes from 57.4%"),
 ('owned:' + VE, '', 'Minimal-pair failures (binding, counting, typographic) on today\'s encoders.', 'yuksekgonul et al. 2022'),
 ('owned:' + VE, '', 'The softmax-against-sigmoid visual on one batch, with batch size and scale to move (removed from Then and now).', "softmax (clip's loss) sigmoid (siglip's loss)"),
 ('core', '', 'Tables tab, drawn by script: Tables 10 and 11 dataset by dataset, Figure 8 per model, Table 16 with the ObjectNet reconciliation, and the does-not-reproduce box.', 'tables 10 and 11: any two models, dataset by dataset'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
m = re.search(r'Usage claims carried over from the old page.*?</details>', body, flags=re.S); dated = ledger.norm(m.group(0)) if m else ''
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
        print('UNPLACED', x['id'], x['text'][:100]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['where'] = ''; x['note'] = 'dated closed block "Usage claims carried over from the old page" (checked 2 October 2026)'
    else:
        x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for row in NEW:
    lab, text, key = (row[0], row[1], row[2]) if len(row) == 3 else (row[0], row[2], row[3])
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-24', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
