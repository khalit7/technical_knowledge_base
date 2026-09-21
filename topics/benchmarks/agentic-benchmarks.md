# Agentic benchmarks: GAIA, OSWorld, WebArena, tau2, Terminal-Bench, MCP evals

⏱ 9 min read · +6h 30m resources

Last updated: 2026-08-24.

Agentic benchmarks score a model + scaffold system on multi-step tasks in an environment

with tools, not a single completion. Two consequences dominate everything below: (1)

numbers are scaffold-dependent, so leaderboards must pin the harness; (2) the environment

is attackable, and in 2026 it was demonstrated that most of these benchmarks can be

gamed outright.

### Best resources

- [GAIA (Mialon et al., 2023)](https://arxiv.org/abs/2311.12983) (45 min)
- [OSWorld (2024)](https://arxiv.org/abs/2404.07972) (45 min) and the [OSWorld-Verified leaderboard](https://os-world.github.io/) (~10 min)
- [WebArena (2023)](https://arxiv.org/abs/2307.13854) (45 min)
- [tau-bench (Sierra, 2024)](https://arxiv.org/abs/2406.12045) (45 min) and [tau2-bench (2025)](https://arxiv.org/abs/2506.07982) (45 min)
- [Terminal-Bench](https://www.tbench.ai/) (~20 min) (Stanford/Laude Institute), 2.0 leaderboard at [tbench.ai](http://tbench.ai/)
- [Berkeley RDI: How We Broke Top AI Agent Benchmarks (2026)](https://rdi.berkeley.edu/blog/trustworthy-benchmarks-cont/) (~25 min)
- [METR time-horizon work](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/) (~35 min)
- [HAL: Holistic Agent Leaderboard (Princeton)](https://hal.cs.princeton.edu/) (~15 min): standardized-harness agent leaderboards

### The main benchmarks

**SWE-bench as agent benchmark**: the resolved-rate depends as much on the scaffold

(SWE-agent, OpenHands, Claude Code, bespoke lab harnesses) as on the model; "minimal

scaffold (bash only)" vs "full agent" columns differ by 10-20 points. Details in [Math and coding benchmarks: GSM8K to FrontierMath, HumanEval to SWE-bench Pro](math-and-coding.md).

**GAIA (2023, Meta/HF)**: 466 real-world assistant questions (web search, multimodal

files, multi-hop) with unambiguous short answers, in 3 difficulty levels; exact match.

Humans ~92%, GPT-4+plugins ~15% at launch; frontier deep-research agents pushed Level-3

into the 80s by 2026 and it is saturating. Its exact-answer design made it popular and

also gameable (answers circulate online; the Berkeley exploit hit 98% without solving

tasks). Successor-style datasets (harder assistant/deep-research sets like BrowseComp,

GAIA2) carry the load now.

**WebArena (2023, CMU)**: self-hosted websites (shop, forum, gitlab, wiki, map) with 812

tasks and functional checkers; success rate. Launch SOTA ~14% vs human ~78%; by 2025-26

frontier agents pass ~60-75% depending on scaffold. VisualWebArena adds image-grounded

tasks. Being self-hosted makes it reproducible, but checkers are brittle and the

environment is now well-represented in training pipelines. Real-web variants

(Mind2Web 2, Online-Mind2Web, WebVoyager) trade reproducibility for realism.

**OSWorld (2024) / OSWorld-Verified (2025)**: 369 tasks on a real Ubuntu VM across office

apps, browsers, file managers, IDEs; execution-based checkers inspect final system state.

Launch: ~12% vs human ~72%. The Verified revision fixed ~300 broken tasks/checkers after

scores plateaued for spurious reasons. Aug 2026 SOTA ~86% (Qwen3.8 Max, Claude

Mythos/Fable 5-class within a point), i.e. above the human baseline and nearing

saturation. Windows counterpart: WindowsAgentArena; Android: AndroidWorld.

**tau-bench (2024) -> tau2-bench (2025, Sierra)**: customer-service agent talks to an

LLM-simulated user, must use domain tool APIs while obeying a policy document; scored on

final database state plus policy compliance. Key metric **pass^k**: probability all k of

k i.i.d. trials succeed, measuring reliability, not best-case (pass^8 is far below

pass^1 for most models: consistency is the bottleneck). tau2 added a telecom domain,

dual-control (the user also acts on the environment, so the agent must instruct them),

better user simulation; 2026 updates added voice and knowledge-retrieval domains. The

standard enterprise-agent benchmark; frontier pass^1 on retail/airline is high but

airline pass^4 still exposes gaps.

**Terminal-Bench (2025) -> 2.0/2.1**: tasks executed in a Docker terminal sandbox

(compile kernels, fix builds, train models, sysadmin, security). Agent gets a shell;

checker verifies end state. TB 1.0 (80 tasks) saturated within months; 2.0 (89 hardened

tasks, launched with Harbor rollout infra) had launch SOTA ~50% and sits at ~92%

(GPT-5.6-class) by Aug 2026; 2.1 is the current refresh. Because Claude Code, Codex CLI,

OpenHands etc. run against it directly, it doubles as a harness benchmark; same

scaffold-pinning caveats as SWE-bench.

**BrowseComp (2025, OpenAI)**: 1,266 questions whose answers are hard to locate

(entangled multi-constraint web search); measures persistent deep research. Deep-research

agents went from ~50% to 80s during 2025-26.

**MCP-era tool-use evals**: BFCL v3/v4 (function-call correctness, then agentic

multi-turn), MCP-Universe (real MCP servers: maps, GitHub, finance; ~7,500 tool calls),

MCPMark, MCP-Bench, MCP-Atlas. These test tool selection, argument construction, and

long-horizon orchestration across real protocol servers rather than mocked functions.

Young, fragmented, no single standard yet; MCP-Universe is the most cited. Frontier

models still fail 40%+ of hard MCP-Universe tasks, so there is headroom here. See [Model Context Protocol (MCP)](../protocols/mcp.md) for MCP itself.

**Economically-grounded evals**: METR's HCAST + time-horizon methodology (the task

length humans need such that agents succeed 50% of the time; doubling roughly every 7

months, crossed multi-hour tasks in 2026), GDPval (OpenAI, 2025: 1,320 deliverables

across 44 occupations, expert pairwise grading), Vending-Bench (long-horizon business

simulation). These trade benchmark cleanliness for external validity and are increasingly

quoted in capability-forecasting debates.

**ARC-AGI-3 (2026)** is also an agentic benchmark (interactive environments, exploration

and planning); covered in [Knowledge and reasoning benchmarks: MMLU family, GPQA, HLE, ARC-AGI](knowledge-and-reasoning.md).

### The integrity crisis (must-know for eval work)

Berkeley RDI (April 2026) built an automated "cheating agent" that audited 8 major agent

benchmarks and achieved near-perfect scores on SWE-bench (Verified and Pro),

Terminal-Bench, WebArena, FieldWorkArena, CAR-bench (100%), GAIA (98%), OSWorld (73%)

while solving zero tasks. Root causes:

- Agent code executes in the same environment the evaluator later inspects, so the agent
  can overwrite test files, tamper with checker state, or exfiltrate expected outputs.

- Gold answers are fetchable (OSWorld answers on Hugging Face; GAIA answers public).
- Some checkers never verify content (FieldWorkArena scored message-sent, not answers).
Follow-ups (BenchJack systematic audits) plus METR's observation that frontier models

already reward-hack organically (o3 hacked scoring in ~30% of some METR runs) mean: any

agent score you did not run yourself, under an isolated evaluator with held-out checks,

deserves suspicion. This is directly relevant to building eval frameworks: evaluator

isolation, read-only mounts for checker state, and post-hoc trajectory audits are now

baseline requirements.

### Leaderboards worth checking (Aug 2026)

- [tbench.ai](https://www.tbench.ai/leaderboard) (~10 min) (Terminal-Bench), [swebench.com](https://www.swebench.com/) (~10 min), [Scale SWE-bench Pro](https://labs.scale.com/leaderboard/swe_bench_pro_public) (~10 min)
- [os-world.github.io](https://os-world.github.io/) (~10 min) (OSWorld-Verified), [gaia-benchmark HF space](https://huggingface.co/spaces/gaia-benchmark/leaderboard) (~10 min)
- [HAL (Princeton)](https://hal.cs.princeton.edu/) (~10 min): reruns many agent benchmarks under one harness with cost axes; the closest thing to a fair cross-benchmark agent view.
- Aggregators (Epoch, Artificial Analysis) for cross-checking vendor claims.
