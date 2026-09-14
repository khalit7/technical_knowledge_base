# Mistral AI

⏱ 7 min read · +1h 30m resources

Last updated: 2026-08-31 (explanation rewrite; map first written 2026-08-24). Per-model pages to follow; this page explains the family.

## What Mistral is

Mistral AI is a Paris lab founded in 2023 by researchers out of Meta and DeepMind, and it is the only Western lab that has kept shipping open weights at close to frontier scale after Meta stepped back from the role. Its whole strategy is a bet that a smaller, cheaper model with a permissive licence and EU jurisdiction wins the enterprise deals that raw benchmark position does not: sovereign and defence deployments, regulated on-prem installs, and anyone who cannot legally send tokens to a US API. Technically the lab is a fast follower rather than an originator: it takes an efficiency idea that already works (sliding-window attention, sparse mixture of experts, distillation from its own larger models) and is usually first to ship it at a size people can actually run.

## Best resources

- [Mixtral paper](https://arxiv.org/abs/2401.04088) (45 min) and repo summary: the release that mainstreamed open MoE. Read it for the routing analysis, which shows experts specialise by syntax and token position far more than by topic, contrary to what the name suggests.
- [Mistral news page](https://mistral.ai/news) (news index, ~15 min to skim the current entries): primary source; releases come fast and thinly documented elsewhere.
- [Mistral release timeline (BenchLM)](https://benchlm.ai/model-updates/providers/mistral) (~10 min): dated list of all 30+ releases.
- [Mistral models 2026 guide (Serenities)](https://serenitiesai.com/articles/mistral-ai-models-2026-complete-guide) (~20 min): current catalogue walkthrough.

## The two architecture ideas the family is built on

**Sliding-window attention (SWA)**, the trick behind Mistral 7B, restricts each layer to attending over only the last W tokens (4096 in Mistral 7B) instead of the whole prefix. Two things follow. Attention cost per token stops growing with sequence length, and the KV cache becomes a fixed-size rolling buffer that overwrites its oldest slot rather than growing without bound, which is what let a 7B model serve long inputs on one consumer GPU. Information still travels further than W because the window stacks: a token at layer k can reach roughly k times W tokens back, in the same way a stack of small convolutions builds a large receptive field. The cost is that anything outside that cone is reached only indirectly, through however much the intermediate representations happened to carry forward, so long-range exact recall is weaker than full attention. Later Mistral models relaxed or dropped SWA as long-context quality became the point.

**GQA (Grouped-Query Attention)**, used from Mistral 7B onward, keeps all the query heads but has groups of them share a single key/value head, so the KV cache shrinks by the group factor (8 query heads per KV head means an eighth of the cache). It sits between full multi-head attention, where every head caches its own keys and values, and multi-query attention, where all heads share one, and it recovers almost all of MHA's quality while getting most of MQA's memory saving. Since decoding is bandwidth-bound rather than compute-bound, this translates directly into higher batch sizes and tokens per second on a fixed GPU.

**Sparse mixture of experts (MoE)** is the Mixtral contribution. Each transformer block's feed-forward network is replaced by N independent FFNs (the experts) plus a small linear router; the router scores the experts for each token, the top 2 run, and their outputs are combined weighted by the router scores. The payoff is that parameters and FLOPs decouple: Mixtral 8x7B holds roughly 47B parameters (the attention layers are shared, which is why it is not 56B) but activates about 13B per token, so it costs a 13B model to run forward and behaves like something far larger in quality. The bill arrives in memory and in serving complexity: every expert must be resident in VRAM even though most are idle for any given token, and in a distributed serving setup the router creates an all-to-all communication step and a load-balancing problem, because a batch whose tokens all prefer the same expert leaves most GPUs idle. This is the design that the whole Chinese open-weight wave (DeepSeek, Qwen, MiniMax, GLM) later pushed to hundreds of experts with much smaller ones.

## Lineage

- **Mistral 7B (Sep 2023)**: outperformed Llama 2 13B, a nearly twice-as-large model, using sliding-window attention plus GQA; instantly the default small base for fine-tuning and the model that established the lab's credibility.
- **Mixtral 8x7B (Dec 2023) / 8x22B (2024)**: the first genuinely usable open sparse MoE (top-2 of 8 experts), matching much larger dense models at 13B-active cost, under Apache 2.0. Apache 2.0 matters here as a technical fact and not only a legal one: no acceptable-use annex, no monthly-active-user threshold, no obligation to publish derivatives, so a company can fine-tune it, embed it in a product and never mention Mistral, which is precisely what Meta's community licence did not allow.
- **2024-2025 diversification**: Mistral Large 1/2 (the closed-ish flagship sold through the API), Small 3.x and Medium 3 (price-performance tiers), **Codestral** (a code model trained for fill-in-the-middle, so it can complete inside an existing file given both the prefix and the suffix, the shape an IDE autocomplete actually needs), **Ministral** (edge sizes meant to run on a phone or laptop CPU), **Pixtral** (vision, an image encoder feeding the language decoder so images and text interleave in one context), **Voxtral** (audio in), **Magistral** (Jun 2025, Europe's first reasoning model line, meaning a model post-trained to emit a long chain of thought before its answer and rewarded on the final answer being correct), and **Devstral** (agentic coding, tuned for the SWE-bench loop of reading a repository, editing files and running tests inside a scaffold rather than emitting a single code block).
- **Mistral Large 3 (Dec 2025)**: current flagship, the largest open-weight MoE from a Western lab, Apache 2.0, frontier-class. The licence, rather than the benchmark row, is what made it notable: the most permissive frontier-adjacent weights anywhere.
- **2026**: Small 4 (Mar), Medium 3.5 (Apr), Devstral 2 123B and Devstral Small 2 24B (Dec 2025), **Shieldstral** (a 3B multimodal safety classifier under Apache 2.0, run as a separate guard model that scores prompts and generations against harm categories, so the policy lives outside the generator and can be updated or swapped without retraining it), **Robostral** (the robotics and physical-AI push), plus a new open-weight frontier model in July early access aimed at closing the gap to the top five.

## Training approach highlights

- Punches above its compute class through distillation (training the small models on the outputs of the large ones rather than on raw web text alone), heavy data filtering, and MoE. It publishes weights first and papers occasionally, which means the recipes are usually inferred from the artefacts rather than documented.
- Apache 2.0 as strategy, not idealism: it is the wedge into EU government, defence and on-prem deals where permissive licensing and EU jurisdiction beat a couple of points of benchmark.
- Full-stack pivot 2025-2026: Le Chat (consumer assistant), La Plateforme (the API and fine-tuning platform), Mistral Compute (sovereign AI infrastructure built with Nvidia), and robotics models; roughly $14B valuation with ASML as anchor investor.
- **Magistral documented its RLVR recipe**, which is the one place the lab was genuinely open about method. RLVR (Reinforcement Learning with Verifiable Rewards) drops the learned reward model entirely and scores a rollout by mechanically checking the final answer, matching a maths result or running unit tests, so the reward cannot be gamed by style the way a preference model can. The notable claim is that they ran it as pure RL on their own base models, with no reasoning traces distilled from a larger reasoner, which is the expensive path but the one that shows the capability was actually trained rather than copied.

## Current models (Aug 2026)

| Model | Role |
|---|---|
| Mistral Large 3 | Open-weight flagship MoE (Apache 2.0) |
| Medium 3.5 / Small 4 | Price-performance tiers |
| Magistral line | Reasoning |
| Devstral 2 / Small 2 | Agentic coding (open) |
| Codestral, Pixtral, Voxtral, Ministral | Code / vision / audio / edge specialists |
| Shieldstral, Robostral | Safety classifier, robotics |

Position: not a top-five frontier lab on capability, but the leading Western open-weight provider post-Llama and the EU's strategic champion. If you are choosing it, you are choosing it for the licence, the jurisdiction, or the price per token, not because it tops a leaderboard.

## Cross-links

- [../moe-models.md](../moe-models.md): Mixtral's top-2 routing as the classic design.
- [../meta-llama/overview.md](../meta-llama/overview.md): the open-weights mantle it inherited.

<details>
<summary>2026-08-24: original map (superseded by this rewrite; kept for reference, not counted in the read estimate)</summary>

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

Lineage: Mistral 7B (Sep 2023): outperformed Llama 2 13B; sliding-window attention + GQA; instantly the default small base. Mixtral 8x7B (Dec 2023) / 8x22B (2024): open sparse MoE (top-2 of 8 experts), 13B-active quality matching much larger dense models; Apache 2.0. 2024-2025 diversification: Mistral Large 1/2 (closed-ish flagship), Small 3.x, Medium 3, Codestral (code), Ministral (edge), Pixtral (vision), Voxtral (audio), Magistral (Jun 2025, Europe's first reasoning model line), Devstral (agentic coding, SWE-bench-focused small models). Mistral Large 3 (Dec 2025): current flagship: the largest open-weight MoE from a Western lab, Apache 2.0, frontier-class; the license made it the most permissive frontier-adjacent model anywhere. 2026: Small 4 (Mar), Medium 3.5 (Apr), Devstral 2 123B + Devstral Small 2 24B (Dec 2025), Shieldstral (3B multimodal safety classifier, Apache 2.0), Robostral (robotics/physical AI push), plus a new open-weight frontier model in July early access aimed at closing the gap to the top five.

Training approach highlights: Punches above its compute class via aggressive distillation, data quality, and MoE; publishes weights first, papers occasionally. Apache 2.0 as strategy: enterprise/sovereign deals (EU governments, defence, on-prem) where permissive licensing and EU jurisdiction beat raw benchmark position. Full-stack pivot 2025-2026: Le Chat consumer app, La Plateforme, Mistral Compute (sovereign AI infra with Nvidia), robotics models; ~$14B valuation with ASML as anchor investor. Magistral documented its RLVR recipe (pure RL on their own models, no distillation from larger reasoners).

</details>
