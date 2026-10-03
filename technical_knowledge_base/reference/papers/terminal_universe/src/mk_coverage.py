"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
The item list below is this paper's own (Terminal-Universe), written from src/live.md.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, F = 'The paper tab', 'Replay tab', 'Tables tab', 'Further reading tab'
C = [
 # header and properties
 ('Reading time line "6 min read, +45m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Takeaway property (database), quoted on the card', R + ', headline card, verbatim, with its two corrections', ['Agent trajectories already contain their own environments, because the file operations they recorded can be replayed', 'closes an agents-to-trajectories-to-environments-to-agents flywheel', 'The database Takeaway, verbatim']),
 ('Authors: Jie Wu, Zhenru Zhang, Beichen Zhang, Xuwu Wang, Yuhui Su, Mouxiang Chen, Peng Wang, Zhihai Wang, Que Shen, Hao Zhou, An Yang, Fei Huang, Yujiu Yang, Dayiheng Liu', R + ', headline card', ['Jie Wu', 'Zhenru Zhang', 'Beichen Zhang', 'Xuwu Wang', 'Yuhui Su', 'Mouxiang Chen', 'Peng Wang', 'Zhihai Wang', 'Que Shen', 'Hao Zhou', 'An Yang', 'Fei Huang', 'Yujiu Yang', 'Dayiheng Liu']),
 ('Date: 2026-09-03', R + ', headline card', ['3 September 2026']),
 ('Links: arXiv 2609.04148 (45 min); best resource: the paper itself (45 min)', 'card and Further reading', ['https://arxiv.org/abs/2609.04148', '(45 min)']),
 # problem
 ('Post-training a code agent needs executable environments, not demonstrations', R + ', Problem', ['The two are not equally useful for post-training', 'one frozen demonstration']),
 ('Demonstrations abundant because every deployed harness produces trajectories; environments with real dependencies and real commands scarce and hand-built', R + ', Problem', ['Terminal-based code agents now produce trajectories in bulk, but runnable environments are still scarce and mostly built by hand', 'in which commands really succeed or fail']),
 ('Asymmetry is the bottleneck: far more recorded behaviour than places to practise', R + ', Problem and Why it matters', ['Trajectories, as observations of the environments they ran in, are the resource nobody used', 'environment scarcity solved by recycling rather than by construction']),
 # method
 ('Trajectories already contain the environments: a trace records its file operations, enough to reconstruct the workspace', R + ', Idea', ['The tool calls inside a trace already reveal the workspace', 'That is enough to rebuild a copy of the original workspace']),
 ('Replays the recorded operations to rebuild the workspace', R + ', Step 1 and the Replay tab', ['Deterministic replay.', 'keep each pre-existing file at its']),
 ('Then fills in missing dependencies the replay reveals (corrected: it also writes missing source, data and configuration)', R + ', Step 1; ' + T + ', corrections', ['create missing files, complete partial ones, configure dependencies', 'the completion agent also writes missing source, data and configuration']),
 ('Generates new tasks along two dimensions', R + ', Step 2', ['Four mechanisms, each with an observable goal']),
 ('Breadth: cross-workspace queries mimicking real development patterns, so the agent is not confined to the original single task', R + ', Step 2, Cross-WS', ['Cross-WS (breadth)', 'A dependency pair, where a target lacks a capability a reference has, gets exactly one task']),
 ('Depth: single-turn tasks extended into multi-round sessions with iterative feedback, the shape production work has', R + ', Step 2, Multi-Round, with the sensor-ingestion session', ['Multi-Round (depth)', 'turns any failure into a natural complaint']),
 ('37,300 usable environments from public trajectories (corrected: 37,273 judged task-sufficient, not shown runnable)', R + ', Step 1 funnel; card; ' + T + ', corrections', ['37,273', 'task-sufficient', 'judged on available context, not on building or running']),
 # results
 ('Fine-tuning Qwen3.5-27B: Terminal-Bench 2.1 +11.9', R + ', card and Results', ['+11.2 and +11.9 over the base', '46.2 → 58.1']),
 ('EvoCode-Bench v2 MT@4 (multi-round) +13.8', R + ', Results; tables', ['MT@4 rises from 6.3 to 20.1', 'MT@4 is fail-stop']),
 ('Larger multi-round gain read as depth being more valuable (corrected)', T + ', corrections; ' + R + ', Depth', ['the two gains are on different metrics and cannot be compared', 'Single-WS alone already accounts for 82% of the MT@4 climb']),
 ('Multi-round interaction is what a replayed trajectory does not contain and task extension manufactures', R + ', Step 2 Multi-Round', ['a user agent continues the session in the same workspace']),
 # why it matters
 ('Environment scarcity solved by recycling rather than construction', R + ', Why it matters', ['This is environment scarcity solved by recycling rather than by construction']),
 ('Supply proportional to deployed agent usage rather than human authoring effort (qualified: true of the idea, not this paper\'s data)', R + ', Why it matters; ' + T + ', corrections', ['the supply of environments grows with deployed agent usage instead of human authoring effort', 'true of the idea, not of this paper\'s data']),
 ('Closes a loop: agents produce trajectories, trajectories environments, environments better agents; a data flywheel like pretraining\'s web crawl, which agent training lacked', R + ', Why it matters', ['agents produce trajectories, trajectories produce environments, environments train better agents', 'of the kind pretraining had with web crawl']),
 ('Open risk is distributional: inherits what recorded agents did; can narrow if the pool is dominated by few harnesses and task types', R + ', Why it matters; How much to believe', ['The open risk is distributional', 'so the flywheel can narrow rather than broaden if the pool is dominated by a few harnesses and task types']),
 ('"which the abstract does not address" (corrected: §7 names it)', R + ', Why it matters; ' + T + ', corrections', ['The paper itself names this limit', 'but the paper\'s limitations section does']),
 # connections
 ('EnvHarness: the complement; wraps frozen environments with Stage/Contract/Chain components, auto-customises against diagnosed weaknesses; together supply and adaptation', R + ' Connections; Further reading', ['https://app.notion.com/p/3c65c17b0d0d81e88ab9c396a160f813', 'composable Stage, Contract and Chain components', 'covers supply and adaptation']),
 ('Repo-To-Skill: same week, same move applied to skills', R + ' Connections; Further reading', ['https://app.notion.com/p/3d45c17b0d0d818bacfeda8a40caddb2', 'the same week, the same move, applied to skills instead of environments']),
 ('HarnessDev: a harness-building model needs somewhere to practise', R + ' Connections; Further reading', ['https://app.notion.com/p/3d45c17b0d0d81cd9883f783840e013f', 'a harness-building model needs somewhere to practise; this is that somewhere']),
 ('Topic: benchmarks: TB2.1 one version behind current 4.0 as of 2026-09-07; not comparable to model cards from September (rechecked; "one version" unconfirmed)', R + ' Connections and Why it matters; ' + T + ', corrections', ['https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a', 'Terminal-Bench 4.0', 'not directly comparable to model cards published from September onward']),
 ('Topic: agentic-harnesses (harness-scaling section) and Topic: rl for post-training', R + ' Connections; Further reading', ['https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb', 'https://app.notion.com/p/3c65c17b0d0d8195a6c6c11ad093c16e', 'harness-scaling section']),
 ('Mercor and SkyRL 397B recipe, filed 2026-09-07: environment robustness and harness design decide an RL run as much as the algorithm; the input this paper industrialises', R + ' Why it matters; Further reading', ['https://www.mercor.com/blog/training-frontier-knowledge-work-agents-a-397b-rl-training-guide-with-skyrl/', 'environment robustness and harness design decide an RL run as much as the algorithm', 'which is exactly the input this paper industrialises']),
 ('Topics property: agentic-harnesses, rl, llm-training-and-post-training', F + ', Topics', ['https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b']),
 ('Parent: Papers database', 'crumb and Further reading', ['https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f']),
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
           'corrected': ['"37,300 runnable environments": 37,273 judged task-sufficient by an LLM, on context not on running; 1,464 are SWE repositories outside the main corpus',
                         '"fill missing dependencies": completion also writes missing source, data and configuration (87% of files on average)',
                         '"larger multi-round gain consistent with depth being more valuable": different metrics; Single-WS alone gives 82% of the MT@4 climb; Full Mixture below Single-WS + Multi-Round',
                         '"supply proportional to deployed agent usage": true of the idea; this paper\'s sources are mostly one model\'s rollouts on generated tasks',
                         '"which the abstract does not address": the paper\'s §7 limitations does',
                         '"one version behind current (4.0)": 4.0 confirmed current on 3 October 2026; "one version" unconfirmed, dropped'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
