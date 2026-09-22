# xAI / SpaceXAI: Grok

⏱ 6 min read · +58 min resources

This page explains the family; per-model pages to follow.

### What xAI is

xAI, merged into SpaceX in Feb 2026 to form SpaceXAI, is the frontier lab whose strategy is the least algorithmic and the most industrial. Where DeepSeek optimises cost per token and Ai2 optimises reproducibility, xAI optimises the rate at which it converts capital into training compute and then into shipped models. It has published very little method; what it has demonstrated is that a datacentre built in months, plus a willingness to spend RL compute at pretraining scale, is enough to stay in the top five without an obvious architectural edge. Its two durable differentiators are the real-time X firehose as a data source and a looser alignment posture than any other frontier lab.

### Best resources

- [Grok (Wikipedia)](https://en.wikipedia.org/wiki/Grok_(chatbot)) (~25 min): maintained lineage and corporate history.
- [xAI news](https://x.ai/news) (news index, ~15 min to skim the current entries): primary source for model releases.
- [VentureBeat on Grok 4.6](https://venturebeat.com/technology/spacexai-debuts-grok-4-6-overtaking-kimi-k3s-performance-and-matching-gpt-5-6-sol-for-worlds-third-best-on-artificial-analysis) (~8 min): current flagship positioning.
- [Grok 4.6 explainer (CometAPI)](https://www.cometapi.com/grok-4-6-release-date/) (~10 min): specs roundup.

### Lineage

- **Grok-1 (Nov 2023)**: built in months, a 314B sparse mixture-of-experts model (a router runs only a couple of experts per token, so total parameters and per-token FLOPs decouple). Weights open-sourced Mar 2024 under Apache 2.0, establishing the lab's pattern of opening the previous generation once it is commercially spent: cheap goodwill, no competitive cost.
- **Grok-1.5 / 2 (2024)**: caught up to the GPT-4 class; Grok 2 weights released Aug 2025 under the same lagging-release policy.
- **Grok 3 (Feb 2025)**: trained on **Colossus**, the Memphis cluster of roughly 200K H100s stood up in 122 days. What matters is not the GPU count but the coherence: training one model across that many accelerators requires them behind a single high-bandwidth fabric with the power and cooling to run them together, so the achievement was the construction and networking timeline rather than the purchase. Grok 3 also added **Think mode** (an extended chain of thought before answering, spending inference tokens to raise accuracy on problems that need multi-step work) and **DeepSearch** (an agentic browsing loop where the model issues its own searches, reads results and iterates, rather than doing a single retrieval pass).
- **Grok 4 (Jul 2025)**: reasoning-first. **Grok 4 Heavy** added parallel test-time compute: instead of one longer chain of thought, several independent attempts run concurrently and their answers are reconciled, trading money for accuracy without adding serial latency, which works because errors in independent rollouts are only partly correlated. At launch it topped **ARC-AGI-2** (novel grid-transformation puzzles built to resist memorisation, so it probes generalisation to unseen rules rather than recall) and **HLE (Humanity's Last Exam**, several thousand expert-written questions across academic fields, designed to be unanswerable by search and to sit near the ceiling of current models). Grok 4.1 (Nov 2025) and Grok 4.1 Fast (agentic, 2M-token context) followed, with Grok Code Fast targeting high-volume coding.
- **Feb 2026**: xAI merged into SpaceX to form **SpaceXAI** (roughly $1.25T combined valuation); the Grok brand was retained.
- **Grok 4.6 (Aug 12, 2026)**: current flagship at roughly 1.5T parameters, built for long-running agents, coding, knowledge work and visual projects. Artificial Analysis intelligence index around 61 (a composite averaging a fixed basket of benchmarks into one number, useful for coarse ranking and nothing finer), tying GPT-5.6 Sol and overtaking Kimi K3, at $2 per 1M input tokens and $6 per 1M output. That price against that position is the product claim: frontier-adjacent quality at roughly a third of what the top two charge. The index placing does not transfer to private code: on Real-SWE's enterprise codebases Grok 4.6 resolves 23.8%, level with Meta's Muse Spark 1.3 and well behind Claude Fable 5.1's 38.8%.
- **Grok 5**: in training; target dates (late 2025, then Q1 and Q2 2026) have all slipped.

### Training approach highlights

- **Compute scale as the core strategy**: Colossus 1 and 2 expanding toward a million-plus GPUs, with the fastest shipping cadence of any lab, achieved by brute-force iteration rather than by publishing a better recipe.
- **RL at pretraining scale**: Grok 4 reportedly spent as much compute on reinforcement learning as on pretraining, the concrete form of the industry's 2025 realisation that post-training is a second scaling axis rather than a finishing step. In practice, very large volumes of rollouts on verifiable tasks (maths, code, tool use) scored by checking the outcome, which is why reasoning and agentic behaviour improved faster than raw knowledge.
- **Data edge**: real-time integration with the X firehose gives recency and a conversational corpus that competitors must license or scrape, and DeepSearch turns that into live retrieval at inference time.
- **Alignment posture**: deliberately looser than rivals, with recurring moderation incidents that are part of the brand's risk profile rather than accidents of it. The concrete cost is a security one. Adversa AI's **cryptographic context injection**, disclosed on 3 June 2026, remained unpatched more than eleven weeks later: a web page carries an AES-encrypted payload that static content filters cannot read, Grok decrypts it in its own Python runtime, then follows the revealed instructions and appends the user's chat history, name, coarse location and subscription tier to an attacker-controlled URL, at roughly a 40% success rate over 20 attempts. It is the clearest demonstration that input filtering cannot secure a model allowed to execute code, and the technique is treated as such on [Harness engineering: the transferable layer](../../agentic-harnesses/harness-engineering.md). Weights stay closed at the frontier; previous generations are sometimes opened once superseded.

### Current models

| Model | Role |
| --- | --- |
| Grok 4.6 | Flagship; value pick among the frontier five ($2/$6) |
| Grok 4.1 Fast | Cheap agentic workhorse, 2M context |
| Grok Code Fast | Coding at volume |
| Grok 5 | In training, no date |

### Cross-links

- [Reasoning models and test-time compute](../reasoning-models.md): Heavy-style parallel test-time compute.
- Rivals: [OpenAI: GPT family](../openai/overview.md), [Anthropic: Claude family](../anthropic/overview.md).
- Compute context: [Topic: hardware](../../hardware/summary.md).
