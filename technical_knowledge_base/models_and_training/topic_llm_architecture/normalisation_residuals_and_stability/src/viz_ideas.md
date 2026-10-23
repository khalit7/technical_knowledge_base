# Visuals built and rejected (scores 0 to 2 on the criteria of visuals/choosing.md; double-weighted criteria counted twice)

## Built
| Visual | Score | Why |
|---|---|---|
| Reading: the same batches at lr 3e-2 without and with QK-norm (or z-loss, or a logit cap, or the default rate), per-layer largest logit and entropy stepped every 30 steps, loss and logit curves with a cursor (before/after, type 1) | 14 | the page's central question (what makes a run stop learning) made visible; real recorded probes; corrects "clipping fixes spikes" and "z-loss fixes everything" |
| Stability explorer tab: learning rate x placement x QK-norm grid over recorded runs, up to three overlaid (type 4 and 9) | 13 | one table that is the controlled experiment no paper prints at this scale; reuses the Block lab's eight runs |
| Residual stream stepper, moved from its own tab into Reading section 2 on 2026-10-23: one sequence through four placements, init or trained, sub-layer by sub-layer, four size measures (before/after, type 1) | 12 | the brief's residual before/after; adds sandwich and output norm and the init switch to the Block lab's pre/post; it explains one mechanism, so it sits beside the claim |
| Init-time stream table (section 1) with the derived 16 sqrt(12) | 9 | a number that reproduces from first principles (derived 55.4 against measured) |
| hyper-connection product table (section 2, calculation) | 8 | shows why mHC constrains the mixing; illustrative, labelled |
| Production table (section 9) read from configs and code | 9 | categorical facts read verbatim; corrections (Gemma 4 back to plain gain, MiniMax-M1 is DeepNorm, DeepSeek-V4 mHC) |
| Code quotes with line numbers located by pattern | 8 | every claim about real models checkable |
| Predict-then-reveal drills x 3 (post-norm with warmup, z-loss on attention logits, clipping) | 9 | each reveal is a measured run |

## Added in the 2026-10-23 rebuild (teaching contract)
| Visual | Kind | Why |
|---|---|---|
| Hero: one block with the five places a fix acts (Reading top) | static annotated diagram | the whiteboard picture the page elaborates; every control tagged with its section |
| Final held-out loss against learning rate, five placements plus the 500-step warmup point (section 2) | parameter chart over recorded runs | absorbed from the root's Block lab learning-rate sweep; pre-norm's graceful slope against post-norm's cliff in one picture |
| Gradient norm by block, trained or initial (section 2) | chart with one toggle | absorbed from the Block lab (5.1e-7 at block 1); the toggle shows the Xiong et al. profile that does not reproduce |
| abs(mean) / RMS through the stream (section 3) | bar chart | the RMSNorm argument seen inside a trained model; data already in out/mistakes.json |
| Mean log Z over training, three runs (section 5) | line chart | z-loss had only prose; shows the healthy drift and that 1e-4 barely moves it |
| Every-step gradient norm with OLMo 2's spike flags, three runs (section 8) | line chart with a picker | what the spike-score table counts, drawn; flags recomputed by page_text.py and checked equal to the table |

## Rejected
- A per-head attention-map strip during the divergence: would need attention maps saved at every probe (large) and repeats the Inside lab's maps; the per-layer largest logit and entropy carry the mechanism.
- Re-running Xiong et al.'s gradient-by-depth toy: the ML-fundamentals page has it; the Block lab found the pattern does not show at 6 layers.
- A depth sweep (12, 24, 48 layers) of the tiny GPT: hours of MPS for a result the published Peri-LN table and the ML-fundamentals toy already show; skipped under "cheap runs over expensive".
- Training a hyper-connection model: its instability needs scale (27B, 12k steps in the paper); a random-matrix calculation shows the mechanism instead.
- A spike-score live calculator: the ML-fundamentals root and the OLMo 2 page have one; this page reports the score on its own runs in a table.
- Timing charts of whole runs: rough on a shared laptop; only the norm micro-benchmark is shown, as ratios.
- Rebuilding the Block lab's own pre/post animation (one token, bars per sub-layer): the four-placement stepper already draws the same trace for token "o"; the matched-pair numbers (0.9 to 14.8, 16.0 to 16.4, 24.6) are given beside it.
- A Block lab loss-curves panel in Reading: the Stability explorer overlays any of those runs; Reading shows the final-loss summary instead.
