# Animation and visual types that worked

The catalogue of visual types that earned their place on built pages: what each is, when to reach for it, what makes it good, and a folder in this repo to read before building one. Paths are relative to `technical_knowledge_base/`. Pick by the content ([choosing.md](choosing.md)); build with [mechanics.md](mechanics.md).

Most pages need two or three of these, not ten. Every type below still has to pass the same test: it teaches something a sentence or a static figure cannot.

---

## 1. Before/after on the same input (the most important type)

**What it is.** One input (a token, an image, a batch, a training step, a request, a session) run step by step through the method that was replaced and through the method that replaced it, with a toggle between the two, drawn to the same scale, so the difference is seen rather than described.

**When to use it.** Whenever a page explains a mechanism that replaced an earlier one, or a process that unfolds in steps. Khalid asks for it by name; root pages carry at least one per axis where a mechanism replaced another, and each lab tab at least one where it fits.

**Anatomy of the reference (the DeepSeek MLA explainer, Khalid's favourite).** `models_and_training/topic_llms/deepseek/src/parts/18_js_mlx.js`, in the Reading tab's MLA section.
- **One input, two methods.** One token through one attention layer under MLA (compress to a 512-number latent, add the 64-number decoupled RoPE key, cache 576 numbers, rebuild heads in prefill, absorb in decode), and a toggle that runs the same token through standard multi-head attention.
- **Drawn to scale.** One square is 64 numbers, so 576 against 32,768 numbers cached per token per layer is visible as area, not just stated. The scale is printed on the card.
- **A caption for every step** (in HTML beside the drawing): what happens and why it matters, with the formula and the number at that step. Seven steps each way.
- **Running counters** that tie the picture to the numbers the text quotes (numbers cached, bytes per token over 61 layers, read per decoded token).
- **Controls:** play and pause, step back and forward, a scrubber over the steps, and a speed control (0.5x, 1x, 2x), so a reader can stop on the step they are thinking about.
- **Good manners:** it animates only while its card is on screen and its tab is visible, plays once when first scrolled into view, and under `prefers-reduced-motion` starts paused and moves one step at a time without tweening.

**What makes it good.** The static switch shows two end states; the animation shows how one becomes the other. The earlier rejection of this animation as duplicating the static mode switch was wrong, and the log says so.

**Other examples to read.**
- `models_and_training/topic_generative_and_multimodal/src/parts/24_js_rd_gen.js`: one real Fashion-MNIST image made three ways (autoregressive tokens, DDIM steps, Euler flow steps), every frame exact arithmetic on the real image and one seeded noise draw.
- `models_and_training/topic_generative_and_multimodal/src/parts/33_tab_flow_b.html` with `33_js_fw_3img.js`: one noise, ten steps, flow against diffusion.
- `systems_and_performance/topic_ml_infra_and_orchestration/src/parts/34_js_io_3anim.js`: the same 60 training steps with no checkpoints, synchronous and asynchronous checkpoints, from measured step times.
- `models_and_training/topic_llms/anthropic_claude_family/src/parts/12_js_sim.js`: the same 16-turn agent session with and without prompt caching, one square per 1,000 tokens, cost counters.
- `systems_and_performance/topic_ml_infra_and_orchestration/fault_tolerance_at_scale/src/parts/32_js_ft_rec.js`: one failure under two recovery designs on one clock.
- Shared controller to reuse: `RD.anim` in [../build/templates/21_js_rd_common.js](../build/templates/21_js_rd_common.js).

---

## 2. Stepped mechanism with captions and counters

**What it is.** One input through one pipeline, stage by stage, without a competing method: the same controls, captions and counters as type 1.

**When to use it.** A process with a clear order whose intermediate states matter (encode, quantise, decode; patchify, project, merge into the language model; gather, compute, reduce-scatter). If there is an earlier method, make it type 1 instead.

**What makes it good.** Real intermediate values (real vectors, real token counts, real shapes) instead of decorative ones; a caption per stage with the shape and the number; counters that end on a number the text quotes.

**Reference folders.**
- `models_and_training/topic_generative_and_multimodal/src/parts/31_js_lt_2walk.js`: one image through each autoencoder model, five stages.
- `models_and_training/topic_generative_and_multimodal/src/parts/35_js_vl_2pipe.js`: one image through SmolVLM-500M with real vectors, or LLaVA-1.5 with config-derived shapes (colours labelled illustrative).
- `reference/papers/zero/src/parts/14_js_step.js`: one 8-layer training step on 2, 4 or 8 GPUs, two ZeRO stages at once, memory strips to scale (2 : 2 : 12 bytes), arrows for all-gather and reduce-scatter, counters against 2 or 3 times the parameter count.

---

## 3. Toggle-compare of end states

**What it is.** A segmented switch that redraws the same diagram under two or more designs, without stepping (two encoders on the same image, prefill against decode, per-layer against whole-model accounting).

**When to use it.** The difference is in the result, not in the order of operations, or a stepped version would repeat type 1 already on the page.

**What makes it good.** Same input, same scale, same layout, so only what differs moves. Counters or a short table under the drawing name the difference in numbers.

**Reference folders.**
- `models_and_training/topic_generative_and_multimodal/src/parts/34_js_vs_2patch.js`: one image as patches, sequence and tokens under CLIP B/32 and SigLIP 2 B/16.
- `models_and_training/topic_llms/deepseek/src/parts/11_js_mla.js`: the MLA prefill and decode switch that preceded the animation.

---

## 4. Parameter slider over recorded runs

**What it is.** A slider or segmented control whose positions are real recorded runs (guidance scale, sampler steps, batch size, rank), each position showing that run's samples and metrics.

**When to use it.** The quantity cannot be computed in the browser (it needs a model) but a handful of cheap local runs span the interesting range.

**What makes it good.** Every position is a run that happened, with its numbers from the run's log; the default lands on the setting the text discusses; the axis covers the failure end too (over-guidance saturating pixels, one step too few).

**Reference folders.**
- `models_and_training/topic_generative_and_multimodal/src/parts/32_js_df_5cfg.js`: guidance scale against class accuracy, diversity, FD and share of saturated pixels, with samples.
- `models_and_training/topic_generative_and_multimodal/diffusion_from_zero/` (Sampler workbench tab): sampler and step count over recorded runs of the tiny model.

---

## 5. Scrubbable timeline or Gantt chart

**What it is.** Resources (GPUs, nodes, ranks, rollout slots) on one axis, time on the other, bars for jobs or phases; a scrubber or play button moves a time cursor, and policies are compared on the same workload.

**When to use it.** Scheduling, pipelines, overlap of compute and communication, stragglers, synchronous against asynchronous work: anything where the question is "who waits, and for how long".

**What makes it good.** The bars come from a real run or from a simulator checked against one (the Scheduling lab's JS simulator is a line-by-line port of its Python one, compared by a script); idle time is visible as empty area; a makespan or utilisation counter under the chart.

**Reference folders.**
- `systems_and_performance/topic_ml_infra_and_orchestration/src/parts/31_js_sc_3w1.js` and `31_js_sc_4w23.js` (Scheduling lab): the same eight-job queue on real Slurm under FIFO and backfill, then fairshare and preemption.
- `systems_and_performance/topic_ml_infra_and_orchestration/fault_tolerance_at_scale/src/parts/33_js_ft_str.js`: straggler Gantt, compute against wait per rank per step, from measured runs.
- `models_and_training/topic_llms/deepseek/src/parts/20_js_pipe.js`: pipeline schedules (1F1B, ZB1P, DualPipe) as a rank by time grid.

---

## 6. Particle and flow fields

**What it is.** Many points (a few hundred) moved by a real field on a 2-D toy: noise flowing onto a data distribution, gradient descent trajectories, a density being transported.

**When to use it.** Generative transport (flow matching, diffusion ODEs), optimisation on a surface, anything whose idea is "where does each point go".

**What makes it good.** The field is the trained network itself, run live in the page (small MLPs shipped as int8 weights with per-row scales), so solver choice and step count change the result honestly; a straight-path against curved-path toggle shows reflow; a step count control shows discretisation error. `requestAnimationFrame` only while visible.

**Reference folders.**
- `models_and_training/topic_generative_and_multimodal/src/parts/33_js_fw_2toy.js` (Flow lab section 1): 400 noise points flowing onto a ring of 8 Gaussians, the four trained MLPs from `src/flow/toy2d.py`.
- `models_and_training/topic_generative_and_multimodal/flow_matching/` (2-D flow playground tab): two panels on the same noise, exact fields, ODE against SDE, reflow rounds.

---

## 7. Token, patch and attention maps

**What it is.** An image or a text shown as the units a model actually sees (patches, tiles, VQ codes, tokens), with what each unit becomes and what attends to what.

**When to use it.** Whenever "how many tokens" or "what the model saw" drives cost or failure: vision encoders, VLM tiling, image tokenizers, cross-attention, positional encodings.

**What makes it good.** The units come from the real processor or tokenizer (counts checked against it), the grid is drawn at the true resolution and patch size, and hovering or tapping a unit shows its index and its numbers. Attention maps are real weights from a small model, never painted.

**Reference folders.**
- `models_and_training/topic_generative_and_multimodal/vision_language_models/` (What the model saw tab): tiles and token positions from SmolVLM's real processor.
- `models_and_training/topic_generative_and_multimodal/latent_diffusion_and_dits/` (Cross-attention viewer tab): precomputed SD 1.5 cross-attention maps for a prompt.
- `reference/papers/attention_is_all_you_need_transformer/src/parts/`: every attention map (encoder, masked decoder, cross) of a live toy Transformer.

---

## 8. Calculator whose presets show their residual

**What it is.** A formula made interactive (memory, FLOPs, tokens, cost, goodput) with presets for real models or published runs; each preset shows the computed value, the published value and the residual between them.

**When to use it.** The page quotes a number that follows from a formula and a configuration. Recompute it, let the reader move one parameter, and show where it lands against the published figure.

**What makes it good.** Defaults reproduce a published figure, and the card says whether independently or by construction. A residual is a fact about the accounting, not an error to tune away: the explanation says where each one comes from, and no input is fudged to hide a gap. Inputs come from configs and papers, never from images.

**Reference folders.**
- `models_and_training/topic_llm_training_and_post_training/src/parts/34_tab_scale.html` and `34_js_scale2_calc.js` (Scaling calculator): residual over published per preset, the lab's own MFU or a stated 40%.
- `models_and_training/topic_generative_and_multimodal/src/parts/35_js_vl_3budget.js`: SmolVLM's processor arithmetic, checked against the real processor.
- `systems_and_performance/topic_ml_infra_and_orchestration/src/parts/33_js_fl_7goodput.js`: exact expected goodput with Young and Daly marked and a seeded simulation check.
- `models_and_training/topic_llms/deepseek/src/parts/15_js_cache.js`: KV memory of every attention design rebuilt from its configuration, landing on the lab's numbers.

---

## 9. Explorers and inspectors

**What it is.** A filterable table, a pick-two diff, a similarity matrix or a picker over many real items (configs, models, embeddings), with a detail panel that opens each item's source.

**When to use it.** The question is "across all of X, how does Y vary" or "which one for my job": model maps, config diffs, licence checkers, metric choosers.

**What makes it good.** Every cell sourced and dated, filters that change the picture, a sensible starting selection, and derived columns computed from the data with their formula. Categorical facts are read verbatim, never paraphrased into thresholds.

**Reference folders.**
- `models_and_training/topic_llms/deepseek/src/parts/24_js_cfg.js`: nine models' configs side by side with derived KV per token.
- `models_and_training/topic_generative_and_multimodal/src/parts/36_js_mm_4pick.js` (Model map): which model for which job, filtered by licence need and a weights-only memory estimate.
- `models_and_training/topic_generative_and_multimodal/src/parts/34_js_vs_3sim.js`: similarity-matrix explorer under cosine and softmax views.

---

## 10. Predict, then reveal

**What it is.** A question with choices before the answer: the reader commits, then sees the real result (a measured run, a table, a live demo) and why.

**When to use it.** Where a common belief is wrong or the answer is surprising: the costliest ablation, what breaks without positions, whether most failures are hardware. Teaching pages from zero use several per tab.

**What makes it good.** The reveal is real evidence, not a paragraph; wrong answers get a sentence on why they are tempting; the drill sits right after the text that equips the reader to answer.

**Reference folders.**
- `models_and_training/topic_generative_and_multimodal/src/parts/23_js_rd_drills.js`: the Reading tab's predict-then-reveal drills, numbers filled from the lab data.
- `reference/papers/attention_is_all_you_need_transformer/src/parts/11_js_ui.js` (the predict widget) and `13_js_read.js`: three questions before the answers, with live demos.

---

## 11. Drawn-to-scale diagrams

**What it is.** A static or lightly interactive diagram whose areas or lengths are proportional to the quantities (cells per expert, bytes per parameter, layers by type, cache per layer).

**When to use it.** Any comparison of sizes that prose states as a ratio: 8 of 128 experts lit against 10 plus 1 of 512; 2 : 2 : 12 bytes per parameter; 576 against 32,768 numbers.

**What makes it good.** The unit is printed (one square is 64 numbers), both sides share it, and log scales are never used for areas. Layer strips show every layer of the real config.

**Reference folders.**
- `models_and_training/topic_llms/alibaba_qwen/src/parts/11_js_moe.js`: expert grid, Qwen3 against Qwen3-Next, to scale.
- `models_and_training/topic_llms/deepseek/src/parts/18_js_mlx.js`: the cache bars inside the MLA explainer.
- `models_and_training/topic_llm_architecture/llm_architecture_gallery/src/parts/`: layer strips and the attention ladder (one token through MHA, GQA, MQA, MLA, sliding window, Gated DeltaNet, KDA with MHA dashed behind each).

---

## 12. Live toy model in the page

**What it is.** A real model small enough to run in plain JS (tens of thousands of parameters), trained offline exactly as the source describes, with its forward pass checked against PyTorch.

**When to use it.** Architecture papers and mechanisms where seeing real outputs and real internals beats any illustration; ablations trained the same way show what a component does.

**What makes it good.** Held-out accuracy reported with how the test set was drawn; JS against PyTorch agreement stated; ablations that do not reproduce the paper's effect at toy scale say so beside the paper's figure.

**Reference folders.** `reference/papers/attention_is_all_you_need_transformer/` (35,184-parameter Transformer, logits within 1.1e-5 of PyTorch); `models_and_training/topic_generative_and_multimodal/src/parts/33_js_fw_2toy.js` (live flow networks).

---

## 13. One axis for the whole subject (timelines, lineage, sweeps)

**What it is.** Every item of the subject on one axis, usually time: releases by lab, model families by lane, a year sweep that fills quarter by quarter.

**When to use it.** "How did we get here" and "who did it first" questions, and for a root's map of the field.

**What makes it good.** Every mark is a sourced, dated row; filters by kind; a year sweep or time-lapse with counters when the order matters; caveats on any derived "first".

**Reference folders.** `models_and_training/topic_generative_and_multimodal/src/parts/36_js_mm_2time.js` (Model map timeline with a year sweep); `models_and_training/topic_llms/src/parts/30_js_time_c_tl.js` (release timeline by lab).

---

## Patterns that were rejected (do not rebuild)
- A visual of a single number with nothing to move.
- Data that exists only as figure images (read printed labels or decode vector figures; never read curves by eye).
- Stacked bars on a log axis (the later, smaller stages vanish or the bar lies about sums).
- Pies or sankeys across sources whose categories are not comparable.
- Dated scatters whose labels collide at phone width when a count chart says the same.
- Price-history, business-ledger, training-bill and compute-across-generations tabs, unless the page truly centres on them (Khalid removed them from DeepSeek).
- Step-by-step drawings of an escape or attack route (the text and dated checks carry it).
- A toy tuned until it agrees with the paper: show the honest toy result instead.

## Sources distilled
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 9ee6d1ea, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

`html_utils/interactive-html-ideas.md` (section 1 ideas table: T, D, A, O, G, Q, M, Z, Mi, K, Mx, X, OL, P, E, R, H, Ga rows; paper P rows; sampled per-page blocks for the training, fault-tolerance and flow-matching pages and the rejection reasons; section 2 animation paragraph), `html_utils/BRIEF_page_agent.md`, `html_utils/methods/topic_pages.md` and `papers.md` (live ingredient by kind of paper), the briefs in `~/kb_briefs` (gm_common, gm_child_common), and the parts files named above.
