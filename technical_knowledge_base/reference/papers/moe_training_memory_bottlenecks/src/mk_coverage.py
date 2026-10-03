"""Write coverage.json: every fact, claim, link and caveat of live.md (the Notion row page before migration)
with where the HTML carries it, verified by check strings against the built index.html (tags stripped,
whitespace normalised). The item list is this paper's own, written from live.md.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, L, T, M = 'The paper tab', 'Run the four schedules tab', "The paper's tables tab", 'Further reading tab'
C = [
 ('Header "3 min read · +40m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read The paper tab', 'of resources']),
 ('Link arXiv 2609.14306 (40 min)', R + ' card; ' + M, ['https://arxiv.org/abs/2609.14306', '(40 min)']),
 ('Claim: the four main memory bottlenecks of training a large MoE can be bounded inside a fixed GPU memory budget without approximating the computation', R + ', card takeaway, Problem, corrections box', ['Bounds the four main memory bottlenecks of large-MoE training inside a fixed GPU memory budget', 'four bottlenecks bounded by scheduling, not approximation']),
 ('The four: expert dispatch, vocabulary projection, activation checkpointing, optimiser state', R + ', Problem list, Table 1, calculator', ['Expert dispatch', 'The vocabulary projection', 'Gradient-checkpoint boundaries', 'Optimizer state']),
 ('Contribution is scheduling rather than approximation', R + ', Problem "The constraint it sets itself"', ['change only the order and granularity of computation and data movement', 'No low-rank adapters, no quantised state, no approximate routing or attention']),
 ('Distinguished from the usual quantise-or-offload answers', R + ', corrections box (corrected: two of the four operators are scheduled offload; what is excluded is quantisation and approximation)', ['two of the four operators', 'are offload, scheduled', 'it excludes quantisation and approximate routing, not offload']),
 ('The arithmetic is unchanged; only when each tensor has to exist changes', R + ', Problem and Why it matters', ['the model, parameterisation, optimizer, precision and loss stay those of standard full-parameter BF16 training', 'a bounded schedule turns each into a term fixed at launch']),
 ('Why it earns a row: these four terms decide whether a MoE run fits on hardware you own rather than rented capacity', R + ', calculator "Which peak runs out first?" and Composition (feasibility before launch)', ['Which peak runs out first?', 'feasibility can be checked before launch']),
 ('Sizing a sparse run against a fixed pair of consumer cards rather than a cluster', R + ', corrections box (stale claim corrected: H200 nodes with 2 TB host memory, 16 to 64 GPUs)', ['not on "a fixed pair of consumer cards"', 'H200 nodes with 2 TB of host memory, 16 to 64 GPUs end to end']),
 ('Sits beside ZeRO and Megatron-LM, which partition the same state rather than schedule it', R + ', corrections box and Connections (refined: it builds on ZeRO-3 and Megatron vocabulary sharding)', ['it builds on ZeRO-3 and on Megatron\'s vocabulary sharding rather than sitting beside them', 'Where ZeRO partitions state, this paper schedules when transient tensors exist', 'https://app.notion.com/p/3c65c17b0d0d81879a7ed90bca007699', 'https://app.notion.com/p/3c65c17b0d0d8133ae92fbe90a1f308e']),
 ('Provenance: summary written from the newsletter abstract (TLDR AI, 23 September 2026), not from a reading of the paper', R + ', corrections box', ['newsletter abstract (TLDR AI, 23 September 2026), not from the paper']),
 ('No numbers, baselines, model scales or ablations recorded; nothing to be quoted as measured', R + ', corrections box (superseded: this page is written from the full paper, with every number sourced)', ['no numbers, baselines, scales or ablations, nothing to quote as measured', 'This page is written from the full paper']),
 ('Read the arXiv entry before relying on it; the row exists so the paper is not lost', 'superseded: the page is the reading; the evidence is judged in How much of this to believe', ['How much of this to believe']),
 ('Integrated on Topic: llm-training-and-post-training', R + ' Connections; ' + M, ['Topic: llm-training-and-post-training', 'where this row is integrated', 'https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b']),
 ('Property Takeaway (on the card)', R + ', headline card "In one line"', ['by scheduling rather than by approximating the computation, across expert dispatch, vocabulary projection, activation checkpointing and optimiser state']),
 ('Property Topics: llm-training-and-post-training, ml-infra-and-orchestration', R + ' Connections; ' + M, ['Topic: ml-infra-and-orchestration', 'https://app.notion.com/p/3c65c17b0d0d81b5925bfd1d8665dd4b']),
 ('Property Year 2026, Paper title', 'header crumb and card (the database keeps the properties)', ['Papers · 2026', 'Listed in the Papers database as "Bounding the memory bottlenecks of large mixture-of-experts training"']),
 ('Parent Papers database', M + ' footnote and crumb', ['https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f', 'its properties (Paper, Takeaway, Topics, Year) live there']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion row page as of 2026-09-28)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
