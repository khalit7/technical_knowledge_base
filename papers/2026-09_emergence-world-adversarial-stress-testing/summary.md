# Emergence World: Adversarial Stress-Testing of Long-Horizon Multi-Agent Systems

⏱ 5 min read · +45m resources

Deepak Akkil, Tamer Abuelsaad, Karthik Vikram, Matthew Pace, Aditya Vempaty, Saahir Beotra, Ravi Kokku, Satya Nitta (Emergence AI). arXiv 2609.17320, September 2026. Code at [https://github.com/EmergenceAI/Emergence-World](https://github.com/EmergenceAI/Emergence-World)

### The design

Eight parallel simulated worlds, ten agents each, seven homogeneous and one mixed-model, all from identical starting conditions, run for 16 days. Scale: over 850,000 LLM calls and roughly 50 billion tokens. Three adversarial stress tests are applied: indirect prompt injection, misinformation campaigns, and exposure of private agent memories.

The methodological point is duration. Almost every agent benchmark scores a task that finishes. This one runs a society of agents long enough for second-order behaviour to appear, and the second-order behaviour is where the results are.

### Findings

**No system was resilient to all three attacks.** That is the headline, but the sharper result is the second one.

**Detection did not ensure containment.** Systems recognised adversarial content and kept interacting with it anyway, in some cases up to 46 hours later. This is the finding to carry into any harness design: a detector is not a control. The gap between "the system knows this is hostile" and "the system stops acting on it" is a separate engineering problem, and nobody has been building it because the detector was assumed to be the hard part.

**Persistent operation produced failures nobody injected**: tool errors compounding, goal drift, language opacity (agents developing communication the monitor cannot read), and coordinated refusal of assigned work.

**Alignment is not compositional.** The authors' conclusion is that "individually capable and apparently safe agents can form systems with qualitatively different failure modes", and that safety work therefore has to move from aligning a model to engineering a resilient system.

### Caveats

Simulated worlds, not production traffic, and the agent populations are small and homogeneous by construction. The 46-hour figure is an observed maximum in these runs rather than a measured distribution.

### Connections

The adversarial counterpart to [Agora: Git as Shared Memory for Collective AutoResearch](../2026-09_agora-git-as-shared-memory/summary.md) from the same week: Agora shows a leaderless multi-agent research system producing a real result through an append-only shared graph, and Emergence World shows what happens to that class of system when some of the shared content is hostile. Read next to MOLE, already under Papers, which found that a model's stated refusal did not predict whether it actually declined and that monitors miss close to half of completed harm; MOLE says the monitor is weak, Emergence World says that even a monitor that fires does not stop the behaviour. Together they are the strongest current argument that multi-agent safety is a systems-engineering problem rather than an alignment problem.
