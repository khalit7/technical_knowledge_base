"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the InstructGPT page before the light pass;
adapted from the LoRA page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, volatile when it sits in the dated block "Open implementations", core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/instructgpt'
RH = 'models_and_training/topic_llm_training_and_post_training/reward_hacking'
AL = 'models_and_training/topic_llm_training_and_post_training/alignment_sft_rlhf_dpo_rlvr'
FAT = {84: 'animation manners line, replaced by "Nothing moves until you press play or step"', 211: 'Why it matters bullet restating the first lesson of the Discussion (60 against 3,640 petaflop/s-days, more useful than a 100 times larger model), which stays core there'}
OWNED = {}    # id -> (label, key)
KEYS = {27: 'with the training-set sizes of table 6', 212: 'had one later answer in rl from ai feedback'}
NEW = [
 ('core', 'Core sentence: fine-tune GPT-3 on what people prefer in three steps (SFT, RM from rankings, PPO with a KL penalty and pretraining gradients); a 1.3B InstructGPT is preferred to 175B GPT-3.', 'fine-tune gpt-3 on what people prefer instead of on more internet text'),
 ('core', "Hero: Figure 2 redrawn with Table 6's training-set sizes and what each step produces; rankings yield up to C(9,2) = 36 comparisons per prompt; step 3 needs only prompts.", 'yields up to c(9,2) = 36 comparisons per prompt'),
 ('core', 'You need and new terms: SFT, RM, PPO, PPO-ptx, beta and gamma, alignment tax, win rate against 175B SFT, held-out labelers.', 'people who produced no training data'),
 ('owned:' + RH, 'Reward-model over-optimisation in general: Goodhart with a learned proxy, the rise-then-fall curve; drawn on Reward hacking.', 'the shape gao et al. measured'),
 ('owned:' + AL, 'The current list of RLHF frameworks (verl, OpenRLHF, TRL and others) is kept on the alignment page.', 'verl, openrlhf, trl, skyrl, nemo rl'),
 ('core', 'Tables tab, drawn by script: every number in the text checked, with verdicts.', 'every number in the text, checked'),
 ('core', 'Tables tab, drawn by script: Table 14 explorer with differences from GPT-3 at the same size.', 'differences are from gpt-3 at the same size'),
 ('depth', 'Tables tab, drawn by script: Tables 6 to 11 (data) and 12 to 13 (labeler surveys), now in closed blocks.', 'the labelers (tables 12 and 13)'),
 ('core', 'Run tab, drawn by script: what reproduces at toy scale and what does not.', 'what reproduces at toy scale, and what does not'),
 ('core', 'Then and now, drawn by script: the recipe card stepped through eight later sources and the changed/survived table.', 'what changed, and what survived'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
m = re.search(r'Open implementations \(checked.*?</details>', body, flags=re.S); dated = ledger.norm(m.group(0)) if m else ''
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
        print('UNPLACED', x['id'], x['tab'], x['text'][:160]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['where'] = ''; x['note'] = 'dated closed block "Open implementations (checked 3 October 2026)"'
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
