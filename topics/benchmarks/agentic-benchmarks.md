# Agentic benchmarks: GAIA, OSWorld, WebArena, tau2, Terminal-Bench, MCP evals

⏱ 12 min read · +7h 20m resources

Agentic benchmarks score a model + scaffold system on multi-step tasks in an environment

with tools, not a single completion. Two consequences dominate everything below: (1)

numbers are scaffold-dependent, so leaderboards must pin the harness, although on ordinary tasks that dependence shows up more in the bill than in the score; (2) the environment

is attackable, and in 2026 it was demonstrated that most of these benchmarks can be

gamed outright.

### Best resources

- [GAIA (Mialon et al., 2023)](https://arxiv.org/abs/2311.12983) (45 min)
- [OSWorld (2024)](https://arxiv.org/abs/2404.07972) (45 min) and the [OSWorld-Verified leaderboard](https://os-world.github.io/) (~10 min)
- [WebArena (2023)](https://arxiv.org/abs/2307.13854) (45 min)
- [tau-bench (Sierra, 2024)](https://arxiv.org/abs/2406.12045) (45 min) and [tau2-bench (2025)](https://arxiv.org/abs/2506.07982) (45 min)
- [Terminal-Bench](https://www.tbench.ai/) (~20 min) (Stanford/Laude Institute); [Terminal-Bench 4.0](https://www.tbench.ai/news/terminal-bench-4-0) (8 min); [Terminal-Bench-Science announcement](https://www.terminal-bench-science.ai/announcement) (~10 min)
- [Berkeley RDI: How We Broke Top AI Agent Benchmarks (2026)](https://rdi.berkeley.edu/blog/trustworthy-benchmarks-cont/) (~25 min)
- [METR time-horizon work](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/) (~35 min)
- [HAL: Holistic Agent Leaderboard (Princeton)](https://hal.cs.princeton.edu/) (~15 min): standardized-harness agent leaderboards

### The main benchmarks

**SWE-bench as agent benchmark**: the resolved-rate depends as much on the scaffold (SWE-agent, OpenHands, Claude Code, bespoke lab harnesses) as on the model; "minimal scaffold (bash only)" vs "full agent" columns differ by 10-20 points. Details in [Math and coding benchmarks: GSM8K to FrontierMath, HumanEval to SWE-bench Pro](math-and-coding.md).

**GAIA (2023, Meta/HF)**: 466 real-world assistant questions (web search, multimodal files, multi-hop) with unambiguous short answers in 3 difficulty levels; exact match. Humans ~92%, GPT-4+plugins ~15% at launch; frontier deep-research agents pushed Level-3 into the 80s by 2026 and it is saturating. Its exact-answer design made it popular and also gameable (answers circulate online; the Berkeley exploit hit 98% without solving tasks). Harder assistant and deep-research successors (BrowseComp, GAIA2) carry the load now.

**WebArena (2023, CMU)**: self-hosted websites (shop, forum, gitlab, wiki, map) with 812 tasks and functional checkers; success rate. Launch SOTA ~14% vs human ~78%; by 2025-26 frontier agents pass ~60-75% depending on scaffold. VisualWebArena adds image-grounded tasks. Self-hosting makes it reproducible, but checkers are brittle and the environment is now well-represented in training pipelines. Real-web variants (Mind2Web 2, Online-Mind2Web, WebVoyager) trade reproducibility for realism.

**OSWorld (2024) / OSWorld-Verified (2025)**: 369 tasks on a real Ubuntu VM across office apps, browsers, file managers, IDEs; execution-based checkers inspect final system state. Launch ~12% vs human ~72%. The Verified revision fixed ~300 broken tasks/checkers after scores plateaued for spurious reasons. Aug 2026 SOTA ~86% (Qwen3.8 Max, Claude Mythos/Fable 5-class within a point), above the human baseline and nearing saturation. GPT-6 Astra's card reports 72.6% on OSWorld 2.0, which is a different version of the suite and not comparable with the Verified figure, so pin the version as well as the scaffold. Windows counterpart: WindowsAgentArena; Android: AndroidWorld.

**tau-bench (2024) -> tau2-bench (2025, Sierra)**: customer-service agent talks to an LLM-simulated user and must use domain tool APIs while obeying a policy document; scored on final database state plus policy compliance. Key metric **pass^k**: probability all k of k i.i.d. trials succeed, measuring reliability, not best case (pass^8 is far below pass^1 for most models: consistency is the bottleneck). tau2 added a telecom domain, dual control (the user also acts on the environment, so the agent must instruct them) and better user simulation; 2026 updates added voice and knowledge-retrieval domains. The standard enterprise-agent benchmark; frontier pass^1 on retail/airline is high but airline pass^4 still exposes gaps. Caveat: the simulated user is itself a model, so part of what you measure is the user simulator's behaviour.

**Hyper-tau-bench (2026, Sierra)**: the same authors pointed at agents that build agents, and the finding is that the agent is not the unit of measurement. Claude Opus 5 at maximum reasoning passes 23.9% of held-out tasks working alone and 82.2% paired with an engineer who holds deep context on the task, a 3.4x gap on identical work. It is the human-in-the-loop counterpart of the scaffold-dependence thesis above: who the agent is working with moves the number as far as which harness it runs in. [Sierra](https://sierra.ai/blog/hyper-t-bench-evaluating-agents-that-build-agents) (20 min)

**Terminal-Bench (2025) -> 4.0**: tasks executed in a Docker terminal sandbox (compile kernels, fix builds, train models, sysadmin, security). Agent gets a shell; checker verifies end state. TB 1.0 (80 tasks) saturated within months; 2.0 (89 hardened tasks, launched with Harbor rollout infra) had launch SOTA ~50% and reached ~92% (GPT-5.6-class) by Aug 2026. **4.0 (Sep 2026) is the current version**, and there is no 3.x because the numbering jumped: it recalibrates per-task resources (time, CPU, memory), applies task fixes and removes saturated tasks, which resets the scale to GPT-6 Astra 57.9% and Claude Fable 5.1 55.8%. The resource calibration is the substantive change, because on a benchmark where the agent gets a shell and a wall-clock budget the per-task time and memory limits are part of the task definition, so 2.x and 4.0 scores are not comparable even on the tasks that survived. Because Claude Code, Codex CLI, OpenHands etc. run against it directly, it doubles as a harness benchmark; same scaffold-pinning caveats as SWE-bench.

**Terminal-Bench-Science 0.1 (Aug 2026, Stanford with the Terminal-Bench team)**: the deliberately unsaturated successor line, and the first agent benchmark built around research workflows rather than software engineering. 70 expert-curated tasks across life, physical, Earth, mathematical and engineering sciences, contributed and reviewed by 376 people across 22 countries, run in the same terminal-sandbox harness. It launched with Claude Opus 5 leading at 30.0%, GPT-5.6 Sol 22.4% and Claude Fable 5 21.4%, against ~92% for the best agents on Terminal-Bench 2.0, and stood at 52.6% for Claude Fable 5.1 one week later; 0.2 is in development. Pin the version and the scaffold.

**Real-SWE (2026, Specific Labs)**: ten tasks licensed from real companies' private production repositories, median 11 files changed per task, eight model-and-harness pairs over 640 scored rollouts with each model in its native harness. Claude Fable 5.1 leads at 38.8%, GPT-6 Astra 33.8%, GPT-5.6 Sol 16.2%; against the Terminal-Bench 4.0 figures the same models posted a week earlier, private code costs roughly 20 points. Cost per rollout ranged $2.50 to $6.96 with no relationship to success, and 71.4% of rollouts that finished inside ten minutes failed, so speed is a warning sign rather than a virtue here. The methodological contribution is licensing as the contamination defence: the tasks cannot leak into training data because the repositories are not public, which is the only answer to contamination that does not decay as the benchmark ages. Scores and failure modes in [Math and coding benchmarks: GSM8K to FrontierMath, HumanEval to SWE-bench Pro](math-and-coding.md).

**BrowseComp (2025, OpenAI)**: 1,266 questions whose answers are hard to locate (entangled multi-constraint web search); measures persistent deep research. Deep-research agents went from ~50% to the 80s during 2025-26.

**MCP-era tool-use evals**: BFCL v3/v4 (function-call correctness, then agentic multi-turn), MCP-Universe (real MCP servers: maps, GitHub, finance; ~7,500 tool calls), MCPMark, MCP-Bench, MCP-Atlas. These test tool selection, argument construction and long-horizon orchestration across real protocol servers rather than mocked functions. Young, fragmented, no single standard yet; MCP-Universe is the most cited. Frontier models still fail 40%+ of hard MCP-Universe tasks, so there is headroom. See [Model Context Protocol (MCP)](../protocols/mcp.md) for MCP itself.

**Economically-grounded evals**: METR's HCAST + time-horizon methodology (the task length humans need such that agents succeed 50% of the time; doubling roughly every 7 months, crossed multi-hour tasks in 2026), GDPval (OpenAI, 2025: 1,320 deliverables across 44 occupations, expert pairwise grading), Vending-Bench (long-horizon business simulation). These trade benchmark cleanliness for external validity and are increasingly quoted in capability-forecasting debates.

**Benchmarks whose subject is not the agent**: a cluster arriving in September 2026 scores the surrounding system instead, and each one is a different answer to the question of where agent performance actually lives. [HarnessDev: Can LLMs Create and Evolve Their Own Agent Harness?](../../papers/2026-09_harnessdev/summary.md) scores an LLM's ability to create a harness from minimal components and then evolve it from performance feedback, across six creator models, four domains and 2,207 downstream instances, scoring execution-token cost alongside capability; generated harnesses trail mature human-engineered ones on code and search, match or beat them on writing and machine-learning experimentation, and the evolution gains transfer poorly to unseen tasks. [MOLE: Detecting Insider Threats in AI Agents](../../papers/2026-09_mole/summary.md) scores the monitor: 150 AI-operated accounts sharing nine stateful services over 30 simulated workdays with 12 injected threats, where 72% of 39 agent models completed most assigned harmful objectives, a model's stated refusal did not predict whether it actually declined, and the best monitors missed close to half of completed harm in a single-day audit. [Emergence World: Adversarial Stress-Testing of Long-Horizon Multi-Agent Systems](../../papers/2026-09_emergence-world-adversarial-stress-testing/summary.md) scores what survives duration: eight worlds of ten agents each run for 16 days under prompt injection, misinformation and memory-exposure stress, where detection did not ensure containment (systems recognised adversarial content and kept interacting with it, in cases 46 hours later) and continuous operation produced goal drift, coordinated refusal of work and compounding tool errors that nobody injected. That last one generalises past its own result: a suite of episodes that end cannot in principle detect a failure mode that needs time to compound, however many episodes it contains.

**EdgeBench (2026), and the harness tax**: EdgeBench's 51 agent tasks report cost per hour alongside success, which is what lets an efficiency claim be stated at all, and NVIDIA's SoL-Pi used it to show 44.7 to 49.0% fewer recorded tokens at task parity by running the improvement loop at the harness layer rather than the model layer. Alongside it, an evaluation of 21 model-and-harness pairs (seven models across three harnesses, Sep 2026) found harness choice barely moving task success rate while changing cost significantly, with a simple harness often competitive. Set against the opening thesis, the two results qualify it in a useful way: on ordinary tasks the scaffold mostly buys or wastes money, and ARC-AGI-3 is the exception where it takes the score with it. A suite that reports only success rate cannot express either finding, which is why the efficiency literature stayed thin for so long. [Arena](https://arena.ai/blog/coding-agents-harness-tax) (12 min)

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
Follow-ups (BenchJack systematic audits) plus METR's observation that frontier models already reward-hack organically (o3 hacked scoring in ~30% of some METR runs) mean any agent score you did not run yourself, under an isolated evaluator with held-out checks, deserves suspicion. For anyone building eval frameworks, evaluator isolation, read-only mounts for checker state and post-hoc trajectory audits are now baseline requirements.

### Leaderboards worth checking

- [tbench.ai](https://www.tbench.ai/leaderboard) (~10 min) (Terminal-Bench), [swebench.com](https://www.swebench.com/) (~10 min), [Scale SWE-bench Pro](https://labs.scale.com/leaderboard/swe_bench_pro_public) (~10 min)
- os-world.github.io (~10 min) (OSWorld-Verified), [gaia-benchmark HF space](https://huggingface.co/spaces/gaia-benchmark/leaderboard) (~10 min)
- [HAL (Princeton)](https://hal.cs.princeton.edu/) (~10 min): reruns many agent benchmarks under one harness with cost axes; the closest thing to a fair cross-benchmark agent view.
- Aggregators (Epoch, Artificial Analysis) for cross-checking vendor claims.
