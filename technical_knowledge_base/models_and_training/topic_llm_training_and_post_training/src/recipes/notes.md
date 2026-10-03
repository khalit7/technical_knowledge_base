# Notes: Open recipes compared (tab t-recipes)

Read on 3 October 2026. Every cell in `../data/recipes.json` carries its own source URL, label, source date, kind (published, derived, unconfirmed, inherited, not disclosed, not used) and, where useful, a verbatim quote; this file records how the rows were chosen and checked.

## Files

- `../data/recipes.json`: columns, 20 rows, the compute stories for the animation, and the corrections list. The source of truth.
- `mk_recipes.py`: validates the JSON (every cell sourced, every derived cell has a formula, no em-dash) and inlines it into `../parts/32_js_recipes_a.js`; prints coverage per column and row.
- `recompute.py`: recomputes every derived figure (6ND for every row, sums, GPU-hours, stage tokens, the five post-training shares) from the published inputs.
- `check_recipes.mjs`: clicks every control at 390 px dark and 920 px light; no console errors, no NaN or undefined, no sideways scroll; section screenshots in `../../.shots/rc-*.png`.

Workflow after editing the JSON: `python3 recipes/mk_recipes.py && python3 recipes/recompute.py && sh build.sh && node recipes/check_recipes.mjs`.

## Row choice (20)

Chosen by disclosure quality, one checkpoint per row, never mixing sizes or versions.

- Historical anchors: T5-11B (2019, pretrain then fine-tune), InstructGPT 175B (2022, the SFT, reward model, PPO recipe; closed weights but the post-training is fully counted), Llama 2-Chat 70B (2023).
- The non-disclosure example: Mixtral 8x7B Instruct (only the 32K context and the SFT + DPO method).
- Repo paper pages used for corrected numbers: OLMo 2, Llama 3 herd, DeepSeek-V3, DeepSeek-R1 (Nature / arXiv v2), Qwen3, Mixtral, T5, DeepSeekMath, GPT-3, InstructGPT.
- Checked against primary sources by three research subagents (arXiv HTML full text, model cards, report PDFs): Llama 2, Tulu 3, Olmo 3, Apertus, Phi-4, Gemma 3, SmolLM3, Kimi K2, DAPO, MiMo-V2.6-Pro, K2 Horizon.
- Size picks: OLMo 2 7B (its post-training is the best described), Tulu 3 70B, Olmo 3 32B Think, Llama 3.1 405B, Qwen3-235B-A22B, Gemma 3 27B.
- Considered and left out: Nemotron 3 Nano 30B-A3B (well disclosed data, but compute not disclosed and its step counts only readable off figures; 21st row), Chinchilla and GPT-3 alone (no post-training), T5Gemma 2 and DiffusionGemma (adaptations, not stage recipes), Llama 4 and DeepSeek V3.x/V4 (less disclosure than their predecessors in this grid).

## What is not disclosed (the hatched cells)

- Post-training sizes are the most withheld: SFT counts (Llama 3.1 gives shares only; Qwen3, Gemma 3, Kimi K2, MiMo-V2.6, Mixtral none), preference data (Llama 3.1, Qwen3, SmolLM3, K2 Horizon, Mixtral), RL prompts (Llama 2, OLMo 2, DeepSeek-V3, Gemma 3, Kimi K2, K2 Horizon).
- Compute: Qwen3, Gemma 3 (chip count only), Kimi K2, K2 Horizon, DAPO, Mixtral, T5, DeepSeekMath. MiMo-V2.6 prices only its final RL ($2.6M).
- Data mix proportions: DeepSeek-V3, Qwen3, Gemma 3, Kimi K2, Llama 2, Mixtral, K2 Horizon.
- Mid-training tokens: Gemma 3 (the 128K extension), MiMo-V2.6 ("the majority of compute"), Mixtral, DeepSeek-V3 (no separate stage described).

## Judgement calls

- "Inherited" cells (Tulu 3, DAPO, DeepSeek-R1, InstructGPT) carry the base model's own source and do not count for or against the row's Disclosed score; nor do stages the recipe does not use, nor the openness columns.
- Compute sorts by GPU-hours of whatever accelerator; FLOP-only (OLMo 2, InstructGPT) and dollar-only (MiMo) rows sort with the undisclosed. The 6ND column is the common yardstick (active parameters x pretraining tokens; derived unless the paper prints it; T5 not applied, encoder-decoder).
- The Olmo 3 animation converts Ai2's stage durations into GPU-days, assuming each stage after the first 9.5 days ran on all 1,024 GPUs; the DPO share (about 2 days) is the remainder of the 9 post-training days after SFT (about 2) and RL (about 5). Labelled derived in the tab.
- Tulu 3's pretraining is shown as Llama 3.1's 15.6T (the paper's figure for the 405B; the herd shares one pipeline), noted in the cell.
- Kimi K2's 400B anneal and 60B long-context tokens appear to come after the 15.5T (the learning rate continues below the 15.5T schedule's end) but the report does not say so; noted.

## Corrections found against common claims

Listed in the tab from `corrections` in the JSON: DeepSeek-V3's $5.6M scope; R1's $294K is post-training only; OLMo 2 7B's "4T" is 3.90T; Llama 2's "3.3M GPU-hours" is all four sizes; InstructGPT's 1.6% excludes SFT (1.75% with it); Olmo 3 32B's "5.9T" is the 7B's mix (32B: 5.5T) and Table 13's "6.2T" does not match Table 35's stages (5.8T); Tulu 3 70B DPO 334,302 in the report against 337,186 rows released; Apertus SFT "3.8M" in text against 4,184,087 in Table 12; Gemma 3 and Kimi K2 paper licences mistaken for model licences; MiMo-V2.6's "7,000 environments" are about 7K tasks and Flash's RL cost is $0.9M in the report; K2 Horizon 375B pretraining is 15.13T, not "about 20T"; Llama 3.1's 128K came from ~800B tokens of extension at the end.

The Ai2 lab page in this knowledge base repeats the Olmo 3 Table 13 "6.2T" figure (as "Table 13's cumulative 6.2T"); flagged for whoever next edits that page.
