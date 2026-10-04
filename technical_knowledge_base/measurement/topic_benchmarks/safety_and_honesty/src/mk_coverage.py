"""Write coverage.json: the root atlas rows and root page mentions this page now owns, each with the needle that finds it in ../index.html.
There was no old Notion page (placeholder only), so coverage is against the root (Topic: benchmarks) instead of a src/live.md."""
import json, re, html
H = open('../index.html', encoding='utf-8').read()
T = html.unescape(re.sub(r'<[^>]+>', ' ', H)); T = re.sub(r'\s+', ' ', T)
atlas = json.load(open('../../src/data/atlas.json'))
rows = {r['id']: r for r in atlas['rows'] if r['fam'] == 'safe'}
items = []
def add(kind, ref, fact, needle, status='carried', note=''):
    items.append({'kind': kind, 'ref': ref, 'fact': fact, 'needle': needle, 'found_in_html': needle in T, 'status': status, 'note': note})
# atlas rows (family "safe"): construction, size, metric, evidence, issues, corrections
add('atlas', 'truthfulqa', '817 questions in 38 categories; generation and MC versions', '817 questions in 38 categories')
add('atlas', 'truthfulqa', '790 after the January 2025 revision', 'The binary set has 790 pairs')
add('atlas', 'truthfulqa', 'MC formats gameable; binary version released, invalid questions dropped (Jan 2025)', 'released a binary version')
add('atlas', 'truthfulqa', 'Best model 58% truthful, humans 94% (2021)', 'truthful on 58% of questions against 94% for people')
add('atlas', 'truthfulqa', 'Retired: labs report SimpleQA, AA-Omniscience, MASK instead', 'files it as retired')
add('atlas', 'harmbench', 'HarmBench 510 behaviours (400 text, 110 multimodal)', '510 harmful behaviours (400 text, 110 multimodal)')
add('atlas', 'harmbench', 'StrongREJECT 313 forbidden prompts', '313 forbidden prompts')
add('atlas', 'harmbench', 'ASR meaningless without the attack named; 18 methods compared', 'ran 18 red-teaming methods')
add('atlas', 'harmbench', 'Correction: StrongREJECT left frontier cards; OpenAI filtered it as "otherwise highly saturated" then replaced it before GPT-5.4', 'replaced it with a multi-turn jailbreak evaluation', 'carried, refined',
    'The "highly saturated" quotation and the 0.975 GPT-5.2 Thinking reading are from the GPT-5.2 card (11 Dec 2025), not the GPT-5.4 card the atlas cites; the 5.4 card says it was replaced by a multi-turn evaluation.')
add('atlas', 'harmbench', 'Evidence: 0.975 not_unsafe GPT-5.2 Thinking, filtered StrongREJECT', 'GPT-5.2 Thinking 0.975')
add('atlas', 'agentharm', '110 malicious agent behaviours (440 with augmentations), 11 categories, 104 tools', '104 synthetic tools and 110 explicitly malicious')
add('atlas', 'agentharm', 'Harm score and refusal rate', 'harm score')
add('atlas', 'agentharm', 'GPT-4o 48.4% harm, refusal 48.9%', '48.4%')
add('atlas', 'agentharm', 'Mistral Large 2 82.2% harm, refusal 1.1%', '82.2%')
add('atlas', 'agentharm', 'Private split; no frontier lab reports it; "active" means unsaturated', 'no frontier card reports AgentHarm now')
add('atlas', 'air_bench', '5,694 prompts in 314 risk categories from regulations and policies', '5,694 prompts in 314 risk categories')
add('atlas', 'air_bench', 'Refusal rate rewards refusing; no over-refusal penalty', 'it has no benign mirror')
add('atlas', 'air_bench', '93.2% Claude 4.5 Haiku, HELM v1.19.0, 24 Nov 2025; spread 44 to 93%', 'spans 44 to 93% refusal (Claude 4.5 Haiku 93.2%)')
add('atlas', 'mask', 'Honesty score = 1 minus P(lie) under pressure against elicited belief', 'Honesty is 1 − P(lie)')
add('atlas', 'mask', '1,500 items: 1,000 public, 500 private', '1,500 items (1,000 public, 500 private)')
add('atlas', 'mask', 'Correction: "consistency score" mislabelled', 'corrects the old label "consistency score"')
add('atlas', 'mask', '96.28% Claude Opus 4.6 (no thinking), Scale private set, plus or minus 0.41', '96.28 ± 0.41')
add('atlas', 'mask', 'Top cluster 92 to 96%; on the Opus 5.5 card (public split, as a figure)', "Anthropic's cards report the public split")
add('atlas', 'mole', '150 accounts, 9 services, 30 workdays, 12 threats', '150 AI-operated accounts sharing nine stateful services')
add('atlas', 'mole', '24 of 45 completed harms caught, best monitor Claude Opus 4.7, single-day audit', 'caught 24 of 45 completed harms')
add('atlas', 'mole', 'Correction: refusal vs completion correlate (Spearman -0.73); 72% (28 of 39) under a no-refusal preamble', 'Spearman −0.73')
add('atlas', 'emergence_world', 'Worlds ran 16 to 21 days; no system resilient to all three tests', 'for 16 to 21 days')
# root page mentions this page now owns
add('root', 'Reading, Safety family', 'Does the model refuse what it should, resist jailbreaks, stay honest, stay safe when it acts', 'Does it refuse what it should and only that')
add('root', 'Reading, Safety family', 'Early tests scored answer text (TruthfulQA); then attack success (HarmBench, StrongREJECT, AgentHarm), regulation-derived risks (AIR-Bench), belief against claim (MASK), the monitor and long run (MOLE, Emergence World)', 'MASK')
add('root', 'Reading, Safety family', 'What a model does matters more than what it says', 'what the model says against what it does', 'carried', 'section title "Agents: what the model says against what it does"')
add('root', 'Reading, system as subject', 'MOLE: 28 of 39 agent models completed most harmful objectives under a role-play instruction not to refuse; best monitors caught about half', '28 of 39 agent models (72%)')
add('root', 'Reading, preference family', 'The 2025 GPT-4o sycophancy rollback showed the cost of optimising for approval', 'rolled back on 28 and 29 April')
add('root', 'Further reading', 'MOLE paper page with the corrected reading of its refusal and 72% results', 'MOLE: Detecting Insider Threats in AI Agents')
add('root', 'Old root table (live.md)', 'TruthfulQA 2021, imitative falsehoods, MCQ / generation, mostly retired; design critiqued', 'MC1')
add('root', 'Old root table (live.md)', 'HarmBench / StrongREJECT / AgentHarm, jailbreak robustness and harmful agent tasks, attack success rate', 'attack success rate')
add('root', 'Old root table (live.md)', 'AIR-Bench, regulation-derived risk taxonomy, refusal accuracy', 'regulations and company policies')
add('root', 'Old root table (live.md)', 'MASK, honesty under pressure (belief vs claim)', 'pressure prompt')
out = {'source': 'No old page (Notion placeholder only). Coverage is against the root Topic: benchmarks: atlas.json rows of family "safe" and the root Reading and Further reading mentions; read 2026-10-04.',
       'counts': {'items': len(items), 'found': sum(i['found_in_html'] for i in items)}, 'items': items}
json.dump(out, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print(out['counts']); [print('MISSING', i['ref'], i['needle']) for i in items if not i['found_in_html']]
