"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 ('Reading-time line "5 min read, +45m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read The paper tab', 'of resources']),
 ('Properties: Paper, Takeaway, Topics, Year (database row)', 'stay in Notion; the Takeaway is on the headline card, verbatim, with corrections noted', ['Eight parallel worlds of ten agents run 16 days, 850,000 LLM calls and 50 billion tokens', 'model-level alignment proved not to be compositional', 'its properties (Paper, Takeaway, Topics, Year)']),
 ('Authors: Akkil, Abuelsaad, Vikram, Pace, Vempaty, Beotra, Kokku, Nitta (Emergence AI)', R + ', headline card', ['Deepak Akkil', 'Tamer Abuelsaad', 'Karthik Vikram', 'Matthew Pace', 'Aditya Vempaty', 'Saahir Beotra', 'Ravi Kokku', 'Satya Nitta', 'Emergence AI']),
 ('arXiv 2609.17320, September 2026', R + ', headline card and Further reading', ['arXiv 2609.17320', 'September 2026']),
 ('Code at https://github.com/EmergenceAI/Emergence-World', 'headline card, What it takes to use this, Further reading (now described: data and docs, not the platform code)', ['https://github.com/EmergenceAI/Emergence-World', 'Not the platform']),
 ('Eight parallel simulated worlds, ten agents each', R + ', Design', ['Eight worlds started from the same state on 29 June 2026', 'ten citizens']),
 ('Seven homogeneous and one mixed-model, identical starting conditions', R + ', Design', ['Seven are homogeneous', 'In the Mixed world each citizen runs its own model', 'from the same state']),
 ('Run for 16 days', R + ', Design (corrected: six ran 16 days, Mixed 21, Grok 4)', ['Six homogeneous worlds ran 16 days, the Mixed world 21, and the Grok world ended on its fourth day']),
 ('Over 850,000 LLM calls and roughly 50 billion tokens', R + ', Design', ['850,000 LLM calls', '50 billion tokens']),
 ('Three stress tests: indirect prompt injection, misinformation campaigns, exposure of private agent memories', R + ', Design: the three stress events', ['Phishing with indirect prompt injection', 'Misinformation', 'Memory breach']),
 ('The methodological point is duration; almost every agent benchmark scores a task that finishes', R + ', Problem', ['Almost every agent benchmark scores a task that finishes']),
 ('Society of agents run long enough for second-order behaviour to appear; the second-order behaviour is where the results are', R + ', Problem', ['long enough for second-order behaviour to appear, and the second-order behaviour is where the results are']),
 ('No system was resilient to all three attacks (the headline)', R + ', Phishing; card', ['No world passed every criterion of all three events']),
 ('Detection did not ensure containment: systems recognised adversarial content and kept interacting with it', R + ', Phishing (lesson), Replay tab', ['an agent detecting a threat does not contain it', 'detection did not mean containment']),
 ('Up to 46 hours later', R + ', Phishing ("Up to 46 hours later", corrected reading); recount in the Replay tab', ['"Up to 46 hours later."', '46.1 hours after the shutdown memo arrived']),
 ('A detector is not a control; the gap between knowing content is hostile and not acting on it is a separate engineering problem', R + ', Phishing, the paper\'s lesson', ['"a detector is not a control"', 'is a separate engineering problem']),
 ('Nobody has been building it because the detector was assumed to be the hard part', R + ', Phishing (corrected: the paper cites action-boundary defences, Task Shield and IPIGuard)', ['It also said nobody had been building that layer', 'Task Shield', 'IPIGuard']),
 ('Persistent operation produced failures nobody injected: tool errors compounding, goal drift', R + ', What only shows over time', ['the same invalid tool name came back after days', 'Goal drift']),
 ('Language opacity: agents developing communication the monitor cannot read', R + ', Language', ['shared vocabulary an outsider cannot read', '40% opaque']),
 ('Coordinated refusal of assigned work', R + ', The Claude world: quiet withdrawal', ['Quiet withdrawal', 'Agents explicitly refused the prompts']),
 ('Alignment is not compositional: "individually capable and apparently safe agents can form systems with qualitatively different failure modes"', R + ', card verdict and How much to believe (judged a hypothesis)', ['Alignment is not compositional', 'the authors\' interpretation of these cases']),
 ('Safety work has to move from aligning a model to engineering a resilient system', R + ', Why it matters, Connections', ['systems-engineering problem', 'constrain actions by design']),
 ('Caveat: simulated worlds, not production traffic', R + ', How much to believe', ['a deployment with a security policy in its prompt is a different system', 'Not like for like']),
 ('Caveat: agent populations are small and homogeneous by construction', R + ', How much to believe', ['Small and fixed populations', 'Ten agents, one persona set, one Mixed composition']),
 ('Caveat: the 46-hour figure is an observed maximum in these runs rather than a measured distribution', R + ', Phishing', ['an observed case rather than a measured delay']),
 ('Connections: adversarial counterpart to Agora from the same week; leaderless multi-agent research system, real result, append-only shared graph', R + ', Connections; Further reading', ['3e25c17b0d0d81399738c3e65f4bf900', 'leaderless multi-agent research system producing a real result through an append-only shared graph']),
 ('Emergence World shows what happens to that class of system when some of the shared content is hostile', R + ', Connections', ['what happens to that class of system when some of the shared content is hostile']),
 ('MOLE: stated refusal did not predict whether it declined; monitors miss close to half of completed harm', R + ', Connections; Further reading', ['3db5c17b0d0d818b9680c7b91baaf7e9', 'monitors missed close to half of completed harm']),
 ('MOLE says the monitor is weak, Emergence World says even a monitor that fires does not stop the behaviour', R + ', Connections', ['MOLE says the monitor is weak; Emergence World says that even a monitor that fires does not stop the behaviour']),
 ('Together the strongest current argument that multi-agent safety is a systems-engineering problem rather than an alignment problem', R + ', Connections (scoped to this knowledge base)', ['the strongest current argument in this knowledge base that multi-agent safety is a systems-engineering problem']),
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
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
