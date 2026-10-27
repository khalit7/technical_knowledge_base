"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Mamba page before the light pass;
adapted from the Chinchilla and QLoRA labellers). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block or in the tables tab, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/mamba'
BA = 'models_and_training/topic_llm_architecture/beyond_attention'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 2: 'tab labels', 78: 'sentence-split fragment (the DNA heading is still on the page)', 81: 'sentence-split fragment (the Audio heading is still on the page)', 124: 'sentence-split fragment (the bullet heading is still on the page)'}
VOLATILE = {}
OWNED = {}   # id -> (owner path, key on the owner's built page)
KEYS = {}    # id -> key chosen by hand where the automatic run of words fails
NEW = [
 ('core', '', 'Core sentence: input-dependent Delta, B, C let a fixed state choose what to keep; a fused hardware-aware scan replaces the convolution; linear-time training, no KV cache, Transformer parity up to 3B.', 'the idea in one sentence: let the state space model'),
 ('core', '', 'Hero: the paper\'s Figure 1 (CC BY 4.0), the selective SSM with the selection mechanism and the SRAM/HBM hierarchy.', 'everything blue is new'),
 ('core', '', 'New terms: LTI, selection and S6, Delta, hardware-aware scan.', 'hardware-aware scan'),
 ('owned:' + BA, '', 'Linear recurrences, S4 discretisation and the LTI convolution form are taught on Beyond attention.', 'linear time-invariant'),
 ('owned:' + BA, '', 'Mamba-2 and state space duality are taught on Beyond attention.', 'state space duality'),
 ('owned:' + BA, '', 'The hybrid design space (Jamba, Nemotron-H, Granite 4.0-H, Falcon-H1) is on Beyond attention.', 'Nemotron-H'),
 ('volatile', '', 'Who ships hybrids (Jamba, Nemotron-H, Nemotron Nano 2, Granite, Falcon-H1, MiniMax) moved to a dated closed block.', 'who ships hybrids, as of 25 october 2026'),
 ('depth', '', 'Table 11 extrapolation table (script-rendered), now a closed block of the Tables tab.', 'table 11 (and table 2): induction heads extrapolation'),
 ('depth', '', 'Ablation bars, Tables 6 to 9 (script-rendered), closed block.', 'tables 6 to 10: ablations'),
 ('depth', '', 'Table 13 Great Apes (script-rendered), closed block.', 'table 13: great apes dna classification'),
 ('depth', '', 'Tables 4 and 5 SC09 (script-rendered), closed block.', 'tables 4 and 5: sc09 speech generation'),
 ('depth', '', 'Table 15 training memory (script-rendered), closed block.', 'table 15: training memory, 125m models'),
 ('depth', '', 'Parameter recount of the checkpoints and Table 12 (script-rendered), closed block.', 'parameters: the released checkpoints, recounted'),
 ('depth', '', 'Every number in the text checked (script-rendered), closed block.', 'every number in the text, checked'),
 ('core', '', 'Tables 1 and 3 rebuilt (script-rendered), open in the Tables tab.', 'table 3: zero-shot evaluations'),
]     # (label, where, text, key) for units the light pass added
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
i0 = body.index('id="t-tables"'); i1 = body.index('id="t-then"')
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
        x['label'], x['key'] = 'volatile', VOLATILE[x['id']]; x['note'] = 'dated closed block in Why it matters'; continue
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
