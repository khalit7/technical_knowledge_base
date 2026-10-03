"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration, fetched 2026-10-03, last edited 2026-09-20) with where the HTML carries it, and verify each
item's check strings against the built index.html (tags stripped, scripts kept, whitespace normalised).
The item list below is this paper's own, written from src/live.md (StateM), not copied from another page.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, F = 'The paper tab', 'Replay tab', 'Tables tab', 'Further reading tab'
C = [
 # properties (stay in Notion; the card repeats the takeaway)
 ('Takeaway property (on the card)', R + ', headline card "In one line"', ['Names and tests harness scaling: a versioned YAML state-machine runbook with enforced, checked transitions around a fixed CLI agent', 'at about 1/38 the evaluation cost']),
 ('Topics property: agentic-harnesses, benchmarks, agentic-frameworks', F + ', Topics', ['https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb', 'https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a', 'https://app.notion.com/p/3c65c17b0d0d81ab8432c54d65b7f8c7']),
 ('Year property: 2026', 'crumb line', ['Papers', '· 2026 ·']),
 ('Reading time line "11 min read, +~1h resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 # header
 ('Authors: Ziheng Qin, Yaxin Lu, Zhangyang "Atlas" Wang, Kai Wang; independent work in personal time; Qin and Lu equal-first', R + ', headline card', ['Ziheng Qin', 'Yaxin Lu', 'Zhangyang "Atlas" Wang', 'Kai Wang', "personal time", 'equal first authors']),
 ('Date: August 2026, arXiv v1 2026-08-15', R + ', headline card', ['15 August 2026 (arXiv v1']),
 ('Links: arXiv 2608.15089 (~45 min); code on GitHub; Terminal-Bench 2.1 submission PR #142 (~15 min)', 'card, Further reading', ['https://arxiv.org/abs/2608.15089', '(45 min)', 'https://github.com/henryqin1997/statem', 'https://github.com/harbor-framework/terminal-bench-2-1/pull/142', '(15 min)']),
 ('Summary: names and tests harness scaling, the stateful control layer around a fixed agent', R + ', Problem', ['harness scaling', 'Improving that control layer is']),
 ('83.1% -> 92.1% with GPT-5.5, a model-generation-sized gain with frozen weights', R + ', Result 1', ['92.1%', '83.1%', 'five times the generation gain']),
 ('Transfers unchanged to GPT-5.6 Sol xhigh for 95.3% raw public submission', R + ', Result 1', ['95.28%', 'the 95.3%', 'public submission']),
 ('~$37 adaptation; DeepSeek-V4-Flash matches GPT-5.6 Sol max score with ~$15 final spend vs $574.68', R + ', Result 3', ['$37.02', '$15.20', '$574.68', 'which rounds to the 88.8% reported for GPT-5.6 Sol max']),
 ('Best resources: paper two weeks old, no external explainers; abstract plus Figures 1, 2, 5 are the fastest path', F + ' (paper, code, PR, artifact release, family guide, HF page) and the Reading tab rebuilds Figures 1 and 5', ['Hugging Face paper page', 'Figure 1', 'Figure 5', 'Figure 2']),
 # problem
 ('Failure modes: lose track of mutable state, drift from plan, skip known checks, repeat lessons, stop early and self-declare completion', R + ', Problem', ['drift from the plan, lose track of changing state, skip a known check, repeat what is not working, or stop early and declare the job done']),
 ('Dominant fix is more model (pretraining, post-training, test-time reasoning, extra agents); orthogonal question', R + ', Problem', ['The usual fix is more model', 'How much apparent model failure is actually failure of the harness that maintains state, constrains execution, verifies progress, and recovers from errors?']),
 ('Control-signal dilution', R + ', Problem', ['control-signal dilution', 'a short plan and its completion criteria buried under thousands of tokens']),
 ('Mutable-state ambiguity', R + ', Problem', ['mutable-state ambiguity', 'the current state rebuilt from an append-only history']),
 ('Graph runtimes (LangGraph, StateFlow): strong control, developer-owned orchestration, node-local calls', R + ', Problem and Figure 1 rebuilt', ['Graph runtimes (StateFlow, LangGraph)', 'a developer owns the controller and the agent is split into node calls']),
 ('CLI agents (Codex, Claude Code): autonomy, but plans, TODO lists, memory files, hooks never one authoritative transition-aware control surface', R + ', Problem', ['CLI agents (Codex, Claude Code) keep autonomy', 'never one authoritative, transition-aware control surface']),
 # method
 ('StateM runtime: lightweight agent-native runtime for CLI agents; versioned YAML runbook', R + ', Idea', ['is a small runtime for CLI agents', 'versioned YAML runbook']),
 ('B = (S, s0, S_T, E, Phi)', R + ', Method', ['B = (S, s 0 , S T , E, Φ)']),
 ('Phase-level states (plan, execute, verify, repair, handoff), transitions, per-state prompts, hooks, checks, repair routes', R + ', Idea and Method', ['states, permitted transitions, and per-state prompts, hooks, checks and recovery routes', 'route to repair , handoff or wait']),
 ('Agent operates via CLI (inspect state, goto, failed conditions, history); user reads, edits, versions, audits', R + ', Idea', ['The agent drives it with ordinary shell commands', 'the user reads, edits and audits the same file']),
 ('States are context-and-contract boundaries: in_hook refreshes instructions and progress; before_transfer must pass; declaration of done is not verification; out_hook persists progress and receipts', R + ', Idea and Method', ['each state is a context-and-contract boundary', "an agent's declaration of completion does not constitute independent verification", 'an out_hook persists progress and receipts']),
 ('Six-step goto protocol', R + ', Method; animation', ['(1) the edge must exist; (2) exit checks run; (3) the out_hook runs; (4) edge guards and hooks run; (5) only then is the target committed and logged; (6) the target\'s in_hook runs']),
 ('Failed pre-commit checks keep the run in the source state for inspection and repair', R + ', Method', ['A failed check leaves the run where it was, with the failure recorded, to repair and retry']),
 ('Graded check strength: command/predicate, manual, checklist/message, llm_review', R + ', Method ladder', ['command, predicate', 'manual', 'llm_review', 'checklist, message', 'self-attestation', 'not deterministic proof']),
 ('Per-run mutable state outside the runbook; one profile many runs; restarted agent resumes from an explicit phase', R + ', Method', ['Per-run state lives outside the runbook', 'One profile serves many runs']),
 ('Stop hooks for Codex/Claude Code refuse premature termination; 22-hour unattended run', R + ', Method and §4.8', ['Stop hooks for Codex and Claude Code refuse to stop a run', 'A 22-hour run']),
 ('Failure-driven optimisation: epistemic, procedural-compliance, procedural-memory gaps with their fixes', R + ', Method', ['epistemic', 'procedural compliance', 'procedural memory', 'state-local context in an in_hook', 'versioned prompt, check or activation rule']),
 ('Hyper-agent plus human golden rules (minimal reusable control, route from visible task semantics not identity, separate development feedback from frozen evaluation)', R + ', Method', ['hyper-agent', 'prefer minimal reusable control, route from visible task semantics rather than task identity, keep development feedback apart from frozen evaluation']),
 ('Experience must be filtered before it becomes memory; more remembered procedure is not better memory; BusinessBench improves when profiles get thinner or replaced by the right invariants', R + ', §4.7 and Result 4', ['experience must be filtered before it becomes memory', 'More remembered procedure is not better memory', 'control sat at the wrong boundary']),
 ('Four evaluation regimes', R + ', The evaluation', ['fixed-model lift, frozen transfer within a family, adapted transfer across providers, held-out task generalisation']),
 ('Profile development uses only visible specs, workspace artifacts, observable feedback; never hidden tests, verifier internals, task identifiers', R + ', Method', ['Hidden tests, verifier code, solutions, task hashes and task identifiers are off limits']),
 # results
 ('Fixed model: 89 tasks x 5 trials; 88/89 solved at least once; above 91.9% Sol Ultra', R + ', Result 1', ['89 tasks × 5 trials = 445', 'solves 88 of 89 tasks at least once', '91.9%']),
 ('Harness gain +9.0 exceeds model-generation shift 83.1 -> 84.9', R + ', Result 1', ['+9.0', 'moves only 1.8 points']),
 ('Frozen transfer: 424/445 = 95.28%, vs 84.9%, every task solved at least once; Luna 76.7 -> 85.4', R + ', Results 1 and 2', ['424/445', '84.9%', 'with every task solved at least once', 'GPT-5.6 Luna from 76.7% to 85.4%']),
 ('Disclosure: PR unmerged; 4 flagged as zero 94.38%; nine flagged 93.26%; $1,062.95 over 1.178B tokens', R + ', Result 1 (updated: PR closed unmerged 2026-09-19)', ['94.38%', '93.26%', '$1,062.95', '1.178 billion tokens', 'closed unmerged']),
 ('DeepSeek: frozen profile 82.7 -> 82.0', R + ', Result 2', ['from 82.7% to 82.0%']),
 ('DeepSeek adapted: 392/445 = 88.09%; 89.09% on 88-task core; descriptive 88.8% with extended timeout on one latency-bound task', R + ', Result 3', ['88.09%', '89.09%', '88.76%', 'gpt2-codegolf']),
 ('Final-score evidence ~$15.20, ~1/38 of $574.68; total DeepSeek spend $52.22', R + ', Result 3; corrected to 1/37.8', ['1/37.8', '$52.22']),
 ('Transfer follows model distance: exact profiles within a family, structure and principles across providers', R + ', Result 2', ['exact runbooks across nearby models, principles across providers']),
 ('BusinessBench: Codex + GPT-5.6 Luna, 405 treated instances, 6 families; held-out macro +0.55, micro +1.34', R + ', Result 4', ['405 instances in six families', '+0.55', '+1.34']),
 ('Mechanism-matched families +10.04 (Budget Approval +12.21, Machine Operating +9.21)', R + ', Result 4; scope corrected (held-out vs Round-1 aggregates)', ['+12.21', '+9.21', '71.91 → 81.94']),
 ('Negative transfer RefactorBench -2.78, WooCommerce -3.70; corrected profiles recover in post-evaluation matched reruns', R + ', Result 4; details on the tables tab', ['RefactorBench', '(−2.78)', '(−3.70)', 'corrected profiles recover in post-evaluation reruns', '76.39 → 79.17', '86.42 → 90.12']),
 ('Lesson: generalisation follows mechanism match not task diversity; abstention (attendance-payroll) can be correct', R + ', Result 4', ['harness generalization follows mechanism match, not task diversity', 'abstaining on Attendance was the right call']),
 ('Table 3: configure-git-webserver 0/5 -> 5/5 because handoff gated on fresh clone-commit-push-curl proof', R + ', Method animation and §4.6; Tables tab', ['configure-git-webserver 0/5 → 5/5', 'StateM gates handoff on a fresh clone, commit, push and curl']),
 # why it matters
 ('Why: named axis orthogonal to model scaling; model "not the (main) bottleneck"; strongest quantified argument (reassessed)', R + ', Why it matters', ['A named, testable axis beside model scaling', 'the model appears not to be the (main) bottleneck']),
 ('Why: changes deployment economics; ~$52 moved a cheap model to the frontier at ~1/38 evaluation cost; buy the strongest model vs invest in the harness', R + ', Why it matters and Result 3', ['a ~$52 campaign put a cheap model at the reported frontier score', 'buy the strongest model']),
 ('Why: middle point in the control design space; graded check taxonomy reusable', R + ', Why it matters', ['A middle point in the control design space', 'a graded check taxonomy any harness can reuse']),
 ('Why: honest transfer boundaries; negative transfer and adjudication caveats disclosed', R + ', Result 2 and How much to believe', ['Candid disclosure', 'negative transfers']),
 # connections
 ('Connections: Terminal-Bench 2.1, BusinessBench; adjudication mechanics for topics/benchmarks', R + ', Connections', ['submission and adjudication mechanics for']),
 ('Connections: Codex and Claude Code control fragments; stop hooks; topics/agentic-harnesses', R + ', Connections', ['the control fragments of Codex and Claude Code']),
 ('Connections: StateFlow and LangGraph; topics/agentic-frameworks', R + ', Connections', ['StateFlow and LangGraph, which StateM reorganises around the agent']),
 ('Connections: Agentic Harness Engineering, Life-Harness, Self-Harness, Better Harnesses Smaller Models (BusinessBench source); AgingBench complementary', R + ', Connections', ['Agentic Harness Engineering, Life-Harness, Self-Harness and Better Harnesses, Smaller Models', 'AgingBench, complementary']),
 ('In this repo: 2026-08 envharness and agent-skills in the same wave; runbook as procedural memory connects to skills-as-files', R + ', Connections', ['https://app.notion.com/p/3c65c17b0d0d81e88ab9c396a160f813', 'https://app.notion.com/p/3c65c17b0d0d81249a3cf5fda4de5d92', 'a StateM practice is enforced at a transition, a skill is advice']),
 ('Related published pages: HarnessDev and Terminal-Universe', R + ', Connections; ' + F, ['https://app.notion.com/p/3d45c17b0d0d81cd9883f783840e013f', 'https://app.notion.com/p/3d45c17b0d0d814abc07fde424e09a31']),
 ('Parent Papers database', F + ' and crumb', ['https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f']),
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
           'corrected': ['"~1/38 the evaluation cost": 1/37.8 in §4.4; the Introduction\'s 38.9x contradicts it (How much to believe; tables tab)',
                         '"+10.04 macro (Budget Approval +12.21, Machine Operating +9.21)": 10.04 is held-out only, 12.21 and 9.21 are Round-1 aggregates over both splits (Result 4; corrections card)',
                         '"submission PR is unmerged": closed unmerged on 2026-09-19 after 13 judge flags, four of them harness cheating (Result 1; corrections card)',
                         '"scoring 4 review-flagged trajectories as zero gives 94.38%": those four are agreed reward-hacking flags; all 13 flags give 92.36% (Result 1)',
                         '"strongest quantified argument yet": reassessed as strong on a development set, weak held out (Why it matters; verdict)',
                         '"code and runtime cases open sourced": the GPT profile behind 92.1% and 95.3% is not released (What it takes; corrections card)',
                         '2026-08-24 tech news paired 95.3% with ~$15 per run; the $15 run is DeepSeek at 88.1% (corrections card)'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
