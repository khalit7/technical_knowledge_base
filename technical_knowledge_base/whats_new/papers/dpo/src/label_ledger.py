"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the DPO page before the
light pass; adapted from the CLIP page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when
that key sits inside a closed <details> block, volatile when it sits in the dated "Adoption and the debate in detail" block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/dpo'
AL = 'models_and_training/topic_llm_training_and_post_training/alignment_sft_rlhf_dpo_rlvr'
ES = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
LJ = 'measurement/topic_evaluation_and_llm_judges/llm_as_judge'
FAT = {39: 'animation-manners line (autoplay off screen), replaced by "Nothing moves until you press play or step"'}
KEYS = {149: 'when it pays off.'}
NEW = [
 ('core', 'Core sentence: the optimal KL-constrained policy reweights the reference by exp(r/beta), so every reward is beta log pi/pi_ref plus a prompt-only term that cancels; one logistic loss, no reward model, no sampling, no RL.', 'plus a prompt-only term that cancels in a preference comparison'),
 ('core', "Hero: the paper's Figure 1 (CC BY 4.0), RLHF against DPO, with the bridge equation under it (Eq. 5 into Eq. 1, Z cancels).", 'notice what disappears on the right'),
 ('core', 'You need and new terms: pi_ref, beta, implicit reward, frontier, Preferred-FT, Unlikelihood, PPO-GT.', 'the kl penalty\'s weight: small β lets the policy move far'),
 ('core', 'Likelihood displacement chart shown inline in its own card after the predict question.', 'at β = 0.1 both answers lose probability'),
 ('core', 'Toy sweep chart shown inline in its own card after the predict question.', 'on the toy, ppo-gt reaches the exact frontier'),
 ('owned:' + AL, 'The RLHF pipeline in general (reward model, KL penalty, PPO) with InstructGPT numbers.', 'it is trained so the preferred answer scores higher, by the bradley-terry model'),
 ('owned:' + AL, 'The DPO against PPO evidence: Xu et al. 2024 (tuned PPO ahead, CodeContests), Tang et al. 2024 (online beats offline at the same KL), Tajwar et al. 2024 (on-policy samples and a negative gradient help); iterative or online DPO recovers much of the gap.', 'tang et al. 2024, google deepmind'),
 ('owned:' + AL, "DPO's successors compared on one pair: IPO, cDPO, KTO, SimPO, ORPO.", 'kto: single thumbs up or down'),
 ('owned:' + AL, 'Why likelihood displacement happens: shared parameters across answers.', 'which is where likelihood displacement comes from'),
 ('owned:' + ES, 'Standard errors, paired tests and sample sizes in general.', 'the standard deviation of the score across re-draws of the items'),
 ('owned:' + LJ, 'Judge biases (length, position) and calibration against human labels in general.', 'position bias'),
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
        x['label'] = 'volatile'; x['note'] = 'dated closed block "Adoption and the debate in detail" (sources read 3 October 2026)'
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
