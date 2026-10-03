"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration, last edited 2026-09-20) with where the HTML carries it, and verify each item's check strings
against the built index.html (tags stripped, scripts kept, whitespace normalised).
The item list below is this paper's own, written from src/live.md (EnvHarness), not copied from another page.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, F = 'The paper tab', 'Wrap a world yourself tab', 'Tables tab', 'Further reading tab'
C = [
 # properties (they stay in Notion; the card repeats the takeaway)
 ('Takeaway property (verbatim on the card)', R + ', headline card "In one line"', ['An agent harness for environments: wrap frozen training environments with composable Stage/Contract/Chain components at the reset/step interface', 'beating static and generated environments for skill learning and GRPO RL and still scaling where they flatten']),
 ('Topics property: rl, llm-training-and-post-training', F + ', Topics; ' + R + ', Connections', ['https://app.notion.com/p/3c65c17b0d0d8195a6c6c11ad093c16e', 'https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b']),
 ('Year property: 2026', 'crumb line', ['Papers', '· 2026 ·']),
 # header
 ('Reading time line "8 min read, +~1h 15m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors/lab: Chengsong Huang (WashU, work done at Google), Zifeng Wang, Rujun Han, Jun Yan, Yanfei Chen, Chen-Yu Lee et al.; Google Cloud AI Research with Google Cloud and UNC Chapel Hill', R + ', headline card (all 17 authors)', ['Chengsong Huang', 'Zifeng Wang', 'Rujun Han', 'Jun Yan', 'Yanfei Chen', 'Chen-Yu Lee', 'Google Cloud AI Research', 'Washington University in St. Louis', 'UNC Chapel Hill', 'the work was done during his internship at Google Cloud AI Research']),
 ('Date: August 2026 (arXiv 2608.19880, v1 20 Aug 2026)', R + ', headline card', ['20 August 2026 (arXiv v1', 'arXiv 2608.19880']),
 ('Links: arXiv (~45 min), GitHub repo (~20 min for the README and entry path), project page (~10 min)', 'card and Further reading (project page now timed at 15 min with its playground)', ['https://arxiv.org/abs/2608.19880', '(45 min)', 'https://github.com/google-research/envharness', 'The README and the entry path take about 20 minutes', 'https://www.envharness.com']),
 # best resources
 ('Best resources: arXiv abstract and project page; paper days old, no good third-party explainers yet; the repo README is the practical entry point', F + '; ' + R + ' note under the nav', ['no third-party explainer existed and the repository README was the practical entry point', 'the practical entry point']),
 # problem
 ('LLM agents learn from interacting with environments (SWE repos, web UIs, embodied simulators)', R + ', Problem', ['LLM agents learn by acting in environments: software repositories, web interfaces, text or embodied simulators']),
 ('Those environments are hand-built and static: behave identically regardless of which agent or how good', R + ', Problem', ['they behave the same whichever agent trains in them and however good it has become']),
 ('So they cannot target a specific policy\'s weaknesses and run out of things to teach once the agent solves the tasks', R + ', Problem', ['cannot aim at one agent\'s particular weaknesses', 'it has nothing left to teach']),
 ('Automated generation flaw 1: pipelines are domain-specific (web generator does not transfer to SWE or tool use)', R + ', Problem', ['Generators are domain-specific.', 'does not transfer to the others']),
 ('Automated generation flaw 2: LLM-generated environments plus verifiers unreliable, forcing over-generation and filtering without correctness guarantees', R + ', Problem', ['Correctness is costly and unreliable.', 'must be over-generated and heavily filtered', 'no guarantee that the verifier is right']),
 # method
 ('EnvHarness is an "agent harness for environments": the explicit analogy (agent harness wraps a frozen LLM with tools, memory, skills; EnvHarness wraps a frozen environment with plug-in components)', R + ', Idea (with Table 1)', ['EnvHarness applies the same trick to the other side of the loop', 'Customized Env = Static Env + EnvHarness', 'Agent = Model + Harness']),
 ('Formally E = (S, A, O, T, R, s0); a component is an environment-agnostic transformation w with E\' = w(E), strictly at reset/step', R + ', Idea (Eq. 1)', ['an environment is a tuple', 'A component is an environment-agnostic transformation', 'works strictly at the interface']),
 ('Base simulator, tasks and verifier untouched, so every reshaped environment inherits the trusted human-built verifier, sidestepping generated-verifier reliability', R + ', Idea', ['the original verifier still scores the episode', 'no generated verifier anywhere']),
 ('Three component types, freely composable; nesting order matters, they do not commute', R + ', Components (and the order demo in the live tab)', ['do not commute', 'the nesting order decides which constraints apply', 'watch the Stage silently fail']),
 ('Stage overrides reset() by applying a scripted action sequence to s0; harder (hide the mug in a drawer, forcing search) or easier (pre-complete early subgoals)', R + ', Components; ' + S, ['overrides <code>reset()</code>', 'take mug 1, open drawer 1, put mug 1 in drawer 1, close drawer 1, so the agent must search', 'clean the mug in advance']),
 ('Contract: triplet (f_A, f_T, f_O) rewriting action space, transition dynamics and observation space; examples: block an action until a precondition holds with structured feedback, truncate observations, remove shortcut actions like teleport navigation', R + ', Components; ' + S, ['rewriting the action space, the transition dynamics and the observation space', 'blocks "clean mug" unless the agent holds it', 'truncates the room description after two sentences', 'removes teleport navigation']),
 ('"open the container first" style structured feedback', R + ', Components (structured feedback) and ' + S + ' (f_T feedback text)', ['attaches structured feedback', 'You need to hold the']),
 ('Chain composes the base environment with E_ext under composition logic g, one interface; extends horizons, tests goal persistence (mug task then "heat a potato"); reward only when both verifiers pass', R + ', Components; ' + S, ['joins the environment with another', 'heat a potato and put it on the countertop', 'succeeding only when both verifiers pass', 'carry its goal past the point where it would stop']),
 ('EnvRigger: components are policy-agnostic but choosing and parameterizing them must depend on policy pi and task t', R + ', EnvRigger', ['A component is policy-agnostic, but which components to use, and with what parameters, must depend on the target policy']),
 ('Observe: roll out pi on the base task, collect trajectories', R + ', EnvRigger', ['Roll π out on the base task']),
 ('Diagnose: root-cause flaws such as dead-loop action repetition, long-observation parsing failures, misread tool constraints; at 100% diagnose too easy and harden', R + ', EnvRigger', ['repetitive action loops, failure to parse long observations, misread tool constraints', 'harden the environment when the policy always succeeds']),
 ('Write: synthesize candidate components as code targeting the diagnosis', R + ', EnvRigger', ['Synthesize one or more components as code aimed at the diagnosis']),
 ('Validate: wrap, fresh rollouts, accept only solvable, challenging, well-scaled candidates; otherwise refine or reject', R + ', EnvRigger; ' + S + ' (the accept rule run live)', ['Wrap the environment, run fresh rollouts', 'reject it (unsolvable or not challenging), or send it back to Write']),
 ('The policy is a pure black box', R + ', EnvRigger', ['with the policy treated as a black box: only its outputs are read, never its weights']),
 ('Explicit user targets: a desired success rate, or a weakness in natural language ("submits patches without running the failing test") from which EnvRigger writes a Contract rejecting submissions until tests are run', R + ', Result 5', ['A quantitative target', 'A weakness named in one sentence', 'The policy submits a patch without running the failing test', 'Run the test suite before submitting.']),
 ('Training paradigm 1: skill-based learning: EnvRigger on training instances, extract skills from trajectories (ReasoningBank-style), equip the frozen policy, evaluate on held-out', R + ', EnvRigger and Setup', ['skill-based learning', 'skills are extracted from trajectories in the customized environments following ReasoningBank']),
 ('Training paradigm 2: online RL with GRPO directly in the reshaped environments', R + ', EnvRigger; Result 2', ['GRPO trains a policy directly in the reshaped environments']),
 # results
 ('Five benchmarks in four domains: ALFWorld, WebArena, SWE-bench Verified, OfficeQA and SpreadsheetBench', R + ', Setup', ['Five benchmarks in four domains', 'ALFWorld (text-based embodied tasks), WebArena (web interaction), SWE-bench Verified (software engineering), and OfficeQA with SpreadsheetBench (office automation)']),
 ('EnvRigger and the policy share the backbone (Gemini 3.1 Flash-Lite or 3.5 Flash), so gains are not distillation from a stronger model', R + ', Setup', ['Gemini 3.1 Flash-Lite on ALFWorld and WebArena, Gemini 3.5 Flash elsewhere', 'ensuring that performance gains do not stem from distilling a stronger external model']),
 ('Skill learning: beats original environments and domain-specific generators everywhere, up to +9.0 (ALFWorld OOD, 70.4 vs 61.4)', R + ', Result 1; card', ['70.4 vs 61.4', 'the paper\'s headline gain']),
 ('SWE-bench Verified 52.58 vs 49.88 with 9.8% fewer steps (49.6 vs 55.0)', R + ', Result 1 (with the correction that 9.8% is against original-environment skills; 7.4% against no skills)', ['52.58% solved against 49.88%', '9.8% saving against the 55.0 of original-environment skills', 'against no skills it is 7.4%']),
 ('Static-environment skills lengthen trajectories, and on SpreadsheetBench fall below the no-skill baseline', R + ', Result 1', ['score below no skills on SpreadsheetBench (45.88 against 46.44)', 'lengthen SWE-bench episodes (55.0 steps against 53.6)']),
 ('Beats SWE-smith by 2.46 points, GenEnv by 5.7 avg on ALFWorld, VeriEnv by 2.0 avg on WebArena', R + ', Result 1', ['GenEnv by 5.7 points on the ALFWorld average', 'VeriEnv by 2.0 on the WebArena average', 'SWE-smith by 2.46 points of success']),
 ('RL: GRPO on Qwen3-8B-base in EnvHarness environments beats training in the originals on 3 of 4 metrics (ALFWorld in-dist 87.9 vs 81.4; WebShop score 79.2 vs 75.6); reshaped envs a genuine standalone optimization signal', R + ', Result 2 (with the one-run-per-arm caveat)', ['Qwen3-8B-base with GRPO', 'EnvHarness wins three of four metrics', 'in-distribution 123 against 114 of 140', 'provide a highly effective, independent optimization signal']),
 ('Scaling: identical environment budget on SWE-bench Verified; EnvHarness 47.67 to 54.79 at 300 environments, still rising; original (52.13) and SWE-smith (50.37) flatten', R + ', Result 3 (corrected: the originals do not flatten in Figure 5)', ['EnvHarness climbs from 47.67 to 54.79 (+7.12)', '52.13 on original environments and 50.37 on generated ones', 'both gain 9 tasks']),
 ('Key mechanism is co-evolution: each batch synthesized against the current, already-improved policy', R + ', Result 3', ['EnvHarness writes each batch against the policy already equipped with the earlier skills, so environment and policy <b>co-evolve</b>']),
 ('Chain: Chain-derived skills cut average steps 53.58 to 41.96; combined Stage/Contract + Chain best of both (SR 54.30, AS 43.12)', R + ', Result 4', ['Chain-only skills cut average steps from 53.58 to 41.96', 'Combining Stage/Contract skills with Chain skills gives the best success rate, <b>54.30</b>, at 43.12 steps']),
 ('Cross-model: +2.7 to +3.7 absolute over original-environment skills across Gemini 3.1 Flash-Lite, Qwen3.6 27B, Gemini 3.5 Flash, Claude Sonnet 4.6 (base rates 30.7 to 67.2); loop neither breaks on weak policies nor saturates on strong ones', R + ', Result 4', ['<b>2.7 to 3.7 points</b>', 'the no-skill success rates span 30.7 to 67.2', 'neither breaks down on the weakest model nor saturates on the strongest']),
 # why it matters
 ('Environment supply is emerging as the bottleneck for agent training the way data curation was for pretraining', R + ', Why it matters', ['Environment supply is emerging as the bottleneck for training agents, the way data curation was for pretraining']),
 ('Reframes construction as a wrapping problem rather than an authoring problem', R + ', Why it matters', ['environment construction becomes a <b>wrapping</b> problem rather than an <b>authoring</b> problem']),
 ('Wrapping keeps the trusted verifier generation pipelines cannot reliably produce; the interface-level design makes one implementation domain-agnostic', R + ', Why it matters', ['Wrapping keeps the one thing generation pipelines cannot reliably produce, a trusted verifier', 'working at the interface makes one implementation domain-agnostic']),
 ('Task-policy-conditioned angle matters most for RL practitioners: automated curriculum design driven by black-box behavioral diagnosis', R + ', Why it matters', ['The task-policy-conditioned angle matters most for RL practitioners', 'EnvRigger is automated curriculum design driven by black-box behavioural diagnosis']),
 ('Scaling result suggests policy-environment co-evolution is the axis to scale, not raw environment count', R + ', Why it matters (with this page\'s correction)', ['co-evolving policy and environment is the axis to scale rather than raw environment count', 'the evidence for that is the first 100 environments']),
 ('The agent-harness analogy as a design lens: freeze the expensive artifact, customize through plug-ins at the interface', R + ', Why it matters', ['freeze the expensive artifact, customize through plug-ins at the interface']),
 # connections
 ('DeepSeekMath / GRPO: the RL algorithm of the online-RL experiments', R + ', Connections; ' + F, ['https://app.notion.com/p/3c65c17b0d0d817f9fc5cb9a9fbcbee5', 'introduced <b>GRPO</b>, the RL algorithm of the online-RL experiment']),
 ('DeepSeek-R1: RLVR lineage; EnvHarness preserves verifiable rewards by keeping original verifiers', R + ', Connections; ' + F, ['https://app.notion.com/p/3c65c17b0d0d813faca4f7a51eaa0c65', 'EnvHarness preserves verifiable rewards by keeping the original verifiers']),
 ('Agent Skills: the skill abstraction fed via ReasoningBank-style extraction, and the agent-harness side of the analogy', R + ', Connections; ' + F, ['https://app.notion.com/p/3c65c17b0d0d81249a3cf5fda4de5d92', 'the skill abstraction EnvHarness feeds through ReasoningBank-style extraction, and the agent-harness side of the paper\'s central analogy']),
 ('ReAct: the basic agent interaction loop being trained', R + ', Connections; ' + F, ['https://app.notion.com/p/3c65c17b0d0d816b9a24c28de8f08ea8', 'the basic reason-then-act interaction loop being trained']),
 ('Broader lineage: UED and curricula (PAIRED, Prioritized Level Replay, POET), environment generation (SWE-smith, SWE-Gym, GenEnv, InSTA), self-evolving agents (Voyager, Reflexion, ReasoningBank)', R + ', Connections (each linked)', ['https://arxiv.org/abs/2012.02096', 'https://arxiv.org/abs/2010.03934', 'https://arxiv.org/abs/1901.01753', 'https://arxiv.org/abs/2504.21798', 'https://arxiv.org/abs/2412.21139', 'https://arxiv.org/abs/2512.19682', 'https://arxiv.org/abs/2502.06776', 'https://arxiv.org/abs/2305.16291', 'https://arxiv.org/abs/2303.11366', 'https://arxiv.org/abs/2509.25140']),
 ('Topics: rl (RL for LLM agents, curricula), llm-training-and-post-training (agent post-training, RLVR)', R + ', Connections; ' + F, ['(RL for LLM agents, curricula)', '(agent post-training, RLVR)']),
]
norm = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if c in raw or norm(c) in txt]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')],
           'corrected': ['"Still scaling where they flatten" / "original envs (52.13) ... flatten": the vector Figure 5 shows original environments gaining 9 tasks from 100 to 300 environments, the same as EnvHarness; only SWE-smith flattens, and 52.13 is not a possible value of 407 tasks (Figure 5 plots 212/407 = 52.09): Result 3 and How much to believe',
                         '"9.8 percent fewer steps": against original-environment skills (55.0); against no skills (53.6) it is 7.4%: Result 1',
                         'SWE-bench Verified results are on the 407 Verified issues not in SWE-bench Lite, not the full 500: Setup',
                         'RL "beats on 3 of 4 metrics": one training run per arm; in whole tasks +9 of 140 in distribution (Fisher p = 0.18) and -1 of 134 out of distribution: Result 2 and How much to believe',
                         'Validate as described ("solvable, challenging, well-scaled") is not one rule in the release: per-benchmark acceptance differs (band on SWE-bench, SR up 0.2 on ALFWorld, designer judgement elsewhere) and WebArena uses 3 rollouts and 3 rounds: How much to believe and the tables tab',
                         'The trusted-verifier argument holds, but Contracts fake environment behaviour (timeouts, missing commands, corrupted files), so the transitions are partly invented: How much to believe'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
