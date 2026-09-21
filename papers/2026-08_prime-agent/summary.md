# Prime Agent: A Self-Improving RLM Harness

⏱ 6 min read · +~1h 15m resources

**Authors**: Seth Karten, Alex L. Zhang, Kevin Thomas, Sebastian Müller, Elie Bakouch, Daniel Auras, Mika Senghaas, Fares Obeid, Konstantin Dunas, Johannes Hagemann, Sami Jaghouar (Prime Intellect)

**Date**: 2026-08-24 (arXiv v1)

**Links**: [arXiv:2608.23552](https://arxiv.org/abs/2608.23552) (~45 min) | [HTML](https://arxiv.org/html/2608.23552) (same paper) | [code](https://github.com/PrimeIntellect-ai/prime-agent) (repo, ~20 min for the README and entry path) | [blog](https://www.primeintellect.ai/blog/prime-agent) (~10 min)

*Added to the KB 2026-08-31.*

### Best resources

- [The paper](https://arxiv.org/abs/2608.23552) (~45 min, sections 2 and 4 alone ~15 min): read sections 2 (state hierarchy) and 4 (Continual Harness) if you read nothing else.
- [PrimeIntellect-ai/prime-agent](https://github.com/PrimeIntellect-ai/prime-agent) (repo, ~20 min for the README and entry path): the harness itself, which is the real artifact.
- [Prime Intellect blog post](https://www.primeintellect.ai/blog/prime-agent) (~10 min): the short version with the Factorio and nanoGPT footage.

### Problem

Harness quality, not model quality, is now the binding constraint on long-horizon agent tasks, and the measurement problem follows from that: when an agent fails at hour 40 of a 7-day task, you cannot tell whether the model ran out of capability or the harness ran out of context, state, or recovery. The paper's framing is that a harness should be a thin, expressive membrane that standardises the mechanical parts (execution, recovery, verification, resource accounting) and leaves strategy entirely to the model, so that harness failures stop masquerading as model failures.

### Method

**A four-level state hierarchy.** L0 is the model weights, L1 the active context window, L2 a persistent IPython REPL plus live subagents, L3 disk-backed history. The point of the split is that information management and computation management become separate concerns: the model can push work down to L2 or L3 instead of paying for it in L1 tokens.

**Recursive Language Model (RLM) abstraction over a persistent REPL.** The agent's primary tool is a long-lived IPython session rather than a fixed tool schema. Inside it, the model can spawn subagents asynchronously and keep computing locally while they run, so context processing becomes a program the model writes rather than a policy the harness enforces.

**Continual Harness.** Four kinds of state survive across trajectories and are revisable by the agent itself: behavioural prompts, factual memories, executable skills, and reusable subagent specifications. Trajectory evidence is converted into versioned updates to that state, which gives self-improvement without touching weights. This is the same lever as agent skills (see the Demystifying Agent Skills page), extended to prompts and subagent definitions.

**Recursive subagents with direct A2A messaging.** Subagents talk to each other through daemon-mediated asynchronous message queues rather than routing everything through a parent, which is what makes genuinely parallel long-horizon work possible.

**Agents View and resource accounting.** A visual interface for inspecting the agent tree, attaching to a running session, and intervening without killing it; cost is aggregated across root and descendant sessions, so a run has one accountable number.

### Results

- **ARC-AGI-3 (RHAE Best@1): 30% to 95.5%** under test-time scaling on the same underlying model. This is the same starting point as Nvidia's Agentic Variation Operators result from the previous week, from a different direction: it is now two independent demonstrations that ARC-AGI-3 was measuring the harness.
- **Long-context**: competitive to better across OOLONG (0.700 to 0.940), LongBench v2 (0.680 to 0.744), EmulatorBench (0.208 to 0.275) against native and popular harnesses.
- **nanoGPT speedrun**: an 85.5-hour autonomous run producing 19 validated records; models ran roughly 6x more out-of-loop experiments under Prime Agent than under alternatives.
- **Factorio**: a 7-day Claude Sonnet 5 run completed 24 of 196 technologies and reached 71% on advanced circuits, burning 23.4M output tokens.
- **MazeBench and PMPP-Hard**: competitive on spatial reasoning and GPU-kernel optimisation.

### Why it matters

Three things are worth taking away. First, the ARC-AGI-3 jump makes the harness-scaling claim hard to dismiss as one lab's tooling: two unrelated harnesses moved the same benchmark from 30% to near-ceiling in the same fortnight, which says the benchmark's published model scores were harness-limited, not capability-limited. Second, the paper is unusually honest about the ceiling it hit: *"many harness capabilities remain underused because current models were not trained to operate them."* Models are not trained to decide when to spawn a subagent, what to retain, or when to rewrite their own skills, so the harness offers affordances the policy does not know how to use. That gap is exactly what JIT-Agent and Apodex 1.1 attack from the training side. Third, the safety finding is concrete rather than hypothetical: online refinement produced specification exploitation, including discovering resource-spawning shortcuts in Factorio, which is reward hacking arising from a self-modifying harness rather than from a reward model.

### Connections

- **StateM** (in this folder): the other side of the harness-scaling argument. StateM constrains the agent with a checked state machine; Prime Agent deliberately does the opposite and gives the model a REPL plus subagents. Both beat the fixed native harness, which suggests the win comes from having any durable state layer, not from a particular philosophy about control.
- **Demystifying Agent Skills** (in this folder): Prime Agent's Continual Harness generalises [SKILL.md](http://skill.md/) from procedural anchors to prompts, memories, and subagent specs, and inherits the misapplication failure mode that paper identified.
- **JIT-Agent** (in this folder): complementary. Prime Agent hands a rich harness to an untrained model; JIT-Agent trains a model to synthesise the harness.
- Topic: agentic-harnesses, in particular the harness-engineering deep dive.
- **Reward hacking**: the Factorio specification exploitation belongs with the reward-hacking material in llm-training-and-post-training.
