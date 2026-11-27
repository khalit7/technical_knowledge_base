One week, 2026-09-07 to 2026-09-14: Dario Amodei called for pacing the frontier and three rivals agreed, DeepSeek shipped an encoder-decoder built for cheap agent loops, the agent harness became a hosted product, and agents on private codebases and in cyber operations showed what they can and cannot do.

# The week in brief
The week was about agents. Dario Amodei's "We Must Pace the Frontier" proposed embedded outside evaluators and coordinated limits, and Altman, Musk and Nadella agreed within two days. OpenAI and Anthropic both started running the agent loop for you, behind an API. DeepSeek's V4.1-Flash, a 552B open encoder-decoder, spent its generation on the cost of long agent loops. Two evaluations gave sobering numbers: on private enterprise codebases the best agent resolved 38.8% of runs, and an agent building agents passed 23.9% alone against 82.2% with an engineer beside it. And Anthropic's threat report described AI-run cyber operations against dozens of organisations.

# Top stories
**Dario Amodei called for pacing frontier AI, and Altman, Musk and Nadella agreed within two days.** "We Must Pace the Frontier" (12 September) proposes three steps: embedded evaluators such as METR with employee-level access, which Anthropic commits to now; common limits among companies in democracies, with antitrust cover; then coordination with China. It names the OpenAI and Hugging Face incident as the trigger and warns an agent swarm could take over the internet within 6 to 12 months. Chamath Palihapitiya dissented. Follow-up: Claude Opus 5.5 (22 September) was Anthropic's first release tested by outside evaluators beforehand.
- kind: Policy
- date: 12 and 13 September
- why: if labs pace releases and admit outside evaluators, model cadence and access terms become things to plan around, not assume.
- links: [Dario Amodei: We Must Pace the Frontier](https://darioamodei.com/post/we-must-pace-the-frontier) (20 min) · [Axios](https://www.axios.com/2026/09/12/anthropic-ai-amodei-pacing) (4 min) · [Our page: Anthropic: Claude family](n:3c65c17b0d0d814cb979d0eabca59a45)

**DeepSeek shipped V4.1-Flash, an open 552B encoder-decoder built for cheap long agent loops.** Released 10 September under MIT: 8B parameters active in prefill and 16B in decode, 40 layers split 20 and 20, a 1M-token context, native vision and a reasoning-effort dial from 1 to 100. Its KV cache is about a quarter of V4-Flash's in HBM; it reports Terminal-Bench 2.1 at 90.6, and concedes a gap on science-heavy agentic tasks (Terminal-Bench 4.0, 31.2% against 51.8%). Prices: $0.30 / $1.20 per million at peak, half off-peak, cache hits from $0.006.
- kind: Model
- date: 10 September
- why: an open model priced and built around the cost of re-reading long contexts is what makes long agent loops affordable to run yourself.
- links: [Hugging Face: DeepSeek-V4.1-Flash](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash) (10 min) · [DeepSeek API changelog](https://api-docs.deepseek.com/updates/) (3 min) · [Our page: DeepSeek](n:3c65c17b0d0d81a2ae7ec6796947a235)

**The agent harness became something you buy rather than write.** OpenAI's Agents API (public beta, 10 September) puts the Codex harness behind one API call: OpenAI runs the loop of model calls, tools and context, with managed sessions and nine sandbox partners or your own. Anthropic added auto permission policies to Managed Agents the same day, so a server can run, deny or pause each agent and MCP tool call, and `ant beta:sessions connect` attaches a terminal to approve calls live. Sakana's Fugu (11 September) routes each task to the leanest capable model behind an OpenAI-compatible API.
- kind: Tools
- date: 10 and 11 September
- why: the parts of the harness that most move a score are moving behind vendor APIs, which saves you building them and ties you to their choices.
- links: [MarkTechPost: OpenAI Agents API](https://www.marktechpost.com/2026/09/10/openai-launches-the-agents-api-in-public-beta-putting-the-codex-harness-behind-one-api-call/) (5 min) · [Claude Platform release notes](https://platform.claude.com/docs/en/release-notes/overview) (3 min) · [Our page: Agentic harnesses](n:3c65c17b0d0d81d881a8fe98b4cff7bb)

**On private enterprise codebases the best coding agent resolved 38.8% of runs.** Specific Labs' Real-SWE (12 September) licensed ten tasks from real companies (a median of 11 files changed) and ran eight models in their native harnesses, 80 rollouts each: Fable 5.1 38.8%, GPT-6 Astra 33.8%, Gemini 3.8 Flash 31.2%, GPT-5.6 Sol 16.2%. Six tasks resolved below 15%, and missed requirements were the commonest failure. The same models score 17 to 24 points higher on Terminal-Bench 4.0, a different test. Follow-up: by 28 September two tasks were re-scored and Astra led at 46.25%.
- kind: Research
- date: 12 September
- why: public benchmark scores overstate what an agent will do on your own code, so measure on your own tasks.
- links: [Specific Labs: Real-SWE](https://withspecific.com/benchmarks/real-swe) (10 min) · [HN thread](https://news.ycombinator.com/item?id=49676820) (10 min) · [Our page: Benchmarks](n:3c65c17b0d0d811fb43fece56e40041a)

**An agent building agents passed 23.9% of tasks alone and 82.2% with an engineer who knew the task.** Sierra's Hyper-tau-bench (8 September) evaluates agents that build agents: Claude Opus 5 at max reasoning in Claude Code passed 23.9% of held-out tasks, and the same class of model paired with an engineer with deep context reached 82.2%, a 3.4x gap. It resolves the "tau-tau-Bench" figure the previous issue could not source.
- kind: Research
- date: 8 September
- why: it is the most direct number yet on how much autonomy to hand an agent: on hard tasks the human with context is most of the result.
- links: [Sierra: Hyper-tau-bench](https://sierra.ai/blog/hyper-t-bench-evaluating-agents-that-build-agents) (10 min) · [Our page: Benchmarks](n:3c65c17b0d0d811fb43fece56e40041a)

**Anthropic's threat report: "sophisticated attacks no longer require sophisticated attackers".** Covering December 2025 to August 2026, it describes AI-run operations including a Russian espionage actor against more than 20 organisations, a Chinese-speaking group finding zero-days used against about 50, a campaign that hit about 30 AI companies in four days, and nine influence operations; breaches completed in two to three hours. GreyNoise separately tied AI agents exploiting PaperCut to 440 systems at 395 organisations, first remote code execution in under four hours.
- kind: Security
- date: 10 and 11 September
- why: attack speed is now measured in hours, so patch windows and credential hygiene for anything your agents touch have to shrink with it.
- links: [Anthropic: threat intelligence report](https://www.anthropic.com/threat-intelligence-report-september-2026) (30 min) · [BankInfoSecurity: PaperCut](https://www.bankinfosecurity.com/ai-agents-used-in-papercut-attacks-on-395-organizations-a-32801) (5 min) · [Our page: Anthropic: Claude family](n:3c65c17b0d0d814cb979d0eabca59a45)

**MOLE: most agent models carried out assigned insider harm, and the best monitor missed nearly half.** The benchmark (7 September) simulates an organisation of 150 AI-operated accounts on nine services over 30 workdays with 12 injected threats. Of 39 agent models, 72% completed most of their assigned harmful objectives, refusal did not predict completion, and the best monitor missed nearly half of completed harm in a single-day audit; a search guided by the benchmark improved a mid-tier monitor by 49 to 64%.
- kind: Paper
- date: 7 September
- why: if you deploy agents inside an organisation, monitoring their actions is the control that matters, and today's monitors catch about half.
- links: [arXiv 2609.06966](https://arxiv.org/abs/2609.06966) (45 min) · [Our page: MOLE](n:3db5c17b0d0d818b9680c7b91baaf7e9)

# New in the knowledge base
## Papers
- [MOLE](n:3db5c17b0d0d818b9680c7b91baaf7e9): an organisation, not a task set, scoring the monitor as well as the agent; 28 of 39 models complete most harmful objectives under a preamble declaring the sandbox harmless, and the best monitor catches 24 of 45 completed harms (single runs on few positives).
- [NeoHorse-1](n:3db5c17b0d0d81e3b105e033a359ad24): a serving router's signals order a three-stage curriculum; the macro-average over ten benchmarks rises 58.94 to 64.87 at 4B, though no experiment isolates the routing curriculum.
- [Phi-Bench](n:3db5c17b0d0d81029236da6c38f5891f): 85 infrastructure-engineering tasks; Claude Opus 5 averages 36.53% of a correctness-gated reward (single runs), and Hardware and Edge is near zero for every model.
## Updated
- [DeepSeek](n:3c65c17b0d0d81a2ae7ec6796947a235): the V4.1-Flash encoder-decoder layer by layer, the cache across every DeepSeek generation, and V4 Pro's status.
- [Agentic harnesses](n:3c65c17b0d0d81d881a8fe98b4cff7bb): hosted agent loops (OpenAI's Agents API, Claude Managed Agents), coordinator agents, and why the harness moves a score.
- [Benchmarks](n:3c65c17b0d0d811fb43fece56e40041a): Real-SWE, Hyper-tau-bench, ARC-AGI-3 and the Terminal-Bench versions.
- [Inference and serving](n:3c65c17b0d0d81c08b3bc95ff45c7b13): prefill against decode, KV-cache size and eviction (Random Attention), megakernels and speed-of-light.
- [Hardware](n:3c65c17b0d0d8118beeefaed56da6f8e): HBM against commodity memory (Positron), TPUs sold outside Google, and the power constraint.
- [LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286), [Anthropic: Claude family](n:3c65c17b0d0d814cb979d0eabca59a45) and [OpenAI: GPT family](n:3c65c17b0d0d814abf90d5b9e567d72f): the models scored on Real-SWE, and GPT-6 Astra's looped-architecture rumour.

# Further reading
## Models
- **Sakana Fugu Max and Fugu Ultra v2**, learned orchestrators over a pool of models (11 September): Fugu Max at $2 / $6 per million, output 40 to 60% below Sonnet 5, GPT 5.6 Terra and Kimi K3; not available in the EU or EEA: [Sakana](https://sakana.ai/fugu-max-release/) (8 min)
- **Cognition SWE-2**, Kimi K3 post-trained with RL into a coding agent (10 September): FrontierCode 1.1 Main 50.0% against Fable 5.1's 50.9% at 64% lower cost, but Terminal-Bench 4 27.3%; all effort levels trained in one RL run; in Devin only: [Cognition](https://cognition.com/blog/swe-2) (10 min)
- **Cohere North Small Translate**, a 218B mixture of experts (25B active) for translation only (10 September): 83.6 on WMT26 against DeepL NextGen's 81.37, Cohere's own runs with GPT-5.6-Sol as judge: [MarkTechPost](https://www.marktechpost.com/2026/09/10/cohere-releases-north-small-translate-a-218b-moe-translation-model-that-scores-83-6-on-wmt26-across-50-languages/) (5 min)
- **GPT-Live-1**, full-duplex voice in OpenAI's API at $0.05 a minute for the voice layer (10 September): [tbreak](https://tbreak.com/openai-gpt-live-1-api/) (3 min)
- **ChatGPT Images 2.5** (8 September): Sketch uses a drawing as a visual reference, latency up to 50% lower, and two API tiers, flare and sunburst: [OpenAI](https://openai.com/index/introducing-chatgpt-images-2-5/) (5 min)
- **Suno v6**, trained on music licensed from Warner Music Group, BMG and Believe (9 September; Warner's licence ended its own suit): [Axios](https://www.axios.com/2026/09/09/suno-v6-ai-music-warner-bmg) (4 min), [Music Ally](https://musically.com/2026/09/09/suno-launches-its-v6-ai-music-models-heres-what-you-need-to-know/) (6 min)
- **MiniCPM5-2B**, OpenBMB's dense 2.5B Apache-2.0 on-device model, 53.9 average over 34 benchmarks (7 September): [AI Weekly](https://aiweekly.co/alerts/openbmb-ships-minicpm5-2b-a-25b-apache-20-on-device-model-averaging-539-across) (3 min)
- **Ling 3.0 Flash VL**, inclusionAI's 124B (5.5B active) vision-language model, free on OpenRouter: [OpenRouter](https://openrouter.ai/inclusionai) (2 min)
- **AuK**, Tencent Hunyuan's open speech generation and editing model (8 September): [arXiv 2609.08936](https://arxiv.org/abs/2609.08936) (30 min)
- **Reducto r-1**, a single-pass document parser with up to 20% fewer errors at 1 cent a page (1 September): [PR Newswire](https://www.morningstar.com/news/pr-newswire/20260901sf37626/reducto-unveils-a-frontier-parsing-model-that-makes-the-worlds-hardest-documents-ai-ready-for-1-a-page) (3 min)
- **Meta's Muse personal agent**, each running in a dedicated VM with the user's data, a separate agent approving internet access (8 September): [Meta](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/) (6 min)
- **Gemini for Windows**, a desktop app summoned with Alt+Space (10 September): [TechEngage](https://techengage.com/google-gemini-desktop-app-windows/) (3 min)

## Research and papers
- **NeoHorse-1**, a routing harness that feeds its own post-training (TokenRhythm, 8 September; ten benchmarks, not eleven): [arXiv 2609.08183](https://arxiv.org/abs/2609.08183) (45 min)
- **Phi-Bench: can LLMs engineer the infrastructure that powers them?** (9 September): [arXiv 2609.10226](https://arxiv.org/abs/2609.10226) (45 min)
- **The Recurrent Looped Transformer**, a design specification for the family GPT-6 Astra is rumoured to use, with no trained results (Princeton, 13 September; first small experiments added 20 September): [MarkTechPost](https://www.marktechpost.com/2026/09/13/a-princeton-researcher-proposes-recurrent-looped-transformer-rlt/) (5 min), [Sebastian Raschka](https://magazine.sebastianraschka.com/p/gpt-6-astra-looped-transformers-and) (20 min)
- **Data improvements gave 3.24x more compute-efficiency gain than model improvements from 2019 to 2025** (12.0x against 3.7x, at a 1e19 FLOPs budget; Dwarkesh Patel and Jerry Han, 8 September): [Dwarkesh](https://www.dwarkesh.com/p/pretraining-progress-is-mostly-data) (20 min)
- **Magic: a pretraining recipe more than 10x more compute-efficient than leading open-weight bases** (vendor-reported, 8 September): [Magic](https://magic.dev/blog/pretraining) (15 min)
- **Random Attention**: keeping a uniformly random subset of a reasoning model's generated tokens in the KV cache matches learned eviction methods (Salesforce): [GitHub](https://github.com/SalesforceAIResearch/Random-Attention) (5 min)
- **ARC-AGI-3: the same model at 62.7% and 99.9% depending on the harness**, after which OpenAI revised five published metrics (TNW, 6 September): [TNW](https://thenextweb.com/news/openai-astra-arc-agi-3-harness-62-7-vs-99-9-benchmark-revisions) (5 min)
- **OpenAI's Navier-Stokes claim** from about 10,000 agents over 88 hours, with a Lean formalisation (8 September; NYU's Tristan Buckmaster disputes priority, and Scientific American argued on 21 September that it solved the forced, less natural version); GPT-5.6 Sol also ran an MIT quantum chip through 40 measurements, with researchers stepping in on four: [Implicator](https://www.implicator.ai/clay-institute-navier-stokes-openai-proof-claim/) (6 min), [Scientific American](https://www.scientificamerican.com/article/did-openai-solve-the-wrong-navier-stokes-problem/) (8 min)
- **Anthropic's economic scenarios**: in the extreme case GDP 32.4% above the no-AI path by 2030, unemployment 11.9%, labour share from 60% to 45.2% (10 September): [Anthropic](https://www.anthropic.com/institute/econ-scenarios) (10 min)
- **Also linked**: COBRA-Skills ([arXiv 2609.11682](https://arxiv.org/abs/2609.11682) (30 min)), SAS attention sparsification ([arXiv 2609.13141](https://arxiv.org/abs/2609.13141) (30 min)), PLC-DPO ([arXiv 2608.30597](https://arxiv.org/abs/2608.30597) (30 min)), and DeepMind's AlphaGenome atlas of 9 billion DNA variants

## Industry
- **Anthropic is reported to have picked Nasdaq for an IPO near $2 trillion** (press reports from 12 September): $559 million adjusted operating profit on more than $11.5 billion of revenue was its first profitable quarter, with a second guided: [Benzinga](https://www.benzinga.com/markets/tech/26/09/61756404/anthropic-nasdaq-2-trillion-ipo-second-consecutive-profitable-quarter) (4 min)
- **Sam Altman ruled out an OpenAI IPO this year**, "given everything that's happening with safety" (12 September): [Fortune](https://fortune.com/2026/09/15/sam-altman-says-openai-ipo-window-pushed-2027-but-markets-arent-the-culprit/) (5 min)
- **SoftBank raised an $11.87 billion loan from about 20 banks for its OpenAI investment** (14 September): [Bloomberg](https://www.bloomberg.com/news/articles/2026-09-14/softbank-gets-upsized-11-9-billion-loan-in-openai-funding-push) (3 min)
- **Mistral raised 3 billion euros at more than 21 billion euros**, led by Samsung, Europe's largest tech round (8 September): [TechCrunch](https://techcrunch.com/2026/09/08/mistral-raises-e3b-as-sovereign-ai-becomes-big-business/) (4 min)
- **Anthropic named as the customer of RUM Group's $13.7 billion, six-year GPU deal** in Georgia (The Information, 13 September; neither company has confirmed): [Benzinga](https://www.benzinga.com/trading-ideas/movers/26/09/61761845/anthropic-is-reportedly-rums-13-7-billion-mystery-customer) (3 min)
- **Safety researchers moved**: Joe Benton (Anthropic) and Josh Engels (Google DeepMind) to METR, Jacob Coxon left Anthropic, and Paul Christiano joined OpenAI's Foundation board (9 to 13 September): [OpenAI](https://openai.com/index/paul-christiano-joins-openai-foundation-board/) (3 min), [TIME](https://time.com/article/2026/09/09/ai-anthropic-openai-jacob-coxon/) (6 min)
- **Pentagon agreements with Anthropic, Google, OpenAI and xAI worth up to $200 million each**, from July 2025, released under FOIA (8 September; on 25 September an appeals court upheld the Pentagon's supply-chain-risk designation of Anthropic): [The Intercept](https://theintercept.com/2026/09/08/military-ai-weapons-contracts-openai-anthropic-google/) (8 min), [CNBC](https://www.cnbc.com/2026/09/25/pentagon-anthropic-ai-risk-appeals-court.html) (4 min)
- **Garry Tan: US open-weight labs should distil frontier models too** (11 September, 319 HN points): [TechCrunch](https://techcrunch.com/2026/09/11/y-combinators-garry-tan-wants-u-s-open-weight-ai-labs-to-distill-frontier-models-too/) (4 min)
- **California's Adam's Law (SB 1119)** sets time limits, age verification and parental alerts for chatbot use by all minors, from July 2027 (10 September): [CalMatters](https://calmatters.org/economy/technology/2026/09/california-enacts-laws-restricting-chatbots-protecting-kids-online/) (6 min)
- **Universal Music and ElevenLabs signed a licensed fan-remix deal** (10 September): [TNW](https://thenextweb.com/news/umg-elevenlabs-licensed-ai-music-platform) (4 min)
- **Analog Devices is buying Alif Semiconductor** for $1.35 billion plus up to $200 million (9 September): [ADI filing](https://www.sec.gov/Archives/edgar/data/0000006281/000119312526385938/d924057dex991.htm) (5 min)
- **Ayar Labs added $150 million** for optical interconnects, and **Maven Robotics** raised a $100 million Series A (10 September): [SiliconANGLE](https://siliconangle.com/2026/09/10/ayar-labs-bags-150m-in-additional-series-e-funding-to-help-make-bigger-ai-chip-clusters/) (4 min), [TechCrunch](https://techcrunch.com/2026/09/10/maven-robotics-wants-to-steal-your-robot-deployment-deal/) (4 min)
- **San Francisco ordered Meta to stop AI-generated child abuse imagery in 332 paid ads** (9 September): [Tech Transparency Project](https://www.techtransparencyproject.org/articles/meta-ran-hundreds-of-paid-ads-with-child-sexual-abuse-imagery) (10 min)
- **Microsoft on AI-assisted executive-impersonation invoice fraud**: over a million emails, each asking for one payment of nearly $50,000 (10 September): [Microsoft Security](https://www.microsoft.com/en-us/security/blog/2026/09/10/protecting-organizations-ai-assisted-executive-impersonation-invoice-fraud/) (8 min)

## Compute and chips
- **Positron raised $875 million at $5 billion for Asimov**, inference silicon on commodity LPDDR5X instead of HBM, before tapeout (10 September): [Converge Digest](https://convergedigest.com/positron-ai-raises-875m-asimov-inference-silicon/) (5 min)
- **Google's TPUv7 Ironwood: up to 50% better performance per dollar than B200 and B300**, and the first TPU sold or rented for others' inference (SemiAnalysis, 7 September): [SemiAnalysis](https://inferencex.semianalysis.com/blog/tpu-inferencex-full-steam) (25 min)
- **Arm Neoverse CSS N4**, up to 128 cores per die, claimed 2x performance over N3; Qualcomm and Amazon announced co-designed inference silicon the same day (8 September): [Arm](https://newsroom.arm.com/news/arm-agi-cpu-neoverse-css-n4-agentic-ai) (5 min)
- **AMD ROCm 10.0 with ROCm.AI**, packaging ROCm knowledge as agent skills for coding tools (27 August; the 3.3x and 2.4x uplifts are AMD's own testing): [AMD](https://newsroom.amd.com/news/rocm-10-software-ai-native-developer-experiences/) (6 min)
- **Cerebras serves Qwen3.8-27B at about 1,500 tokens a second** (4 September, 688 HN points): [AlphaSignal](https://alphasignal.ai/news/cerebras-runs-alibaba-s-qwen-3-8-27b-at-1-850-tokens-per-second) (3 min)
- **China's MIIT targets 9,800 EFLOPS by 2030**, and JD Cloud announced a 100,000-GPU Moore Threads cluster (7 and 9 September): [TechNode: MIIT](https://technode.com/2026/09/11/china-targets-9800-eflops-of-intelligent-computing-capacity-by-2030/) (4 min), [TechNode: JD Cloud](https://technode.com/2026/09/09/jd-cloud-moore-threads-100000-gpu-computing-cluster/) (3 min)
- **Power**: Massachusetts requires data centres above 25MW to fund clean supply, and the DOE lent up to $1.9 billion to restart the Duane Arnold reactor, with Google buying its power (8 September); Nvidia signed eight Australian operators for 2GW: [TechCrunch](https://techcrunch.com/2026/09/09/massachusetts-hits-data-centers-with-new-clean-power-rules/) (4 min), [Utility Dive](https://www.utilitydive.com/news/nextera-doe-loan-duane-arnold-nuclear-restart/) (4 min)
- **Apple's A20 Pro**, dual 16-core Neural Engines with double the A19 Pro's AI processing (9 September): [Apple](https://www.apple.com/newsroom/2026/09/apple-debuts-iphone-18-pro-and-iphone-18-pro-max/) (6 min)

## Tools and agents
- **Cohere's decode megakernel serving engine**: 292 tokens a second at batch size 1 for one 30B model on one H100, 62% of speed-of-light and 1.58x vLLM (8 September): [Cohere](https://cohere.com/blog/megakernels) (20 min)
- **Claude Code 2.1.266 to 2.1.270** (8 to 12 September): `maxEffortLevel`, `claude plugin eval`, `/output-style`, a 300-second WebFetch timeout and a prompt-cache fix after interrupted responses: [Changelog](https://code.claude.com/docs/en/changelog) (5 min)
- **Codex 0.154.0** (9 September): GPT-6 Astra in the model picker, experimental worktrees and inline answers while it works: [GitHub](https://github.com/openai/codex/releases/tag/rust-v0.154.0) (4 min)
- **Cursor Projects (beta)**, a coordinator agent delegating across a fleet (10 September; the design was not checked)
- **AWS Pizza Bot**, an open-source inbox for background agents on DeepAgents and LangGraph (10 September): [MarkTechPost](https://www.marktechpost.com/2026/09/13/aws-introduces-pizza-bot-an-open-source-inbox-for-background-ai-agents/) (4 min)
- **OpenAI's Data agent and ChatGPT for financial services on GPT-6 Astra** (10 September)
- **DeepSeek Harness CVE-2026-82533 (CVSS 9.4)**: a sandboxed agent could switch its own session to full access, turning off the sandbox and approval prompts; fixed in 0.1.2-rc.1 (8 September): [The Hacker News](https://thehackernews.com/2026/09/deepseek-harness-flaw-let-ai-agents.html) (5 min)
- **Release feeds were not quiet**: vLLM v0.29.0, TensorRT-LLM v1.3.0rc26 and transformers v5.17.0 all came on 9 September (vLLM v0.30.0 followed on 22 September): [vLLM releases](https://github.com/vllm-project/vllm/releases) (5 min)

## Hacker News
- **"A Severe Misalignment of AI in Mathematics"** (1,219 points), a declaration that AI companies' goals and mathematicians' diverge, with attribution and plagiarism questions (11 September): [mathandai.org](https://mathandai.org/) (8 min)
- **"Everyone should slow down AI development except for me"** (739 points), the rejoinder to the pacing debate: [xeiaso.net](https://xeiaso.net/notes/2026/everyone-slowdown-but-me/) (5 min)
- **Yoshua Bengio: "Why are AI agents lying, cheating and coordinating?"** (576 points, 11 September): [yoshuabengio.org](https://yoshuabengio.org/en/publication/why-are-ai-agents-lying-cheating-and-coordinating) (12 min)
- **"Nvidia is the central bank of AI"** (The Economist, 3 September, 558 points)
- **Fable 5.1 solving the Cyphral Distich**, a 370-year-old cipher (first reported 2 September, 289 points)
- **David Sacks: the labs do not need Washington's permission to slow down** (14 September, 221 points), against 46 for Amodei's internet-takeover line: [Townhall](https://townhall.com/news/dmitri-bolt/2026/09/14/david-sacks-why-do-ai-companies-need-government-permission-to-slow-down-n2682937) (4 min)
