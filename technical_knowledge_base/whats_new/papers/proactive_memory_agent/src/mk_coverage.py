"""Write coverage.json: every fact, number, caveat and link of live.md (the Notion page before migration,
this paper: Proactive Memory Agent, arXiv 2607.08716) with where the HTML carries it, and verify each
item's check strings against the built index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header and provenance
 ('Yifan Wu and colleagues, Meta AI', R + ', headline card; Corrections', ['Yifan Wu', 'Meta AI']),
 ('Dated September 2026 (corrected: arXiv v1 submitted 9 July 2026)', R + ', headline card; Corrections', ['submitted 9 July 2026', 'rather than in September']),
 ('Provenance note: built from The Batch, 18 September 2026; no arXiv id resolvable; links are tracking redirects; paper not read directly; figures reported not verified; attach the arXiv id when it surfaces', R + ', Corrections (now resolved: arXiv 2607.08716 read in full)', ["The Batch's coverage of 18 September 2026", 'tracking redirects', 'had not been read directly', 'reported rather than verified', 'arXiv id was to be attached when it surfaced', 'https://arxiv.org/abs/2607.08716']),
 # mechanism
 ('An acting agent does the work; a second model runs alongside as a memory agent watching the trajectory', R + ', Idea; animation', ['action agent', 'runs alongside']),
 ('At each step it decides whether the actor should be reminded of something it already knows and has lost from working context', R + ', Idea; Method', ['decides whether to inject a concise reminder']),
 ('The reminder is injected; nothing about the actor is retrained', R + ', Idea', ['Nothing about the actor is retrained']),
 ('That is the whole design; the cheapness is the point: a harness-layer addition that can be bolted onto a model you do not control', R + ', Idea; Why it matters', ['That is the whole design', 'cheapness of the integration is the point', 'bolted onto a model you do not control']),
 # results
 ('Terminal-Bench 2.0: Claude Sonnet 4.5 37.6% to 45.9%', R + ', Results; card; Tables tab', ['37.6% to 45.9%']),
 ('Terminal-Bench 2.0: Qwen3.5-27B 37.6% to 41.1% (corrected: actor is Qwen3.5-122B-A10B, Qwen3.5-27B the trained memory agent)', R + ', Open weights; Corrections; Tables tab', ['37.6% to 41.1%', 'Qwen3.5-122B-A10B', 'Qwen3.5-27B is the memory agent']),
 ('tau2-Bench: Claude Sonnet 4.5 55.0% to 61.8%', R + ', Results; card', ['55.0% to 61.8%']),
 ('tau2-Bench: Claude Opus 4.6 66.2% to 68.7%', R + ', Results; Corrections', ['66.2% to 68.7%']),
 ('Gains larger for the weaker actor on TB, smaller for the stronger on tau2; reading: substituting for context management the stronger model partly does itself (corrected: weaker gains more on both; the paper reads it as not mere compensation)', R + ', Results; Corrections', ['Gains larger for the weaker actor on Terminal-Bench and smaller for the stronger one on τ²-Bench', 'not merely compensating for limited capacity']),
 # the non-obvious finding
 ('Reminding selectively beats reminding at every step (corrected: only on macro, by 3 airline tasks; always inject leads on micro)', R + ', Ablations; Corrections; card', ['Reminding selectively beats reminding at every step', '171 against 170']),
 ('A reminder is not free: it consumes context, and an irrelevant one competes with the actual task state for the actor\'s attention', R + ', Idea', ['A reminder is not free', 'competes with the actual task state']),
 ('The memory agent\'s job is discrimination, not retrieval; the bottleneck is knowing when to surface a fact rather than being able to find it', R + ', Idea', ['discrimination, not retrieval', 'knowing when to surface a fact rather than being able to find it']),
 ('Distinguishes from RAG, where ranking is the whole problem and the timing is fixed', R + ', Idea; Why it matters; Connections', ['ranking is the whole problem', 'the timing is fixed']),
 # caveats
 ('Second-hand provenance (resolved)', R + ', Corrections', ['This page replaces a 3-minute summary']),
 ('Two benchmarks, four model pairings (corrected: two actors on two benchmarks plus the Qwen pair)', R + ', Corrections', ['Four model pairings', 'plus the Qwen pair on Terminal-Bench']),
 ('No cost accounting reported for running a second model continuously (confirmed; estimated here from the traces)', R + ', How much to believe; In the traces; Replay tab', ['No tokens, latency or cost are reported', 'No cost accounting is reported" is confirmed']),
 ('That cost is the number needed to compare against the harness-efficiency direction SoL-Pi opens', R + ', Connections; Why it matters', ['SoL-Pi', '3e25c17b0d0d81a0bb77f16cbc898bb5']),
 # connections
 ('Constructive counterpart to Topic: agentic-harnesses harness-scaling strategies; a second model supervising the first is the delegating-coordinator shape pointed at memory rather than task decomposition', R + ', Connections; Further reading', ['3c65c17b0d0d81d881a8fe98b4cff7bb', 'delegating-coordinator shape', 'pointed at memory rather than at task decomposition']),
 ('SoL-Pi from the same window finds roughly half an agent\'s tokens are harness overhead', R + ', Connections', ['roughly half an agent', 'harness overhead']),
 ('Compaction and selective reminding: same lever in opposite directions, one removing what is carried, the other restoring what was dropped; nobody has measured them together', R + ', Connections', ['same lever pulled in opposite directions', 'removing what is carried', 'restoring what was dropped', 'nobody has yet measured them together']),
 # database properties
 ('Database property Takeaway (with its Qwen error)', 'stays in the database; the card carries a corrected one-line takeaway; the error is named under Corrections', ['also in the database', 'Takeaway']),
 ('Database properties Topics: agentic-harnesses, benchmarks, rag-and-retrieval', 'Further reading, Topics', ['3c65c17b0d0d81d881a8fe98b4cff7bb', '3c65c17b0d0d811fb43fece56e40041a', '3c65c17b0d0d81b89145c37dfe8a3b0b']),
 ('3 min read, +20m resources header', 'dropped: page metadata, replaced by this page\'s own reading-time line', []),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-21)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
