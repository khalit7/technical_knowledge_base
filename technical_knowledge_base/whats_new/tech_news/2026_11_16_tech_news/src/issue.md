Two weeks, 2026-11-02 to 2026-11-16: a new top model and a top lab's IPO terms, NVIDIA's founder out as its chief executive, AI keys leaking through agent traces and CI, and machine-checked mathematics meeting its first outside reviewers.

# The week in brief
Two weeks this time. Claude Fable 5.2 took first place on every independent board checked, at a lower price but the highest cost per index task. Anthropic's amended S-1 showed short-term compute turning an operating profit into a loss, and set its IPO range; NVIDIA's chief executive resigned days before its results. AI provider keys leaked through agent traces, CI runners and a saved permission rule. A physics committee validated OpenAI's machine-checked Yang-Mills construction and said exactly what it does not prove, and a model's weight edit drew a sharp rebuttal. Tool calls got measured: MCP can cost about forty times the input tokens of a CLI.

# Top stories
**Anthropic's Claude Fable 5.2 took first place on every independent board checked, at a 20% lower price and the highest cost per index task.** Released on 9 November with Claude Mythos 5.2 (the same model with different safeguards, for vetted organisations only), Fable 5.2 costs $8 / $40 per million tokens (Fable 5.1: $10 / $50). It scores 65 on Artificial Analysis Intelligence Index v5.0.1 at max effort, five points ahead of Gemini 4 Carbon, at $26.54 per index task, the most on that board; 71.31% on the Vals Index; and 81.2% on ARC-AGI-3 with the standard harness (ARC Prize verified).
- kind: Model
- date: 9 November
- why: the top model got cheaper per token yet is the most expensive per index task, so measure cost on your own workload.
- links: [Anthropic: Claude Fable 5.2 and Mythos 5.2](https://www.anthropic.com/claude-fable-and-mythos-5-2) (15 min) · [Artificial Analysis: Claude Fable 5.2](https://artificialanalysis.ai/models/claude-fable-5-2) (5 min) · [ARC Prize leaderboard](https://arcprize.org/leaderboard) (3 min) · [Our page: Anthropic](n:3c65c17b0d0d814cb979d0eabca59a45)

**Anthropic's amended IPO filing says demand outran its long-term compute contracts, and the short-term compute bought instead turned an operating profit into a loss.** The S-1/A of 2 November reports Q3 revenue of $16.96B (Q2: $11.6B) and an operating loss of $567M after Q2 operating income of $974M, blamed on about $5.0B of short-term compute that "currently costs significantly more" than capacity contracted 12 to 18 months ahead. Committed spend is about $895.4B, substantially all compute and infrastructure. On 10 November Anthropic set a range of $70 to $78 a share, beside a $26B private placement with seven chip and cloud partners.
- kind: Industry
- date: 2 and 10 November
- why: capacity bought at short notice is what squeezes a lab's margin, which is the pressure behind rate limits and prices.
- links: [Anthropic S-1/A (SEC)](https://www.sec.gov/Archives/edgar/data/2130357/000162828026068676/anthropicpbc-sx1ax1.htm) (60 min) · [CNBC: price range](https://www.cnbc.com/2026/11/10/anthropic-sets-price-range-of-70-to-78-in-upcoming-ipo.html) (5 min) · [Our page: Anthropic](n:3c65c17b0d0d814cb979d0eabca59a45)

**NVIDIA's chief executive, Jensen Huang, resigned five days before its quarterly results.** NVIDIA's 8-K of 12 November says Huang resigned as President, CEO and director effective immediately, with CFO Colette Kress as interim CEO and Harvey Jones as the board's first Chair; it gives no reason, and the reasons CNBC and Al Jazeera report are press reports. The shares fell more than 13% at the open and closed down 4.3%. It came as voters in more than 30 localities backed data-centre moratoriums (Semafor) and CoreWeave's 2032 bond yielded above 16% (CNBC).
- kind: Industry
- date: 12 November
- why: the company that sets the price and pace of AI compute changed leaders while the build-out meets voters and bond markets.
- links: [NVIDIA 8-K: CEO transition](https://www.sec.gov/Archives/edgar/data/0001045810/000104581026000082/nvidiaannouncesceotransiti.htm) (3 min) · [CNBC: live updates](https://www.cnbc.com/2026/11/12/nvidia-jensen-huang-ceo-live-updates.html) (10 min) · [Our page: Power, cooling and reliability](n:3f05c17b0d0d8143851cfc3ae14c3c22)

**AI provider keys leaked three ways in one fortnight: through agent traces shared with a vendor, through CI runner memory, and through a saved permission rule.** Cursor traced the tampered Claude Code extension of 29 October to an access key it had issued to Fireworks: the attacker copied coding-agent traces holding unredacted credentials and used one to publish the extension, which at most 5,000 users could have received. The wfx worm planted credential stealers in 8,093 repositories (SafeDep), scanning CI runner memory for keys. And Claude Code's "Yes, and don't ask again" saves the literal command, secrets included, into `.claude/settings.local.json`; Apiiro counted 1,122 public GitHub files with real secrets.
- kind: Security
- date: 10 to 13 November
- why: agent traces, CI memory and agent settings files are now places where keys live, so redact traces and never type a secret into an agent's command.
- links: [Cursor: security incident update](https://cursor.com/blog/security-incident-update) (8 min) · [SafeDep: wfx](https://safedep.io/blog/github-actions-wfx-credential-stealer) (10 min) · [Apiiro: coding agents leaking secrets](https://apiiro.com/blog/coding-agents-leaking-secrets-github-dont-ask-again) (6 min) · [Our page: Agent security](n:3f15c17b0d0d81ad9fb7d1dd74217335)

**A physics committee validated OpenAI's machine-checked Yang-Mills construction and said exactly what it does not prove.** The committee, chaired by David Gross, found that the Lean code "proves that a relativistic quantum field theory satisfying the Wightman axioms can be constructed as a scaling limit of four-dimensional Wilson lattice gauge theory"; it "does not prove that the infinite-volume limit is unique or that there is a mass gap", so it is not the Millennium Prize problem. A clean rebuild and an axiom audit passed, and the committee adds: "We do not claim to fully understand the proof yet." No finding on either ETH refutation had been published by 16 November.
- kind: Research
- date: 10 November
- why: a machine check certifies a statement, and only experts can say which statement it is, which is the review step every model-made proof now needs.
- links: [Yang-Mills committee assessment](https://github.com/yang-mills-group/YM/blob/main/docs/assessment-1.pdf) (20 min) · [Our page: Math](n:3c65c17b0d0d81cdb851c0835b25a538)

**GPT-6 Astra edited a small model's weights to fix its looping, and a rebuttal said what else the edit used.** Astra traced Qwen3.5-0.8B's looping in thinking mode to one direction written by two layers and subtracted it from 0.016% of the weights, raising MATH-500 from 7.9% to 48.1%. Matthew Honnibal replied that the result used 50 batches of forward passes on practice problems, not the weights alone, and that the same approach failed on Gemma 3 270M.
- kind: Research
- date: 2 November
- why: a model doing interpretability-guided weight surgery is a real capability, but read such claims for the data and the failed cases, not the headline.
- links: [Weight-space programming](https://rikiyat.github.io/blog/weight-space-programming/) (12 min) · [Honnibal: the rebuttal](https://honnibal.dev/blog/astra-read-write-misleading) (8 min) · [Our page: OpenAI](n:3c65c17b0d0d814abf90d5b9e567d72f)

**MCP tools cost an agent about forty times the input tokens of a CLI, and Claude Code's Code Mode cuts what the model has to read.** OpenRouter measured one GitHub task on Sonnet 5.5: 1,421 input tokens through the CLI, 3,315 through a skill, 23,228 through MCP with 2 tools and 59,417 with the server's 46 default tools; deferred tool loading cut the up-front cost but not the results. Claude Code 2.1.323's experimental Code Mode has Claude write JavaScript that calls its tools, returning only what it needs to read, with each inner call still under permission rules and hooks.
- kind: Tools
- date: 11 and 12 November
- why: tool definitions and tool results, not the prompt, are where an agent's context goes, and how you expose a tool decides the bill.
- links: [OpenRouter: MCP vs CLI vs skills](https://openrouter.ai/blog/insights/mcp-vs-cli-vs-skills/) (10 min) · [Claude Code: Code Mode](https://code.claude.com/docs/en/code-mode) (8 min) · [Our page: MCP](n:3c65c17b0d0d813f9695dc4175c44cbb)

# New in the knowledge base
## Papers
- [Are Dense Rewards Worth Their Tokens in GRPO?](n:41a5c17b0d0d81eb8e0cc16195491027): on six models of 0.6B to 4B trained with GRPO on MATH, a Monte-Carlo process reward that led per update (exploratory) trailed outcome-only GRPO by 14.3 points at equal generated tokens and 7.8 at equal GPU-hours; choosing prompts with predicted success near 1/2 gained 1.7 and 0.8 points on two of six models, a lead GRPO with twice the learning rate matched on Qwen3-0.6B.
## Updated
- [LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286) and the lab pages ([Anthropic](n:3c65c17b0d0d814cb979d0eabca59a45), [Google DeepMind](n:3c65c17b0d0d8173a0aafcb27cf7a5f3), [Meta](n:3c65c17b0d0d81949ad8e17bcb3567f1), [Moonshot AI](n:3c65c17b0d0d81f5abf5dbdbac821a12), [Alibaba: Qwen](n:3c65c17b0d0d81fd8c36ce06672bb235), [Other notable providers](n:3c65c17b0d0d8154ba44e521a4ed8749)): Claude Fable 5.2, Gemini 4 Carbon and Hydrogen, and Kimi K3.1 Pro's open weights.
- [Benchmarks](n:3c65c17b0d0d811fb43fece56e40041a), [Agentic benchmarks](n:3c65c17b0d0d811fb926d7b91ef8234e) and [Knowledge and reasoning benchmarks](n:3c65c17b0d0d810f8574da3ffb860be5): the new readings, Terminal-Bench 4.1 and the Endpoint Accuracy Index.
- [RL for LLMs](n:3c65c17b0d0d818c9bcff7177325fe56): GRPO's group baseline, including what it does to rewards that depend on the group, and dense rewards at matched tokens.
- [Agent security](n:3f15c17b0d0d81ad9fb7d1dd74217335): agent traces and permission rules as places where keys leak, and the ways an approval monitor is bypassed.
- [Claude Code](n:3c65c17b0d0d81db9c7fc54987c1ab65): Code Mode's code-as-tool-calls.
- [MCP](n:3c65c17b0d0d813f9695dc4175c44cbb): what tool definitions and results cost a model's context.
- [Context engineering](n:3f15c17b0d0d811292cee46514370431): server-side message threads and memory consolidation.
- [Quantization and Precision](n:3c65c17b0d0d817b8f41ff66fba4cd0e): FP4 training recipes and what a loss curve can hide about them.
- [TPUs and other accelerators](n:3c65c17b0d0d8151bbc2e0ceea196187), [GPU architecture](n:3c65c17b0d0d810682aae39bd614ec64), [Interconnects and scaling](n:3c65c17b0d0d81808563fd41fb163af0) and [Power, cooling and reliability](n:3f05c17b0d0d8143851cfc3ae14c3c22): TPU 8i Max and 8tx, MI450, Marvell and Lumentum, and power.
- [Reward Hacking](n:3c65c17b0d0d8196a6f1f29a817aa974), [Speculative decoding](n:3f35c17b0d0d81e086fde85940ebac1c) and [vLLM](n:3c65c17b0d0d8113b976d8bcaf2c0722): evaded monitors, and the fortnight's engine releases.

# Further reading
## Models
- **Gemini 4 Carbon opens to developers** (Google, 10 November): in the Gemini API at an introductory $2 / $10 until 30 November, then $4 / $20; Artificial Analysis reads it at 60 (second): [Google: Gemini 4 Carbon now available](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-carbon-now-available/) (5 min)
- **Gemini 4 Hydrogen, the successor to Gemini 3.8 Flash** (12 November): $1.50 / $7.50, 51 at high effort and 54 at xhigh on Artificial Analysis: [Google: Gemini 4 Hydrogen](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-hydrogen/) (6 min), [VentureBeat](https://venturebeat.com/technology/google-launches-gemini-4-hydrogen-a-faster-smarter-pricier-flash-successor) (5 min)
- **Kimi K3.1 Pro weights published** (Moonshot AI, by 4 November): 2.8T / 104B active, MXFP4, an MIT-style licence with two commercial conditions; at 46 the highest open-weight model on Artificial Analysis: [Hugging Face: Kimi-K3.1-Pro](https://huggingface.co/moonshotai/Kimi-K3.1-Pro) (8 min), [Licence](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/blob/main/LICENSE) (4 min)
- **Qwen4-Max, Alibaba's closed flagship** (preview 11 November, API 16 November): $1.50 / $4.50; the parameter counts in circulation rest on secondary reports: [Qwen Developers on X](https://x.com/QwenDevs/status/2122156218928242799) (2 min), [Crypto Briefing](https://cryptobriefing.com/alibaba-unveils-qwen4-max-ai-model/) (4 min)
- **Meta Muse Ember, Meta's smallest Muse model** (9 November): level with Claude Haiku 5.5 on Artificial Analysis at about a third of its cost per index task: [Meta: Muse Ember](https://research.meta.ai/blog/muse-ember) (6 min), [Artificial Analysis: Muse Ember](https://artificialanalysis.ai/articles/meta-s-muse-ember-is-the-cheapest-model-scoring-36-on-the-intelligence-index) (5 min)
- **Inkling 2 Small, Thinking Machines' 594B / 17B-active open MoE** (5 November; Apache 2.0 weights 12 November): [Thinking Machines: Inkling 2 Small](https://thinkingmachines.ai/news/inkling-2-small/) (10 min), [Hugging Face: Inkling-2-Small](https://huggingface.co/thinkingmachines/Inkling-2-Small) (6 min)
- **GPT-6 Cyber, OpenAI's model for approved defenders** (5 November; figures from secondary coverage): [OpenAI: GPT-6 Cyber](https://openai.com/index/introducing-gpt-6-cyber/) (6 min)
- **Three Chinese MoE designs**: Tencent's Hy4, Baidu's open ERNIE 5.5 Flash Base, Meituan's LongCat-2.5 (4 to 5 November): [Hugging Face: ERNIE-5.5-Flash-Base](https://huggingface.co/baidu/ERNIE-5.5-Flash-Base) (8 min), [Hugging Face: Hy4-preview](https://huggingface.co/tencent/Hy4-preview) (6 min), [LongCat-2.5](https://longcat.ai/blog/longcat-2.5/) (6 min)
- **Images and video**: OpenAI's Images 2.6, Gemini Omni 1.2 Flash, MiniMax's open H3-Image (4 to 10 November): [Gemini Omni 1.2 Flash model card](https://deepmind.google/models/model-cards/gemini-omni-1-2-flash/) (4 min), [Hugging Face: MiniMax-H3-Image](https://huggingface.co/MiniMaxAI/MiniMax-H3-Image) (4 min)
- **Terminal-Bench 4.1**: the same tasks with verifiers hardened against reward hacking (9 November): [Terminal-Bench 4.1](https://www.tbench.ai/news/terminal-bench-4-1) (6 min)
- **Endpoint Accuracy Index v1.1** (Artificial Analysis, 9 November): 24 of 103 serverless endpoints scored below a self-hosted reference of the same open model, mostly from output caps and tool-call handling: [Artificial Analysis: Endpoint Accuracy Index v1.1](https://artificialanalysis.ai/articles/endpoint-accuracy-index-v1-1) (8 min)

## Research and papers
- **When rewards depend on the group, GRPO plays a tournament** (Edinburgh and Toronto, 2 November), and Team-GRPO fixes it: [arXiv 2611.02404](https://arxiv.org/abs/2611.02404) (40 min)
- **On-policy distillation against GRPO at matched FLOPs** (Salesforce, 5 November): [arXiv 2611.08453](https://arxiv.org/abs/2611.08453) (30 min)
- **Monitors against reward hacking get evaded** (MATS and Google DeepMind, 6 November; one 4B model): [arXiv 2611.09828](https://arxiv.org/abs/2611.09828) (35 min)
- **Deletion tuning**: a mask over under 0.05% of the weights matched full fine-tuning (7 November): [arXiv 2611.10866](https://arxiv.org/abs/2611.10866) (30 min)
- **End-to-end 4-bit training of Inkling 2 Small** (Thinking Machines, 13 November; vendor figures without seeds): [Thinking Machines: end-to-end 4-bit training](https://thinkingmachines.ai/blog/end-to-end-4-bit-training/) (15 min)
- **What the loss curve misses**: NVFP4 pretraining needed more exposures to recall rare facts (9 November): [arXiv 2611.12832](https://arxiv.org/abs/2611.12832) (25 min)
- **The noise floor of a quantization comparison** (11 November): [arXiv 2611.15671](https://arxiv.org/abs/2611.15671) (25 min)
- **Muir linear attention** (5 November): [arXiv 2611.08376](https://arxiv.org/abs/2611.08376) (30 min)
- **A shared indexer for DeepSeek Sparse Attention** (Writer, 2 November): [arXiv 2611.03768](https://arxiv.org/abs/2611.03768) (20 min)
- **"You don't need long context"** (NVIDIA, 3 November; "little accuracy loss" is the authors' summary): [arXiv 2611.05306](https://arxiv.org/abs/2611.05306) (30 min)
- **FlashProve, a zero-knowledge proof of an LLM's output** (Anthropic, 2 November, research prototype): [Anthropic: provable inference](https://www.anthropic.com/research/provable-inference) (15 min)
- **Silent grader errors reordered agent leaderboards** (3 November): [arXiv 2611.04399](https://arxiv.org/abs/2611.04399) (25 min)
- **ExpertCrowd-SWE, Toptal's expert-written coding benchmark** (9 November): [arXiv 2611.13246](https://arxiv.org/abs/2611.13246) (25 min)
- **Hyperclique conjectures refuted with the main step credited to ChatGPT** (MIT and UIUC, human-checked): [arXiv 2611.05082](https://arxiv.org/abs/2611.05082) (40 min), [arXiv 2611.06813](https://arxiv.org/abs/2611.06813) (40 min)
- **AlphaProof Code**: Google DeepMind's agents wrote over six million lines of Lean on Signal's protocol code (Google's report): [DeepMind: AlphaProof Code](https://deepmind.google/blog/introducing-alphaproof-code/) (8 min)

## Industry
- **The build-out met voters and bond markets** (3 to 6 November): data-centre moratoriums in more than 30 localities, CoreWeave's bond above 16%; Yahoo Finance's figure of $3.7T lost by chip and memory stocks: [Semafor: ballot measures](https://www.semafor.com/article/11/04/2026/us-voters-roundly-reject-data-centers-in-ballot-measures) (5 min), [CNBC: CoreWeave bond yield](https://www.cnbc.com/2026/11/06/coreweave-bond-yield-tops-16percent-as-ai-credit-stress-rises.html) (5 min)
- **OpenAI's round** (press reports, 6 and 12 November; OpenAI confirmed neither figure): [SiliconANGLE](https://siliconangle.com/2026/11/06/openai-reportedly-raises-11b-in-new-funding-at-1-25t-valuation/) (4 min)
- **OpenAI is buying Pierre**, the Git layer inside the Codex app; Meta acquired Conductor (4 November): [InfoWorld](https://www.infoworld.com/article/4245719/openai-buys-tiny-software-developer-to-improve-codex.html) (4 min), [Conductor](https://www.conductor.build/changelog/0.93.0-conductor-is-joining-meta) (2 min)
- **Cerebras' quarter** (12 November): core revenue up 70%: [CNBC](https://www.cnbc.com/2026/11/12/cerebras-systems-cbrs-q3-earnings-report-2026.html) (5 min)
- **China's draft AI export controls closed for comment** (15 November): [Cloud Security Alliance analysis](https://labs.cloudsecurityalliance.org/research/csa-research-note-china-ai-export-controls-announcement-48-2/) (10 min)
- **Goldman Sachs restricted Claude Code** (reported 8 November): [The State of AI](https://www.thestateofai.com/news/goldman-sachs-claude-code-traders-bankers) (3 min)

## Compute and chips
- **TPU 8i Max and TPU 8tx** (Google, 9 November), with no absolute specifications: [Google: TPU 8i Max and 8tx](https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/tpu-8i-max-and-8tx/) (5 min)
- **AMD's first MI450 quarter** (3 November): Data Center revenue $8.5B, up 97%: [AMD Q3 release (SEC)](https://www.sec.gov/Archives/edgar/data/0000002488/000000248826000188/q32026991.htm) (8 min)
- **Marvell to buy Lumentum for $115B in stock**, a bet on optics in AI racks (2 November): [Light Reading](https://lightreading.com/ai-machine-learning/marvell-strikes-115b-deal-for-lumentum) (5 min)
- **Checkpoint forensics**: published weights reveal the SM count of the GPU that initialised them (12 November), not where they were trained: [Unemployment Labs: checkpoint forensics](https://unemploymentlabs.com/checkpoint-forensics) (15 min)
- **Power** (6 to 16 November): the FT's report of Anthropic buying about 1.7 GW of gas generators, and 800V DC trials: [CNBC: Anthropic generators](https://www.cnbc.com/2026/11/08/anthropic-generator-deal-ai-data-centers.html) (4 min), [Korea Times](https://www.koreatimes.co.kr/business/companies/20261116/sk-telecom-hyosung-team-up-to-build-ai-data-center-power-infrastructure) (3 min)

## Tools and agents
- **Claude Code 2.1.317 to 2.1.325**: background MCP tasks and sandboxed Bash in the normal permission flow: [Changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) (5 min)
- **Claude API message threads** (public beta, 2 November): the server holds the conversation for 5 minutes, about 35% lower median time to first token on very long requests: [Claude: message threads](https://claude.com/resources/articles/message-threads) (6 min)
- **How Anthropic builds agent memory** (6 November): [Anthropic: the components of agent memory](https://www.anthropic.com/research/components-of-agent-memory) (15 min)
- **A 1,000-agent team with a Postgres database as its coordination bus** (Anthropic, 9 November): [Claude: safely scaling multi-agent teams](https://claude.dev/blog/safely-scaling-multi-agent-teams-with-fable-5-2/) (12 min)
- **Orchestrator and /swarm in Antigravity, Google's coding agent** (11 to 12 November): [Antigravity: Gemini 4 Hydrogen](https://antigravity.google/blog/gemini-4-hydrogen-in-google-antigravity/) (6 min)
- **Decision models from four vendors**, one probability per option instead of text (9 to 13 November): [Strands: Decider](https://strandsagents.com/blog/amazon-saves-millions-replacing-sonnet-with-strands-decider) (8 min), [Google: Gemini Decisions API](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-decisions-api/) (5 min)
- **A2UI 1.0 and OpenAI's MCP extensions** (11 to 12 November); no new MCP specification: [Google: A2UI 1.0](https://developers.googleblog.com/a2ui-10-build-delightful-fast-reliable-agentic-experiences/) (6 min), [GitHub: openai/mcp-extensions](https://github.com/openai/mcp-extensions) (4 min)
- **vLLM 0.33 and SGLang 0.5.23** (2 November): [vLLM releases](https://github.com/vllm-project/vllm/releases) (8 min), [SGLang releases](https://github.com/sgl-project/sglang/releases) (8 min)
- **ggml 1.0 and the local stack** (3 to 13 November): [ggml v1.0.0](https://github.com/ggml-org/ggml/releases/tag/v1.0.0) (5 min), [Ollama releases](https://github.com/ollama/ollama/releases) (4 min)
- **Helion picks kernel configurations without autotuning** (PyTorch, 12 November): [PyTorch: compile-time heuristics for Helion](https://pytorch.org/blog/fast-by-default-compile-time-heuristics-for-helion-kernels/) (10 min)
- **Git backends rebuilt for agents** at OpenAI and GitHub (2 and 5 November): [OpenAI: scaling Git](https://openai.com/index/scaling-git-at-openai/) (10 min), [GitHub: new Git storage architecture](https://github.blog/engineering/architecture-optimization/inside-githubs-new-git-storage-architecture/) (12 min)
- **Other harness releases**: Codex, Gemini CLI, OpenCode 2.3, Google ADK 2.14 (4 to 13 November): [Codex releases](https://github.com/openai/codex/releases) (5 min), [OpenCode releases](https://github.com/anomalyco/opencode/releases) (4 min), [ADK releases](https://github.com/google/adk-python/releases) (5 min)

## Security
- **Eleven ways past Codex's Auto-review monitor** (LessWrong, 30 October): [LessWrong: red-teaming Auto-review](https://www.lesswrong.com/posts/dbStc8ZFESqfihwAd/lessons-from-red-teaming-auto-review-openai-s-blocking-1) (20 min)
- **Claude Code sent the account email in a User-Agent header** during web searches (issue opened 5 November), fixed from 2.1.317: [GitHub issue #107757](https://github.com/anthropics/claude-code/issues/107757) (5 min)
- **A fake `@claudecode/cli` package on npm** (13 November), rated critical malware: [GitHub advisory GHSA-vp2q-gp5r-xh5j](https://github.com/advisories/GHSA-vp2q-gp5r-xh5j) (2 min)
- **442 CVEs attributed to Anthropic's vulnerability search, 2 exploited** (VulnCheck, 9 November): [VulnCheck](https://www.vulncheck.com/blog/anthropic-glasswing-november-update) (8 min)
- **sshole, an OpenSSH password-authentication bypass on musl systems without PAM** (5 November): [Alpine advisory](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/) (4 min)
- **Apps built on Lovable exposed private data** (14 November): [Crissyfield research](https://www.crissyfield.de/research/lovable-en/) (10 min)

## Hacker News
- **"AI is forcing us to pay off 40 years of technical debt"** (IEEE Spectrum, 4 November): [IEEE Spectrum: PHP2Shell](https://spectrum.ieee.org/ai-in-cybersecurity-php2shell-vulnerability) (8 min)
- **"All AI-generated code should be Open Source"** (15 November): [Jakub Jankiewicz](https://jakub.jankiewicz.org/blog/ai-code-open-source/) (8 min)
- **"Goodbye Claude, hello Pi"**, a move to a minimal harness (8 November): [Caleb: Claude to Pi](https://caleb.software/posts/claude-to-pi.html) (8 min)
- **"Is Opus 5.5 nerfed?"** (9 November): counter-analyses point to the thinking summariser; no Anthropic statement by 16 November: [Pin your harness, then measure](https://www.dsebastien.net/2026-11-10-opus-5-5-nerf-claims-pin-your-harness-then-measure/) (8 min)
- **"AI usage generates a fragile codebase"** and Jonathan Blow's "If AI solved coding, why is my software still the same?" (10 and 13 November): [Evan X. Merz](https://evanxmerz.com/post/ai-usage-generates-a-fragile-codebase/) (6 min)
