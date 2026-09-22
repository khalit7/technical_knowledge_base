# Mistral AI

⏱ 6 min read · +1h 30m resources

This page explains the family; per-model pages to follow.

### What Mistral is

Mistral AI is a Paris lab founded in 2023 by researchers out of Meta and DeepMind, and the only Western lab still shipping open weights at close to frontier scale after Meta stepped back from the role. Its strategy is a bet that a smaller, cheaper model with a permissive licence and EU jurisdiction wins the enterprise deals that raw benchmark position does not: sovereign and defence deployments, regulated on-prem installs, and anyone who cannot legally send tokens to a US API. Technically it is a fast follower rather than an originator: it takes an efficiency idea that already works (sliding-window attention, sparse mixture of experts, distillation from its own larger models) and is usually first to ship it at a size people can actually run.

### Best resources

- [Mixtral paper](https://arxiv.org/abs/2401.04088) (45 min) and repo summary: the release that mainstreamed open MoE. Read it for the routing analysis, which shows experts specialise by syntax and token position far more than by topic, contrary to what the name suggests.
- [Mistral news page](https://mistral.ai/news) (news index, ~15 min to skim the current entries): primary source; releases come fast and thinly documented elsewhere.
- [Mistral release timeline (BenchLM)](https://benchlm.ai/model-updates/providers/mistral) (~10 min): dated list of all 30+ releases.
- [Mistral models 2026 guide (Serenities)](https://serenitiesai.com/articles/mistral-ai-models-2026-complete-guide) (~20 min): current catalogue walkthrough.

### The architecture ideas the family is built on

**Sliding-window attention (SWA)**, the trick behind Mistral 7B, restricts each layer to attending over only the last W tokens (4096 in Mistral 7B) instead of the whole prefix. Attention cost per token stops growing with sequence length, and the KV cache becomes a fixed-size rolling buffer that overwrites its oldest slot rather than growing without bound, which is what let a 7B model serve long inputs on one consumer GPU. Information still travels further than W because the window stacks: a token at layer k reaches roughly k times W tokens back, as a stack of small convolutions builds a large receptive field. The cost is that anything outside that cone is reached only indirectly, through however much the intermediate representations carried forward, so long-range exact recall is weaker than full attention. Later Mistral models relaxed or dropped SWA as long-context quality became the point.

**GQA (Grouped-Query Attention)**, used from Mistral 7B onward, keeps all the query heads but has groups of them share a single key/value head, so the KV cache shrinks by the group factor (8 query heads per KV head means an eighth of the cache). It sits between multi-head attention and multi-query attention, recovering almost all of MHA's quality with most of MQA's memory saving. Decoding is bandwidth-bound rather than compute-bound, so this translates directly into higher batch sizes and tokens per second on a fixed GPU.

**Sparse mixture of experts (MoE)** is the Mixtral contribution: each transformer block's feed-forward network becomes N independent FFNs (the experts) plus a small linear router that scores them per token, the top 2 run, and their outputs are combined weighted by the router scores. Parameters and FLOPs decouple: Mixtral 8x7B holds roughly 47B parameters (the attention layers are shared, which is why it is not 56B) but activates about 13B per token, so it costs a 13B model to run forward and behaves like something far larger in quality. The bill arrives in memory and serving complexity: every expert must be resident in VRAM even though most are idle for any given token, and in distributed serving the router creates an all-to-all communication step and a load-balancing problem, because a batch whose tokens all prefer the same expert leaves most GPUs idle. This is the design the Chinese open-weight wave (DeepSeek, Qwen, MiniMax, GLM) later pushed to hundreds of much smaller experts.

### Lineage

- **Mistral 7B (Sep 2023)**: outperformed Llama 2 13B, a nearly twice-as-large model, using sliding-window attention plus GQA; instantly the default small base for fine-tuning and the model that established the lab's credibility.
- **Mixtral 8x7B (Dec 2023) / 8x22B (2024)**: the first genuinely usable open sparse MoE (top-2 of 8 experts), matching much larger dense models at 13B-active cost, under Apache 2.0. Apache 2.0 matters as a technical fact, not only a legal one: no acceptable-use annex, no monthly-active-user threshold, no obligation to publish derivatives, so a company can fine-tune it, embed it in a product and never mention Mistral, which is precisely what Meta's community licence did not allow.
- **2024-2025 diversification**: Mistral Large 1/2 (the closed-ish flagship sold through the API), Small 3.x and Medium 3 (price-performance tiers), **Codestral** (code, trained for fill-in-the-middle so it completes inside an existing file given both prefix and suffix, the shape IDE autocomplete needs), **Ministral** (edge sizes for a phone or laptop CPU), **Pixtral** (vision, an image encoder feeding the language decoder so images and text interleave in one context), **Voxtral** (audio in), **Magistral** (Jun 2025, Europe's first reasoning model line, post-trained to emit a long chain of thought and rewarded on the final answer being correct), and **Devstral** (agentic coding, tuned for the SWE-bench loop of reading a repository, editing files and running tests inside a scaffold rather than emitting a single code block).
- **Mistral Large 3 (Dec 2025)**: current flagship, the largest open-weight MoE from a Western lab, Apache 2.0, frontier-class. The licence rather than the benchmark row made it notable: the most permissive frontier-adjacent weights anywhere.
- **2026**: Small 4 (Mar), Medium 3.5 (Apr), Devstral 2 123B and Devstral Small 2 24B (Dec 2025), **Shieldstral** (a 3B multimodal safety classifier under Apache 2.0, a separate guard model scoring prompts and generations against harm categories, so the policy lives outside the generator and can be swapped without retraining it), **Robostral** (the robotics and physical-AI push), plus a new open-weight frontier model in July early access aimed at closing the gap to the top five.

### Training approach highlights

- Punches above its compute class through distillation (small models trained on the outputs of the large ones rather than on raw web text alone), heavy data filtering, and MoE. It publishes weights first and papers occasionally, so the recipes are usually inferred from the artefacts rather than documented.
- Apache 2.0 as strategy, not idealism: it is the wedge into EU government, defence and on-prem deals where permissive licensing and EU jurisdiction beat a couple of points of benchmark.
- Full-stack pivot 2025-2026: Le Chat (consumer assistant), La Plateforme (the API and fine-tuning platform), Mistral Compute (sovereign AI infrastructure built with Nvidia), and robotics models. ASML anchored a round at roughly $14B; a €3B Samsung-led Series D in September 2026, the largest round in European tech, valued the company above €21B on an explicit sovereign-AI pitch covering research, compute and international expansion. The distribution side moved with it: Mistral models now ship inside Mozilla's **Firefox Smart Window**, sold on private multilingual browsing with model choice, which is the sovereignty argument reaching a consumer surface rather than a procurement one.
- **Magistral documented its RLVR recipe**, the one place the lab was genuinely open about method. RLVR (Reinforcement Learning from Verifiable Rewards) drops the learned reward model entirely and scores a rollout by mechanically checking the final answer, matching a maths result or running unit tests, so the reward cannot be gamed by style the way a preference model can. The notable claim is pure RL on their own base models, with no reasoning traces distilled from a larger reasoner: the expensive path, but the one that shows the capability was trained rather than copied.

### Current models

| Model | Role |
| --- | --- |
| Mistral Large 3 | Open-weight flagship MoE (Apache 2.0) |
| Medium 3.5 / Small 4 | Price-performance tiers |
| Magistral line | Reasoning |
| Devstral 2 / Small 2 | Agentic coding (open) |
| Codestral, Pixtral, Voxtral, Ministral | Code / vision / audio / edge specialists |
| Shieldstral, Robostral | Safety classifier, robotics |

Position: not a top-five frontier lab on capability, but the leading Western open-weight provider post-Llama and the EU's strategic champion. You choose it for the licence, the jurisdiction or the price per token, not because it tops a leaderboard.

### Cross-links

- [Mixture-of-Experts (MoE) models](../moe-models.md): Mixtral's top-2 routing as the classic design.
- [Meta: Llama and Meta Superintelligence Labs](../meta-llama/overview.md): the open-weights mantle it inherited.
