# Write coverage.json: the root atlas rows and root mentions this page now owns, each checked against ../index.html.
# There was no old page (Notion placeholder only), so the floor is the parent's material on preference and arenas.
import json, os, re, html
HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, '..', 'index.html'), encoding='utf-8').read()
text = html.unescape(re.sub(r'<[^>]+>', ' ', page)); text = re.sub(r'\s+', ' ', text)
items = [
    # atlas rows (topic_benchmarks/src/data/atlas.json, family pref and instr)
    ('atlas:lmarena', 'LMArena row: pairwise votes, Bradley-Terry with and without style control, 410+ models, top Gemini 4 Argon 1525 (1516 to 1534, 4,932 votes) on 2 Oct 2026, ranks 2 to 10 at 1494 to 1505, GPT-6 Astra 29th at 1477', 'One screen table; Uncertainty; Today\'s board tab', ['1525 (1516 to 1534)', '4,932 votes', '413 models', 'GPT-6 Astra (max) is 29th'], 'Atlas said 410 models (30 Sep); the 2 Oct board has 413.'),
    ('atlas:lmarena:iss', 'Leaderboard Illusion: private testing, 27 Meta variants, 19.2% and 20.4% data shares, 205 of 243 deprecated', 'Critiques', ['27 private LLM variants', '19.2% and 20.4%', '205 of 243'], None),
    ('atlas:lmarena:corr', 'Correction: no "frontier cluster 1510 to 1525"; one model at 1525, next at 1494 to 1505', 'Uncertainty (spreads), board tab', ['spread of 1 to 1'], None),
    ('atlas:arena_hard', 'Arena-Hard v2.0: 500 hard + 250 creative prompts, judge win rate, o3 85.9% vs o3-mini (Gemini 2.5 judge), dormant since mid-2025; null model 83.0', 'Judge-graded boards', ['500 new hard prompts plus 250 creative-writing prompts', 'o3 at 85.9% against o3-mini', 'last commit June 2025', '83.0 on Arena-Hard-Auto'], None),
    ('atlas:alpacaeval', 'AlpacaEval 2 LC: 805 instructions, GPT-4 Turbo reference, null model tops at 86.45%, GPT-4o 57.45%, retired', 'Judge-graded boards', ['805 instructions', '86.45%', '57.45%'], None),
    ('atlas:mt_bench', 'MT-Bench: 80 questions, 8 categories, GPT-4 1 to 10, 13 of 30 wrong reference answers, null 9.55, last table 9.32, retired', 'Judge-graded boards', ['80 two-turn questions in 8 categories', '13 of 30', '9.55 on MT-Bench', '9.32'], None),
    ('atlas:ifeval', 'IFEval: 541 prompts, 25 instruction types, four scoring variants, saturated, dropped from frontier cards', 'Instruction following', ['541 prompts with 25 kinds', 'Four scores', 'dropped from the Claude Opus 5.5 and Gemini 4 Argon cards'], None),
    ('atlas:multichallenge_ifbench', 'MultiChallenge 273 conversations, Muse Spark 75.52% (plus or minus 4.05), static since 3 Feb 2026; IFBench 300 prompts, 58 constraints, Grok 4.3 (medium) 83.3%', 'Instruction following', ['273 multi-turn conversations', '75.52%', '58 new out-of-domain constraints', '83.3%'], None),
    # root reading, family section and mistakes
    ('root:family', 'LMArena fits Bradley-Terry (Elo-style) ratings to anonymous pairwise votes; live, contamination-free, preference not capability', 'Votes to ratings; one screen', ['Bradley-Terry', 'Only anonymous votes count', 'What it measures is preference, though, not correctness'], None),
    ('root:family:style', 'Votes reward confident, well-formatted, flattering answers; style rivals substance; 2025 GPT-4o sycophancy rollback', 'Style control; Critiques', ['56.2% win chance', 'rolled back a GPT-4o update'], None),
    ('root:family:judges', 'Arena-Hard and AlpacaEval swap voters for an LLM judge; judges on the evaluation topic', 'Judge-graded boards', ['replaced the crowd with a strong LLM judge', 'LLM-as-judge: design, biases, calibration, reliability'], None),
    ('root:family:if', 'Instruction following checked mechanically: IFEval, MultiChallenge', 'Instruction following', ['checked by rule, not by taste'], 'The root groups instruction following with preference; no child owned IFEval, IFBench and MultiChallenge, so this page carries them briefly.'),
    ('root:family:status', 'Active: LMArena (category filters, style control), Arena-Hard v2, GDPval-AA, IFEval (saturating), MultiChallenge, IFBench. Fading or retired: AlpacaEval 2, MT-Bench', 'One screen; Judge-graded boards; Instruction following', ['dormant since mid-2025', 'Retired'], 'Correction: Arena-Hard v2 is dormant (no update since mid-2025), not active; IFEval is saturated. GDPval-AA is an expert-preference Elo on knowledge work owned by the Agentic page (linked).'),
    ('root:mistake', 'Treating an arena rating as a capability ranking; use with category filter and style control', 'Mistakes; Preference vs capability', ['Treating preference as capability or truth', 'Spearman 0.71'], None),
    ('root:gaming', 'Selective reporting: private variants, Meta 27 Llama 4 variants; LMArena response; AlpacaEval needed length control', 'Critiques; Judge-graded boards', ['Arena\'s response', 'length control narrowed the swing'], None),
    ('root:more', 'Further reading: LMArena, The Leaderboard Illusion with response and Simon Willison summary', 'Further reading', ['Simon Willison', 'The Leaderboard Illusion'], None),
    # methodology depth (topic_benchmarks/src/for_children/methodology_depth.md, "Arenas, in depth")
    ('depth:arena', 'Anonymous pairwise battles, Bradley-Terry; Arena-Hard distils hard arena prompts into an offline judge proxy', 'Votes to ratings; Judge-graded boards', ['BenchBuilder selects hard, varied prompts from arena logs'], None),
    ('depth:illusion', 'Private testing best-of-N retracted at will; unequal sampling; silent deprecation; data-access advantage trains models to win the arena; LMArena disputed parts (open-model share) and tightened variant policy', 'Critiques', ['retract scores if desired', '40.9% of battles, not 8.8%', 'provisional', 'relative performance gains of up to 112%'], None),
    ('depth:pref', 'Preference is not capability: votes reward confident, formatted, sycophantic answers; style-controlled ratings reorder the board; GPT-4o sycophancy rollback', 'Style control; Critiques; Preference vs capability', ['eleven of the twenty move three places or more', 'short-term thumbs-up'], None),
    ('depth:read', 'Practical read: one noisy signal, category-filtered (coding, hard prompts, style control on), never the capability ranking', 'What to use', ['read by rank spread, not rank'], None),
    ('depth:metrics', 'Elo (preference) as a scoring metric; legacy metrics list', 'Votes to ratings', ['Calling the score "Elo"'], 'Only the preference metric belongs here; the other legacy metrics stay with the root.'),
]
out = []
for iid, fact, where, checks, note in items:
    missing = [c for c in checks if c not in text]
    out.append({'id': iid, 'fact': fact, 'where': where, 'checks': checks, 'missing': missing, 'note': note, 'verified': not missing})
res = {'source': 'No old page (Notion placeholder only). Floor: the parent Topic: benchmarks material this page now owns (atlas rows in family pref and instr, the Reading family section and mistakes, the gaming paragraph, Further reading, and for_children/methodology_depth.md "Arenas, in depth").',
       'items': len(out), 'verified': sum(o['verified'] for o in out), 'list': out}
json.dump(res, open(os.path.join(HERE, 'coverage.json'), 'w'), indent=1, ensure_ascii=False)
print(res['items'], 'items,', res['verified'], 'verified')
for o in out:
    if o['missing']: print('MISSING', o['id'], o['missing'])
