# Inside a real model (tab `t-inside`, prefix `in`)

What trained transformers do with their parts, measured on fixed inputs: head patterns (previous-token, induction, first-token), attention sinks and what removing them costs, massive activations, and the logit lens; on SmolLM2-135M, Qwen3-0.6B, Pythia-70M-deduped's published training checkpoints, and the topic's tiny GPT before and after training. Built 2026-10-18 on an Apple M1 Pro.

Parts: `parts/34_tab_inside_a.html` to `_d.html` (HTML, scoped CSS in `_a`), `parts/34_js_in_0data.js` (written by `make_page_data.py`, window.IND), `34_js_in_1core.js` (helpers, the step controller registered on `t-inside`, `.in-v` prose numbers filled from `IND`), `_2one.js` to `_8drill.js` (one per section).

## Runs (all deterministic forward passes; no timings are quoted on the page)
| script | what | where | time |
|---|---|---|---|
| `extract_pretrained.py smol` / `qwen` | running text: all attention maps, raw residual stream (forward hooks), logit lens; repeated random tokens (8 seeds); sink ablation (custom attention function registered with `AttentionInterface`); sliding window 64 with 0, 1 or 4 first tokens kept on 1,024 tokens of TinyStories validation; SDPA `output_attentions` behaviour | MPS, bench lock, fp32 (SmolLM2) and fp16 (Qwen3) | about 10 s each |
| `pythia_phase.py` | the same repeated random tokens through 14 published Pythia-70M-deduped checkpoints (inference only) | CPU, 4 threads | about 30 s |
| `train_snapshots.py` | the tiny GPT baseline retrained exactly as `ref_baseline_s1500` (same seed, batches, schedule) with probes every 25 steps and 12 snapshots | MPS, bench lock | about 5.5 min |
| `tiny_analysis.py` | tiny GPT at initialisation (seed 0, as `train.py`) and after training: same measurements, plus the Roxy copy test | CPU | seconds |
| `make_page_data.py` | builds `out/*.json` and `parts/34_js_in_0data.js`; `facts.json` holds every number the prose quotes | CPU | seconds |
| `locate_source.py` | file:line of the quoted transformers v5.20.1 lines, by pattern (`out/source_lines.json`) | | |
| `check_in.mjs`, `check_data.py` | every control at 390 px dark and 920 px light; page data equals `out/*.json`, prose numbers present | | |

Raw arrays live in `$LA_SCRATCH/in/` (not durable); everything the page needs is in `out/`. To rebuild from scratch: run the scripts in the order above (GPU ones under the bench lock with both MPS watermark variables), then `sh src/build.sh`.

Downloads: Pythia-70M-deduped `pytorch_model.bin` at 14 revisions (URLs, commit shas and sha256 in `out/pythia_manifest.json`); SmolLM2-135M and Qwen3-0.6B were already cached by the setup agent (revisions in `src/data/README.md`).

## Findings worth knowing (all in the page)
- SmolLM2: the sink switches on at layer 12, in the same layer where dimension 507 of the first token's residual reaches about 20,000 (median entry about 1.6). Masking token 0 raises the loss from 1.563 to 1.648 and breaks greedy generation; a 64-token window doubles the loss (3.36 against 1.62) and keeping even one first token recovers most of it (1.81).
- Pythia-70M: induction score jumps from 0.007 to 0.95 between steps 512 and 1,000 (1.07B to 2.10B tokens). The final checkpoint (step 143,000) keeps an induction head (score about 0.8) but loses the copy (copy-2 loss about 12): see the page for the intermediate checkpoints.
- The tiny GPT forms previous-token heads but no induction head and no sink within its 12.3M tokens; it does learn to reuse "Roxy" from context.

## Departures from the brief
- Pythia-70M checkpoints were added because the tiny GPT forms no induction head within the topic's training budget; training it to about 2B tokens would take hours (cheap-runs rule).
- Maps are stored for 7 of SmolLM2's 30 layers to stay near the 200 KB data budget; scores cover every head.
