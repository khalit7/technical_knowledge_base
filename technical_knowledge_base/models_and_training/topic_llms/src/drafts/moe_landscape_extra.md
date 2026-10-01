# MoE landscape: what the child page's landscape tab and table had that the parent scatter lacks

Source: the child page "Mixture-of-Experts (MoE) models" (`mixture_of_experts_moe_models/src/parts/17_js_land.js`, `16_js_par.js`, `05_read_c.html`), data as of 1 October 2026. Parent scatter: `src/parts/22_js_scatter.js` (array `D`: name, total B, active B, group, note, url).

## Points the parent scatter does not have

Rows in the parent's `D` format. The parent's `hist` group is for 2023 and 2024 models; these 2025 ones either go in `open` or in a new 2025 group shown with the history toggle.

```js
['Kimi K2 (2025)',1040,32,'hist','Moonshot; 384 routed experts, top-8 plus 1 shared; about 32x; the report table gives 1.04T, its abstract rounds to 1 trillion','https://arxiv.org/abs/2507.20534'],
['Qwen3 235B-A22B (2025)',235,22,'hist','Alibaba; 128 experts, top-8, no shared expert; about 10.7x','https://arxiv.org/abs/2505.09388'],
['Llama 4 Maverick (2025)',400,17,'hist','Meta; 128 routed experts, top-1 plus 1 shared, MoE in every second layer; about 23.5x','https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct'],
['gpt-oss-20b',20.9,3.61,'open','OpenAI; 32 experts, top-4; 20.91B total, 3.61B active as OpenAI counts (input embedding not active)','https://arxiv.org/abs/2508.10925'],
['V4.1-Flash (prefill)',552,8,'open','DeepSeek encoder-decoder in prefill: 69x; same model as the decode point','https://api-docs.deepseek.com/updates/'],
```

Small MoE models named on the child page (trend "MoE reached small models"), with counts from their names only:

```js
['Gemma 4 26B-A4B',26,4,'open','Google; laptop-class MoE','https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/'],
['North Mini Code 30B-A3B',30,3,'open','Cohere; laptop-class MoE','https://docs.cohere.com/changelog/north-mini-code-1-0'],
```

Plot range: the parent's x axis starts at 20B total and y at 3B active, so all of these fit; North Mini Code sits on the bottom edge (3B).

Possible V4.1-Flash treatment: draw the prefill and decode points joined by a horizontal segment (the child did this), instead of two separate points.

## Better or more precise data for points the parent already has

| Parent point | Parent value and source | Child value and source | Suggestion |
|---|---|---|---|
| Mixtral 8x7B (2023) | 47 / 13, Notion paper page | 46.7 / 12.9 (Mistral announcement https://mistral.ai/news/mixtral-of-experts/, config https://huggingface.co/mistralai/Mixtral-8x7B-v0.1/blob/main/config.json); rebuilt independently from the config on the deep tab | keep 47 / 13 on the scatter, or use 46.7 / 12.9 to match the deep tab |
| gpt-oss-120b | 117 / 5.1, InfoQ | 116.83 / 5.13, model card https://arxiv.org/abs/2508.10925; rebuilt on the deep tab | primary source is better |
| GLM-5.2 | 744 / 40, techjacksolutions.com | 744 / 40, model card https://huggingface.co/zai-org/GLM-5.2 (256 routed experts, top-8 plus 1 shared, first 3 of 78 layers dense, sparse-attention indexer, MIT) | primary source is better |
| Qwen3.8 2.4T-A95B | llm-stats.com | model files https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B (512 routed experts, top-10 plus 1 shared; hybrid attention, 69 of 92 layers linear) | primary source is better |
| Qwen3.8-Flash-Next | MarkTechPost | model files https://huggingface.co/Qwen/Qwen3.8-Flash-Next (512 routed, top-10 plus 1 shared; Gated DeltaNet in 36 of 48 layers plus QSA) | primary source is better |
| DeepSeek-V3 (2024) | HF model page | config https://huggingface.co/deepseek-ai/DeepSeek-V3/raw/main/config.json and report https://arxiv.org/abs/2412.19437 (256 routed, top-8 plus 1 shared, first 3 of 61 layers dense, sigmoid with bias balancing) | either |
| Kimi K3 | HF model card | adds layout: 896 routed experts, top-16 plus 2 shared, routed experts on a 3,584-wide latent ("Stable LatentMoE"), config https://huggingface.co/moonshotai/Kimi-K3/blob/main/config.json | note text could carry the layout |
| GLM-5.3-Flash | SiliconANGLE | adds layout: 288 routed, top-8 plus 1 shared; 34 of 45 layers Kimi Delta Attention, 11 sparse attention with IndexPool (config https://huggingface.co/zai-org/GLM-5.3-Flash/blob/main/config.json, Z.ai docs https://docs.z.ai/guides/vlm/glm-5.3-flash) | note text |

Ratios (total / active), from `src/moe/recompute.py` and the table above: Maverick 23.5x, Qwen3 235B 10.7x, Kimi K2 32.5x at 1.04T (recompute.py's landscape block still uses 1.00T and prints 31.2x; the child page's table and text use 32.5x), gpt-oss-20b 5.8x, V4.1-Flash 69.0x prefill and 34.5x decode.

## Not taken from the child

- The child's rank-by bars (ratio, smallest active, total) and its click-a-row table duplicate what the parent scatter's picker shows; not needed.
- Year colours (2023 to 2026): the parent colours by open, dense and history instead; a year colouring would conflict.
