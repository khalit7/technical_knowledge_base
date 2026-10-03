"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration, fetched 2026-10-03, last edited 2026-09-20) with where the HTML carries it, and verify each
item's check strings against the built index.html (tags stripped, scripts kept, whitespace normalised).
The item list below is this paper's own, written from src/live.md (NeoHorse-1), not copied from another page.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, F = 'The paper tab', 'Schedule the curriculum tab', 'Tables tab', 'Further reading tab'
C = [
 # properties (they stay in Notion; the card repeats the takeaway, corrected)
 ('Takeaway property (on the card, with "11 benchmarks" corrected to ten and the teacher step made precise)', R + ', headline card "In one line"', ['Makes the serving harness the source of the training curriculum rather than downstream infrastructure', 'a router over a heterogeneous model pool predicts each request\'s capability demand', 'structural validation plus six-dimensional semantic evaluation plus subscene-level labelling', 'evaluation feedback feeds back into the training mixture', 'goes 58.94 to 64.87 at 4B and 65.60 to 69.04 at 9B']),
 ('Topics property: agentic-harnesses, llm-training-and-post-training, rl', F + ', Topics', ['https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb', 'https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b', 'https://app.notion.com/p/3c65c17b0d0d8195a6c6c11ad093c16e']),
 ('Year property: 2026', 'crumb line', ['Papers', '· 2026 ·']),
 # header
 ('Reading time line "5 min read, +45m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('TokenRhythm; submitted 8 September 2026', R + ', headline card and note under the nav', ['TokenRhythm Technologies', '8 September 2026 (arXiv v1', 'TokenRhythm, submitted 8 September 2026']),
 ('412 Hugging Face upvotes', R + ', note under the nav (kept as the count at the time, with the dated re-count)', ['412 Hugging Face upvotes then', 'by the Hugging Face API']),
 ('Models on Hugging Face, code on GitHub', R + ', What it takes (the GitHub repository has no training code); card', ['https://huggingface.co/TokenRhythm/NeoHorse-1-4B', 'https://github.com/TokenRhythm/NeoHorse', 'nothing of it is released: no training code']),
 ('arXiv 2609.08183 (45 min); best resource: the paper (45 min)', 'card and Further reading', ['https://arxiv.org/abs/2609.08183', 'https://arxiv.org/html/2609.08183v1', '(45 min)']),
 # problem
 ('Post-training data for agents is usually curated once, offline, against a fixed task distribution', R + ', Problem', ['Post-training data for agents is usually curated once, offline, against a fixed task distribution']),
 ('The serving harness is treated as downstream infrastructure with no say in what the next checkpoint learns', R + ', Problem', ['treated as downstream infrastructure with no say in what the next checkpoint learns']),
 ('That wastes the signal a curated dataset never has: which requests the model handled badly, which model had to take them', R + ', Problem', ['which requests the current model handled badly, and which model in the fleet had to take them']),
 ('Thesis as a loop: "what the system learns to do shapes what it learns from next"', R + ', Problem; Idea animation', ['what the system learns to do shapes what it learns from next']),
 # method
 ('Five components, the router is the spine', R + ', Idea', ['Five components, and the router is the spine']),
 ('Heterogeneous model pool with intelligent routing: tiers by predicted capability demand, not a static rule; the router produces a labelled difficulty judgement as a side effect of serving', R + ', Idea; Routing signals (C0 to C3, three fields)', ['routed across service tiers by predicted capability demand rather than by a static rule', 'labelled judgement about task difficulty as a side effect of serving', 'raw prediction, the policy-adjusted decision, and the tier actually served']),
 ('Data curation pipeline: structural validation, six-dimensional semantic evaluation, subscene-level labelling (finer than per-conversation; enables partial-trajectory supervision)', R + ', Idea; Data from the routing harness (gates, six dimensions named, Scene/Goal/Outcome)', ['finer-grained than per-conversation labelling and is what makes partial-trajectory supervision possible', 'goal attainment, instruction adherence, tool use, evidence consistency, error recovery and termination', 'PASS, WARN, FAIL or NOT_EVALUATED', 'Partially recoverable']),
 ('Three-stage curriculum: SFT ordered by routing signals; difficulty from observed traffic, not a heuristic', R + ', Idea; Training (Eq. 2 widget); ' + S, ['difficulty ordering comes from observed traffic rather than from a heuristic', 'three stages', 'score-weighted mean tier']),
 ('Routing-guided distillation: teacher supervises student responses under progressively harder stages (corrected: one fixed teacher, on-policy, on the student\'s own rollouts, lower-scored contexts partly reserved)', R + ', Idea; Training (Eq. 3, predict question); ' + S, ['A fixed teacher supervises the student\'s own generated responses', 'fixed teacher', 'reverse KL']),
 ('Capability-guided allocation: evaluation feedback becomes training-mixture decisions, closing the loop to the pool', R + ', Idea; Capability-guided allocation; loop animation', ['Evaluation feedback is converted directly into training-mixture decisions, which closes the loop back to the pool', 'model-deficiency profile']),
 # results
 ('Across 11 benchmarks spanning agent tasks, tool use, coding and instruction following (corrected: ten)', R + ', note under the nav, Results, How much to believe', ['the suite has ten benchmarks, not eleven', 'ten benchmarks in three groups', 'The arXiv listing\'s abstract says "eleven benchmarks"']),
 ('4B: macro-average 58.94 to 64.87', R + ', card, Results chart; ' + T, ['58.94 → 64.87', '58.94 to 64.87']),
 ('9B: macro-average 65.60 to 69.04', R + ', card, Results chart; ' + T, ['65.60 → 69.04', '65.60 to 69.04']),
 ('The post-trained 4B substantially narrows the gap to the base 9B', R + ', predict question 3 (89% of the macro gap; 5 of 10 benchmarks)', ['closes 89% of the macro-average gap to the', 'On how many of the ten benchmarks does it actually beat the base 9B?']),
 ('Economically interesting claim: the routing-derived curriculum buys a large fraction of a size step', R + ', Results (kept, with the caveat that the curriculum is not isolated)', ['post-training buys a large fraction of a size step', 'how much of that fraction the routing-derived curriculum buys']),
 # why it matters
 ('First published instance of the loop the harness-scaling line has circled since 2026-08-31: harness and model improving each other, the harness supplying the training signal', R + ', Why it matters', ['This is the first published instance of the loop the harness-scaling line in this knowledge base has been circling since 2026-08-31', 'with the harness supplying the training signal rather than merely consuming the weights']),
 ('Prime Agent: rich harnesses offer affordances models are not trained to use', R + ', Why it matters; Further reading', ['https://app.notion.com/p/3cd5c17b0d0d81579a02f0431f24c6cb', 'found that rich harnesses offer affordances models are not trained to use']),
 ('JIT-Agent: trained a model to emit harnesses, in a language far poorer than a production one', R + ', Why it matters; Further reading', ['https://app.notion.com/p/3cd5c17b0d0d81148227fbd67dc4b3ee', 'trained a model to emit harnesses but in a language far poorer than a production one']),
 ('Terminal-Universe supplied environments, Repo-To-Skill supplied skills', R + ', Why it matters; Further reading', ['https://app.notion.com/p/3d45c17b0d0d814abc07fde424e09a31', 'https://app.notion.com/p/3d45c17b0d0d818bacfeda8a40caddb2', 'supplied environments and']),
 ('NeoHorse-1 runs the loop at 4B and 9B, not frontier scale, routing decisions as curriculum signal (corrected: one pass)', R + ', Why it matters', ['runs one pass of the loop', 'at 4B and 9B rather than at frontier scale, using routing decisions as the curriculum signal']),
 ('Honest reading: a demonstration of the mechanism, not evidence that it scales', R + ', Why it matters; verdict', ['The honest reading is that this is a demonstration of the mechanism and not evidence that it scales']),
 # connections
 ('Topic: agentic-harnesses, harness-scaling section: the sixth strategy, first where the harness is a training-data source', R + ', Connections; Further reading', ['the sixth strategy, and the first where the harness is a training-data source rather than a runtime wrapper']),
 ('Topic: llm-training-and-post-training: subscene-level labelling and routing-derived curricula next to distillation and curriculum material', R + ', Connections', ['subscene-level labelling and routing-derived curricula belong next to the existing distillation and curriculum material']),
 ('Dwarkesh decomposition: data improvements 3.24x more compute-efficiency gain than model improvements 2019 to 2025; small models gain most from data quality; NeoHorse-1 a mechanism for that gain at that scale', R + ', Connections', ['3.24x more compute-efficiency gain than model improvements between 2019 and 2025', 'small models gain most from data quality', 'NeoHorse-1 is a mechanism for producing exactly that kind of gain at exactly that scale']),
 ('Topic: rl: capability-guided allocation as an allocation policy, same shape as SA-MRPO\'s saturation-aware reweighting, from the serving side', R + ', Connections; Further reading', ['https://app.notion.com/p/3c65c17b0d0d81e38b0fe72f3daf44bc', "saturation-aware reweighting, arrived at from the serving side"]),
 ('Reads against Φ-Bench (can a model build its own infrastructure: mostly not) and MOLE (what the loop does when subverted)', R + ', Connections; Further reading', ['https://app.notion.com/p/3db5c17b0d0d81029236da6c38f5891f', 'https://app.notion.com/p/3db5c17b0d0d818b9680c7b91baaf7e9', 'which measures whether a model can build its own infrastructure and finds it mostly cannot', 'which asks what such a loop does when it is subverted']),
 ('Parent: Papers database', 'crumb line and Further reading', ['https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')],
           'corrected': ['"11 benchmarks": the tables have ten columns; the HTML abstract, §6 and the GitHub README say ten; only the arXiv listing abstract says eleven (Results, How much to believe, Tables tab)',
                         '"Teacher models supervise student responses under progressively harder stages": one fixed, unnamed teacher scores the student\'s own rollouts (on-policy distillation, reverse KL over top-K plus a tail bin); stages introduce harder contexts while reserving some easier ones (Training)',
                         '"NeoHorse-1 runs the loop": it ran one pass of evaluation, selection and update; the authors say compounding is untested (Why it matters, How much to believe, card)',
                         '"Closing most of the gap to the base 9B": 89% of the macro-average gap, but the post-trained 4B beats the base 9B on only 5 of 10 benchmarks (predict question 3)',
                         '"The routing-derived curriculum buys a large fraction of a size step": the gain is the whole recipe\'s; no experiment isolates the curriculum (Results, How much to believe)',
                         '412 Hugging Face upvotes: 326 by the Hugging Face API on 2026-10-03; both shown (note under the nav)'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
