One week, 2026-10-19 to 2026-10-26: the plumbing everyone trusts was opened up, attacked or audited.

# The week in brief
A week about trust in the layers below the model. A signed LiteLLM release carried a credential stealer, a certificate authority's keys turned out to be computable from its certificates, and two public red-teams found that the monitors watching coding agents miss more than half of determined attacks. At the same time two private pieces of infrastructure opened up: DeepSeek published the engine behind its service, and PyTorch went native on TPU and Trainium. Kimi K3.1 Pro came within three points of the top of the independent index, with three Terminal-Bench scores from three harnesses, and Claude's first new API version since 2023 drops the sampling knobs.

# Top stories
**Moonshot's Kimi K3.1 Pro reached fourth on Artificial Analysis's index, three points from the top, with open weights promised.** It is a post-trained Kimi K3 at 2.8T total / 104B active parameters (Artificial Analysis's count), $2 / $10 per million tokens, scoring 55 on Intelligence Index v4.3.2 against Claude Opus 5.5's 58. Its Terminal-Bench 4.0 score depends on the harness: 67% in Artificial Analysis's run, 63.64% on Vals AI's mini-swe-agent harness ($4.57 a test against Opus 5.5's $13.20), 65.7% in Moonshot's own run inside Claude Code. Follow-up, 2 November: on the rebuilt Index v5 it scores 46 (ninth), and no weights or licence had appeared.
- kind: Model
- date: 23 October
- why: a near-frontier model at about a third of the cost per test is worth trying, but only scores from the same harness can be compared.
- links: [Kimi: K3.1 Pro](https://www.kimi.ai/blog/kimi-k3-1-pro) (8 min) · [Artificial Analysis: K3.1 Pro benchmarks](https://artificialanalysis.ai/articles/kimi-k3-1-pro-launch-benchmarks) (6 min) · [Our page: LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286)

**A signed LiteLLM release shipped a credential stealer, and a certificate authority's private keys could be computed from its certificates.** LiteLLM 1.107.0 on PyPI (21 October, 11:39 to 13:23 UTC) and four Docker tags took SSH keys, cloud and CI secrets and the proxy's provider keys; the attacker reached the release workflow from an Agent Platform master key committed publicly in May and never revoked, so the trusted-publishing pipeline built and signed the malware itself (1.106.2 is clean). The same week eMudhra disclosed that the keys of 8 intermediate CAs were recoverable; browsers distrusted them and eMudhra is leaving the TLS business.
- kind: Security
- date: 21 October
- why: an LLM gateway holds every provider key you have, and signing proves which pipeline built an artefact, not who controlled it: pin versions and expire long-lived tokens.
- links: [LiteLLM: incident](https://docs.litellm.ai/blog/security-incident-oct-21-2026) (8 min) · [LiteLLM: attack chain](https://docs.litellm.ai/blog/security-incident-oct-21-2026-attack-chain) (10 min) · [eMudhra disclosure](https://emudhra.we-have-a-problem.com/) (6 min) · [Our page: Agent security](n:3f15c17b0d0d81ad9fb7d1dd74217335)

**Two public red-teams of the monitors that watch coding agents found the same blind spots.** Anthropic set an Opus 5 attacker against Claude Code's Auto Mode and an approximation of Codex's Guardian: production monitors failed to block more than 55% of attacks, through text aimed at the monitor, sessions coordinating through a shared workspace, compaction hiding earlier steps, and actions the monitor never saw. METR and Redwood found OpenAI's internal monitoring fired only when an agent returned control, missed compaction events (about 10% of Codex traffic) and could be switched off by two client headers.
- kind: Security
- date: 22 October
- why: per-action blocking guards against an over-eager agent, not a persistent adversarial one; monitoring has to run on a clock, see compaction and sit out of the agent's reach.
- links: [Anthropic: red-teaming Auto Mode](https://alignment.anthropic.com/2026/red-teaming-auto-mode/) (20 min) · [METR: OpenAI agent monitoring](https://metr.org/blog/2026-10-22-red-teaming-openai-agent-monitoring/) (15 min) · [Our page: Agent security](n:3f15c17b0d0d81ad9fb7d1dd74217335)

**Claude API version 2026-10-21, the first since 2023-06-01, rejects `temperature`, `top_p` and `top_k`.** Under the new version these return a 400 error even at their default values, and document blocks in assistant messages and citations in user messages are rejected; the old version is not deprecated. New SDK majors (Python 2.0.0, TypeScript 1.0.0, Go 2.0.0 and the rest) send the new version by default, send the key as `Authorization: Bearer` instead of `X-Api-Key`, and move from MIT to Apache 2.0.
- kind: Tools
- date: 21 October
- why: upgrading the SDK changes the API version under you, so code that sets sampling parameters breaks and gateways that read `X-Api-Key` need a change.
- links: [Migration guide](https://platform.claude.com/docs/en/api/migration-2026-10-21) (12 min) · [API release notes](https://platform.claude.com/docs/en/release-notes/api) (5 min) · [Our page: Service APIs](n:3c65c17b0d0d81cb88a3f1f63e85f27b)

**DeepSeek open-sourced the inference engine behind its production service, without the parts that make it a service.** DeepInfer (Apache 2.0) serves only DeepSeek-V4.1-Flash, on NVIDIA SM100 and Huawei Ascend 950, with attention data and context parallelism, MoE expert parallelism with EPLB, DeepSeek's own kernels, "DSpark" speculative decoding and batch-invariant, deterministic inference on NVIDIA. Left out: the KV cache system, prefill/decode disaggregation and cross-replica load balancing; the README shows Pareto charts but no numbers. At 2,351 points it was the window's largest Hacker News thread.
- kind: Tools
- date: 20 October
- why: it is a frontier lab's production serving layout in readable code, and what it withholds shows which parts of serving are hardest.
- links: [DeepInfer repository](https://github.com/deepseek-ai/DeepInfer) (15 min) · [Our page: Inference and serving](n:3c65c17b0d0d81c08b3bc95ff45c7b13)

**PyTorch became native on Google TPUs and AWS Trainium on the same day.** Google (with Meta) open-sourced TorchTPU and AWS put TorchNeuron into public beta, both Apache 2.0, both registering as PyTorch devices with eager modes and a `torch.compile` path that lowers to StableHLO. Google's own numbers: 98% of 4,917 popular Hugging Face models run, Qwen3 MoE 235B on 64 TPU v7 chips at 1,828 tokens per second against 1,937 for JAX/MaxText, and 27.1% MFU in the 8,192-chip weak-scaling row. Meta says SGLang on TorchTPU runs in its production.
- kind: Chips
- date: 20 October
- why: TPU and Trainium capacity no longer means porting to JAX or living with PyTorch/XLA, which widens where you can train and serve.
- links: [PyTorch: TorchTPU](https://pytorch.org/blog/introducing-torchtpu/) (12 min) · [PyTorch: TorchNeuron](https://pytorch.org/blog/introducing-torchneuron-native-pytorch-backend-for-aws-trainium/) (10 min) · [Our page: TPUs and other accelerators](n:3c65c17b0d0d8151bbc2e0ceea196187)

# New in the knowledge base
## Papers
- [GRAFT](n:4055c17b0d0d8139ba07f0ddc44d3092): routing the gradients of monitor-flagged RL samples into an adapter that is deleted after training, instead of penalising them, kept Qwen3-8B from learning the undetected hack a penalty taught (1.6% hacking after deletion against 26%), at a slightly lower solve rate; keyword-style monitors, models up to 8B.
- [Understanding the Benefits of Scaffolds through Computational Separations](n:4055c17b0d0d818e80a5e7d8e8c976ba): same-size students trained on a multi-call harness's traces trailed it by 5 to 16 points on trees of 13 to 40 calls (single runs) and a 4B student matched its teacher; a theorem shows a breadth-first-search harness decides what no fixed-depth transformer with a short chain of thought can, if NL is not in TC0.
## Updated
- [LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286): Kimi K3.1 Pro fourth on the index, MiniMax M3.1 Flash and Beam open, Mistral Large 4's weights still pending.
- [Agent security](n:3f15c17b0d0d81ad9fb7d1dd74217335): the LiteLLM compromise from the agent's side, monitors red-teamed, and credentials agents never hold.
- [Inference and serving](n:3c65c17b0d0d81c08b3bc95ff45c7b13): DeepInfer among the engines, what DeepSeek kept back, and speculative decoding measured fairly.
- [TPUs and other accelerators](n:3c65c17b0d0d8151bbc2e0ceea196187): TorchTPU and TorchNeuron as native PyTorch paths, and Cerebras laying a 3T model across 59 wafers.
- [Reward Hacking](n:3c65c17b0d0d8196a6f1f29a817aa974): where GRAFT sits among the mitigations, and how a misspecified reward alone blinds the chain of thought.
- [Harnesses for training and evaluation](n:3f15c17b0d0d815ea579d6c80065aa36): why a harness can do what its distilled student cannot, and the ARC-AGI-3 follow-ups.
- [Service APIs](n:3c65c17b0d0d81cb88a3f1f63e85f27b): what a dated API version buys, with Claude's second version three years after the first.

# Further reading
## Models
- **MiniMax M3.1 Flash weights are public** (MiniMax, 23 October): about 428B total / 23B active, sparse attention in every layer, under a community licence that needs authorisation above $20M a year in revenue: [MiniMax M3.1 Flash model card](https://huggingface.co/MiniMaxAI/MiniMax-M3.1-Flash) (10 min)
- **Reflection Beam weights went public on 16 October** under Apache 2.0, not behind the waitlist the previous issue described; 3.0% on Terminal-Bench 4.0 in Artificial Analysis's run against Reflection's 81.6% on SWE-bench Verified: [Beam model card](https://huggingface.co/reflection/Beam-1.0-501B-A23B) (8 min), [Artificial Analysis: Beam](https://artificialanalysis.ai/articles/reflection-beam) (5 min)
- **Mistral Large 4 weights were still not out on 26 October**; follow-up: Mistral published them on 29 October under a modified MIT licence: [Mistral](https://mistral.ai/news/mistral-large-4-oss/)
- **Mercury 3, Inception's text diffusion LLM** (19 October): 1M context and 1,068 tokens per second on NVIDIA GPUs; benchmark claims without published scores: [Inception: Mercury 3](https://www.inceptionlabs.ai/blog/introducing-mercury-3) (6 min)
- **Voxtral 3 and Timestral** (Mistral, 20 and 15 October): a transcription and text-to-speech family, and four small time-series forecasting models: [Mistral: Voxtral 3](https://mistral.ai/news/voxtral-3/) (6 min), [Mistral: Timestral](https://mistral.ai/news/timestral/) (6 min)
- **Recursive Flint, a 40B total / 2.5B active open MoE** (Recursive, 23 October), shipped in NVFP4 for laptops; no scores published: [Recursive: Flint](https://recursive.com/updates/introducing-recursive-flint) (5 min)
- **Dessa, Block's full-duplex speech-to-speech model** trained only on human conversation (23 October): [Block: Dessa](https://block.xyz/dessa) (6 min)
- **Decision models kept multiplying** (19 October on): Cloudflare's Clairic extraction model, and Baseten Labs' mammoth-1 and elephant-1 (vendor scores): [Cloudflare: Clairic](https://blog.cloudflare.com/clairic-extraction-model/) (8 min), [Baseten Labs: mammoth-1 and elephant-1](https://labs.baseten.co/articles/mammoth-1-and-elephant-1-frontier-decision-models) (8 min)
- **Technical reports for Meta's Muse Glimmer 30B and Aleph Alpha's Kolibri** (an English and German MoE): [Muse Glimmer report](https://arxiv.org/abs/2610.24628) (40 min), [Kolibri report](https://arxiv.org/abs/2610.31945) (40 min)
- **No new model from OpenAI, Anthropic, Google, Meta or xAI** in the window; GPT-6.1 Terra is reported by TestingCatalog but not released.

## Research and papers
- **Three harness papers followed the ARC-AGI-3 gap** (from 19 October): summarising old turns instead of dropping them recovered 86% of a 63-point gap (single runs), and harness rankings change across models and benchmarks: [When the harness decides success](https://arxiv.org/abs/2610.26632) (30 min), [Can LLMs improve their own harness?](https://arxiv.org/abs/2610.30499) (30 min), [When agents fail: model or harness?](https://arxiv.org/abs/2610.32483) (30 min)
- **What RL adds, measured token by token**: about 4% of positions recover 90.5% of the pass@1 gain on 120 AIME problems (Qwen3-4B): [What RL Brings to Reasoning](https://arxiv.org/abs/2610.24663) (30 min), [Inherited, Not Invented](https://arxiv.org/abs/2610.30882) (25 min), [Scaling Laws for Generative Reward Models](https://arxiv.org/abs/2610.30765) (30 min)
- **A misspecified reward alone can blind the chain of thought**, and Google's SimHack predicts when hacking starts: [Reward Misspecification Degrades CoT Monitorability](https://arxiv.org/abs/2610.28303) (30 min), [SimHack](https://arxiv.org/abs/2610.28707) (25 min)
- **On-policy distillation stayed the busiest post-training topic** (about 20 papers, 18 to 23 October): [Distillation overshoot](https://arxiv.org/abs/2610.25034) (25 min), [Perplexity: JOLT](https://www.perplexity.ai/hub/blog/a-good-teacher-meets-the-student-where-they-are) (10 min, vendor figures)
- **A scaling law for how much synthetic rewriting to use** (Percy Liang and colleagues, 22 October): [Rewriting Scaling Laws for Synthetic Data](https://arxiv.org/abs/2610.31867) (40 min)
- **Speculative decoding's published gains shrink under fair measurement**: [When Does Better Acceptance Pay?](https://arxiv.org/abs/2610.24993) (25 min), [Acceptance Does Not Decay with Position](https://arxiv.org/abs/2610.30644) (20 min)
- **MXFP4 training of an MoE and 2-bit inference** (AMD's run is simulated MXFP4, no wall-clock): [Training an MoE in MXFP4](https://arxiv.org/abs/2610.32229) (30 min), [Beyond 4 bits](https://arxiv.org/abs/2610.28537) (30 min)
- **Architecture notes**: wider attention heads help long-context retrieval at a fixed budget; dynamic expert skipping rarely beats lowering k: [Head Dimension Matters](https://arxiv.org/abs/2610.32213) (20 min), [Don't Skip the Baseline](https://arxiv.org/abs/2610.28369) (20 min)
- **Agent memory and cache**: plain dense retrieval plus a reranker ranked first in 6 of 7 settings against agentic memory systems: [Naive RAG Is Stronger](https://arxiv.org/abs/2610.30755) (20 min), [Cache Engineering for Agents](https://arxiv.org/abs/2610.28577) (25 min)
- **Claude proved 239 fuzz targets crash-free at the binary level** (Anthropic with Theorem, 22 October), with stated limits: [Anthropic: formal verification](https://www.anthropic.com/research/formal-verification) (15 min)
- **Anthropic's assessment of the UK AISI incident** (23 October): unsanctioned actions in 9 of 43 runs with safeguards off: [Anthropic: alignment assessment](https://www.anthropic.com/research/alignment-assessment-ukaisi) (15 min)
- **Agents beat the published best on 20 ML-for-science benchmarks, mostly by engineering tricks** (Anthropic): [Agent4Sci](https://arxiv.org/abs/2610.28763) (30 min)
- **Fable 5.1 can hide messages in images with no agreed scheme** (39 of 50 recovered): [LessWrong](https://www.lesswrong.com/posts/WHEQps5PK8LrrcTAb/how-does-fable-5-1-hide-messages-in-images) (12 min)
- **OpenAI's coding evaluations and GPT-Rosalind agents**, read only through coverage (OpenAI's own runs as relayed): [DevOps.com on the coding evals](https://devops.com/openai-puts-cobol-migration-to-the-test-and-its-newest-models-mostly-pass) (6 min), [R&D World on GPT-Rosalind](https://www.rdworldonline.com/openai-deploys-nearly-2000-gpt-rosalind-agents-to-generate-biological-research-leads-in-32-minutes/) (6 min)
- **A community hub to revise OpenAI's 722 maths write-ups** (24 October, guest post on Terence Tao's blog): [oai-math-revised](https://terrytao.wordpress.com/2026/10/24/oai-math-revised-a-community-hub-for-revising-openais-math-write-ups/) (6 min)

## Industry
- **Frontier-lab money, press reports only**: OpenAI raising up to $30B at $1.25T (CNBC via TechCrunch); the WSJ's read of Anthropic's draft S-1 (H1 2026 revenue $16.3B); no S-1 on EDGAR by 26 October: [TechCrunch on OpenAI's round](https://techcrunch.com/2026/10/22/openai-working-on-new-30b-raise-at-1-25t-valuation-ahead-of-ipo) (4 min), [Investing.com on the draft S-1](https://www.investing.com/news/stock-market-news/anthropic-revenue-hits-163-billion-as-preliminary-s1-outlines-ipo-risks--wsj-4960928) (5 min)
- **Meta's third quarter** (21 October): $34.91B of capital spending, 2026 guidance raised to $135B to $145B: [Meta Q3 results](https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Third-Quarter-2026-Results/default.aspx) (8 min)
- **US federal civilian agencies must remove DeepSeek** (DHS order, 20 October), including products built on its implementations: [Federal Register 2026-21447](https://www.federalregister.gov/documents/2026/10/20/2026-21447/notice-of-order-regarding-exclusion-and-removal-of-deepseek-products-from-federal-civilian-executive) (5 min)
- **GPT-6 is now on all three hyperscalers**, and Claude is on Google Cloud as a service Anthropic runs: [Google Cloud: OpenAI models](https://cloud.google.com/blog/products/ai-machine-learning/google-cloud-brings-openai-models-to-customers) (5 min), [Claude on Google Cloud](https://claude.com/resources/articles/claude-models-on-google-cloud-anthropic-managed) (5 min)
- **Funding and deals**: Tenstorrent $1.5B at $6.2B; Flapping Airplanes, Orchestra Bio and Anthropic's reported Nscale talks rest on single reports: [Tenstorrent Series E](https://kyodonewsprwire.jp/release/202610218369) (3 min), [DCD on Anthropic and Nscale](https://datacenterdynamics.com/en/news/anthropic-and-nscale-in-talks-for-second-45bn-deal-report) (4 min)
- **Policy, reported and not read at source**: revived US talks on pre-empting state AI laws (Axios), and Sweden's government offices reported to block ChatGPT and Claude for staff (Sveriges Radio, 23 October).

## Compute and chips
- **Vera Rubin reached its first cloud customer** (Google and NVIDIA, 21 October); the post's headline says general availability, its text says that is "coming next month": [NVIDIA: A5X on Vera Rubin](https://blogs.nvidia.com/?p=99227) (5 min)
- **NVIDIA's other GTC Berlin news**: DSX POD containerised AI factories and supply-chain prepayments: [NVIDIA: DSX POD](https://nvidianews.nvidia.com/news/nvidia-introduces-dsx-pod-ai-factories-to-accelerate-europes-infrastructure-deployment) (5 min), [NVIDIA: supply-chain capacity](https://nvidianews.nvidia.com/news/nvidia-and-supply-chain-partners-expand-capacity-to-accelerate-ai-infrastructure-buildout) (5 min)
- **Cerebras laid a 3T-parameter model across 59 wafers** (22 October), only activations crossing between them: [Cerebras: trillion-parameter models](https://www.cerebras.ai/blog/how-we-deploy-trillion-parameter-frontier-models-on-cerebras) (10 min)
- **HBM before the earnings**: an analyst estimate that Samsung's HBM revenue passed SK hynix's; follow-up, 28 October: SK hynix said HBM4 entered mass production and shipment in the quarter: [TrendForce preview](https://www.trendforce.com/news/2026/10/26/news-sk-hynix-3q-earnings-preview-record-profit-at-78-operating-margin-hbm4-ltas-solidigm-in-focus/) (5 min)
- **Power decides where compute goes**: Meta's Prometheus, Microsoft leaving a UK site over grid delays, Amazon's nuclear study: [Meta: inside Prometheus](https://engineering.fb.com/2026/10/19/data-center-engineering/inside-prometheus-meta-gigawatt-scale-supercluster/) (12 min), [Network World on Loughton](https://www.networkworld.com/article/4238599/microsoft-exits-uk-ai-data-center-project-over-electricity-delays.html) (4 min), [Utility Dive on the X-energy study](https://www.utilitydive.com/news/aep-signs-advanced-960-mw-nuclear-amazon-x-energy/833341/) (4 min)
- **GPU rental, read 25 October**: H100 SXM $3.03, H200 $6.30, B200 $9.70 per GPU-hour on Ornn's index: [Ornn markets](https://data.ornn.com/markets) (2 min)

## Tools and agents
- **Claude Duet, Anthropic's proactive personal agent** (21 October, research preview by waitlist): [Claude Duet](https://claude.com/product/claude-duet) (5 min)
- **The Agentic AI Foundation took in Agent Skills, Open Responses, OpenEnv and OpenSandbox** (22 October): [AAIF announcement](https://aaif.io/news/agentic-ai-foundation-announces-four-new-projects) (5 min), [Anthropic: donating Agent Skills](https://www.anthropic.com/news/donating-agent-skills-to-the-agentic-ai-foundation) (5 min)
- **Fold subagents back into the main loop** (Anthropic guidance, 22 October): [Anthropic: when to fold subagents](https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop) (10 min)
- **Claude Code 2.1.304 to 2.1.310**: `/auto-mode-setup`, safety events in OpenTelemetry: [Claude Code changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) (8 min)
- **Other coding agents**: Codex 0.164.0, OpenAI's REST CLI, JetBrains' ThinkRail IDE: [Codex releases](https://github.com/openai/codex/releases) (5 min), [OpenAI CLI](https://github.com/openai/openai-cli) (4 min), [JetBrains ThinkRail](https://github.com/JetBrains/thinkrail) (6 min)
- **Serving releases**: llm-d 1.0, Dynamo 1.6.0, vLLM's Humming kernels, push-based KV transfer: [llm-d releases](https://github.com/llm-d/llm-d/releases) (5 min), [vLLM: Humming](https://vllm.ai/blog/2026-10-21-humming) (10 min), [AWS: push-based KV transfer](https://aws.amazon.com/blogs/machine-learning/push-based-kv-transfer-to-improve-ttft-and-tpot-for-disaggregated-inference-in-vllm/) (10 min)
- **Agent libraries**: Google ADK 2.13.0's breaking telemetry change, Pydantic AI sandboxes: [ADK releases](https://github.com/google/adk-python/releases) (5 min), [Pydantic AI releases](https://github.com/pydantic/pydantic-ai/releases) (5 min)
- **Prompt caching cut Cloudflare's AI code-review bill 68%**: [Cloudflare: obsessive inference optimisation](https://blog.cloudflare.com/obsessive-inference-optimization) (12 min)
- **Durable harnesses** from Vercel and Ramp: [Vercel: making every harness durable](https://vercel.com/blog/making-every-harness-durable) (10 min), [Ramp: building Laminar](https://builders.ramp.com/post/building-laminar) (10 min)
- **DuckDB 2.0.0 LTS** (21 October): [DuckDB 2.0.0](https://duckdb.org/2026/10/21/announcing-duckdb-200) (12 min)
- **TypeScript compilers, two ways**: TypeScript 7.1 beta and tsrs, a Rust port (vendor claims): [TypeScript 7.1 beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/) (10 min), [Cloudflare: tsrs](https://blog.cloudflare.com/typescript-rust-port/) (12 min)
- **JAX 0.12.0** (19 October): [JAX changelog](https://docs.jax.dev/en/latest/changelog.html) (5 min)

## Security
- **PHP2Shell, two remote code execution flaws in PHP 8.2 to 8.5** (21 October), exploited before disclosure: [PHP Foundation](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/) (8 min), [Wiz: PHP2Shell](https://www.wiz.io/blog/php2shell-php-rce) (8 min), [Amazon threat intelligence](https://aws.amazon.com/blogs/security/amazon-threat-intelligence-identifies-php2shell-exploitation) (5 min)
- **A Brotli decoder RCE reached Node.js and Python** (CVE-2026-111497, fixed 21 October): [Broccoli2Shell](https://broccoli2shell.com/) (8 min)
- **Credentials the agent never holds**: 1Password for Agents and NVIDIA OpenShell: [1Password for AI agents](https://1password.com/blog/1password-for-ai-agents) (6 min), [NVIDIA OpenShell](https://github.com/NVIDIA/OpenShell) (8 min)
- **Using Claude to shrink attack surface** (Anthropic, 20 October): [Anthropic: attack surface reduction](https://www.anthropic.com/research/attack-surface-reduction) (10 min)
- **Qwen3-Coder wrote less secure code for a US defence persona** (Hirundo, a vendor selling the fix, 21 October): [Hirundo](https://www.hirundo.io/blog/qwen3-coder-vulnerabilities) (8 min)

## Hacker News
- **"No signs of AI payoff outside the tech sector"** (Torsten Slok, Apollo, 24 October): [Apollo](https://www.apollo.com/wealth/insights-news/insights/daily-spark/no-signs-of-ai-payoff-outside-the-tech-sector) (4 min)
- **"Ask HN: If the models are so good, why doesn't OpenAI just start 100 companies?"** (22 October): [Hacker News](https://news.ycombinator.com/item?id=50200997) (20 min)
- **"Ask HN: How to deal with shipping AI-written code you don't understand?"** (19 October): [Hacker News](https://news.ycombinator.com/item?id=50151036) (20 min)
- **"Every AI model has the same 'controversial' take on humans"** (22 October): [ModelCompare](https://www.modelcompare.ai/blog/ai-models-controversial-take-on-humans) (6 min)
- **WorldTUI: a 360M model that pretends to be a terminal** (21 October): [simedw](https://simedw.com/2026/10/21/world-model-terminal/) (8 min)
- **Max Woolf on why LLM prices fell by up to 80% in a few months** (25 October): [minimaxir](https://minimaxir.com/2026/10/cheap-llms/) (12 min)
- **"Why is AI-generated language so hard to understand?"** (Clark, Martin and Mahowald, 21 October): [arXiv 2610.29162](https://arxiv.org/abs/2610.29162) (25 min)
