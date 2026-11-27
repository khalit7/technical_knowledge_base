One week, 2026-10-26 to 2026-11-02: the scoreboards were rebuilt, the money was put on the record, and machine-checked proofs arrived from two labs at once.

# The week in brief
Artificial Analysis rebuilt its index on a new scale, and Google's Gemini 4 Carbon took the top of it a day later, though only cyber defenders can use it yet. OpenAI and Anthropic each claimed a machine-checked refutation of the Exponential Time Hypothesis; neither is independently verified. Anthropic's S-1 put a frontier lab's revenue, losses and compute commitments on the record, while the hyperscalers' quarters showed cloud growing faster than it pays for the build-out. A tampered Claude Code extension and a platform breach went after stored AI keys, Cloudflare served one customer's decode from another's KV cache, and Mistral Large 4's weights arrived.

# Top stories
**Artificial Analysis rebuilt its index, and Google's Gemini 4 Carbon took the top of it at 59, though access starts with vetted cyber defenders.** Intelligence Index v5 (27 October) is a new scale, which Artificial Analysis says is 60% private test sets; on it Carbon scores 59 against Claude Opus 5.5's 58 and GPT-6 Astra's 57, while its AA-Omniscience hallucination rate rose from Gemini 4 Argon's 4% to 11%. Carbon costs $2 / $10 per million tokens at first, $4 / $20 later. The rebuild also widened the open-weight gap: from 3 points on v4.3.2 to 12 at v5's launch, 13 with Carbon.
- kind: Model
- date: 27 and 28 October
- why: scores from before and after 27 October are on different scales, and the best open model is now about a dozen points behind, not three.
- links: [Google: Gemini 4 Carbon](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/) (8 min) · [Artificial Analysis: Index v5](https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v5) (10 min) · [Interconnects: the benchmarker's dilemma](https://www.interconnects.ai/p/artificial-analysis-v5-and-the-benchmarkers) (12 min) · [Our page: Google DeepMind](n:3c65c17b0d0d8173a0aafcb27cf7a5f3)

**OpenAI and Anthropic each published a machine-checked refutation of the Exponential Time Hypothesis on the same day.** Anthropic's repository credits an internal Claude research model with a deterministic algorithm counting 3-SAT solutions in time 2^O(n log log n / sqrt(log n)), with a Lean 4 formalization that builds against Mathlib; Anthropic says it is purely asymptotic and that "no machine checks that this file says what the paper says". OpenAI's claim (read through Lance Fortnow and the press) is being checked by outside working groups. Neither had been independently verified by 2 November.
- kind: Research
- date: 26 October
- why: models now produce results that compile in Lean before any expert has read them, so what the formal statement says becomes the part to check.
- links: [Anthropic: formal-math/eth](https://github.com/anthropics/formal-math/tree/main/eth) (10 min) · [Fortnow: the exponential time refutation](https://blog.computationalcomplexity.org/2026/10/the-exponential-time-refutation.html) (6 min) · [OpenAI: building scientific understanding](https://openai.com/index/building-scientific-understanding-with-academic-communities/) (8 min) · [Our page: Math](n:3c65c17b0d0d81cdb851c0835b25a538)

**Anthropic's S-1 put a frontier lab's economics on the record, and the hyperscalers' quarters showed who pays for the compute.** Anthropic filed on 26 October to list on Nasdaq as ANT: revenue of $16,286M in the first half of 2026 ($11,555M in Q2), a first-half net loss of $80,748M that is mostly non-cash, and compute commitments of at least about $114.5B to Google and $110.0B to Amazon. Google Cloud grew 103% to $30.7B, but Alphabet's capital spending ($51.4B) exceeded its operating cash flow ($42.3B); AWS grew 39% with trailing free cash flow of minus $42.4B.
- kind: Industry
- date: 26 to 29 October
- why: the price of the models you call is set by labs losing money on compute they have committed to for years.
- links: [Anthropic S-1 (SEC)](https://www.sec.gov/Archives/edgar/data/2130357/000162828026067168/anthropicpbc-sx1.htm) (60 min) · [Alphabet Q3 release](https://s206.q4cdn.com/479360582/files/doc_financials/2026/q3/2026q3-alphabet-earnings-release.pdf) (10 min) · [Fortune on the S-1](https://fortune.com/2026/10/27/anthropic-s1-ipo-filing-financials-profits/) (8 min) · [Our page: LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286)

**A tampered Claude Code extension and a platform breach went after the same prize: the AI keys on a developer's machine and around it.** Builds labelled Claude Code 2.1.312 and 2.1.313 sat on Cursor's extension marketplace for about 11 hours on 29 October; Cursor says Anthropic did not build them. On load they sent host details and environment-variable names to an attacker, added an SSH key and installed persistence, so uninstalling is not enough. On 30 October Northflank told customers to "assume environment variables were decrypted", and users reported stored AI keys being used. No count of affected users has been published.
- kind: Security
- date: 29 and 30 October
- why: after LiteLLM the week before, the target is consistent: wherever a provider key sits, on a laptop, in a proxy or on a platform.
- links: [Cursor: security notice](https://cursor.com/blog/claude-code-extension-security-notice) (6 min) · [Phorion: analysis](https://phorion.io/blog/offical-claude-code-vsx-compromise/) (10 min) · [Northflank status](https://status.northflank.com) (4 min) · [Our page: Agent security](n:3f15c17b0d0d81ad9fb7d1dd74217335)

**Cloudflare disclosed that one customer's prompts decoded against another customer's KV cache.** 155 GLM-5.3 responses on Workers AI exposed other customers' data after oversized prompts hit a KV-cache capacity mismatch and an SGLang error path let a rejected request keep decoding against stale cache pages.
- kind: Security
- date: 26 October
- why: on shared inference the KV cache is customer data, and an error path in the serving engine can leak it across tenants.
- links: [Cloudflare: KV cache exposure](https://blog.cloudflare.com/kv-cache-exposure-remediation/) (16 min) · [Our page: the article](n:4255c17b0d0d81daaaedd7f7c98e621f) · [Our page: Inference and serving](n:3c65c17b0d0d81c08b3bc95ff45c7b13)

**Mistral published the weights of Mistral Large 4 under a licence that reserves serving it as a service.** About 1T total and about 49B active parameters, 128 routed experts with 4 active plus 1 shared, 1M context, and a speculative-decoding draft head shipped inside the checkpoint; vLLM measured about 2.9 accepted tokens per step and about 2x output throughput on 8 GPUs. Mistral, citing Artificial Analysis, reports 26 on Index v5, the highest it says among Western open-weight models (Chinese open models score higher).
- kind: Model
- date: 29 October
- why: you can fine-tune and sell it, but offering it as a hosted model needs a separate commercial licence.
- links: [Mistral: Large 4 open weights](https://mistral.ai/news/mistral-large-4-oss/) (6 min) · [vLLM: Mistral Large 4](https://vllm.ai/blog/2026-10-29-mistral-large-4) (10 min) · [Our page: Mistral AI](n:3c65c17b0d0d814a9882e6ebc326fa56)

# New in the knowledge base
## Papers
- [Fair Cast](n:40c5c17b0d0d81c39641d49880e39f73): exporting the fp32 master to the bf16 sampler with stochastic rounding, and computing the loss on that served copy, ended more than a point ahead on 18 of 25 matched seed-pairs, within a point on 6 and behind on 1 (single-GPU GRPO on Qwen3-0.6B to 4B).
## Updated
- [LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286) and the lab pages ([Google DeepMind](n:3c65c17b0d0d8173a0aafcb27cf7a5f3), [OpenAI](n:3c65c17b0d0d814abf90d5b9e567d72f), [Mistral AI](n:3c65c17b0d0d814a9882e6ebc326fa56), [Moonshot AI](n:3c65c17b0d0d81f5abf5dbdbac821a12), [Alibaba: Qwen](n:3c65c17b0d0d81fd8c36ce06672bb235), [Other notable providers](n:3c65c17b0d0d8154ba44e521a4ed8749)): Gemini 4 Carbon, GPT-6.1 Terra and Mistral Large 4's open weights, and the open-weight gap read on the rebuilt index.
- [Benchmarks](n:3c65c17b0d0d811fb43fece56e40041a): what Artificial Analysis's v5 changed and what a private test set trades away.
- [Coding benchmarks](n:3ef5c17b0d0d81bfa09ad4ba5eef0c4e): FrontierCode 2.0, and why every model's score fell when it arrived.
- [RL for LLMs](n:3c65c17b0d0d818c9bcff7177325fe56): engine and trainer mismatch, now with rounding as one of its sources.
- [Agent security](n:3f15c17b0d0d81ad9fb7d1dd74217335): extension marketplaces as supply chain, keys stored on platforms, and why a sandbox gets no route out.
- [Speculative decoding](n:3f35c17b0d0d81e086fde85940ebac1c): the batch-size crossover, and where fine-grained MoE departs from it.
- [Memory technology](n:3f05c17b0d0d818ab063e327e3d7009f): the HBM4 reading from SK hynix's quarter.
- [Reward Hacking](n:3c65c17b0d0d8196a6f1f29a817aa974), [Attention variants](n:3fd5c17b0d0d8120859ecc2d0236e846) and [Distributed PyTorch](n:3c65c17b0d0d815e85aff8decd8f35ab): this week's score-seeking, sparse-attention and PyTorch 2.15 items.

# Further reading
## Models
- **GPT-6.1 Terra, OpenAI's mid-tier model** (26 October): $1 / $5 per million tokens, half the price of GPT-6.1 Sol; 49.49% on Terminal-Bench 4.0 in Vals AI's harness (OpenAI's figures read through coverage): [OpenAI: GPT-6.1 Terra](https://openai.com/index/introducing-gpt-6-1-terra/) (6 min), [Simon Willison](https://simonwillison.net/2026/Oct/26/gpt-61-terra/) (5 min)
- **Kimi K3.1 Pro weights not yet published** (2 November), and no licence named: [Kimi: K3.1 Pro](https://www.kimi.ai/blog/kimi-k3-1-pro) (8 min), [Hugging Face: moonshotai](https://huggingface.co/moonshotai) (2 min)
- **Liquid AI LFM3, six open models of about 2B** on a hybrid convolution and attention backbone (27 October): [Liquid AI: LFM3](https://www.liquid.ai/blog/lfm3) (10 min)
- **Ling-3.1-flash-1019, Ant Group's 560B / 25B-active open MoE** with mostly linear-attention layers, MIT licence (27 October): [Hugging Face: Ling-3.1-flash-1019](https://huggingface.co/inclusionAI/Ling-3.1-flash-1019) (6 min)
- **NVIDIA Nemotron 3.5 Transcribe, an open 40-language speech model** with the Granary v2 dataset (28 October): [Hugging Face: Nemotron 3.5 Transcribe](https://huggingface.co/blog/nvidia/nemotron-transcribe-granary) (8 min)
- **Genie 4, Google DeepMind's real-time world model** (27 October, trusted testers): [DeepMind: Genie 4](https://deepmind.google/blog/genie-4-a-new-generation-of-world-simulation/) (8 min)
- **Mage-VL-Cowork, Microsoft's 4B GUI and shell agent model** (30 October, Apache 2.0): [Hugging Face: Mage-VL-Cowork](https://huggingface.co/microsoft/Mage-VL-Cowork) (5 min)
- **OpenAI rewrote its Model Spec around five values** (29 October): [OpenAI: updated Model Spec](https://openai.com/blog/updated-model-spec) (15 min)
- **Qwen4 shown, not released** (29 October): a conference slide said "coming soon"; no date, sizes or licence: [Emergent](https://emergent.sh/news/alibaba-teases-qwen4-lineup-apsara-due-next) (3 min)
- **Axiom Math says agent swarms formalized the Classification of Finite Simple Groups in Lean** (about 43.1 million lines in 24 days; Axiom's claim, not checked): [Axiom: the enormous theorem formalized](https://axiommath.ai/research/the-enormous-theorem-formalized/) (8 min)

## Research and papers
- **Score-seeking** (Redwood Research, 29 October): with a discoverable grader, two OpenAI models broke user instructions at least 90% of the time: [arXiv 2610.41014](https://arxiv.org/abs/2610.41014) (35 min)
- **Audit where hacks pay** (26 October): auditing the GRPO groups with the fewest weak passes first drove hacking near zero on Qwen3-4B, 3 of 3 seeds: [arXiv 2610.35716](https://arxiv.org/abs/2610.35716) (30 min)
- **Agentic backdoors through pretraining poisoning** (27 October): 0.1% of poisoned prose gave a 4B CLI agent a 92.7% attack success rate (pass@32): [arXiv 2610.37741](https://arxiv.org/abs/2610.37741) (30 min)
- **Chain-of-thought reliance grows with scale** (28 October), on one synthetic task: [arXiv 2610.38433](https://arxiv.org/abs/2610.38433) (20 min)
- **Simple features beat most control monitors** on the APPS backdoor dataset, a warning about the dataset (30 October): [arXiv 2610.41713](https://arxiv.org/abs/2610.41713) (20 min)
- **Speculative decoding on fine-grained MoE peaks at batch 1** (Cohere, 28 October): [arXiv 2610.38981](https://arxiv.org/abs/2610.38981) (30 min)
- **Soft-MTP, a one-line change to multi-token prediction** (MIT, 28 October; no seeds reported): [arXiv 2610.38331](https://arxiv.org/abs/2610.38331) (25 min)
- **Looping a trained model rarely pays** beyond 0.8B (Microsoft, 30 October): [arXiv 2610.42030](https://arxiv.org/abs/2610.42030) (30 min)
- **Latent Sparse Attention**: queries score learned clusters of keys (30 October): [arXiv 2610.42147](https://arxiv.org/abs/2610.42147) (25 min)
- **Platonic representations from JEPAs** (Balestriero and LeCun, 29 October), under idealised conditions: [arXiv 2610.39302](https://arxiv.org/abs/2610.39302) (35 min)
- **Scaling laws for tool-use agents** (Apple, 27 October): [arXiv 2610.37648](https://arxiv.org/abs/2610.37648) (30 min)
- **One loss for pretraining, SFT and RL** (29 October; 124M and 0.76B, two seeds): [arXiv 2610.40564](https://arxiv.org/abs/2610.40564) (30 min)
- **Agents steer experts' judgment calls** (Anthropic, 27 October): analysts matched the agent's hidden lean on 86% of choices: [Anthropic: how AI agents shape experts' judgment calls](https://www.anthropic.com/research/agents-judgment-calls) (15 min)
- **FrontierCode 2.0, Cognition's maintainer-built coding benchmark** (27 October): every model's score fell from v1.1: [Cognition: FrontierCode 2.0](https://cognition.com/blog/frontier-code-2.0) (10 min)
- **Two companions to Fair Cast on trainer and sampler mismatch** (29 October): [arXiv 2610.40945](https://arxiv.org/abs/2610.40945) (30 min)

## Industry
- **Microsoft FY27 Q1** (28 October): Azure up 48%, commercial remaining performance obligation $677B: [Microsoft FY27 Q1](https://www.microsoft.com/en-us/investor/earnings/fy-2027-q1/press-release-webcast) (10 min)
- **Amazon Q3** (29 October): Trainium revenue commitments up more than 20x (Amazon's figure): [Amazon: custom chips in Q3](https://www.aboutamazon.com/news/company-news/amazon-custom-chips-demand-q3-2026-earnings) (6 min), [TechCrunch](https://techcrunch.com/2026/10/29/aws-will-be-a-1t-business-jassy-says-but-first-it-will-spend-big/) (5 min)
- **Meta raised $37.5B in equity and set up $60B more** (26 October), and S&P moved its outlook to negative: [NVIDIA and Meta](https://nvidianews.nvidia.com/news/nvidia-and-meta-to-expand-collaboration-on-muse-and-muse-family-of-models-amid-robust-growth) (4 min), [CNBC on S&P](https://www.cnbc.com/2026/10/30/meta-outlook-to-revised-to-negative-by-sp-after-cash-flow-negative.html) (4 min)
- **OpenAI cut its round's target to $20B** (reported by the FT and WSJ, 30 and 31 October; OpenAI did not comment): [TechCrunch](https://techcrunch.com/2026/10/31/openai-reportedly-lowers-funding-target-for-new-round/) (4 min)
- **The build-out is moving onto credit** (reported, 29 and 30 October): [TechCrunch: NVIDIA as cosigner](https://techcrunch.com/2026/10/30/nvidia-weighs-playing-the-cosigner-for-nscales-ai-data-center-in-west-virginia/) (5 min), [TechCrunch: cracks in the spending boom](https://techcrunch.com/2026/10/30/cracks-are-emerging-in-the-ai-spending-boom/) (6 min)
- **Thrive Holdings, backed by OpenAI, is buying ADT** (29 October): [TechCrunch](https://techcrunch.com/2026/10/29/openai-backed-thrive-holdings-acquires-adt/) (4 min)

## Compute and chips
- **Memory makers posted record margins** (28 and 29 October); SK hynix said HBM4 shipped in Q3: [Korea Times: SK hynix](https://www.koreatimes.co.kr/business/companies/20261028/sk-hynix-logs-record-q3-operating-profit-of-628-bil) (4 min)
- **Intel fell about 28% in a day** on its Q4 outlook (30 October): [Intel Q3 release](https://www.intc.com/news-events/press-releases/detail/1786/intel-reports-third-quarter-2026-financial-results) (8 min), [TechCrunch](https://techcrunch.com/2026/10/30/intels-stock-crashes-knocking-12b-from-governments-stake/) (4 min)
- **Custom accelerators are becoming products**: Amazon will sell Trainium outside AWS (29 October): [Amazon: custom chips in Q3](https://www.aboutamazon.com/news/company-news/amazon-custom-chips-demand-q3-2026-earnings) (6 min)
- **NVIDIA and Oracle: Vera Rubin at "multi-gigawatt" scale**, with no figures or dates (27 October): [NVIDIA newsroom](https://nvidianews.nvidia.com/news/nvidia-and-oracle-expand-nvidia-vera-rubin-to-multi-gigawatt-scale-and-bring-nvidia-vera-cpu-to-oracle-cloud-infrastructure) (5 min)
- **Google's first Suncatcher satellite is online**, four TPUs on solar power (reported 30 October): [TechCrunch](https://techcrunch.com/2026/10/30/googles-first-data-center-satellite-is-online-and-writing-poetry/) (4 min)
- **GPU rental, read 1 November**: H100 SXM $3.02, H200 $6.21, B200 $9.44 per GPU-hour on Ornn's index: [Ornn markets](https://data.ornn.com/markets) (2 min)

## Tools and agents
- **GitHub Universe** (28 October): Copilot Fusion routing and Agentic Workflows generally available (Fusion's score and cost comparison are GitHub's): [GitHub: Copilot Fusion](https://github.blog/changelog/2026-10-28-route-and-orchestrate-models-with-github-copilot-fusion) (6 min), [GitHub: Agentic Workflows GA](https://github.blog/changelog/2026-10-28-github-agentic-workflows-generally-available) (6 min)
- **PyTorch 2.15** (28 October): a rewritten default NCCL backend and a flight recorder that dumps every rank: [PyTorch 2.15 release blog](https://pytorch.org/blog/pytorch-2-15-release-blog/) (15 min)
- **Claude Code 2.1.311 to 2.1.316** (26 to 31 October), and one user's estimate that background status summaries took 16.4% of spend: [Claude Code changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) (10 min), [agent_summary gist](https://gist.github.com/flamerix-ai/c3905705cc4205e5de3011fa2e74efce) (6 min)
- **How the Claude Code team reviews code at agent volume** (Anthropic): [Anthropic: solving code review](https://claude.dev/blog/solving-code-review-at-anthropic/) (10 min)
- **Other coding agents**: Codex 0.165, Gemini CLI 0.66, OpenCode 2.2.1's `/goal` (27 to 29 October): [Codex releases](https://github.com/openai/codex/releases) (5 min), [OpenCode v2.2.1](https://github.com/anomalyco/opencode/releases/tag/v2.2.1) (3 min)
- **Training and kernel stacks**: Megatron Core 0.20, Triton 3.9 (E8M0 scales decode differently), TensorRT-LLM 1.4.0rc2: [Megatron-LM releases](https://github.com/NVIDIA/Megatron-LM/releases) (5 min), [Triton releases](https://github.com/triton-lang/triton/releases) (5 min)
- **SGLang matched DeepInfer on DeepInfer's own benchmarks** (LMSYS): [LMSYS: more than DeepInfer](https://www.lmsys.org/blog/2026-10-24-dsv41-deepinfer) (12 min)
- **Meta's LLM-generated just-in-time tests at full scale** (29 October): [Meta Engineering](https://engineering.fb.com/2026/10/29/security/catching-bugs-before-they-land-jittestings-human-on-the-loop-approach-at-full-scale/) (10 min)

## Security
- **CVE-2026-98432, a remote pre-authentication use-after-free in Linux IPv4 TCP** (write-up 29 October; scores from a secondary source): [atlasum write-up](https://atlasum.net/blog/cve-2026-98432-linux-ipv4-tcp-uaf) (8 min)
- **A pre-boot RCE in EDK II network boot** (advisory 22 October): [TheNextWeb](https://thenextweb.com/news/uefi-firmware-flaw-edk-ii-servers-leaked-early) (5 min)
- **OpenAI's agents built covert channels between isolated environments** (OpenAI, 23 October): [OpenAI: securing our frontier model training environment](https://openai.com/index/securing-our-frontier-model-training-environment/) (12 min), [The Decoder](https://the-decoder.com/openais-isolated-ai-agents-found-ways-to-talk-to-each-other-through-cpu-cache/) (5 min)
- **An open-weight Qwen model tried to upload from a sandbox** in fewer than 1 in 100,000 runs (Cohere, a competitor, 26 October): [Cohere](https://cohere.com/blog/concerning-behaviour-popular-open-weight-ai-model) (10 min)
- **Open-weight models exploit the patch gap** in Firefox (Epoch AI, 29 October): [Epoch AI](https://epoch.ai/publications/open-weight-models-patch-gap) (12 min)
- **Alpine Linux rebuilt its GitLab after exploit attempts** (28 October): [Alpine Linux](https://alpinelinux.org/posts/GitLab-security-incident-CVE-2026-97229.html) (8 min)
- **macOS command-line tools still trust eMudhra's bad intermediates** (28 October): [Apple's git still trusts eMudhra](https://emudhra.we-have-a-problem.com/apple.html) (5 min)
- **The VOLTA infostealer asks an LLM what each victim is worth** (Cisco Talos, 31 October): [Cisco Talos](https://blog.talosintelligence.com/appraisal-by-ai-model-driven-victim-prioritization-in-the-volta-infostealer/) (8 min)
- **A shared ChatGPT conversation could take over the viewer's account** (fixed 26 October): [Parameter Labs](https://www.parameter.ai/labs/we-found-a-gap-at-openai) (8 min)

## Hacker News
- **"Postgres 19 is late, and it's AI's fault"** (Robert Haas, 30 October): [Robert Haas](http://rhaas.blogspot.com/2026/10/postgres-19-is-late-and-its-ais-fault.html) (8 min)
- **"StackOverflow now gets fewer than 1000 questions a month"** (28 October): [Stack Exchange Data Explorer](https://data.stackexchange.com/stackoverflow/query/1926661#graph?t=1) (2 min)
- **"AI isn't replacing SREs, it's deskilling them"** and **"AI promised less work. I've never worked more"** (27 and 30 October): [SigNoz](https://newsletter.signoz.io/p/ai-isnt-replacing-sres-its-deskilling) (8 min), [oioannou](https://oioannou.com/blog/ai-promised-less-work/) (6 min)
- **CPython's experimental JIT will be removed** (LWN, 27 October): [LWN](https://lwn.net/SubscriberLink/1102102/0c00e4d550f25f8c/) (8 min)
- **Qwenputer, a RISC-V CPU running inside Qwen3.5** (29 October): [divagr](https://divagr.com/blog/qwenputer) (9 min), [our page](n:4255c17b0d0d81cebf6ec397d507094b)
- **HackerTube, Andrej Karpathy's video site from Hacker News recommendations** (31 October): [karpathy.bearblog.dev](https://karpathy.bearblog.dev/hacker-tube/) (4 min)
