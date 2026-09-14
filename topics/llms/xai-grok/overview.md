# xAI / SpaceXAI: Grok

⏱ 5 min read · +58 min resources

Last updated: 2026-08-31 (explanation rewrite; map first written 2026-08-24). Per-model pages to follow; this page explains the family.

## What xAI is

xAI, merged into SpaceX in Feb 2026 to form SpaceXAI, is the frontier lab whose strategy is the least algorithmic and the most industrial. Where DeepSeek optimises cost per token and Ai2 optimises reproducibility, xAI optimises the rate at which it can convert capital into training compute and then into shipped models. The lab has published very little method; what it has demonstrated is that a datacentre built in months, plus a willingness to spend RL compute at pretraining scale, is enough to stay in the top five without an obvious architectural edge. Its two durable differentiators are the real-time X firehose as a data source and a looser alignment posture than any other frontier lab.

## Best resources

- [Grok (Wikipedia)](https://en.wikipedia.org/wiki/Grok_(chatbot)) (~25 min): maintained lineage and corporate history.
- [xAI news](https://x.ai/news) (news index, ~15 min to skim the current entries): primary source for model releases.
- [VentureBeat on Grok 4.6](https://venturebeat.com/technology/spacexai-debuts-grok-4-6-overtaking-kimi-k3s-performance-and-matching-gpt-5-6-sol-for-worlds-third-best-on-artificial-analysis) (~8 min): current flagship positioning.
- [Grok 4.6 explainer (CometAPI)](https://www.cometapi.com/grok-4-6-release-date/) (~10 min): specs roundup.

## Lineage

- **Grok-1 (Nov 2023)**: built in months, a 314B sparse mixture-of-experts model (the feed-forward block of each layer is replaced by many independent experts and a router that runs only a couple of them per token, so total parameters and per-token FLOPs decouple). Its weights were open-sourced in Mar 2024 under Apache 2.0, establishing the lab's pattern of opening the previous generation once it is commercially spent: cheap goodwill, no competitive cost.
- **Grok-1.5 / 2 (2024)**: caught up to the GPT-4 class; Grok 2 weights released Aug 2025 under the same lagging-release policy.
- **Grok 3 (Feb 2025)**: trained on **Colossus**, the Memphis cluster of roughly 200K H100s stood up in 122 days. The number worth understanding is not the GPU count but the coherence: training one model across that many accelerators requires them to sit behind a single high-bandwidth fabric with the power and cooling to run them together, and the achievement was the construction and networking timeline rather than the purchase. Grok 3 also added **Think mode** (the model generates an extended chain of thought before answering, spending inference tokens to raise accuracy on problems that need multi-step work) and **DeepSearch** (an agentic browsing loop where the model issues its own searches, reads results and iterates before answering, rather than doing a single retrieval pass).
- **Grok 4 (Jul 2025)**: reasoning-first. **Grok 4 Heavy** added parallel test-time compute: instead of one longer chain of thought, several independent attempts are run concurrently and their answers reconciled, which trades money for accuracy without adding serial latency, and which works because errors in independent rollouts are only partly correlated. At launch it topped **ARC-AGI-2** (a benchmark of novel grid-transformation puzzles built specifically to resist memorisation, so it probes generalisation to unseen rules rather than recall) and **HLE (Humanity's Last Exam**, several thousand expert-written questions across academic fields, designed to be unanswerable by search and to sit near the ceiling of current models). Grok 4.1 (Nov 2025) and Grok 4.1 Fast (agentic, 2M-token context) followed, with Grok Code Fast targeting high-volume coding.
- **Feb 2026**: xAI merged into SpaceX to form **SpaceXAI** (roughly $1.25T combined valuation); the Grok brand was retained.
- **Grok 4.6 (Aug 12, 2026)**: current flagship at roughly 1.5T parameters, built for long-running agents, coding, knowledge work and visual projects. Artificial Analysis intelligence index around 61 (a composite that averages a fixed basket of benchmarks into a single number, useful for coarse ranking and nothing finer), tying GPT-5.6 Sol and overtaking Kimi K3, at $2 per 1M input tokens and $6 per 1M output. That price against that position is the actual product claim: frontier-adjacent quality at roughly a third of what the top two charge.
- **Grok 5**: in training; target dates (late 2025, then Q1 and Q2 2026) have all slipped.

## Training approach highlights

- **Compute scale as the core strategy**: Colossus 1 and 2 expanding toward a million-plus GPUs, with the fastest shipping cadence of any lab, achieved by brute-force iteration rather than by publishing a better recipe.
- **RL at pretraining scale**: Grok 4 reportedly spent as much compute on reinforcement learning as on pretraining, which is the concrete form of the industry's 2025 realisation that post-training is a second scaling axis rather than a finishing step. Practically it means very large volumes of rollouts on verifiable tasks (maths, code, tool use), scored by checking the outcome, which is why reasoning and agentic behaviour improved faster than raw knowledge.
- **Data edge**: real-time integration with the X firehose gives recency and a conversational corpus that competitors must license or scrape, and DeepSearch turns that into live retrieval at inference time.
- **Alignment posture**: deliberately looser than rivals, with recurring moderation incidents that are part of the brand's risk profile rather than accidents of it. Weights stay closed at the frontier; previous generations are sometimes opened once superseded.

## Current models (Aug 2026)

| Model | Role |
|---|---|
| Grok 4.6 | Flagship; value pick among the frontier five ($2/$6) |
| Grok 4.1 Fast | Cheap agentic workhorse, 2M context |
| Grok Code Fast | Coding at volume |
| Grok 5 | In training, no date |

## Cross-links

- [../reasoning-models.md](../reasoning-models.md): Heavy-style parallel test-time compute.
- Rivals: [../openai/overview.md](../openai/overview.md), [../anthropic/overview.md](../anthropic/overview.md).
- Compute context: topics/hardware.

<details>
<summary>2026-08-24: original map (superseded by this rewrite; kept for reference, not counted in the read estimate)</summary>

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

Lineage: Grok-1 (Nov 2023): built in months; 314B MoE, weights open-sourced Mar 2024 (Apache 2.0), setting the pattern of open-sourcing previous generations. Grok-1.5 / 2 (2024): caught up to GPT-4 class; Grok 2 weights released Aug 2025. Grok 3 (Feb 2025): trained on Colossus (Memphis; ~200K H100s, built in 122 days), the loudest compute-maximalist bet; added Think mode and DeepSearch. Grok 4 (Jul 2025): reasoning-first; Grok 4 Heavy ran parallel multi-agent test-time compute; topped ARC-AGI-2 and HLE at launch. Grok 4.1 (Nov 2025) and Grok 4.1 Fast (agentic, 2M context) followed; Grok Code Fast targeted coding. Feb 2026: xAI merged into SpaceX, forming SpaceXAI (~$1.25T combined valuation); Grok brand retained. Grok 4.6 (Aug 12, 2026): current flagship: ~1.5T parameters, built for long-running agents, coding, knowledge work, and visual projects; AA intelligence ~61, tying GPT-5.6 Sol and overtaking Kimi K3, priced aggressively ($2/$6 per 1M). Grok 5: in training; target dates (late 2025, Q1, Q2 2026) all slipped.

Training approach highlights: Compute scale as the core strategy: Colossus 1/2 expansion toward 1M+ GPUs; fastest lab shipping cadence via brute-force iteration. Large-scale RL for reasoning (Grok 4 reportedly matched pretraining compute with RL compute); multi-agent parallel inference for Heavy tiers. Data edge: real-time X (Twitter) firehose integration; DeepSearch agentic browsing. Looser alignment posture than rivals; recurring moderation incidents are part of the brand's risk profile. Weights closed at the frontier, previous generations sometimes opened.

</details>
