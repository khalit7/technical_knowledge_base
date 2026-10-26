"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-26 from the Context Language Models page as built
before the light pass; adapted from the DSec page's labeller). For every unit not overridden below, the key is the first run
of 8 (then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when
that key sits inside a closed <details> block, volatile when it sits in the dated block "Since the paper", core otherwise.
Units added by hand (NEW) cover the light pass's top, the owner links and the script-drawn charts and tables, keyed to
static text. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/context_language_models'
BK = 'systems_and_performance/topic_inference_and_serving/batching_kv_cache_and_scheduling'
RL = 'models_and_training/topic_rl/rl_for_llms'
CE = 'agents_and_retrieval/topic_agentic_harnesses/context_engineering'
FAT = {1: 'the old header line ("About 20 min to read The paper tab"), replaced by the measured reading line',
       2: 'the tab bar labels'}
KEYS = {33: 'how it is built.', 206: 'eq. 9 for one call'}
OWNED = {43: ('owned:' + BK, 'stops at the first miss')}  # id -> (label, key): the sentence moved to its owner
NEW = [
 ('core', 'Core sentence: the context as a file the model may rewrite with Bash; context management becomes model behaviour a prompt can steer and RL can train; edits break the prefix cache, so cost is counted in prefix-reuse FLOPs and the server patched (SCR).', 'what to keep stops being a harness rule'),
 ('core', 'Hero: the paper\'s Figure 1 (CC BY 4.0), the c_t to c_t+1 strip and four panels; panel B omits TerminalBench (tie) and the 9B model.', 'panel b leaves out terminalbench'),
 ('core', 'You need (prefix cache, GRPO, production compaction) and the new terms: live context file, harness-defined and action-based, context pressure, prefix-reuse FLOPs, re-prefill, stepwise GRPO, success-gated efficiency advantage, SCR.', 'recomputing cached tokens after an edit'),
 ('core', 'The paper\'s Figure 4 (CC BY 4.0) beside SCR: standard serving re-prefills C, SCR reuses the cached suffix.', 'same edit, two servers'),
 ('core', 'Calculator moved into Reading with a prediction prompt: one turn\'s bill by operation, defaults reproduce Figure 16.', 'drag r t from 90% to 50%'),
 ('core', 'Prior work in two families, one open sentence (details closed).', 'either way, a human designed the menu'),
 ('core', 'Table 1 summary open: CLM beats OpenEvolve on all four, by up to 16.8%, one run each.', 'by up to 16.8% (heilbronn triangles)'),
 ('core', 'Settings that disagree: open pointer, readings closed.', 'none changes a conclusion, the readings are in the closed block below'),
 ('volatile', 'Since the paper, checked 26 October 2026: arXiv still v1 only.', 'arxiv still lists only v1 of the paper'),
 ('core', 'Takeaway scoped on 26 October 2026 (takeaway_note): one run per setting, TerminalBench tie, Self-Compact ahead on 9B, calculated FLOPs, +47.6% against CLM\'s own start.', 'scoped on 26 october 2026'),
 ('owned:' + BK, 'Why a prefix cache stops at the first differing token (block-hash lookup) is owned by the serving page; this page keeps one sentence and the link.', 'stops at the first miss'),
 ('owned:' + RL, 'GRPO and its group-relative advantage in general, owned by RL for LLMs; this page keeps what stepwise GRPO changes.', 'group relative policy optimization is ppo minus the value model'),
 ('owned:' + CE, 'Production compaction triggers (Claude API compaction at 150,000 input tokens by default), owned by Context engineering.', '150,000 input tokens by default'),
 ('core', 'Reading: Figure 5 and 19 chart, GRPO rollout widget, predict reveal bars, all drawn by script.', 'click the rollouts below to flip success and failure'),
 ('core', 'Replay tab: one episode under three context policies, priced with Eq. 9, drawn by script.', 'the whole episode, three policies side by side'),
 ('core', 'Tables tab: Tables 1 and 2 and the decoded figures, with every check, drawn by script.', 'every check against a printed number'),
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
    tab = 't-tables' if text.startswith('Tables tab') else 't-run' if text.startswith('Replay tab') else 't-read'
    n += 1; u.append({'id': n, 'tab': tab, 'section': 'light pass 2026-10-26', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
