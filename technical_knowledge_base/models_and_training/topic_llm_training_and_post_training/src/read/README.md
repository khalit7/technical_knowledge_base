# Reading tab and Further reading: sources, scripts, visual choices

Parts: `parts/20_read.html` (styles, In one screen, Axis 1, Axis 2), `20_read_b.html` (Axis 3, Axis 4), `20_read_c.html` (Machinery, How we got here, Common mistakes, Choosing a path, closes the tab), `21_js_rd_common.js` (RD helpers and the step-animation controller), `22_js_rd_grid.js` (stage x axis grid and its 32 cell paragraphs), `23` to `28` (one script per visual), `39_tab_more.html`. Element ids are prefixed `rd-`; CSS is scoped under `#t-read`.

Checks: `python3 src/read/recompute.py` (every derived number and the KL-leash simulation), `node src/check_read.mjs` (clicks every control and steps every animation at 390 dark and 920 light; screenshots in `../.shots/rd-*.png`). Coverage of the old page: `src/coverage.md`; the old page verbatim: `src/live.md`.

## Visuals, and why each earns its place

| Visual | Where | Teaches | Numbers |
|---|---|---|---|
| Stage x axis grid, click a cell | In one screen | The whole comparison in one table; each cell says the stage's answer to one axis and links to the page that owns it | Each cell sourced; derived and reported marked |
| Same prompt through five checkpoints (base, SFT, preference-tuned, RLVR, distilled) | Axis 1 | Before and after of one input: what each signal changes in behaviour | Illustrative texts, labelled; behaviours documented and linked |
| Disclosed datasets filling in year by year, coloured by who made them | Axis 2 | Volume falls by orders of magnitude down the lifecycle while the labeller moves from the web to people to models to checkers | Published counts, each linked in its step caption; two log panels (tokens; examples) because units differ |
| One batch through PPO, GRPO and DPO | Axis 3 | Where post-training cost moved: four models against two, one rollout against a group of eight, no sampling at all | Memory derived (16 and 2 bytes per parameter); outcomes illustrative |
| Proxy against gold reward, with and without the KL leash | Axis 4 | Reward hacking as a shape: the proxy keeps rising after the true reward peaks, and the penalty stops the policy near the peak | Gao et al.'s functional form, illustrative coefficients, simulated in recompute.py |
| Bytes per parameter calculator | Machinery | Why PEFT and quantization change who can train and serve; reproduces QLoRA's arithmetic (33.5 GB at 65B) by construction, and shows its 780 GB is 12 bytes per parameter | Derived from ZeRO, QLoRA, llama.cpp |
| Path chooser | Choosing a path | Each need mapped to stages, data, cost and failure | From the sections above |

Rejected: an animated pretraining loss curve (no number a sentence does not give); a cost ladder chart of priced runs (owned by the Price list tab); a FLOPs slider (owned by the Scaling calculator); a parallelism animation (the ZeRO and Megatron-LM paper pages already have one each).

Placement of self-improving and automated-research loops: folded into the axes they inform (Axis 2 who makes data, Axis 3 who chooses experiments, Axis 4 loops that narrow) and the 2026 entry of How we got here, rather than a separate section, so the old news list does not return as a section of its own.
