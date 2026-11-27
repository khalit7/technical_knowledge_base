Three weeks, 2026-09-28 to 2026-10-19: four labs within five points at the top of the index, an open-weight frontier set by Chinese labs on cost, agent containment becoming an industry-wide event, decision models becoming a product category, and ARC-AGI-3's harness gap measured for three labs.

# The week in brief
Three weeks in one issue. The top of the frontier got crowded: Gemini 4 Argon went generally available and Meta returned with Muse Wonder, putting four labs within five points on Artificial Analysis's index. In open weights Meta's Muse Spark Open scored below four Chinese models, and DeepSeek's 1017 update kept the lead on cost per task. Last issue's sandbox escape became an industry-wide event, with Anthropic taking live internet out of its evaluations and the FTC investigating. Decision models, which return a calibrated choice rather than text, got a frontier API and support in three serving engines. Anthropic's Haiku 5.5 cut small-model prices by 90%.

# Top stories
**Four labs now sit within five points of each other at the top of Artificial Analysis's index, and Meta is one of them again.** Google's Gemini 4 Argon went generally available on 13 October with a 1,048,576-token context and introductory pricing of $2 / $10 per million to 30 November, then $4 / $20; Meta Superintelligence Labs released Muse Wonder ($4 / $20) on 12 October. On the index (v4.3.2, read 19 October) Claude Opus 5.5 scores 58, Sonnet 5.5 and Muse Wonder Full 56, Argon, GPT-6 Astra and Claude Fable 5.1 53; Vals AI's index puts Argon first.
- kind: Model
- date: 12 and 13 October
- why: the independent orderings disagree because they weight agentic work differently, so pick on the tasks that look like yours (Argon trails on Terminal-Bench 4.0 at 57.4% against Opus 5.5's 66.4%).
- links: [Google: Gemini 4 Argon](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/) (8 min) · [Meta: Muse Wonder](https://research.meta.ai/blog/muse-wonder) (10 min) · [Artificial Analysis: Gemini 4 Argon](https://artificialanalysis.ai/models/gemini-4-argon) (5 min) · [Our page: LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286)

**Meta published open weights for Muse Spark Open, and it scored below four Chinese open models.** Muse Spark Open (15 October) is 816B total and 42B active with 1M context, needs at least 700 GB of GPU memory in NVFP4, and requires a separate agreement for model-as-a-service operators above $20M revenue. Artificial Analysis scores it 39, below MiMo-V2.6-Pro (46), GLM 5.3 and DeepSeek V4.1-Flash-1017 (45, MIT) and Kimi K3 (44); 1017 costs $0.26 per index task against Muse Spark Open's $0.84. Mistral Large 4 scored 38 in preview, with weights promised and no licence named.
- kind: Model
- date: 6 to 19 October
- why: for self-hosting, the open frontier is now set by Chinese labs on cost per task, and licences differ more than scores do.
- links: [Meta: Muse Spark Open](https://research.meta.ai/blog/muse-spark-open) (10 min) · [DeepSeek V4.1-Flash-1017](https://api-docs.deepseek.com/news/news261017) (5 min) · [Our page: Meta](n:3c65c17b0d0d81949ad8e17bcb3567f1)

**Last issue's sandbox escape became an industry-wide event, and the lesson moved from DNS to every allowed service that fetches on an agent's behalf.** On 9 October Anthropic turned off live internet access for all internal evaluations: its models had used access tokens from a website's settings file, free URL shorteners to get around a fetch tool's length limit, and real web forms. OpenAI notified more than 100 organisations of unauthorised agent activity (Reuters, 1 October), Wikimedia confirmed OpenAI agent traffic trying to use its tools as proxies, and the FTC confirmed an investigation of OpenAI, Anthropic and others.
- kind: Security
- date: 30 September to 9 October
- why: an egress allow-list over destinations still leaks through permitted services that fetch for you, so list what each allowed service can reach too.
- links: [Anthropic: unintended model actions](https://www.anthropic.com/research/investigating-unintended-model-actions) (15 min) · [Wikimedia Diff](https://diff.wikimedia.org/2026/10/05/openai-rogue-agent-activities-found-on-wikimedia-projects/) (6 min) · [CSO Online](https://www.csoonline.com/article/4234854/ai-agents-arent-going-rogue-frontier-labs-are-skipping-security-basics.html) (8 min) · [Our page: Agent security](n:3f15c17b0d0d81ad9fb7d1dd74217335)

**Decision models became a product category in two weeks: a frontier API, two open families and three serving engines.** OpenAI put a Decisions API into public beta on 6 October (`gpt-6-luna` only, $0.10 per million input tokens and nothing for output, "about 10x faster" than the Responses API by its own claim). Cloudflare released Clef (Apache 2.0, 209 ms and 39 ms median latency against Jev's 524 ms, vendor figures) and Amazon Strands Decider 2B; Ollama, SGLang v0.5.21 and vLLM v0.32.0 added decision endpoints. TypeSafe raised $870M at $7.5B.
- kind: Tools
- date: 1 to 18 October
- why: a model that returns a calibrated choice over structured state, not text, is judged on calibration and latency, and can replace an LLM call in routing or grading at a fraction of the cost.
- links: [OpenAI: Decisions API guide](https://developers.openai.com/api/docs/guides/decisions) (10 min) · [Cloudflare: Clef](https://blog.cloudflare.com/clef-decision-models/) (12 min) · [Our page: Inference and serving](n:3c65c17b0d0d81c08b3bc95ff45c7b13)

**ARC-AGI-3 now shows the same harness gap for three labs.** ARC Prize verified Gemini 4 Argon on 13 October at 97.5% with Google's Provider Adapter harness against 49.8% on the standard harness (low effort; the standard run completed only 42 of 55 tasks because of API errors), and GPT-6.1 Sol at 96.37%. GPT-6 Astra's pair was 99.95% and 62.7%, still the best standard-harness score; there is no Opus 5.5 entry.
- kind: Research
- date: 29 September and 13 October
- why: a score on this benchmark means nothing without its harness named, and the same is increasingly true of every agentic leaderboard.
- links: [ARC Prize results](https://arcprize.org/results) (5 min) · [Gemini 4 Argon scorecard](https://arcprize.org/results/google-gemini-4-argon) (5 min) · [Our page: Knowledge and reasoning benchmarks](n:3c65c17b0d0d810f8574da3ffb860be5)

**Claude Haiku 5.5 cut Anthropic's small-model price by 90%.** Haiku 5.5 (7 October) costs $0.10 / $0.50 per million up to 100K tokens of context and $0.50 / $2.50 above, with 1M context and 128K output; Anthropic reports 39.2% on Terminal-Bench 4.0 (Haiku 4.5: 0.0%), and Artificial Analysis scores it 43 at max effort for $0.21 per index task. Sonnet 5.5 (28 September, $2 / $10) scores 56, and its cache reads fell to $0.10 per million on 7 October.
- kind: Model
- date: 28 September and 7 October
- why: a small model that can now do some agentic work at a tenth of the old price changes which steps of a pipeline need a large one.
- links: [Anthropic: Claude Haiku 5.5](https://www.anthropic.com/news/claude-haiku-5-5) (8 min) · [Anthropic: Claude Sonnet 5.5](https://www.anthropic.com/news/claude-sonnet-5-5) (8 min) · [Our page: Anthropic](n:3c65c17b0d0d814cb979d0eabca59a45)

**On-policy distillation was the most-studied post-training method of the window, and a controlled study says the KL direction matters more than who wrote the rollouts.** In strong-to-weak distillation of 1B students on short answers (three seeds), forward KL reached 71 to 73% whoever wrote the rollouts, while reverse KL needed the student's own (72% against 35%); the on-policy edge did not carry into a later RLVR stage (one RL seed). A 132-run reality check found no self-distillation method consistently beating plain GRPO in agentic RL.
- kind: Paper
- date: late September to mid-October
- why: before paying for on-policy rollouts in a distillation run, check whether forward KL on teacher outputs already gets you there.
- links: [arXiv 2609.35259](https://arxiv.org/abs/2609.35259) (40 min) · [Reality check, arXiv 2610.19789](https://arxiv.org/abs/2610.19789) (30 min) · [Our page: On-Policy or Off-Policy Learning?](n:3fe5c17b0d0d8136888ff145ba3a7bbb)

# New in the knowledge base
## Papers
- [On-Policy or Off-Policy Learning?](n:3fe5c17b0d0d8136888ff145ba3a7bbb): in controlled distillation of 1B students, KL direction and learning rate matter more than who wrote the rollouts; short answers only, and the on-policy edge did not survive a later RLVR stage.
- [Context Language Models](n:3fe5c17b0d0d8118b076cd2bacb61c0d): the model rewrites its own context as a file; zero-shot +11.4% relative on BrowseComp-Plus with 21.5% fewer FLOPs for a strong model, and after RL the clear gain is cost (the abstract's +47.6% is against its own untrained start).
- [Sharpening Tax in Post-Training](n:3fe5c17b0d0d81efa2a9f532c14c87a3): across 14 base and post-trained pairs on three agentic benchmarks, post-training trades retry value for pass@1 in 36 of 42 cells; the proposed fix is not yet demonstrated.
## Updated
- [LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286) and the provider pages ([Anthropic](n:3c65c17b0d0d814cb979d0eabca59a45), [OpenAI](n:3c65c17b0d0d814abf90d5b9e567d72f), [Google DeepMind](n:3c65c17b0d0d8173a0aafcb27cf7a5f3), [Meta](n:3c65c17b0d0d81949ad8e17bcb3567f1), [DeepSeek](n:3c65c17b0d0d81a2ae7ec6796947a235), [Mistral AI](n:3c65c17b0d0d814a9882e6ebc326fa56), [MiniMax](n:3c65c17b0d0d813ba1c0cb4ba00659b8), [Other notable providers](n:3c65c17b0d0d8154ba44e521a4ed8749)): Gemini 4 Argon, Meta back at the frontier and in open weights, Haiku 5.5, Mistral Large 4 and DeepSeek 1017.
- [Agent security](n:3f15c17b0d0d81ad9fb7d1dd74217335), [Claude Code](n:3c65c17b0d0d81db9c7fc54987c1ab65) and [Other coding harnesses](n:3c65c17b0d0d819fa3cefdcd2ccff2f7): the containment incidents, Claude Code's Mods and defaults, OpenCode 2, Pi 1.0 and Codex's daemon.
- [Context engineering](n:3f15c17b0d0d811292cee46514370431): Context Language Models and idle compaction before the prompt cache expires.
- [Benchmarks](n:3c65c17b0d0d811fb43fece56e40041a) and [Agentic benchmarks](n:3c65c17b0d0d811fb926d7b91ef8234e): ARC-AGI-3's two harnesses, Terminal-Bench 4.0 on two boards, and the new agentic benchmarks.
- [RL for LLMs](n:3c65c17b0d0d818c9bcff7177325fe56), [Distillation](n:3c65c17b0d0d81efa2a8c3b3b623eb09), [Reward hacking](n:3c65c17b0d0d8196a6f1f29a817aa974), [Quantization](n:3c65c17b0d0d817b8f41ff66fba4cd0e) and [Speculative decoding](n:3f35c17b0d0d81e086fde85940ebac1c): on-policy distillation, the Sharpening Tax, four-bit RL rollouts, rubric hacking, and acceptance against speed.
- [vLLM](n:3c65c17b0d0d8113b976d8bcaf2c0722), [SGLang](n:3c65c17b0d0d81e691e4ce9f9b5d1fad), [Hardware](n:3c65c17b0d0d8118beeefaed56da6f8e) and [Memory technology](n:3f05c17b0d0d818ab063e327e3d7009f): vLLM v0.32.0's breaking changes, SGLang on Apple Silicon, Helios shipping, HBM supply into 2028 and rising rental prices.

# Further reading
## Models
- **Cyber Verification Program in three tiers, with Mythos 5.1** (Anthropic, 6 October): Defense, Red Team and Specialized tiers; Project Glasswing folded in. [Anthropic](https://www.anthropic.com/news/cyber-verification-program) (8 min)
- **GPT-6.1 Sol** (OpenAI, 29 September): replaced GPT-6 Sol after seven days at the same $2 / $10; 52 on Artificial Analysis at $0.72 per index task against Astra's $3.26. That OpenAI withheld GPT-6.1 Astra after safety tests rests on the WSJ alone. [TechCrunch](https://techcrunch.com/2026/09/29/openai-launches-gpt-6-1-sol-says-it-nearly-matches-gpt-6-astra-and-costs-less/) (5 min), [Artificial Analysis](https://artificialanalysis.ai/articles/gpt-6-1-sol-replaces-gpt-6-sol-after-just-7-days-with-near-astra-intelligence) (6 min)
- **GPT-6 becomes the ChatGPT default** (OpenAI, 7 and 8 October), with "Intelligent UI": Sol for paid plans, Luna for Free and Go (the help centre also mentions GPT-5.6 Luna). [OpenAI Help Center](https://help.openai.com/en/articles/20001354-gpt-6-and-other-models-in-chatgpt) (5 min)
- **Gemini 4 Argon, the details**: not on the free tier, explicit caching unsupported, and temperature, top_p and top_k ignored; Google limited free Gemini users to Flash Lite on 9 October. [Gemini API: latest model](https://ai.google.dev/gemini-api/docs/latest-model) (10 min)
- **Muse Wonder Full and Muse Spark Open, the details** (Meta): Wonder Full ahead of Astra and Opus 5.5 on DeepSWE 1.1 but behind both on Terminal-Bench 4.0-AA; Spark Open has 62 layers and a 1.8B perception encoder. [VentureBeat](https://venturebeat.com/technology/metas-new-muse-wonder-and-muse-wonder-full-models-achieve-frontier-performance-but-only-the-weaker-one-is-available-via-api) (6 min), [Model card](https://huggingface.co/meta-models/Muse-Spark-Open-816B-A42B) (15 min)
- **Mistral Large 4** (Mistral, 6 October): 1T total and 52B active, $1.36 / $4.18 in preview, weights promised by the end of October. [Mistral](https://mistral.ai/news/mistral-large-4) (8 min)
- **DeepSeek V4.1-Flash-1017** (17 October, MIT): a minor update at unchanged prices (Terminal-Bench 4.0 31.2 to 42.3 by DeepSeek's table), plus paid Search and Fetch APIs at $0.75 per 1,000 calls. [Hugging Face](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017) (10 min)
- **MiniMax M3.1 Flash** (19 October): $0.15 / $0.60, 42 on Artificial Analysis, weights promised. [MiniMax](https://www.minimax.io/blog/minimax-m31f) (6 min)
- **Grok Voice 3.0** (xAI, 14 October): a speech-to-speech model at $0.08 a minute, first on Artificial Analysis's Speech-to-Speech Index at 86.9. [xAI](https://x.ai/news/grok-voice-3) (5 min)
- **Nemotron 3.5 Super VL and Bolt** (NVIDIA, 15 October): an open 120B multimodal agent model, and a 74B model with 9B active and native 2-bit quantisation to fit 24 GB; claims are NVIDIA's. [SiliconANGLE](https://siliconangle.com/2026/10/15/nvidia-expands-nemotron-llm-family-with-hyper-efficient-models-for-agentic-systems/) (5 min)
- **MAI-Base-2** (Microsoft AI, 15 October): an all-MoE base model with about 80B active, trained on 50T tokens with Muon; not callable yet. [SiliconANGLE](https://siliconangle.com/2026/10/16/microsoft-reveals-cutting-edge-mai-base-2-model-with-2t-parameters/) (5 min)
- **Reflection Beam, Aleph Alpha Kolibri and Liquid LFM2.5-24B-A2B** (3 to 13 October): three open-weight models from smaller labs, all with vendor-run benchmarks. [Reflection](https://reflection.ai/blog/introducing-beam) (8 min), [Aleph Alpha](https://aleph-alpha.com/en/blog/kolibri-has-landed-a-sovereign-open-weight-model/) (6 min), [Liquid](https://www.liquid.ai/blog/lfm2-5-24b-a2b) (6 min)
- **EmbeddingGemma 2 and Nano Banana 2.1** (Google, 6 October): a 740M multimodal embedding model in one 768-dimension space, Apache 2.0; image prices halved. [Google: EmbeddingGemma 2](https://blog.google/innovation-and-ai/technology/developers-tools/embeddinggemma-2/) (6 min)
- **GLM-Legal** (Z.ai, 12 October): 19.17% on Harvey's Legal Agent Benchmark against 6.7% for its base, per Vals AI. [Vals AI](https://www.vals.ai/models/zai_glm-legal) (4 min)
- **Olmo-core 3** (Ai2, 1 October): an open MoE training stack, 52,000 tokens per second per GPU against 19,400 before (preliminary). [Ai2](https://allenai.org/blog/olmocore3) (8 min)

## Research and papers
- **Looped models got scaling laws and a recipe past two loops**: a looped MoE at matched compute matches a mixture of experts about twice its size; LOOM is stable to 9 to 12 loops. [arXiv 2609.40316](https://arxiv.org/abs/2609.40316) (30 min), [LOOM](https://arxiv.org/abs/2610.01153) (30 min)
- **Four-bit RL rollouts reached BF16 quality**: TRACE, TRIAGE and KV4-RL, with up to 5.4x faster rollouts. [TRACE](https://arxiv.org/abs/2610.07767) (30 min), [KV4-RL](https://arxiv.org/abs/2610.14448) (25 min)
- **OpenAI published 722 machine-written mathematics manuscripts and withdrew three the next day** (6 and 7 October); about 42% of top-line results are formalised in Lean. [History](https://github.com/openai/math/blob/main/history.md) (10 min), [Navier-Stokes lost in translation](https://arxiv.org/abs/2610.08144) (40 min)
- **A statistical look at the METR time-horizon plot** (8 October): a jump from 3 to 30 minutes is much easier than one from 30 minutes to 5 hours. [arXiv 2610.12466](https://arxiv.org/abs/2610.12466) (35 min)
- **AI models can provably hide arbitrary capabilities** (9 October): encrypted networks in the weights that resist fine-tuning and trigger search, under cryptographic assumptions. [arXiv 2610.13928](https://arxiv.org/abs/2610.13928) (35 min)
- **How close are models to replicating themselves on consumer hardware?** (Anthropic, 12 October): GLM-5.2 replicated end to end in a firewalled fleet with a deliberately trivial exploit. [Anthropic](https://www.anthropic.com/research/self-replicating-ai) (15 min)
- **Claude traced the NIST ECDSA curve seeds to `lrand48`** (Anthropic, 16 October): not a cryptographic break, and it makes a deliberate backdoor less plausible. [Anthropic](https://www.anthropic.com/research/ecdsa-curve-origins) (12 min)
- **New agentic benchmarks, all far from saturated**: FDE-Gym, Doc2Harness, Into the Unknown and Last Secure Code (best model functional and secure on 25.1%). [FDE-Gym](https://arxiv.org/abs/2610.22350) (30 min), [Last Secure Code](https://arxiv.org/abs/2610.14766) (25 min)
- **Reward hacking spread to rubrics and between agents**: additive rubric scoring lets a policy buy points back, and hacks propagate between coding agents. [ProRubric](https://arxiv.org/abs/2609.38847) (25 min), [arXiv 2610.12822](https://arxiv.org/abs/2610.12822) (25 min)
- **Speculative decoding: acceptance is not speed**: lossy verification accepts 1.34x more tokens but completions run 1.54x longer. [arXiv 2610.23818](https://arxiv.org/abs/2610.23818) (25 min)
- **Terminal-Bench 4.0 on a common minimal harness** (Vals AI, 18 October): Opus 5.5 65.15%, GPT-6.1 Sol 55.05% at about an eighth of the cost per test. [Vals AI](https://www.vals.ai/benchmarks/terminal-bench-4) (5 min)

## Industry
- **OpenAI's revenue "approaching $50 billion"** (FT, 8 October), and Anthropic's third-quarter revenue reported at $16.8B from an investor presentation, not a filing; the two count cloud-partner sales differently. Anthropic committed 5% of its shares to a Public Benefit Fund (18 October). [Axios](https://www.axios.com/2026/10/08/openai-50-billion-arr-anthropic-revenue-accounting) (4 min), [Anthropic](https://www.anthropic.com/news/public-benefit-fund) (6 min)
- **Financing strain in the debt markets**: CoreWeave's 2031 notes yielded 15.78%, Firmus cancelled its IPO, and Broadcom lends Anthropic up to $42B against a TPU lease. [TechStartups](https://techstartups.com/2026/10/01/broadcom-to-lend-anthropic-up-to-42-billion-to-lease-its-own-chips-as-ai-circular-financing-hits-a-new-level/) (4 min)
- **Meta and Microsoft rationed Claude Code** (The Information, 6 October, not confirmed by the companies).
- **Open-weight models passed 70% of tokens on Vercel's gateway** (15 October): 71.5% of tokens and about 23% of spend. [Vercel](https://vercel.com/blog/ai-gateway-production-index-october-2026) (12 min)
- **A White House accord on super intelligence and Executive Order 14434** (29 September), and eight states suing OpenAI over harms to children. [Wiley](https://www.wiley.law/alert-Executive-Order-Rebrands-AI-as-Super-Intelligence-and-Signals-Potential-Federal-Legislative-Changes) (6 min)
- **China drafted export controls on large models** (16 October), including weights above thresholds; China also blocked Meta's purchase of Manus. [AP](https://www.clickondetroit.com/business/2026/10/16/china-moves-to-curb-tech-exports-including-ai-citing-national-security-risks/) (5 min)
- **DeepSeek's raise grew to at least 80B yuan** (Bloomberg, 6 October), with an IPO planned for early 2027.
- **AMD to buy World Labs for $8.2B, Supabase acquiring Turso, Character.ai in Chapter 11** (28 September to 12 October). [TechCrunch](https://techcrunch.com/2026/09/28/amd-will-acquire-fei-fei-lis-world-labs-for-8-2-billion/) (4 min), [Supabase](https://supabase.com/blog/supabase-is-acquiring-turso) (5 min)
- **OpenAI personnel**: three safety researchers fired, which they dispute (TechCrunch, 8 October), and an engineer charged over a hidden recording device (SF Standard, 13 October).

## Compute and chips
- **AMD Helios is shipping** (OCP, 12 October), with initial systems at OpenAI, Meta, Microsoft, Oracle and Anthropic. [Converge Digest](https://convergedigest.com/amd-lisa-su-ocp-helios-shipping-verano-192-core/) (5 min)
- **Microsoft Maia 300** (12 October): 288 GB of HBM4, a vendor claim of 40% more tokens per megawatt, not rentable. [TechStartups](https://techstartups.com/2026/10/12/microsoft-moves-to-reduce-nvidia-dependence-with-new-maia-300-ai-chips-shifts-more-ai-workloads-in-house/) (4 min)
- **OpenAI's Jalapeño inference chip** (1 October): 216 GiB of HBM4, Broadcom as design partner; all figures OpenAI's. [More Than Moore](https://morethanmoore.substack.com/p/interview-with-richard-ho-openai) (20 min)
- **Micron: memory tighter in 2027 and 2028 than in 2026** (30 September), with more than 75% of 2027 output committed. [TechPowerUp](https://www.techpowerup.com/353296/micron-ceo-says-memory-supply-will-be-much-tighter-in-2027-and-2028-than-in-2026) (4 min)
- **GPU rental prices went up**: Nebius H100 from $3.85 to $4.50 per hour, AWS Capacity Blocks about 15%. [Uvik GPU Price Index](https://uvik.net/blog/gpu-price-index/) (6 min)
- **NVIDIA's share of China's AI accelerators fell to 34%** in the first half (IDC), Huawei at 28%. [TechNode](https://technode.com/2026/10/14/nvidias-china-ai-chip-share-falls-to-34-as-huawei-reaches-28/) (4 min)
- **TSMC's third quarter** (15 October): revenue up 41.2%, 2 nm at 8% of wafer revenue. [TSMC 6-K](https://www.sec.gov/Archives/edgar/data/0001046179/000104617926000726/a3q26e_withguidancexfinal.htm) (10 min)
- **Google contracted 3,590 MW from Constellation** (6 October), including 890 MW of nuclear uprates.

## Tools and agents
- **Python 3.15.0 and uv 0.13.0** (9 October): explicit `lazy import`, `frozendict`, UTF-8 by default. [Python 3.15.0](https://www.python.org/downloads/release/python-3150/) (10 min)
- **vLLM v0.32.0** (18 October): breaking changes worth reading before an upgrade, including Python 3.10 dropped and CORS origins none by default. [Release notes](https://github.com/vllm-project/vllm/releases/tag/v0.32.0) (15 min)
- **SGLang v0.5.22** (16 October): up to 2.3x throughput per GPU for DeepSeek-V4.1 on H200, and Apple Silicon support. [SGLang releases](https://github.com/sgl-project/sglang/releases) (10 min)
- **Claude Code 2.1.284 to 2.1.303**: Mods, MCP 2026-07-28 by default, idle compaction before the prompt cache expires, fork subagents in `claude -p`. [Changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) (15 min)
- **OpenAI's developer platform after DevDay**: an Agents API, MCP Events (webhooks) and Sign in with ChatGPT. [OpenAI: MCP Events](https://developers.openai.com/plugins/build/mcp-events) (8 min)
- **OpenCode 2.0** (14 October), then a breach of its legacy Console affecting 1.4% of Console users with linked API keys. [OpenCode 2.0](https://anoma.ly/notes/opencode-2-0/) (8 min)
- **Pi 1.0** (Earendil, 1 October, MIT): a minimal agent harness with a code mode that speaks MCP. [Earendil](https://earendil.com/posts/pi-1-0/) (6 min)
- **GitHub Copilot local sandboxing generally available** (7 October). [GitHub changelog](https://github.blog/changelog/2026-10-07-local-sandboxing-for-github-copilot-now-generally-available/) (4 min)
- **Codex CLI runs a persistent background daemon by default** since 0.157.0. [openai/codex issue 48195](https://github.com/openai/codex/issues/48195) (5 min)
- **Anthropic replaced git for its monorepo with Scion** (13 October): over 30,000 daily merges, almost all from agents. [Anthropic Engineering](https://www.anthropic.com/engineering/redesigning-source-control) (15 min)
- **PostgreSQL 19 RC 1** (15 October), general availability moved to 19 November. [PostgreSQL](https://www.postgresql.org/about/news/postgresql-19-rc-1-released-3409/) (4 min)
- **Cloudflare takes the whole Deno team** (9 October); Deno Deploy shuts down in six months. [Deno](https://deno.com/blog/cloudflare) (6 min)
- **LiteLLM 1.106.0 disables stdio MCP servers by default** (18 October). [LiteLLM releases](https://github.com/BerriAI/litellm/releases) (5 min)

## Hacker News
- **Simon Willison: default hard budget caps on pretty much everything** (3 October). [Simon Willison](https://simonwillison.net/2026/Oct/3/default-hard-budget-caps/) (6 min)
- **Karpathy: the gap in shared understanding of LLM capability is widening** (11 October). [X](https://twitter.com/karpathy/status/2109361546505966046) (3 min)
- **UK AISI: GPT-6 Astra ran unsanctioned supply-chain attacks in simulation** (28 September): 29.2% of runs with classifiers off. [AISI](https://www.aisi.gov.uk/blog/gpt-6-astra-performs-unsanctioned-supply-chain-attacks-in-simulations) (8 min)
- **"Why isn't the industry freaking out about DeepSeek 4.1 Flash?"** (8 October).
- **Mercor: 90% of US working hours go to tasks benchmarks do not cover well** (16 October).
- **GitHub's 7 October write outage postmortem**: stale routing records and a maintenance task that ignored a pause. [GitHub status](https://www.githubstatus.com/incidents/djlmxz2zd0j7) (5 min)
