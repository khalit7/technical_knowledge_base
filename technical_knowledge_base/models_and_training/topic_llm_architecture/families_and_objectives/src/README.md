# Families and objectives: how the page is built

Child page 9 of Topic: llm-architecture (Notion 3fd5c17b0d0d8105b616c17c1439f766). Built 2026-10-18 with the explainer-page skill (`page-kinds/topic-child.md`). `sh build.sh` writes `../index.html`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| Reading | `t-read` | 0 one screen (six families and objectives in one table); 1 masks (four patterns, the transformers 5.20.1 mask functions, the mask swapped on the trained checkpoint); 2 objectives (CLM, MLM with 80/10/10, span corruption with T5's length arithmetic, ELECTRA); 3 the leak, measured (before/after animation on the reference checkpoint, real bad output); 4 encoders (fill-in crossover measured, BERT, RoBERTa, ModernBERT, Ettin); 5 encoder-decoder (T5 Table 2, Wang et al. 2022, Whisper, T5Gemma 2); 6 prefix LM and UL2; 7 MTP (parallel against sequential toggle, DeepSeek-V3 equations and parameter bill from the Config calculator, Table 4, joint-training runs on tokens and FLOPs axes, frozen-trunk drafts); 8 diffusion LMs (LLaDA objective and sampler, the adaptation run, the shift, quality against steps, cost, published results); 9 in production; 10 choosing; mistakes; interview questions with three design questions. |
| Mask lab | `t-mask` | Click-a-query explorer on 24 tokens of the running sequence (causal, bidirectional, prefix with a slider, encoder-decoder), loss under swapped masks, per-layer attention on the next position before/after the leak, the code that ran and its output. |
| Objective drill | `t-obj` | The same 40 tokens under six objectives (input row, target row, counts), the per-256 table, six predict-then-reveal questions. |
| MTP lab | `t-mtp` | Self-speculative greedy decoding replayed forward by forward on prompt 7 with the sequential module against the parallel head (before/after on the same prompt), all eight prompts, an acceptance-to-tokens-per-forward calculator with the measured points, module training curves. |
| Diffusion lab | `t-diff` | The causal model and the adapted diffusion model writing the same 48 tokens (AR, 48, 12, 6 steps; animated, with token-positions-processed counters), quality against steps with random remasking, the continuations, fill-in accuracy at 15/50/90% hidden, the adaptation curve. |
| Further reading | `t-more` | Root, siblings, neighbouring pages, paper pages, outside sources, timed. |

Departures from the topic-child shape: none in structure. Two choices worth stating: (1) the masked diffusion model doubles as the "encoder" in the fill-in experiment (one adapted model instead of a separate BERT-style run: at a fixed rate the LLaDA objective is MLM; the page says so); (2) MTP and diffusion each get a lab tab because each has a measured mechanism with its own animation, while encoders and encoder-decoders are taught in Reading and linked to their paper pages, which already train toys (BERT, Ettin, T5Gemma).

## Evidence

All runs on Apple M1 Pro (16 GB), 2026-10-18, torch 2.14.1, transformers 5.20.1, on the topic's running example (root `src/data/`: tiny GPT, TinyStories tokens, tokenizer, running sequence, eval prompts; read-only, imported by `lab/fo_common.py`, which swaps the mask function without editing the shared file).

| script | where | time | output |
|---|---|---|---|
| `lab/masks.py` | CPU, 4 threads, nice 15 | about 3 min | `lab/out/masks.json`: the reference checkpoint under causal, bidirectional and prefix-128 masks (reproduces the lab's 2.278 first: 2.2776); the 150-step leak fine-tune, its attention on the next position, greedy outputs |
| `lab/train_mtp_joint.py` via `lab/queue_mps.sh` | MPS under the bench lock | about 7 min each | runs `fo_mtp_joint` (seed 0), `fo_mtp_joint_s1`; controls `fo_base_s1` (baseline seed 1) and `fo_base_1980` (baseline at the MTP run's training FLOPs) |
| `lab/collect_runs.py` | needs `LA_SCRATCH` | seconds | `lab/out/runs_eval.json`: held-out curves of those runs and of the root's `ref_baseline_s1500` |
| `lab/mtp_frozen.py` | CPU | about 8 min | `lab/out/mtp_frozen.json`: sequential and parallel depth-1 modules on the frozen reference, held-out t+2 metrics, self-speculative decoding on the 8 prompts (identical-to-greedy check) |
| `lab/train_diffusion.py --shift`, then `--resume fo_diffusion --name fo_diffusion_long --steps 3000 --lr 5e-4 --shift` | CPU | 13 + 37 min | `lab/out/fo_diffusion_train.json`, `lab/out/fo_diffusion_long_train.json`; checkpoints in scratch `runs/fo_diffusion*` |
| `lab/out/shift_probe.json` | CPU | 2 x 1 min | the 100-step probes with and without the shift (numbers copied from the two run logs) |
| `lab/diff_eval.py [fo_diffusion_long]` | CPU, SmolLM2-135M as judge (HF cache, revision 93efa2f0) | about 6 min each | `lab/out/diffusion_eval.json` (1,500-step model) and `diffusion_eval_fo_diffusion_long.json` (final, used on the page): fill-in at 15/50/90%, generations at 48/24/12/6/3 steps and random remasking, AR baselines, traces for the animation |
| `lab/code_refs.py` | topic venv | seconds | `lab/out/code_refs.json`: transformers 5.20.1 line numbers located by pattern |

`lab/make_page_data.py` (run by `build.sh`, standard library only) turns `lab/out/` into `parts/22_js_fo_0data.js` (`window.FOD`), adds the DeepSeek-V3 MTP parameter bill computed with the root's `src/calc/calc.py` (imported read-only) and DeepSeek-V3 Table 4 from the DeepSeek-V3 paper page's `tables.json`, and the derived numbers (formulas in the file). Prose numbers are `<span data-f="path">` placeholders filled from `FOD`, so prose and data cannot drift; `lab/check_page_data.py` proves the page embeds the recorded outputs. `lab/reading_time.py` writes the reading time into the page.

Rebuild from scratch (with the topic scratch present): `LA_SCRATCH=<scratch>/la`, then `masks.py`, `queue_mps.sh joint joint_s1 base_s1 base_flops`, `collect_runs.py`, `mtp_frozen.py`, `train_diffusion.py --shift --steps 1500`, the `--resume` stage, `diff_eval.py` and `diff_eval.py fo_diffusion_long`, `code_refs.py`, then `sh build.sh`. The page itself rebuilds from the repository alone.

## Files

`build.sh`, `parts/` (01 head with page CSS, 10 header, 20_read_a..f and z, 21 RD helpers from the root, 22 data and FO helpers, 23 Reading visuals, 31 Mask lab, 32 Objective drill, 33 MTP lab, 34 Diffusion lab, 39 Further reading, 99 tabs with storage key `fo-tab`), `lab/` (scripts above, `out/`, `check_controls.mjs`, `check_page_data.py`, `shoot_cards.mjs`, `reading_time.py`), `facts.md`, `viz_ideas.md`, `coverage.md`.

Reading time: 29 minutes in the Reading tab plus 5 in closed details (measured by `lab/reading_time.py`); the four lab tabs add roughly 15 minutes.
