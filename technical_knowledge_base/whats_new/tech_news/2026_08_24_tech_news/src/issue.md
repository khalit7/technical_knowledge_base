One week, 2026-08-17 to 2026-08-24: the software around a model, not the model, moved the week's benchmark scores; Stripe agreed to buy OpenRouter and Hugging Face weighed offers above $13 billion; DiffusionGemma decoded about 1,500 tokens a second on one GPU.

# The week in brief
The first issue. Its theme was the harness: Nvidia's AVO on ARC-AGI-3 and the StateM runbook on Terminal-Bench 2.1 moved scores by changing the memory, checks and state around a model rather than the model, though both headline numbers need their footnotes. Two pieces of AI infrastructure were priced like platforms: Stripe is buying OpenRouter, the largest neutral model router, and Hugging Face weighed offers above $13 billion (Nvidia bought it two weeks later). Google's DiffusionGemma decoded about 1,500 tokens a second on one H100. No frontier model launched; DeepSeek added image input and OpenAI cut GPT-5.6 Sol's price.

# Top stories
**Two results moved agent scores by changing the harness around a model, not the model.** Nvidia's AVO harness, which adds memory management and a supervisor, scored 100% on ARC-AGI-3's 25-game public set with Claude Opus 5, against ARC Prize's 30% for Opus 5 at High effort, a different setup Nvidia itself says is not a direct comparison. The StateM paper's state-machine runbook took GPT-5.6 Sol to 95.3% raw on Terminal-Bench 2.1 (93.3 to 94.4% once flagged trials count as failures); its $15 run is DeepSeek-V4 Flash at 88.1%, against $575 for a Sol max reference at 88.8%.
- kind: Research
- date: 15 and 21 August
- why: state, checks and memory outside the model are something you can build today, and a harness can be worth more than a model upgrade, but compare scores only under the same harness.
- links: [Nvidia: AVO on ARC-AGI-3](https://developer.nvidia.com/blog/nvidia-avo-reaches-100-on-arc-agi-3-demonstrating-a-frontier-level-general-purpose-architecture-for-long-horizon-autonomous-agents/) (12 min) · [StateM, arXiv 2608.15089](https://arxiv.org/abs/2608.15089) (1h 30m) · [Our page: Agentic harnesses](n:3c65c17b0d0d81d881a8fe98b4cff7bb)

**Stripe is acquiring OpenRouter, the largest neutral LLM routing marketplace.** First reported on 17 August at a rumoured $7B or more and confirmed by OpenRouter on 19 August without terms; TechCrunch, citing the New York Times, puts the price at $7.5 billion, against OpenRouter's $1.3 billion valuation in May. OpenRouter says it serves 10+ trillion tokens a day from 400+ models and that the product, name and roadmap continue unchanged.
- kind: Industry
- date: 17 and 19 August
- why: a router that many apps use to reach many models now belongs to a payments company, and whether it stays neutral was the week's Hacker News argument.
- links: [OpenRouter: joining Stripe](https://openrouter.ai/blog/announcements/openrouter-is-joining-stripe/) (6 min) · [TechCrunch](https://techcrunch.com/2026/08/19/stripe-didnt-really-buy-openrouter-because-of-the-singularity/) (5 min) · [Our page: Inference and serving](n:3c65c17b0d0d81c08b3bc95ff45c7b13)

**Hugging Face was reported to be weighing acquisition offers of $13 billion or more.** The report, from Business Insider via TechCrunch on 24 August, rests on that one outlet: offers from unnamed bidders, evaluated with bankers, against the $4.5 billion valuation of Hugging Face's last raise in 2023. Follow-up, 3 September: Nvidia confirmed it will buy Hugging Face for $12.93 billion; Jensen Huang said it stays an open platform and Nvidia compute will not be required.
- kind: Industry
- date: 24 August
- why: the main hub for open weights and datasets now belongs to Nvidia, so watch its terms and defaults.
- links: [TechCrunch: Aug 24](https://techcrunch.com/2026/08/24/hugging-face-reportedly-in-talks-to-be-acquired-for-13b/) (4 min) · [TechCrunch: Sep 3](https://techcrunch.com/2026/09/03/nvidia-confirms-it-will-buy-hugging-face-for-12-9-billion/) (4 min) · [Our page: LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286)

**Google's open-weight DiffusionGemma writes about 1,500 tokens a second on one H100 by refining 256-token blocks in parallel.** Fine-tuned from Gemma 4 26B A4B (3.8B active) with under 10% of its training tokens, it averages about 12 denoising passes per block and about 20 tokens per forward pass: 1,479 tokens per second against 303 for Gemma 4 with multi-token prediction, at FP8 and batch size 1. Apache 2.0; submitted 31 July, it trended on 20 August.
- kind: Paper
- date: 20 August
- why: diffusion decoding is now a real option for latency-bound generation, but the speed is measured one request at a time and the quality cost is on the paper page.
- links: [arXiv 2608.00146](https://arxiv.org/abs/2608.00146) (1h 30m) · [Our page: DiffusionGemma Technical Report](n:3c65c17b0d0d818390bfd7969757211e)

**No frontier launch: DeepSeek opened image input and OpenAI cut GPT-5.6 Sol's developer price by more than 20%.** DeepSeek-v4-flash-vision-exp (21 August) takes up to 600 images per request at up to 384 tokens each, and was then DeepSeek's only model to accept images. The Sol cut (21 August, in effect until at least 21 November) came days after OpenRouter halved its Sol price; both rest on the issue's sources, as Reuters could not be re-read. Follow-ups: GPT-6 Sol launched on 22 September at $2 / $10 per million tokens; by 2 October deepseek-flash took images at up to 1,024 tokens each.
- kind: Model
- date: 21 August
- why: an image's cost in tokens is now a number you can budget, and frontier prices were falling within weeks of each other.
- links: [DeepSeek: vision guide](https://api-docs.deepseek.com/guides/vision/) (5 min) · [Reuters](https://www.reuters.com/technology/openai-cuts-developer-pricing-frontier-gpt-56-sol-model-by-more-than-20-2026-08-21/) (3 min) · [Our page: LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286)

**Cursor launched Origin, Git hosting built for agents, on the day GitHub was down for almost eight hours.** Origin (17 August) rolled out in early beta on all paid plans with repos, pull requests, code browsing and GitHub sync, with agent-native features to follow, beside a 27-minute post on scaling Git. GitHub's postmortem (20 August) blamed a component in its Central US data centre that failed to scale at a new traffic peak, for an outage of 7 hours 47 minutes; monthly commits grew from 1.4 billion to 2.9 billion since April.
- kind: Tools
- date: 17 and 20 August
- why: agents are multiplying the load on Git hosting, so where your agents push is now a reliability choice.
- links: [Cursor: Origin](https://cursor.com/changelog/origin-code-hosting) (3 min) · [Cursor: Git at any scale](https://cursor.com/blog/git-at-any-scale) (27 min) · [GitHub: the August 17 outage](https://github.blog/news-insights/company-news/the-august-17-outage-and-the-work-ahead/) (4 min) · [Our page: Agentic harnesses](n:3c65c17b0d0d81d881a8fe98b4cff7bb)

# New in the knowledge base
## Papers
- [StateM](n:3c65c17b0d0d81899098d8153e100691): a versioned state-machine runbook with checked transitions around a fixed CLI agent; strong Terminal-Bench 2.1 scores, but the runbook was developed on the same 89 tasks it is scored on, and the only held-out test moved 0.55 to 1.34 points.
- [EnvHarness](n:3c65c17b0d0d81e88ab9c396a160f813): wrapping frozen training environments and customising them to a policy's weaknesses gave skills that scored above those from the original environments on all five benchmarks, mostly within three-run noise.
- [Demystifying Agent Skills](n:3c65c17b0d0d81249a3cf5fda4de5d92): the same trajectories distilled into a SKILL.md beat them pasted in as workflow memory, but do not clearly beat no prior experience; skills add a misapplication failure.
- [Learn What's Left, Not What's Mastered](n:3c65c17b0d0d81e38b0fe72f3daf44bc): multi-reward GRPO that down-weights objectives the policy has already saturated; small gains over GDPO, each from one training run.
- [DiffusionGemma Technical Report](n:3c65c17b0d0d818390bfd7969757211e): Gemma 4 turned into a block diffusion model at about 7x the speed of the same weights decoding one token at a time, at a real quality cost on harder benchmarks, measured at one request.
## Updated
- [Agentic harnesses](n:3c65c17b0d0d81d881a8fe98b4cff7bb): the harness-scaling results, StateM and AVO.
- [Benchmarks](n:3c65c17b0d0d811fb43fece56e40041a): what ARC-AGI-3 and Terminal-Bench measure, and why a harness, an effort setting or a trial count changes a score.
- [Inference and serving](n:3c65c17b0d0d81c08b3bc95ff45c7b13): DiffusionGemma's decoding beside speculative decoding and multi-token prediction; Unsloth's quantised GGUFs.
- [Hardware](n:3c65c17b0d0d8118beeefaed56da6f8e): Cerebras's CS-4, high-bandwidth flash beside HBM, and memory prices.
- [Protocols](n:3c65c17b0d0d81ec9355f4eecd6eed02): the MCP roadmap and the AGENTS.md argument.
- [LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286): GPT-5.6 Sol's price, DeepSeek's vision model, Ox Alpha and Qwen 3.8.
- [Generative and multimodal](n:3c65c17b0d0d817ab6ade318917bff55): vision input, Qwen3 TTS and General Intuition's world models.

# Further reading
## Models
- **Qwen3 TTS under 50 ms at frontier quality**, per Nari Labs' cost and speed analysis (21 August): [Nari Labs](https://nari-labs.com/blog/qwen3-tts-speed-cost-frontier/) (8 min)
- **Unsloth Dynamic 3.0 GGUFs**, the next version of its dynamic quantisation for local models (19 August): [Unsloth docs](https://unsloth.ai/docs/basics/dynamic-3.0-ggufs) (6 min)
- **Ox Alpha, a stealth model of unclear origin** (TechCrunch, 23 August; on 26 August Z.ai open-sourced it as GLM-5.3-Flash, 320B parameters with 18B active): [TechCrunch](https://techcrunch.com/2026/08/23/whos-behind-the-new-stealth-model-ox-alpha/) (4 min), [SiliconANGLE](https://siliconangle.com/2026/08/26/z-ai-open-sources-ox-alpha-model-as-glm-5-3-flash/) (4 min)

## Research and papers
- **EnvHarness: turning static corpora and applications into interactive environments for agent training** (arXiv, 20 August): [arXiv 2608.19880](https://arxiv.org/abs/2608.19880) (40 min)
- **Demystifying Agent Skills: when packaged agent skills help and where they stop transferring** (arXiv, 14 August): [arXiv 2608.14036](https://arxiv.org/abs/2608.14036) (40 min)
- **Learn What's Left, Not What's Mastered: saturation-aware multi-objective RL** (arXiv, 17 August): [arXiv 2608.16072](https://arxiv.org/abs/2608.16072) (35 min)
- **Every Model Cheats: every tested frontier model cheats on offensive cyber tasks**, with prompt-level mitigations (Dreadnode, 20 August): [Dreadnode](https://dreadnode.io/research/every-model-cheats-prompt-level-mitigation-of-cheating-on-offensive-cyber-tasks/) (15 min)
- **OpenAI on pacing releases as cyber capabilities approach thresholds** (18 August, 297 HN comments): [OpenAI](https://openai.com/index/pacing-model-development-cyber-capabilities/) (10 min)
- **"Stop Anthropomorphizing Intermediate Tokens as Reasoning/Thinking Traces"**, Kambhampati et al.'s 2025 position paper, resurfaced in a 250+ comment HN debate (20 August): [arXiv 2504.09762](https://arxiv.org/abs/2504.09762) (30 min)

## Industry
- **General Intuition at a $6B valuation**, from Valor and Point72, moving from game-derived world models into robotics (24 August): [TechCrunch](https://techcrunch.com/2026/08/24/valor-point72-back-general-intuition-at-6b-valuation-as-ai-startup-pushes-into-robotics/) (4 min)
- **Micro1, a training-data startup, at a $500M gross run rate** (20 August): [TechCrunch](https://techcrunch.com/2026/08/20/ai-data-startup-micro1-reaches-500m-gross-run-rate-amid-ai-training-boom/) (4 min)
- **Enterprise spend data suggests OpenAI is winning business users back from Anthropic** (20 August): [TechCrunch](https://techcrunch.com/2026/08/20/openai-is-gaining-on-anthropic-with-business-users-new-data-indicates/) (4 min)
- **OpenAI asked California to strengthen its AI safety bill** (22 August): [TechCrunch](https://techcrunch.com/2026/08/22/openai-says-california-should-strengthen-its-ai-safety-bill/) (4 min)
- **Inherent, founded by DeepMind alumni, claims its agent out-replicated Anthropic's and OpenAI's models on published research** (the company's claim, 22 August): [TechCrunch](https://techcrunch.com/2026/08/22/inherent-founded-by-deepmind-alumni-says-its-ai-teammate-just-outperformed-anthropic-and-openai-at-replicating-research/) (4 min)

## Compute and chips
- **Cerebras CS-4**, three WSE-3 Turbo wafers per system, claimed up to 30x GPU inference speed and over 1,000 tokens a second on models over 10 trillion parameters (19 August; whether 250 PFLOPS and 43.2 PB/s are per wafer or per system is unconfirmed, and by 2 October the page said 50 trillion): [Cerebras](https://www.cerebras.ai/cs4) (5 min)
- **Memory prices up about 500% in a year** (Tom's Hardware, 17 August; the 500% is year-over-year averages, while $3,399 for a 128GB DDR5 kit is 10.3 times its lowest-ever $329): [Tom's Hardware](https://www.tomshardware.com/pc-components/ram/memory-prices-climb-500-percent-in-12-months-up-to-10x-the-lowest-ever-tracked-prices-128gb-of-ddr5-now-usd3-399) (8 min)
- **Nvidia sharply scaled back its $250B OpenAI data-centre guarantee** (WSJ via Reuters, 14 August): [Reuters](https://www.reuters.com/business/nvidia-scales-back-250-billion-openai-data-center-guarantee-wsj-reports-2026-08-14/) (3 min)
- **Hot Chips 2026: CUDA for RISC-V hosts, and high-bandwidth flash as a tier beside HBM** (Chips and Cheese, 23 and 24 August): [CUDA targets RISC-V](https://chipsandcheese.com/p/hot-chips-2026-cuda-targets-risc) (10 min), [Applying high bandwidth flash](https://chipsandcheese.com/p/hot-chips-2026-applying-high-bandwidth) (10 min)

## Tools and agents
- **Mojo 1.0 is open source**, Apache 2.0 with LLVM exceptions; compiler contributions not yet accepted (Modular, 18 August; the Qualcomm and ModCon details are not in the post): [Modular](https://www.modular.com/blog/mojo-open-source) (6 min)
- **The Model Context Protocol's roadmap** (22 August, 240+ HN points): [MCP blog](https://blog.modelcontextprotocol.io/posts/mcp-roadmap/) (10 min)
- **A request for Claude Code to read the cross-tool AGENTS.md file**, the week's agent-config argument (19 August, 376 HN points): [GitHub issue](https://github.com/anthropics/claude-code/issues/6235) (5 min)
- **Go 1.27** (19 August): [Go blog](https://go.dev/blog/go1.27) (6 min)

## Hacker News
- **Paul Graham: "If I were 17, I'd learn how to build LLMs from scratch"** (24 August, 500+ comments), beside a counterpoint that leaning on AI stops expertise forming: [paulg on X](https://twitter.com/paulg/status/2091544343589060625) (1 min), [larsfaye.com](https://larsfaye.com/articles/ai-coding-will-prevent-expertise) (8 min)
- **$266 across four paid models failed to root a Fire HD tablet; open-weight GLM-5.3 did it in a day** (23 August, 673 points): [Eric Pardee](https://ericpardee.github.io/fire-hd-ownership/) (12 min)
- **Qwen 3.8 27B, the local model of the moment**: excellent but prone to overthinking (Simon Willison, 16 August), and a reverse-engineering job done in 30 minutes (XDA): [Simon Willison](https://simonwillison.net/2026/Aug/16/qwen-38-27b/) (6 min), [XDA](https://xda-developers.com/qwen-3-8-27b-reverse-engineering-job-frontier-model/) (6 min)
- **John Gruber calls Anthropic's text watermarking in Claude "a perversion of writing"** (823 points): [Daring Fireball](https://daringfireball.net/2026/08/anthropics_watermark_text_adulteration_in_claude_is_a_perversion_of_writing) (5 min)
