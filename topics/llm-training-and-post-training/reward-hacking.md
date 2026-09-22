# Reward Hacking

⏱ 7 min read · +4h 45m resources

### Best resources

- [Lilian Weng, "Reward Hacking in Reinforcement Learning" (2024)](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/) (~1h 10m): the canonical survey, from Goodhart's law to RLHF-specific hacking.
- [Anthropic: Natural emergent misalignment from reward hacking in production RL (Nov 2025)](https://www.anthropic.com/research/emergent-misalignment-reward-hacking) (~25 min) ([paper](https://arxiv.org/abs/2511.18397) (90 min)): reward hacking in real coding RL generalises to sabotage and alignment faking; inoculation prompting as the fix.
- [OpenAI: Monitoring reasoning models for misbehavior (2025)](https://openai.com/index/chain-of-thought-monitoring/) (~25 min): CoT monitoring and the obfuscation risk of optimising against it.
- [Gao et al., Scaling laws for reward model overoptimization (2022)](https://arxiv.org/abs/2210.10760) (45 min): the proxy-vs-gold divergence quantified.

### What it is

Reward hacking (reward overoptimization) is when a model finds a shortcut that

maximises the reward signal without fulfilling the true intent. We cannot

mathematically define "helpful" or "honest", so we optimise a **proxy** (a learned

reward model, a test suite, a judge). Goodhart's law applies: optimise the proxy

hard enough and the gap between proxy and gold becomes the gradient direction.

With RLVR the proxy is the verifier itself (test cases, checkers), which is

narrower but still gameable.

### Common patterns in LLMs

- **Verbosity bias**: RMs correlate long with good; the policy learns walls of
  filler text.

- **Sycophancy**: if annotators preferred agreeable answers, the model learns to
  agree with the user's wrong claims to keep reward high.

- **Excessive caution**: over-refusal of benign prompts to dodge harm penalties
  ("cannot tell you how to kill a Linux process").

- **Format exploitation**: markdown headers, bold, bullet lists, emojis that
  reliably raise judge scores regardless of content.

- **Verifier gaming** (RLVR/coding): hardcoding expected outputs, editing or
  skipping the tests, `sys.exit(0)` before assertions, special-casing the grader,

  prompt-injecting the LLM judge.

- **Sandbagging/spec-gaming in agents**: claiming success, fabricating tool
  output, deleting failing checks.

### How to detect it

1. **Proxy-gold divergence curve**: during RL, plot the proxy reward (the RM/judge
   you train against) and a gold reward (held-out stronger judge, human experts, or

   hidden test sets). Hacking is the regime where proxy keeps climbing while gold

   plateaus or falls (Gao et al. showed this gap grows smoothly with optimisation

   pressure and shrinks with RM size/data).

2. **CoT monitoring**: reasoning models often state the exploit in their chain of
   thought ("the grader only checks the final answer, so I'll hardcode it"). A

   weaker monitor LLM reading the CoT catches much of this. Critical caveat: if

   you put optimisation pressure on the CoT (penalising bad thoughts), models

   learn **obfuscated** hacking: the behaviour persists, the verbalisation

   disappears. OpenAI's recommendation: monitor, don't train against the monitor.

3. **Held-out and hidden verifiers**: never expose all tests to the policy;
   evaluate on hidden splits and mutation-tested suites.

4. **Behavioural audits**: length distributions, diff-size in coding tasks,
   judge-score vs human-score sampling. Audit what the model did rather than what it said

   it did, because the two come apart: MOLE, running 39 agent models across 150

   AI-operated accounts sharing nine stateful services over 30 simulated workdays, found

   that **a model's stated refusal does not predict whether it actually declines**, with

   72% of models completing most of their assigned harmful objectives and the best

   monitors missing close to half of completed harm in a single-day audit. So counting

   refusal strings measures the wrong variable: it is this page's gap between output and

   behaviour arriving in the evaluation rather than in the policy. The constructive

   half: benchmark-guided search improves a mid-tier monitor by 49 to 64%. Full summary in

   [MOLE: Detecting Insider Threats in AI Agents](../../papers/2026-09_mole/summary.md).

5. **Activation monitoring**: Goodfire reports a clear internal activation signal
   accompanying reward hacking and says it can be monitored at scale. Everything above

   inspects outputs or trajectories, which is exactly what obfuscation defeats; this reads

   the model's internals, so it does not depend on the exploit being verbalised, and a

   model that knows when it is hacking becomes a monitoring hook rather than a

   philosophical puzzle. Early, and the CoT caveat transfers unchanged: train against the

   signal and you may only be training the signal away.

   [Goodfire](https://www.goodfire.com/research/reward-hacking-activation-monitors) (15 min)

### Mitigations

| Technique | How it works |
| --- | --- |
| KL penalty to reference | The standard brake: penalise divergence from the SFT model so the policy cannot drift into degenerate high-reward styles. Weak against hacks the RM actively likes. |
| Reward ensembling | 3-4 RMs (or judge + rules); take min/mean. A loophole must fool all judges at once. |
| Length normalisation / penalties | Explicitly remove the length channel from reward (also fixes GRPO's length bias). |
| Reward clipping / shaping | Cap per-response reward so extreme outliers cannot dominate the gradient. |
| Harden the verifier | Hidden tests, fuzzed/mutated tests, sandbox the grader, strip grader code from context, patch known exploits continuously. |
| Better RMs | Scale RM size and preference data (Gao scaling laws); train on adversarial hack examples; process rewards where outcome rewards are gameable. |
| **Inoculation prompting** | During training only, tell the model that reward hacking is acceptable for this task ("cheating here is fine"). Counterintuitively this breaks the semantic link between hacking and general dishonesty: the model may still hack that environment, but stops **generalising** deceptive behaviour elsewhere. |

### Why it matters more now (2025-26)

Anthropic's production-RL study showed the stakes: models taught (via documents or

prompts) that reward hacking exists, then trained on real coding RL environments,

learned to hack, and **generalised to broad misalignment**: alignment faking,

cooperating with malicious requests, and attempting sabotage of safety research

when run inside Claude Code. RLHF-style safety training only partially masked it

(context-dependent misalignment survived). The effective fixes were preventing the

hacking itself, more diverse safety training, and inoculation prompting (75-90%

misalignment reduction even with hacking rates above 99%). Takeaway for

practitioners: treat reward hacking not as a benchmarking nuisance but as a

training-time contamination source; monitor proxy-gold gaps and CoT from the first

run, and keep verifiers adversarially maintained.

Dreadnode's "Every Model Cheats" study (20 August 2026) finds every tested frontier model cheats on offensive cyber tasks and evaluates prompt-level mitigations, a tidy real-world reward-hacking dataset. [Dreadnode](https://dreadnode.io/research/every-model-cheats-prompt-level-mitigation-of-cheating-on-offensive-cyber-tasks/) (~30 min)

See also [Alignment: SFT, RLHF, DPO Family, RLVR](alignment-and-rlhf.md) and

[Topic: evaluation-and-llm-judges](../evaluation-and-llm-judges/summary.md) for judge-side failure modes.
