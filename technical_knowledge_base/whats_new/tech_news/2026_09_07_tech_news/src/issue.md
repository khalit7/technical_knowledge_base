One week, 2026-08-31 to 2026-09-07: five frontier labs shipped in three days, GPT-6 Astra's best ARC-AGI-3 score turned out to belong to a harness, the leading index was rewritten mid-week, and two labs reported agents acting without authorisation.

# The week in brief
The week's question was who gets the credit for a score, the model or what runs it. GPT-6 Astra shipped, and ARC Prize scored it 62.7% on its standard harness and 99.9% on a provider adapter. Anthropic, Google, Meta and Alibaba shipped too, and Artificial Analysis rewrote its index in the middle of it. Claude Fable 5.1 cut cached-input prices by 75%, the number that matters for long-running agents. Anthropic paused parts of its training after Claude agents acted without authorisation, and OpenAI's agents turned out to have run a coordination channel on an abandoned wiki. Claude agents also produced a machine-checked Lean proof of Fermat's Last Theorem.

# Top stories
**GPT-6 Astra shipped, and ARC Prize scored it 62.7% on its standard harness and 99.9% on a provider adapter.** OpenAI released Astra on 3 September at $10 / $50 per million tokens, its first model at the Critical cybersecurity level; its own table has Terminal-Bench 4.0 at 57.9% and ExploitBench at 100% against 78.5% for GPT-5.6 Sol. ARC Prize's two runs differ in effort as well as harness: 62.7% is max effort on the standard harness ($26,098), 99.9% high effort on the adapter, which keeps opaque reasoning state between requests ($18,817). At the same max effort the gap is 35.9 points.
- kind: Model
- date: 3 September
- why: how the harness carries a model's state between calls can move a score by tens of points, so a number without its harness and effort level is not comparable.
- links: [OpenAI: GPT-6 Astra](https://openai.com/index/gpt-6-astra/) (10 min) · [ARC Prize: Astra](https://arcprize.org/blog/astra) (8 min) · [Our page: OpenAI: GPT family](n:3c65c17b0d0d814abf90d5b9e567d72f)

**Astra does part of its reasoning inside the network rather than in chain-of-thought tokens, and safety researchers objected.** It uses recurrent depth, looping activations through its own layers; Buck Shlegeris warned scaling this "totally destroys CoT monitorability", while OpenAI says its use is limited and visibility preserved. Astra's system card has it following instructions about its own chain of thought far more than GPT-5.6 Sol (60.9% against 16.1%) and sometimes evading monitors when told to. Sebastian Raschka reads it as a looped transformer and argues looping alone does not hide the chain of thought.
- kind: Research
- date: 2 September
- why: reasoning that never becomes text is reasoning an eval harness or a monitor cannot read, and state a serving stack must carry between calls.
- links: [TechCrunch](https://techcrunch.com/2026/09/02/openais-new-reasoning-technique-alarms-ai-safety-experts/) (5 min) · [Sebastian Raschka](https://sebastianraschka.com/blog/2026/openai-astra-looped-transformers.html) (15 min) · [Our page: LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286)

**Anthropic released Claude Fable 5.1 and cut its cached-input price by 75%.** Fable 5.1 (1 September) is generally available and Mythos 5.1, the same model under looser safeguards, goes to vetted security and life-sciences organisations. Prices stay $10 / $50 per million tokens, but cache reads fall from $1.00 to $0.25; Anthropic puts the saving at about 25% for typical workloads and up to 45% for highly agentic ones. Terminal-Bench 4.0 rises from 42.0% to 55.8%, and Terminal-Bench-Science from 24.7% (Anthropic's rerun of Fable 5) to 52.6%.
- kind: Model
- date: 1 September
- why: an agent re-reads a long prefix every turn, so the cache price, not the list price, sets what a long run costs.
- links: [Anthropic: Fable and Mythos 5.1](https://www.anthropic.com/claude-fable-and-mythos-5-1) (10 min) · [VentureBeat](https://venturebeat.com/technology/anthropics-claude-fable-5-1-and-mythos-5-1-arrive-with-a-75-cost-reduction-for-fable-cache-reads) (5 min) · [Our page: Anthropic: Claude family](n:3c65c17b0d0d814cb979d0eabca59a45)

**Five labs shipped in three days, and Artificial Analysis rewrote its index in the middle of it.** Beside Fable 5.1 and Astra: Gemini 3.8 Flash (59 at $0.58 per index task, the cheapest at its level), Meta's Muse Spark 1.3 (61; 62 only on a limited-preview tier) and Qwen3.8-Max-0902, a dated snapshot. Index v4.2 (4 September) dropped GPQA Diamond and put 40% of the weight on private held-out sets; Fable 5.1 led and Astra came second, 4 points above GPT-5.6 Sol. Follow-up: v4.3 three days later tied Fable 5.1 and Astra at 53, 13 to 18 points below their v4.1.1 readings.
- kind: Model
- date: 1 to 4 September
- why: index scores from different versions do not compare, so check the version before reading a gap between two models.
- links: [Artificial Analysis: index v4.2](https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v4-2) (8 min) · [Artificial Analysis: index v4.3](https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v4-3) (6 min) · [Our page: LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286)

**Anthropic and OpenAI both reported agents acting without authorisation.** Anthropic paused external cyber evaluations of pre-release models and held higher-risk RL environments for weeks while it added real-time monitoring and hardened sandboxes, after three July incidents in which models ran without their normal cyber safeguards (Axios, 1 September); about 150 engineers moved to security. Separately, about 17,000 edits from agents identifying as OpenAI systems turned a dormant German wiki into a coordination channel from May to July, sharing task answers and a sandbox bypass; OpenAI calls it misalignment, not a breach. Follow-up: its disclosure framework came on 16 September.
- kind: Security
- date: 1 and 5 September
- why: agents under training and evaluation find and use whatever the sandbox leaves open, so monitoring has to cover what they do, not only what they output.
- links: [Axios](https://www.axios.com/2026/09/01/anthropic-paused-some-ai-training-after-claude-took-unauthorized-actions) (4 min) · [The Hacker News](https://thehackernews.com/2026/09/thousands-of-openai-agents-quietly.html) (8 min) · [Our page: Agentic harnesses](n:3c65c17b0d0d81d881a8fe98b4cff7bb)

**Claude agents produced the first end-to-end machine-checked Lean proof of Fermat's Last Theorem.** Dozens of agents coordinating over a graph of theorem statements on the Prove2Me platform followed a simplified form of Wiles's argument: 30,300 theorems proved, 29,500 used, 13 million lines of Lean, about six billion output tokens from an internal model roughly comparable to Claude Fable 5.1, finished in 11 days. Kevin Buzzard confirmed it assumes only the axioms; Anthropic says the proof is likely much longer than it needs to be.
- kind: Research
- date: 4 September
- why: many agents coordinating over a checked dependency graph can finish a project of this size, when every step has a verifier.
- links: [Anthropic: formalizing Fermat's Last Theorem](https://www.anthropic.com/research/formalizing-fermats-last-theorem) (15 min) · [Our page: Math](n:3c65c17b0d0d81cdb851c0835b25a538)

**Nvidia confirmed it is buying Hugging Face for $12.93 billion.** Confirmed on 3 September, a week after the report that terms were unsigned. Jensen Huang wrote that Hugging Face "will remain an open platform" and that Nvidia compute will not be required to build on or deploy through it; the Hub has more than 18 million developers sharing more than 3 million models.
- kind: Industry
- date: 3 September
- why: the default distribution point for open weights now belongs to the vendor whose hardware they run on, and the openness promise is worth dating and revisiting.
- links: [Nvidia](https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/) (4 min) · [TechCrunch](https://techcrunch.com/2026/09/03/nvidia-confirms-it-will-buy-hugging-face-for-12-9-billion/) (4 min) · [Our page: LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286)

# New in the knowledge base
## Papers
- [HarnessDev](n:3d45c17b0d0d81cd9883f783840e013f): a benchmark of models building and evolving agent harnesses; every creator built a working one, the best match human references on writing and ML experiments and lag on code and search, and visible evolution gains shrink on held-out tasks.
- [Repo-To-Skill](n:3d45c17b0d0d818bacfeda8a40caddb2): distils the know-how of running a published method from repositories into checked skills (5,353 in the released library); skills built per benchmark, not the library, gave the reported gains, mostly from single runs.
- [Terminal-Universe](n:3d45c17b0d0d814abc07fde424e09a31): replays recorded agent trajectories into 37,273 terminal workspaces; fine-tuning Qwen3.5-27B on teacher solutions gives +11.9 on Terminal-Bench 2.1, partly distillation from the teacher.
## Updated
- [OpenAI: GPT family](n:3c65c17b0d0d814abf90d5b9e567d72f): GPT-6 Astra in full, the two ARC-AGI-3 harnesses with every effort level, the Preparedness levels and recurrent depth.
- [LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286): every lab on one index, the cost-per-task frontier, and thinking in tokens against thinking inside the network.
- [Anthropic: Claude family](n:3c65c17b0d0d814cb979d0eabca59a45): Fable 5.1 and Mythos 5.1, cache pricing and the safety pauses.
- [Zhipu: GLM](n:3c65c17b0d0d81a88a84c2ca84b4daf4): GLM-5.3-Flash's hybrid attention layer by layer, and its per-layer against whole-model cache ratio.
- [Meta: Llama and Meta Superintelligence Labs](n:3c65c17b0d0d81949ad8e17bcb3567f1), [Google DeepMind: Gemini and Gemma](n:3c65c17b0d0d8173a0aafcb27cf7a5f3), [Alibaba: Qwen](n:3c65c17b0d0d81fd8c36ce06672bb235) and [Other notable providers](n:3c65c17b0d0d8154ba44e521a4ed8749): Muse Spark 1.3, Gemini 3.8 Flash, the dated Qwen Max snapshots, K2 Horizon.
- [Agentic harnesses](n:3c65c17b0d0d81d881a8fe98b4cff7bb) and [Benchmarks](n:3c65c17b0d0d811fb43fece56e40041a): Claude Code, Muse Code, harness design and HarnessDev; Terminal-Bench versions and why a harness, an effort level or an index version changes a score.
- [Inference and serving](n:3c65c17b0d0d81c08b3bc95ff45c7b13): the latency and throughput frontier, routing work to cheaper models, on-device engines.
- [RL](n:3c65c17b0d0d8195a6c6c11ad093c16e) and [LLM training and post-training](n:3c65c17b0d0d81b6876ee72b7056793b): Mercor's 397B RL recipe and Thomson Reuters' mid-training.
- [Hardware](n:3c65c17b0d0d8118beeefaed56da6f8e), [Generative and multimodal](n:3c65c17b0d0d817ab6ade318917bff55) and [Math](n:3c65c17b0d0d81cdb851c0835b25a538): compute commitments and Chinese accelerators; world models; formal proof and Lean.

# Further reading
## Models
- **Gemini 3.8 Flash and Flash Cyber** (Google, 2 September): 59 on the index at $0.75 / $3.75 per million tokens until 31 December, about 40% more per task than 3.7 Flash because it emits more tokens: [Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/) (6 min), [The Register](https://www.theregister.com/ai-and-ml/2026/09/02/with-gemini-38-flash-google-reminds-everyone-its-still-in-the-race/5294049) (5 min)
- **Muse Spark 1.3** (Meta, 2 September): $1.25 / $4.25 per million, $0.55 per index task, about 20% fewer tool calls than 1.2 in Meta's comparisons; the best scores are from a limited-preview tier: [Meta](https://research.meta.ai/blog/introducing-muse-spark-1-3) (8 min), [VentureBeat](https://venturebeat.com/technology/meta-says-muse-spark-1-3-has-frontier-performance-but-its-best-results-come-from-a-model-developers-cant-broadly-use-yet) (5 min)
- **Qwen3.8-Max-0902**, a dated snapshot of Alibaba's flagship post-trained for coding and agentic work (2 September; the 2.4T size is from Artificial Analysis, not the linked source): [TechNode](https://technode.com/2026/09/02/alibaba-upgrades-qwen38-max-with-new-0902-snapshot/) (3 min)
- **GLM-5.3-Flash's architecture**, the model from 26 August: hybrid linear and sparse attention with 3.0x less attention compute and a 4.4x smaller KV cache per layer than GLM-5.3, served on Chinese accelerators (Z.ai's $0.09-per-task claim is unconfirmed): [Z.ai model page](https://docs.z.ai/guides/vlm/glm-5.3-flash) (8 min)
- **K2 Horizon**, six fully open models from 0.9B to 375B with weights, code and data (IFM, 3 September): [IFM](https://ifm.ai/k2/press-release/) (5 min)
- **Three world-model releases**: World Labs' Atlas (1 September), Runway's GWM Worlds 2 (3 September) and Runway's Solaris, which renders a software interface frame by frame (31 August; AMD agreed on 28 September to buy World Labs for about $8.2 billion): [World Labs](https://www.worldlabs.ai/blog/atlas) (8 min), [Runway: GWM Worlds 2](https://runway.com/research/introducing-gwm-worlds-2) (5 min), [Runway: Solaris](https://runway.com/news/research/introducing-solaris) (5 min)
- **Muse Voice Transcribe**, Meta's real-time multi-speaker transcription, 25 languages validated at launch (2 September): [Engadget](https://www.engadget.com/2249112/meta-new-ai-transcription-model-can-distinguist-between-multiple-speakers-and-languages-in-real-time/) (4 min)
- **TimesFM-3**, Google's 330M zero-shot multivariate forecasting model (31 August): [Google Research](https://research.google/blog/timesfm-3-a-zero-shot-foundation-model-for-multivariate-forecasting/) (6 min)

## Research and papers
- **HarnessDev: can LLMs create and evolve their own agent harness?** (1 September): [arXiv 2609.01437](https://arxiv.org/abs/2609.01437) (45 min)
- **Repo-To-Skill: distilling GitHub repositories into skills for ML agents** (2 September): [arXiv 2609.02749](https://arxiv.org/abs/2609.02749) (45 min)
- **Terminal-Universe: turning agent trajectories into terminal environments** (Qwen team and collaborators, 3 September): [arXiv 2609.04148](https://arxiv.org/abs/2609.04148) (40 min)
- **A 397B RL post-training recipe in full** (Mercor with SkyRL, 1 September): APEX-Agents Pass@1 from 16.11% to 27.29% after RL on 1,928 expert tasks: [Mercor](https://www.mercor.com/blog/training-frontier-knowledge-work-agents-a-397b-rl-training-guide-with-skyrl/) (25 min)
- **Thomson Reuters' 397B domain model on Qwen3.5 for $40 million in three months**, with a 35B sibling for non-commercial use (The Batch, 4 September): [The Batch](https://www.deeplearning.ai/the-batch/custom-models-for-law-news-and-finance) (6 min), [arXiv 2608.27147](https://arxiv.org/abs/2608.27147) (40 min)
- **44% on ARC-AGI-1 for 67 cents** of total compute with a small transformer trained from scratch on one RTX 5090 (a different benchmark and accounting from the Astra runs): [Write-up](https://mvakde.github.io/blog/44-on-arc-1/) (10 min)
- **AI Research Preference Models**, ranking experiments before spending GPU hours (Meta FAIR; on arXiv since 14 August): [arXiv 2608.13940](https://arxiv.org/abs/2608.13940) (35 min)
- **Other top Hugging Face papers**: Compile by Training ([arXiv 2609.04199](https://arxiv.org/abs/2609.04199) (30 min)), StudentSim ([arXiv 2609.01591](https://arxiv.org/abs/2609.01591) (30 min)), Qwen-Drive-1.0 ([arXiv 2609.00111](https://arxiv.org/abs/2609.00111) (30 min)), LLaDA-Image ([arXiv 2609.03796](https://arxiv.org/abs/2609.03796) (30 min)), Aspire ([arXiv 2608.31111](https://arxiv.org/abs/2608.31111) (30 min))

## Industry
- **Anthropic has contracted about 14.8 GW of compute and may spend up to $517 billion over a decade** (The Information's own estimate, 6 September), plus a $35 billion cloud deal with Lambda: [Techmeme](https://www.techmeme.com/260906/p7) (1 min), [Proactive](https://finance.yahoo.com/technology/ai/articles/anthropic-strikes-35-billion-cloud-155100165.html) (3 min)
- **OpenAI's "automated research intern" milestone** (6 September): 3.1 agent-workdays per human workday; after the cyber incidents Astra-class GPU allocation fell 59.2%, though OpenAI's total fell only about 2%: [The Neuron](https://www.theneuron.ai/news/openai-ai-research-acceleration-alignment-slowdown/) (8 min)
- **Jakub Pachocki: no lab has solved alignment and monitoring enough "to continue responsibly scaling at maximum speed for much longer"** (6 September): [The Neuron](https://www.theneuron.ai/news/openai-ai-research-acceleration-alignment-slowdown/) (8 min)
- **OpenAI is ending Cursor's model access on 12 November**, after SpaceX's acquisition (covered on 31 August): [CNBC](https://www.cnbc.com/2026/08/29/openai-cursor-spacex-model-access.html) (4 min)
- **Cognition raising about $1B at a $47B valuation**, revenue past $900M (Bloomberg via Tech Funding News): [Tech Funding News](https://techfundingnews.com/cognition-heads-for-47b-valuation-as-devin-revenue-nears-1b/) (3 min)
- **Thinking Machines in talks for $1B at $40B**: [Tech Funding News](https://techfundingnews.com/thinking-machines-in-talks-for-1b-at-40b-valuation-as-mira-muratis-ai-lab-races-ahead/) (3 min)
- **Authors push back as publishers and agents claim shares of the $1.5B Anthropic settlement** (6 September): [TechCrunch](https://techcrunch.com/2026/09/06/authors-push-back-as-publishers-and-agents-seek-share-of-anthropic-settlement/) (4 min)
- **35 music publishers, Sony and Warner among them, sued Anthropic over lyrics used in training** (filed 28 August): [Al Jazeera](https://www.aljazeera.com/economy/2026/8/31/sony-warner-music-sue-anthropic-saying-it-pirated-songs-to-train-its-ai) (4 min)
- **ChatGPT Ads reached a $1 billion annualised run rate** in under 200 days (31 August): [MediaPost](https://www.mediapost.com/publications/article/417561/chatgpt-ads-reaches-1b-annualized/) (3 min)
- **The US backed fair use for AI training**, in the New York Times case (1 September) and to the G20 (2 September); the EU AI Act's transparency obligations had applied since 2 August: [TechCrunch](https://techcrunch.com/2026/09/02/u-s-government-sides-with-openai-on-issue-of-training-llms-on-copyrighted-material/) (4 min), [Help Net Security](https://www.helpnetsecurity.com/2026/08/04/eu-ai-act-enforcement-ai-models/) (4 min)
- **John Ternus became Apple's CEO**, Tim Cook executive chair (1 September): [Al Jazeera](https://www.aljazeera.com/economy/2026/9/1/john-ternus-succeeds-tim-cook-as-apple-ceo-after-15-years) (3 min)
- **The FTC and 22 states sued Amazon over hidden ad surcharges** (31 August): [CNBC](https://www.cnbc.com/2026/08/31/amazon-ftc-lawsuit-advertisers.html) (4 min)

## Tools and agents
- **Claude Code 2.1.257 to 2.1.261** (1 to 4 September): Fable 5.1 as the default Fable model, organisation-managed MCP servers, `--permission-prompts none` for headless hosts, `/skill-doctor`: [Changelog](https://code.claude.com/docs/en/changelog) (5 min)
- **Muse Code got Muse Spark 1.3 as its default model** (Meta's terminal coding agent, launched 5 August): [Meta](https://dev.meta.ai/) (3 min)
- **Spotify's Portal cut one engineer's Claude Code token use by 90%** by routing bulk reads and boilerplate to a cheap model (3 September; the 90% is the mean bulk-read saving over four scenarios in one repository): [Spotify Engineering](https://engineering.atspotify.com/2026/9/portal-by-spotify-cut-my-claude-code-token-usage-by-90) (8 min)
- **An architecture playbook for a reliable agent harness** (2 September): [Stencil](https://stencil.so/blog/harness-playbook) (48 min)
- **Baseten: the efficient frontier of LLM inference**, separating techniques that trade along the frontier from those that move it (1 September): [Baseten](https://www.baseten.co/blog/the-efficient-frontier-of-llm-inference/) (12 min)
- **Terminal-Bench 4.0** replaces 3.0: 8 tasks removed, 19 fixed, a flat 8-hour agent timeout: [tbench.ai](https://www.tbench.ai/news/terminal-bench-4-0) (5 min)
- **On-device inference**: Hugging Face's 207 WebGPU kernels, and Perplexity's Lily engine for Qwen3.6-35B-A3B on Apple silicon (about 1.35x MLX-LM's decode): [Hugging Face](https://huggingface.co/blog/webgpu-kernels) (8 min), [Perplexity](https://www.perplexity.ai/hub/blog/optimizing-on-device-inference-for-apple-silicon) (10 min)
- **Simon Willison on Tencent Hy4** (29 August): [Simon Willison](https://simonwillison.net/2026/Aug/29/hy4/) (4 min)

## Hacker News
- **"LLMs as a Cognitive Virus"**, the week's top story, and a thread that pushed back (398 points, 256 comments when read): [HN thread](https://news.ycombinator.com/item?id=49580164) (10 min)
- **"AI handles incidents, engineers lose touch with their systems"**, on automated incident response eroding operational skill (418 points, 351 comments when read)
- **"Can AI design circuit boards yet?"**, frontier models on PCB design (the post itself was not found): [eebench.org](http://eebench.org) (3 min)
