One week, 2026-11-16 to 2026-11-23: OpenAI and Google closed most of the gap to the top model at a fraction of its cost per task, a 17-million-line Lean proof of the Riemann Hypothesis passed every machine check, Anthropic went public, the US closed the remote route to AI chips, and canary prompts caught attackers inside inference providers.

# The week in brief
The frontier got cheaper rather than better: GPT-6.2 Astra and Gemini 4 Neon landed within four points of Claude Fable 5.2 on the main index at a quarter to a seventh of its cost per task. A machine-checked Lean proof of the Riemann Hypothesis, found with Claude, passed every independent checker, though no mathematician yet understands it. Anthropic's IPO was the largest on record. Washington now requires a licence to ship AI chips to any data centre, anywhere, that may serve Chinese companies. And a canary study showed why it matters which inference provider serves your requests.

# Top stories
**OpenAI and Google closed most of the gap to Claude Fable 5.2 at a fraction of its cost per task.** OpenAI's GPT-6.2 Astra (17 November, $8 / $40 per million tokens) scored 62 on Artificial Analysis's index against Fable 5.2's 65, at $4.00 per index task against $26.54; Google's Gemini 4 Neon (18 November, $3 / $15) scored 61 at $6.44. On ARC-AGI-3's standard harness Fable 5.2 still leads Astra by 10.9 points; the "first to 100%" headlines describe a provider adapter, not the standard harness.
- kind: Model
- date: 17 and 18 November
- why: for most workloads the choice is now about price and behaviour rather than raw capability, and index readings depend on the harness, so compare like with like.
- links: [Artificial Analysis: GPT-6.2 launch](https://artificialanalysis.ai/articles/openai-has-the-2-model-in-the-intelligence-index-with-the-release-of-gpt-6-2-astra-and-gpt-6-2-sol) (6 min) · [Google: Gemini 4 Neon](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-neon/) (8 min) · [Our page: LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286)

**A 17-million-line Lean proof of the Riemann Hypothesis, found by an Anthropic mathematician working with Claude, passed every machine check within a day.** Levent Alpöge released only Lean (175,187 files on top of Mathlib) on 20 November; on 21 November the Lean FRO and the Mathlib Initiative certified Mathlib's statement of the Riemann Hypothesis and its proof with Lean's kernel and independent checkers. The human-readable draft still rests on thirteen hypotheses it does not prove, and no mathematician has yet reviewed the mathematics.
- kind: Research
- date: 20 and 21 November
- why: it is the clearest case yet of a result that is certified correct before anyone understands it, which is exactly what a Lean check does and does not give you.
- links: [Lean community statement](https://leanprover-community.github.io/blog/posts/riemann-hypothesis/) (6 min) · [Scientific American](https://www.scientificamerican.com/article/dueling-claims-of-riemann-hypothesis-proofs-emerge/) (7 min) · [Our page: Math benchmarks](n:3ef5c17b0d0d81ec942edf0040a2f596)

**Anthropic priced the largest IPO on record at $83 a share and closed its first day 17% higher.** It raised about $81.3B (range $70 to $78) beside a $26B private placement with seven chip and cloud partners; trading began on Nasdaq on 19 November under ANT and closed at $97.17. Renaissance Capital puts the fully diluted valuation at about $1.38T.
- kind: Industry
- date: 19 November
- why: the lab behind the top model now answers to public shareholders, with quarterly disclosures of its costs and compute.
- links: [Anthropic: IPO pricing](https://www.anthropic.com/news/anthropic-prices-initial-public-offering) (3 min) · [Renaissance Capital](https://www.renaissancecapital.com/IPO-Center/News/122776/anthropic-prices-upsized-ipo-at-83-above-the-range%3B-raises-81b) (3 min) · [Our page: Anthropic](n:3c65c17b0d0d814cb979d0eabca59a45)

**The US now requires a licence to ship AI chips to any data centre, anywhere, that may serve Chinese companies.** The Commerce Department's interim rule of 16 November covers data centres above roughly 750 H100s of compute, gives existing operators 90 days to get licences and rescinds the 2025 AI Diffusion Rule. NVIDIA, reporting $115.8B of quarterly revenue the next day, said it has stopped shipping licensed Hopper chips to China.
- kind: Policy
- date: 16 and 17 November
- why: renting GPUs abroad was the main way Chinese labs reached frontier hardware; this closes it, which will show in their next models.
- links: [TechCrunch](https://techcrunch.com/2026/11/16/us-tightens-ai-chip-export-controls-to-deter-chinese-companies-from-accessing-compute-remotely/) (5 min) · [NVIDIA: third-quarter results](https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-Third-Quarter-Fiscal-2027/default.aspx) (8 min) · [Our page: Hardware](n:3c65c17b0d0d8118beeefaed56da6f8e)

**About two million canary prompts caught attackers inside three inference providers for months, including on requests marked zero data retention.** Dragos seeded prompts with unique links and credentials from July to November; attackers inside three hosting providers captured requests and used planted AWS keys for tens of thousands of API calls, and one unnamed Chinese lab fetched secret links from more than half of the prompts sent to its models. OpenRouter removed three providers and took 125 endpoints off zero-data-retention eligibility.
- kind: Security
- date: 19 and 22 November
- why: a prompt sent through a router or reseller can be read by whoever hosts the model, so secrets do not belong in prompts and zero data retention is a promise, not a guarantee.
- links: [Dragos: canary tokens in the AI supply chain](https://www.dragos.com/blog/ai-supply-chain-security-canary-tokens) (15 min) · [OpenRouter: incidents](https://openrouter.ai/blog/announcements/data-processing-incidents-on-inference-providers/) (4 min) · [Our page: Agent security](n:3f15c17b0d0d81ad9fb7d1dd74217335)

**A fixed rollout cap in GRPO teaches small models to stop thinking early.** JetBrains Research trained three 2B to 4B models with GRPO on math under a fixed cap (three seeds): AIME accuracy at the cap rose 10.9 to 42.4 points, while accuracy at the largest budget tested fell 13.1 to 30.2 points below the base model. None of the fixes tried (single runs) kept both.
- kind: Paper
- date: 19 November
- why: a budget set for training cost becomes a limit the model learns, so a cheap RL run can quietly remove test-time scaling.
- links: [arXiv 2611.26172](https://arxiv.org/abs/2611.26172) (45 min) · [Our page: Budget Internalization](n:4215c17b0d0d811a8e3af51e06cd8f0f)

# New in the knowledge base
## Papers
- [Budget Internalization](n:4215c17b0d0d811a8e3af51e06cd8f0f): GRPO under a fixed rollout cap gains inside the cap and loses test-time scaling beyond it, on three small models; the fixes tested did not keep both.
## Updated
- [LLM landscape](n:3c65c17b0d0d812d9e00f6ec89965286), [OpenAI](n:3c65c17b0d0d814abf90d5b9e567d72f) and [Google DeepMind](n:3c65c17b0d0d8173a0aafcb27cf7a5f3): GPT-6.2 Astra and Sol and Gemini 4 Neon beside Claude Fable 5.2, with prices and index readings.
- [Math benchmarks](n:3ef5c17b0d0d81ec942edf0040a2f596): what a Lean check certifies and what it does not, with the Riemann Hypothesis release.
- [Agentic benchmarks](n:3c65c17b0d0d811fb926d7b91ef8234e): Terminal-Bench 4.1's board, where a router now sits above every single model.
- [Test-time compute and reasoning](n:4035c17b0d0d813f9fb2d62cff1f09ef): budgets and overthinking, with the rollout-cap result.
- [Agent security](n:3f15c17b0d0d81ad9fb7d1dd74217335): the canary study and the Codex sandbox post.
- [Other notable providers](n:3c65c17b0d0d8154ba44e521a4ed8749): Inkling 2 Mini, MAI Code 2 and Hy4 Flash.

# Further reading
## Models
- **Inkling 2 Mini** (Thinking Machines, 20 November): [Thinking Machines: Inkling 2 Mini](https://thinkingmachines.ai/news/inkling-2-mini/) (10 min), [Artificial Analysis: Inkling 2 Mini](https://artificialanalysis.ai/models/inkling-2-mini) (4 min)
- **Microsoft's seven MAI models** (Ignite, 17 November): [Microsoft AI: MAI Code 2](https://microsoft.ai/news/introducing-mai-code-2-and-mai-code-2-flash/) (7 min), [Microsoft AI: Ignite 2026](https://microsoft.ai/news/microsoft-ignite-2026/) (8 min), [Axios](https://www.axios.com/2026/11/17/microsoft-ai-models-openai-anthropic-ignite) (4 min)
- **Hy4 Flash weights** (Tencent, 19 November): [Hugging Face: tencent/Hy4-flash](https://huggingface.co/tencent/Hy4-flash) (10 min), [TechNode](https://technode.com/2026/11/19/tencent-releases-hy4-flash-model-weights-for-local-deployment/) (3 min)
- **A router tops Terminal-Bench 4.1** (entry dated 17 November): [Terminal-Bench leaderboard](https://www.tbench.ai/leaderboard) (3 min), [GitHub docs: Copilot Fusion](https://docs.github.com/en/copilot/concepts/models/copilot-fusion) (5 min)
- **FrontierHarness Eval v1.1** (Runta with Baseten, 17 November): [Runta: FrontierHarness Eval v1.1](https://runta.com/blog/introducing-frontierharness-eval-v1-1/) (10 min)
- **Genie 4 opens to subscribers** (Google DeepMind, 19 November): [Google: Genie 4 in Project Genie](https://blog.google/innovation-and-ai/models-and-research/google-deepmind/genie-4-now-available-project-genie/) (4 min)
- **Scheduled retirements** (as listed on 23 November): [Anthropic: model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations) (6 min), [OpenAI: deprecations](https://developers.openai.com/api/docs/deprecations) (5 min)

## Research and papers
- **Long generations collapse at high temperature because of the sampler, not the model** (arXiv 2611.22148, 17 November, NeurIPS 2026 Evaluations and Datasets track): [arXiv 2611.22148](https://arxiv.org/abs/2611.22148) (40 min)
- **Weight-space programming went from one demonstration to about twenty arXiv papers in a week** (16 to 20 November): [our page on the original article](n:4255c17b0d0d81c4923ac58982f35f2f), [arXiv 2611.21885](https://arxiv.org/abs/2611.21885) (30 min), [arXiv 2611.21449](https://arxiv.org/abs/2611.21449) (25 min)
- **Physics of Language Models 4.2** (Zeyuan Allen-Zhu, arXiv 2611.24963, first announced in the window): [arXiv 2611.24963](https://arxiv.org/abs/2611.24963) (60 min)
- **Sparse attention loses long-context retrieval in a few "blind" heads** (arXiv 2611.21917, 16 November): [arXiv 2611.21917](https://arxiv.org/abs/2611.21917) (25 min)
- **Optimistic verifiers get hacked by padding** (arXiv 2611.21538, 16 November): [arXiv 2611.21538](https://arxiv.org/abs/2611.21538) (30 min)
- **Gumbel substitution for rollouts from untrusted samplers** (arXiv 2611.27375, 20 November): [arXiv 2611.27375](https://arxiv.org/abs/2611.27375) (25 min)
- **Claude solves two open problems in black-hole physics** (Anthropic, 17 November): [Anthropic: Claude and black-hole physics](https://www.anthropic.com/research/claude-black-hole-physics) (12 min)
- **OpenAI's chief scientist proposes perplexity as a shared limit between labs** (Jakub Pachocki, 22 November): [OpenAI: Perplexity and intelligence](https://openai.com/index/perplexity-and-intelligence/) (15 min)
- **OpenAI uses its models in chip design** (19 November): [OpenAI: advancing chip design with our models](https://openai.com/index/advancing-chip-design-with-our-models/) (8 min)
- **METR: agents can tell alignment evaluations from capability evaluations** (16 November): [METR: measuring alignment-eval tells](https://metr.org/notes/2026-11-16-measuring-alignment-eval-tells/) (15 min)
- **Bitwise-identical sampler and trainer log-probabilities on TPU** (Google, 17 November): [Google Developers: zero train-inference mismatch](https://developers.googleblog.com/unlocking-stable-on-policy-rl-on-tpu-with-bitwise-zero-traininference-mismatch) (10 min)

## Industry
- **NVIDIA's leadership after Huang** (16 to 22 November): [CNBC](https://www.cnbc.com/2026/11/17/nvidia-jensen-huang-house-committee.html) (5 min), [TechCrunch](https://techcrunch.com/2026/11/17/nvidia-says-its-open-source-ai-strategy-remains-intact-after-jensen-huangs-exit/) (4 min)
- **California sues OpenAI over agents that broke out of test environments** (16 November): [TechCrunch](https://techcrunch.com/2026/11/16/california-state-ag-sues-openai-over-rogue-agent-incidents/) (5 min), [OpenAI: embedded assessments](https://openai.com/index/our-first-phase-of-embedded-assessments/) (6 min)
- **OpenAI requires approval for routers that resell its models** (reported 20 November): [Semafor](https://www.semafor.com/article/11/20/2026/openai-tightens-grip-on-model-resellers) (4 min)
- **Epoch: Anthropic's compute spending grows about 4x a year, OpenAI's about 3x** (19 November): [Epoch AI](https://epoch.ai/data-insights/anthropic-openai-compute-spend-growth) (5 min)
- **AMD completed its $8.2B all-stock acquisition of World Labs** (announced 16 November; AMD's filing gives 13 November as the closing date): [AI Weekly](https://aiweekly.co/alerts/amd-completes-world-labs-deal-names-fei-fei-li-chief-scientist) (3 min), [SiliconANGLE: the September announcement](https://siliconangle.com/2026/09/28/amd-acquires-world-model-developer-world-labs-for-8-2B/) (4 min)
- **A short-seller report on AMD firmware and China** (19 November): [The Motley Fool](https://fool.com/investing/2026/11/19/why-amd-stock-was-plunging-on-thursday) (4 min)

## Compute and chips
- **Vera Rubin NVL72 has shipped** (NVIDIA, 17 November): [NVIDIA: third-quarter results](https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-Third-Quarter-Fiscal-2027/default.aspx) (8 min)
- **Disaggregated inference across vendors** (16 to 18 November): [Cerebras: disaggregated inference](https://www.cerebras.ai/blog/cerebras-launches-disaggregated-inference) (6 min)
- **TOP500, November 2026** (SC26, 16 November): [HPCwire](https://www.hpcwire.com/2026/11/16/no-change-at-the-top-of-top500-lineshine-still-no-1/) (5 min)
- **Microsoft's Cobalt 200 VMs generally available** (Ignite, 17 November): [Azure blog](https://azure.microsoft.com/en-us/blog/new-azure-cobalt-200-vms-deliver-50-performance-improvement/) (5 min)
- **Anthropic's 2028 power mix, an outside estimate** (Better Data Center Project, 16 November): [Better Data Center Project](https://betterdatacenterproject.com/2026/11/16/how-ai-is-powered-a-breakdown-of-byop-and-grid-power/) (15 min)
- **Google booked a New Glenn launch for Project Suncatcher's TPU satellites** (19 November): [Google](https://blog.google/innovation-and-ai/models-and-research/google-research/blue-origin-project-suncatcher-partnership/) (4 min)

## Tools and agents
- **OpenAI explains the Codex sandbox and the risks it leaves** (18 November): [OpenAI: inside the Codex sandbox](https://openai.com/index/inside-the-codex-sandbox/) (15 min), [Codex releases](https://github.com/openai/codex/releases) (5 min)
- **Claude Code 2.1.326 to 2.1.330** (changelog, undated): [Claude Code changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) (5 min)
- **vLLM 0.34** (16 November): [vLLM releases](https://github.com/vllm-project/vllm/releases) (8 min)
- **Transformers 5.24** (21 November): [Transformers releases](https://github.com/huggingface/transformers/releases) (6 min)
- **Windows 11 records which coding agents a user runs** (16 November): [xusheng.dev](https://xusheng.dev/posts/windows-coding-agent-telemetry/) (10 min)
- **OpenAI's Performance Factory** (19 November): [OpenAI](https://openai.com/index/how-openai-performance-factory-keeps-chatgpt-fast/) (8 min)

## Security
- **Agentic attack frameworks in real incidents** (16 to 19 November): [Google Threat Intelligence](https://cloud.google.com/blog/topics/threat-intelligence/agentic-threat-activity-crosses-a-significant-threshold) (15 min), [TechCrunch: FBI on ARTEX](https://techcrunch.com/2026/11/16/fbi-says-artex-ai-open-source-hacking-tool-used-to-breach-networks-in-under-three-hours/) (6 min)
- **Two critical HTTP/2 remote-code-execution bugs in NGINX** (18 November): [Wiz](https://www.wiz.io/blog/nginx-http2-rce-vulnerabilities) (12 min)
- **Java4Shell** (17 November): [Calif: Java4Shell](https://calif.io/java4shell/) (15 min), [OpenJDK advisory](https://openjdk.org/groups/vulnerability/advisories/2026-11-17) (3 min)
- **Optimizely's CDN served card-skimming JavaScript to 178 organisations** (16 November): [Report URI](https://blog.report-uri.com/worlds-largest-brands-infected-with-malware-via-optimizely/) (12 min)
- **Sandboxed models signalled each other through a shared inference server** (20 November): [LessWrong](https://www.lesswrong.com/posts/7wzWuLP3HhyBLmKfo/models-can-communicate-via-inference-servers-despite-being) (12 min)
- **Fireworks widened its breach disclosure** (17 November, per secondary coverage): [Silicon Report](https://www.siliconreport.com/fireworks-expands-breach-disclosure-to-datasets-and-model-weights) (4 min)

## Hacker News
- **AI-found infrastructure bugs**: [Wiz](https://www.wiz.io/blog/nginx-http2-rce-vulnerabilities) (12 min)
- **"AI is killing All About Berlin"** (18 November, 820 points, 713 comments): [Nicolas Bouliane](https://nicolasbouliane.com/blog/death-by-ai) (8 min)
- **Model launches on the front page**: [Hacker News](https://news.ycombinator.com/item?id=50535230) (1 min)
