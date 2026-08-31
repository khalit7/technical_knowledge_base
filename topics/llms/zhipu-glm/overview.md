# Z.ai (Zhipu): GLM

Last updated: 2026-08-31. Per-model files to follow; this page maps the family.

## Best resources

- [GLM-4.5 tech report](https://arxiv.org/abs/2508.06471): the ARC (agentic, reasoning, coding) design brief and training stack.
- [Z.ai blog](https://z.ai/blog): primary source for GLM-5.x releases.
- [Z.ai (Wikipedia)](https://en.wikipedia.org/wiki/Z.ai): corporate lineage from Tsinghua's ChatGLM to today.
- [GLM-5.2 analysis (Labellerr)](https://www.labellerr.com/blog/glm-5-2-open-weight-ai-model/): current flagship vs closed rivals.
- [Z.ai HuggingFace org](https://huggingface.co/zai-org): MIT-licensed weights.

## Lineage

- **ChatGLM-6B / GLM-130B (2022-2023)**: Tsinghua KEG spinoff; GLM-130B was one of the
  first open bilingual 100B models; ChatGLM-6B seeded China's local-LLM scene.
- **GLM-4 (2024)**: commercial catch-up generation, first agentic features.
- **GLM-4.5 (Jul 2025)**: repositioned around **ARC** (agentic + reasoning + coding) in
  one model: 355B/32B MoE + 106B Air variant, hybrid thinking modes, MIT license; the
  moment GLM became a serious open contender.
- **GLM-4.6 (Oct 2025) / 4.7 (late 2025)**: coding-focused iterations; the GLM Coding
  Plan (~$3/month Claude Code-compatible endpoint) made it the value option for agentic
  coding and a genuine competitive lever.
- **GLM-5 (early 2026)**: ~745B-parameter generation targeting frontier parity.
- **GLM-5.2 (Jun 2026)**: current open flagship: 744B total/~40B active MoE, 1M-token
  context, MIT license. Beat GPT-5.5 on FrontierSWE at roughly one sixth the cost;
  topped the open-weight division of the Artificial Analysis index and led Design
  Arena/frontend-code arenas.
- **GLM-5.3 (Aug 14, 2026)**: incremental update, reported as roughly 6x coding gains over
  5.2 from post-training alone, and a claimed #1 on CyberGym at 84.5%.
- **GLM-5.3-Flash (Aug 26, 2026)**: added 2026-08-31. The line's first natively multimodal
  model and its most strategically aggressive release. 320B total / 18B active MoE,
  1,048,576-token context, image *and video* input with text output, MIT licence, weights on
  Hugging Face. Z.ai claims it beats GLM-5.2 across its own evaluation suite while costing
  roughly a tenth as much: list pricing $0.15 input / $0.50 output per million tokens, with a
  $0.075 input promotion running to Sep 9. It had been on evaluation platforms the week
  before as the unattributed stealth model **Ox Alpha**, which is worth noting as a pattern:
  shipping anonymously first to collect clean third-party scores, then claiming the model
  once the numbers are in. The strategic read is unchanged from GLM-4.6 onward, only sharper:
  put frontier-class capability under MIT at a price that makes a paid multimodal API tier
  hard to defend.
  [Announcement](https://docs.z.ai/release-notes/new-released),
  [SiliconANGLE](https://siliconangle.com/2026/08/26/z-ai-open-sources-ox-alpha-model-as-glm-5-3-flash/)

## Training approach highlights

- "Slime" RL infrastructure (open-sourced): asynchronous agentic RL rollouts feeding
  reasoning + tool-use training; hybrid thinking with controllable depth.
- MIT licensing everywhere plus rock-bottom serving prices: strategy is to commoditise
  agentic coding against Anthropic/OpenAI subscriptions.
- Muon-family optimizers and MTP layers per recent reports; dense-first blocks like
  DeepSeek. IPO'd in Hong Kong (2026) as the "first LLM stock" wave hit China.

## Current models (Aug 2026)

| Model | Params | Notes |
|---|---|---|
| GLM-5.3 / GLM-5.2 | 744B / 40B active | Open-weight quality leader per AA v4.x, MIT, 1M ctx |
| GLM-5.3-Flash | 320B / 18B active | Natively multimodal (image + video in), 1M ctx, MIT, $0.15/$0.50 per Mtok; shipped Aug 26 2026, ex-"Ox Alpha" |
| GLM-4.7-Air class | ~100B | Cheap self-hostable tier |
| GLM Coding Plan | service | Claude Code-compatible agentic coding value play |

## Cross-links

- [../moe-models.md](../moe-models.md), [../reasoning-models.md](../reasoning-models.md).
- Direct rivals: [../deepseek/overview.md](../deepseek/overview.md), [../moonshot-kimi/overview.md](../moonshot-kimi/overview.md), [../minimax/overview.md](../minimax/overview.md).
