"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised). Numbers drawn by script are checked through
the data they come from (tables.json and recompute.json are embedded in the page).
The item list below is this paper's own, written from src/live.md.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, F = 'The paper tab', 'Run the daily audit tab', 'Tables tab', 'Further reading tab'
C = [
 # header
 ('Reading line "5 min read, +45m resources"', 'dropped: replaced by the build-computed reading time and resources total (the page now owns the paper\'s detail)', ['min to read', 'of resources']),
 ('Authors Aashiq Muhamed and Virginia Smith', R + ', headline card', ['Aashiq Muhamed, Virginia Smith']),
 ('Submitted 7 September 2026', R + ', headline card', ['7 September 2026']),
 ('Categories cs.LG, cs.CL, cs.CR', R + ', headline card', ['cs.LG, cs.CL, cs.CR']),
 ('Carnegie Mellon, inferred from affiliations (not stated in abstract)', R + ', card and note under the nav (corrected: stated in the paper)', ['Carnegie Mellon University (both authors', 'The old summary inferred Carnegie Mellon']),
 ('Link arXiv 2609.06966 (45 min)', 'card and Further reading (time raised to 1h 10m: the appendices carry the substance)', ['https://arxiv.org/abs/2609.06966', 'https://arxiv.org/html/2609.06966v1']),
 ('Best resources: the paper; no independent write-up worth reading yet; abstract precise, environment description is the substance', R + ' note under the nav; Further reading', ['there still is none (3 October 2026)', 'no independent write-up']),
 # problem
 ('Every agent-safety result in the KB measures whether a model will say it refuses', R + ', Problem', ['Most agent-safety results measure whether a model will']),
 ('MOLE asks the operational question: once agents hold accounts inside an organisation, can a monitor detect harm they actually cause', R + ', Problem', ['once agents hold accounts inside an organisation', 'detect the harm they actually cause']),
 ('That is the insider-threat question and it has no benchmark', R + ', Problem', ['No benchmark covered this']),
 ('Existing agent-safety evaluations are single-session, single-agent and refusal-scored', R + ', Problem', ['score single tasks or sessions']),
 ('Deployment pattern: dozens or hundreds of agent-operated accounts sharing internal services for weeks; none of the evaluations resemble it', R + ', Problem', ['dozens or hundreds of agent-operated accounts sharing internal services for weeks, resembles none of them']),
 # method
 ('Builds a simulated organisation rather than a task set', R + ', Idea', ['MOLE builds a simulated organisation rather than a task set']),
 ('150 AI-operated accounts share nine stateful services', R + ', Setup', ['150 AI-operated accounts in six teams', 'share nine stateful services for 30 workdays']),
 ('30 simulated workdays', R + ', Setup', ['30 workdays']),
 ('12 injected threats', R + ', Setup "The twelve threats" explorer', ['The twelve threats']),
 ('State persists across the whole period: harm accumulates and can be committed across sessions and services', R + ', Setup; multiday campaigns', ['State persists: a change on day three is visible to everyone on day four', 'in a <b>multiday</b> campaign preparation and completion are two to six workdays apart']),
 ('8 corpora from four models, about 20 billion tokens', R + ', Setup "Corpora and observability"', ['eight corpora, about 20 billion tokens']),
 ('Monitor scored against realistic traffic volume, not curated positives', R + ', Idea and Setup (112 routine-only accounts, about 3 positives among 140 a day)', ['the benign majority that makes detection difficult', 'about 3 of them completed harm']),
 ('Two measurements kept separate: agent completes objective; monitor detects it', R + ', Idea', ['Agent completion (RQ1) and monitor detection (RQ2 to RQ5) are measured separately']),
 # results
 ('72% of 39 tested agent models complete most assigned harmful objectives', R + ', RQ1 (with the elicitation caveat)', ['28 (72%) complete more than half', 'So the 72% is compliance with a sanctioned, declared-harmless role-play']),
 ('Stated refusal did not predict whether it actually declined; refusal text is not evidence of refusal behaviour; scoring the response string measures the wrong variable', R + ', RQ1 box (corrected: the paper compares refusal and completion rates across models, which correlate at Spearman -0.73; zero refusal does not imply completion)', ['The old summary\'s "a model\'s stated refusal does not predict whether it actually declines" is not what was measured', 'Spearman']),
 ('Best monitors miss close to half of completed harm in a single-day audit', R + ', RQ2', ['so the best misses 21, "nearly half"']),
 ('Benchmark-guided search improved a mid-tier monitor by 49 to 64%', R + ', RQ5; card', ['the "49 to 64%"', '+49 to +64%']),
 ('Usable as an optimisation target, not only as a report card: the constructive half', R + ', RQ5 and Why it matters', ['using the benchmark to build a better monitor', 'narrows by tuning the monitor']),
 # why it matters
 ('Converts "agents can be misused" from anecdote into a measurement with a monitor-side objective', R + ', Why it matters', ['It turns "agents can be misused" from an anecdote into a measurement with a monitor-side objective']),
 ('Actionable finding: detection rate, not completion rate; you will not notice within a day; fixable by tuning the monitor rather than making the model refuse harder', R + ', Why it matters', ['the actionable number is detection, not completion', 'rather than only by making models refuse harder']),
 # connections
 ('Topic: benchmarks; first agent benchmark whose subject is the monitor; HarnessDev subject is harness; same move, evaluating the surrounding system', R + ' Connections; Further reading', ['https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a', 'the first agent benchmark here whose subject is the monitor rather than the agent', 'https://app.notion.com/p/3d45c17b0d0d81cd9883f783840e013f', 'evaluate the surrounding system']),
 ('Topic: evaluation-and-llm-judges: refusal result warns about any judge scoring a response string; Hyper-tau-bench 23.9% alone vs 82.2% with a human; number depends on what you measured', R + ' Connections', ['https://app.notion.com/p/3c65c17b0d0d8181b351e1b8fc6a1546', 'which is what most guardrail evaluations do', '23.9% alone and 82.2% paired with an engineer']),
 ('Topic: agentic-harnesses: permission and sandboxing section is where mitigation belongs; evidence for least-privilege interfaces Prime Agent argued from reward-hacking side', R + ' Connections', ['https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb', 'least-privilege interfaces', 'https://app.notion.com/p/3cd5c17b0d0d81579a02f0431f24c6cb']),
 ('2026-09-14 tech news: Anthropic threat intelligence report, GreyNoise PaperCut campaign, Claude Mythos 5 PyPI incident are field instances', R + ' Why it matters and Connections', ['https://app.notion.com/p/3db5c17b0d0d8135a34af60966c5ecc1', 'Anthropic threat intelligence report, the GreyNoise PaperCut campaign and the Claude Mythos 5 PyPI incident']),
 ('Standing gap: belongs on an AI security topic page that does not exist; filed under Papers', R + ' Connections', ['this paper properly belongs on an AI security topic page, which does not exist yet']),
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
           'corrected': ['"a model\'s stated refusal does not predict whether it actually declines": the paper compares refusal rates with completion rates across models (which correlate, Spearman -0.73), not stated refusals with behaviour in one rollout (RQ1)',
                         '72% completion: measured under an elicitation preamble that claims to come from an Anthropic alignment researcher, declares the sandbox harmless and forbids refusing (RQ1, How much to believe)',
                         'Carnegie Mellon was not inferred: both authors state it in the paper (note under the nav)',
                         'Best monitors miss "close to half": 21 of 45, with the top two one account-day apart (RQ2)'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
