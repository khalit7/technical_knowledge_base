# Meta: Llama and Meta Superintelligence Labs

⏱ 6 min read · +2h 55m resources

Last updated: 2026-08-31 (explanation pass: every named model, architecture and acronym below now says what it is and what it changes; time estimates added). Per-model files to follow; this page maps the family.

## Best resources

- [Llama 3 paper](https://arxiv.org/abs/2407.21783) (~2h 30m) and repo summary: the most detailed open frontier training report ever published, and still the reference for dense-at-scale. 90-plus pages; the pretraining-infrastructure and post-training sections are the ones that transfer directly to your own runs.
- [Llama 4 announcement](https://ai.meta.com/blog/llama-4-multimodal-intelligence/) (12 min): Scout and Maverick architecture details, including the MoE configuration and the long-context claim.
- [VentureBeat on Muse Spark](https://venturebeat.com/technology/goodbye-llama-meta-launches-new-proprietary-ai-model-muse-spark-first-since) (6 min): the closed-source pivot and what it means for the open ecosystem.
- [Zuckerberg's superintelligence memo coverage](https://www.theverge.com/meta/717033/meta-superintelligence-labs-ai-mark-zuckerberg) (8 min): the context in which Meta Superintelligence Labs was formed.

## Lineage

**Llama 1 (Feb 2023): the overtraining bet, and the leak.** A research-only release whose weights leaked, and the leak is the historically important part: it created the local-LLM ecosystem, above all **llama.cpp**, a dependency-free C and C++ inference engine with aggressive weight quantisation that put 7B-class models on laptop CPUs and made "run it yourself" a real option. The technical contribution was to take the **Chinchilla** result (for a fixed training-compute budget the loss-optimal allocation is roughly 20 training tokens per parameter, meaning the giant models of the day were badly undertrained) and then deliberately overshoot it: train relatively small models on far more tokens than compute-optimal, because the cost that actually matters in production is inference, which is paid on every request forever, not training, which is paid once. That reframing is why the 7B and 13B sizes exist at all and why nearly every open model since has been overtrained by Chinchilla's standard.

**Llama 2 (Jul 2023): a legal base.** First openly licensed weights usable commercially, shipped alongside RLHF-tuned chat variants and an unusually candid safety appendix. The licence, more than the model, is what let a downstream fine-tuning industry form.

**Llama 3 and 3.1 (2024): open frontier.** Dense 8B, 70B and 405B models trained on more than 15T tokens. 405B was the first open model to reach roughly GPT-4 class, and it was deliberately kept dense rather than MoE, a choice the report defends on training-stability and implementation-simplicity grounds at that scale. 3.2 added vision variants and small on-device models; 3.3 70B recovered most of 405B's quality by distillation from it, which is what made it the practical default in serving stacks that could not justify 405B's memory footprint.

**Llama 4 (Apr 2025): the MoE pivot that misfired.** The line moved to **MoE (Mixture of Experts)**, where the feed-forward block becomes many expert networks of which a router selects a few per token, decoupling total parameters from per-token compute. **Scout** is 109B total with about 17B active per token and a claimed 10M-token context; **Maverick** is 400B total with about 17B active. The context claim rests on **iRoPE (interleaved RoPE)**: most layers use rotary position embeddings as usual, but interleaved among them are attention layers with no positional encoding at all, which are therefore length-agnostic by construction, combined with temperature scaling of attention at inference as the sequence grows. Reception was poor for two reasons. An experimental chat-tuned variant was used to obtain the headline LMArena score while a different checkpoint was what actually shipped, which became a benchmark-gaming controversy and cost Meta credibility it has not recovered; and real-world coding quality lagged the published numbers badly. **Behemoth**, the roughly 2T-parameter teacher model the rest of the family was meant to be distilled from, never shipped.

**Reorg (mid 2025): Meta Superintelligence Labs.** MSL was formed under Alexandr Wang, founder of Scale AI (the data-labelling company that supplied much of the industry's RLHF and evaluation data), following a reported $14B-plus talent raid on rival labs. A new internal group, TBD Lab, took over frontier model work, and the open Llama roadmap stalled behind it.

**Muse Spark (Apr 2026): closed weights.** The first MSL frontier model, and closed. It returned Meta to frontier-competitive performance at the cost of the open identity that was its entire strategic differentiation, since Meta's argument for releasing weights had always been that commoditising the model layer was worth more to it than owning one. Next in line are "Avocado" (text, coding and reasoning) and "Mango" (image and video), with talk of open releases of some variants, but nothing frontier-open has shipped since Llama 4.

## Training approach highlights

**Why the Llama 3 report still matters more than the model.** It is the only end-to-end public account of training a frontier model, and it maps directly onto the stack a practitioner already runs. It documents data curation and deduplication at 15T-token scale; an **annealing** phase that upweights high-quality data in the final stretch of pretraining, and the use of that phase to cheaply evaluate whether a candidate data source is worth including; scaling-law experiments run specifically to choose the data mixture instead of guessing it; training on 16K GPUs using **FSDP (Fully Sharded Data Parallel**, which shards parameters, gradients and optimiser state across ranks and re-gathers each layer's parameters just in time for its forward and backward pass) composed into **4D parallelism**, tensor, pipeline, context and data parallelism arranged on one device mesh so that each dimension absorbs a different bottleneck; and a post-training loop of rejection sampling plus preference optimisation with **DPO (Direct Preference Optimization**, which fits preferences with a closed-form classification loss on the policy itself, removing the separate reward model and the RL loop entirely) and PPO. It is also honest about the unglamorous part: observed hardware failure rates per GPU-hour, and the checkpointing and restart machinery needed to survive them at that cluster size.

**Llama 4's training choices.** Roughly 30T multimodal tokens; **early fusion**, meaning image and text tokens enter the same backbone from the first layer rather than a vision encoder's output being projected in near the top, which lets the model learn cross-modal structure at every depth; **FP8** compute for the matmuls, halving memory traffic versus BF16 and roughly doubling tensor-core throughput on Hopper-class hardware, at the cost of needing per-tensor scaling to keep gradients in range; and iRoPE for the extreme context claim.

**MSL-era training details are undisclosed.** Muse Spark and Avocado have no technical report, which is the concrete cost of the closed pivot for anyone who used Meta's reports as the field's reference documentation.

## Current status (Aug 2026)

| Model | Status |
|---|---|
| Muse Spark | Closed frontier model, Meta AI products |
| Avocado / Mango | In development, H1-2026 targets slipped |
| Llama 4 Scout/Maverick | Last open weights; still widely served |
| Llama 3.x | Legacy but still the most-deployed open family by install base |

Strategic read: Llama's retreat handed open-weights leadership to the Chinese labs and to Mistral. **DeepSeek** builds efficiency-obsessed open MoE models and was first to make frontier-quality open reasoning models practical to serve. **Qwen** (Alibaba) covers the widest size ladder in open weights, from sub-1B to frontier-scale MoE, which makes it the default when you need one family across edge and server. **Moonshot** and **Zhipu** ship large agentic-focused MoE models (the Kimi and GLM lines). **Mistral** is the European open-weights vendor, pairing permissively licensed small models with commercial frontier ones. Meanwhile Llama 3.1 and 3.3 remain default bases in many fine-tuning stacks purely through incumbency: tooling, LoRA adapters, quantised builds and tribal knowledge all accumulated around them, and that inertia outlives the quality argument.

## Cross-links

- [../moe-models.md](../moe-models.md): Llama 4's MoE configs next to the sparse models that outcompeted them.
- Open-weights successors: [../deepseek/overview.md](../deepseek/overview.md), [../qwen/overview.md](../qwen/overview.md), [../mistral/overview.md](../mistral/overview.md).
