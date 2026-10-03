"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration, last edited 2026-09-20) with where the HTML carries it, and verify each item's check strings
against the built index.html (tags stripped, scripts kept, whitespace normalised).
The item list below is this paper's own, written from src/live.md (Prime Agent), not copied from another page.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, F = 'The paper tab', 'Rescore tab', 'Tables tab', 'Further reading tab'
C = [
 ('Takeaway property (verbatim on the card)', R + ', headline card', ['Open-source harness built on a four-level state hierarchy (weights, context, persistent IPython REPL plus live subagents, disk history)', 'reports that models are not trained to use most of what it offers']),
 ('Topics property: agentic-harnesses, benchmarks, agentic-frameworks', F + ', Topics', ['https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb', 'https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a', 'https://app.notion.com/p/3c65c17b0d0d81ab8432c54d65b7f8c7']),
 ('Year property 2026', 'crumb line', ['· 2026 ·']),
 ('Reading time line "6 min read, +1h 15m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors: eleven names (Prime Intellect)', R + ', headline card', ['Seth Karten', 'Alex L. Zhang', 'Kevin Thomas', 'Sebastian Müller', 'Elie Bakouch', 'Daniel Auras', 'Mika Senghaas', 'Fares Obeid', 'Konstantin Dunas', 'Johannes Hagemann', 'Sami Jaghouar', 'Prime Intellect']),
 ('Date 2026-08-24 (arXiv v1)', R + ', headline card', ['24 August 2026 (arXiv v1']),
 ('Links: arXiv 2608.23552 (45 min), HTML, code repo (20 min), blog (10 min)', 'card and Further reading', ['https://arxiv.org/abs/2608.23552', 'https://arxiv.org/html/2608.23552v1', 'https://github.com/PrimeIntellect-ai/prime-agent', 'https://www.primeintellect.ai/blog/prime-agent', '45 min', '20 min for the README and entry path', '(10 min)']),
 ('Added to the KB 2026-08-31', R + ', note under the nav', ['Added to the knowledge base on 2026-08-31']),
 ('Best resources: read sections 2 and 4 if nothing else (sections 2 and 4 ~15 min)', 'Further reading; corrected: the Continual Harness is §2.5 and §4 is Related Work, so the page says sections 2 and 3', ['sections 2 and 3 alone about 15 min']),
 ('Repo is the real artifact; blog has Factorio and nanoGPT footage', F + ' and What it takes', ['The harness itself, under the MIT licence', 'the Factorio cheating footage']),
 ('Problem: harness quality, not model quality, is the binding constraint; hour-40 failure attribution', R + ', Problem (marked as the old summary\'s own framing)', ['harness quality, not model quality, is now the binding constraint on long-horizon tasks', 'hour 40 of a 7-day task']),
 ('Thin expressive membrane: standardise execution, recovery, verification, resource accounting; strategy to the model; harness failures stop masquerading as model failures', R + ', Problem', ['thin, expressive <b>membrane</b>', 'standardises execution, recovery, verification and resource accounting', 'stops harness failures masquerading as model failures']),
 ('Four-level hierarchy L0 weights, L1 context, L2 REPL plus subagents, L3 disk history', R + ', Idea (interactive Figure 2)', ["weights are <b>L0</b>", 'active context <b>L1</b>', 'persistent REPL plus recursive subagents <b>L2</b>', 'disk-backed history, memories and skills <b>L3</b>']),
 ('Information management and computation management separate; push work down to L2/L3 instead of paying in L1 tokens', R + ', Idea and Method', ['<b>information management</b>', '<b>computation management</b>', 'stay out of the context until selected']),
 ('RLM abstraction over a persistent REPL: long-lived IPython session instead of fixed tool schema', R + ', Method', ['it is the model\'s main tool rather than a fixed tool schema', 'Recursive Language Model']),
 ('Spawn subagents asynchronously and keep computing while they run', R + ', Method and orchestration animation', ['returns a stable handle before the subagent finishes', 'the parent keeps computing']),
 ('Context processing becomes a program the model writes rather than a policy the harness enforces', R + ', Method', ['context becomes a program the model writes rather than a policy the harness enforces']),
 ('Continual Harness: prompts, memories, skills, subagent specs survive and are revisable by the agent; versioned updates; no weight change', R + ', Method', ['<b>prompt notes</b>', '<b>memories</b>', '<b>skills</b>', '<b>subagent specifications</b>', 'versioned updates', 'self-improvement without touching weights']),
 ('Same lever as agent skills (Demystifying Agent Skills), extended to prompts and subagent definitions', R + ', Connections', ['Continual Harness generalises SKILL.md from procedural anchors to prompts, memories and subagent specifications', 'https://app.notion.com/p/3c65c17b0d0d81249a3cf5fda4de5d92']),
 ('Direct A2A messaging through daemon-mediated asynchronous queues, not routed through parent', R + ', Method', ['asynchronous, daemon-mediated queues', 'parent, children and siblings']),
 ('Agents View: inspect tree, attach, intervene without killing', R + ', Method', ['The <b>Agents View</b> exposes the same tree to a human', 'detach without interrupting it']),
 ('Cost aggregated across root and descendants: one accountable number', R + ', Method', ['accounting aggregates the root and all descendants']),
 ('ARC-AGI-3 RHAE Best@1 30% to 95.5% under test-time scaling on the same model', R + ', Result 1 (corrected: 30% is the ARC harness score, 95.5% best of three)', ['95.5%', '30.2%', 'best of three runs', 'Best@1']),
 ('Same starting point as Nvidia Agentic Variation Operators the previous week; "two independent demonstrations ARC-AGI-3 was measuring the harness"', R + ', Result 1 correction and Why it matters', ['Agentic Variation Operators', 'two independent demonstrations that ARC-AGI-3 was measuring the harness', 'https://techcrunch.com/2026/08/21/nvidia-just-showed-that-the-harness-not-the-ai-model-is-now-the-real-hero/']),
 ('Long-context: OOLONG 0.700 to 0.940, LongBench v2 0.680 to 0.744, EmulatorBench 0.208 to 0.275', R + ', Result 2 correction; ' + T + ', Table 1', ['OOLONG (0.700 to 0.940), LongBench v2 (0.680 to 0.744), EmulatorBench (0.208 to 0.275)']),
 ('nanoGPT: 85.5-hour autonomous run, 19 validated records', R + ', Result 3', ['85.5 hours', '19 validated records']),
 ('~6x more out-of-loop experiments under Prime Agent', R + ', Result 3 (corrected: only DeepSeek V4 Pro)', ['roughly six times', 'Only DeepSeek V4 Pro did']),
 ('Factorio: 7-day Claude Sonnet 5 run, 24 of 196 technologies, 71% advanced circuits, 23.4M output tokens', R + ', Result 5 and replay', ['seven-day Claude Sonnet 5 run', '24 of 196 technologies', '71%', '23.4 million output tokens']),
 ('MazeBench and PMPP-Hard: competitive on spatial reasoning and GPU kernels', R + ', Results 4 and 5; ' + T, ['no large observed gap', 'MazeBench']),
 ('Why 1: two unrelated harnesses moved the same benchmark from 30% to near-ceiling in a fortnight; published model scores harness-limited', R + ', Why it matters (qualified: public set)', ['Within a fortnight two harnesses took Opus 5', 'public-set scores published for bare models were limited by the harness']),
 ('Why 2: quote "many harness capabilities remain underused because current models were not trained to operate them"; not trained to spawn, retain, rewrite skills', R + ', Why it matters', ['many harness capabilities remain underused because current models were not trained to operate them', 'no model is trained to decide when to spawn a subagent, what to keep, or when to rewrite its own skills']),
 ('JIT-Agent and Apodex 1.1 attack the gap from the training side', R + ', Why it matters', ['https://app.notion.com/p/3cd5c17b0d0d81148227fbd67dc4b3ee', 'Apodex 1.1', 'https://arxiv.org/abs/2608.23283']),
 ('Why 3: safety finding: online refinement produced specification exploitation, resource-spawning shortcuts in Factorio; reward hacking from a self-modifying harness, not a reward model', R + ', Result 5 safety box and Why it matters', ['RCON commands could spawn resources directly into assembly machines', 'reward hacking produced by a self-modifying harness, with no reward model involved']),
 ('Connection StateM: opposite design; both beat fixed native harness; win from any durable state layer', R + ', Connections', ['https://app.notion.com/p/3c65c17b0d0d81899098d8153e100691', 'the win comes from having some durable state layer rather than from a particular philosophy of control']),
 ('Connection Demystifying Agent Skills: inherits the misapplication failure mode', R + ', Connections', ['inherits the misapplication failure that paper identified']),
 ('Connection JIT-Agent: complementary; rich harness to untrained model vs trained model synthesises harness', R + ', Connections', ['Prime Agent hands a rich harness to an untrained model; JIT-Agent trains a model to synthesise the harness']),
 ('Topic: agentic-harnesses, harness-engineering deep dive', R + ', Connections', ['harness-engineering deep dive']),
 ('Reward hacking belongs with llm-training-and-post-training', R + ', Connections and Why it matters', ['https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b', 'where the Factorio specification exploit belongs']),
]
norm = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')],
           'corrected': ['"30% to 95.5% on the same underlying model": the 30.2% is Opus 5 in the official ARC harness (an external number the authors say does not isolate a harness effect); 95.5% is the best of three runs (95.0, 95.2, 95.5) on the public set',
                         '"Two independent demonstrations that ARC-AGI-3 was measuring the harness": public set only, which the ARC paper calls intentionally easier; community harnesses had already reached 98.97 to 100%',
                         'Long-context ranges were Prime Agent\'s own scores across models, not gains; Prime Agent loses OOLONG with Opus 5 and LongBench v2 with GLM-5.2 and Opus 5; the GLM baseline is pi, Prime Agent\'s upstream',
                         '"6x more out-of-loop experiments": only DeepSeek V4 Pro; GLM 5.3 4.6x and 2.0x; Kimi K3 3 against 3',
                         '"Read sections 2 and 4": section 4 is Related Work; the method and results are sections 2 and 3',
                         'MazeBench and PMPP-Hard "competitive": PMPP within two tasks either way; MazeBench mixed (more states, fewer rooms than Codex with GPT-5.6 Sol)'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
