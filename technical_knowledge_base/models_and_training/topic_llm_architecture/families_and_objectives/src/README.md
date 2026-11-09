# Families and objectives: how the page is built

Child page 9 of Topic: llm-architecture (Notion 3fd5c17b0d0d8105b616c17c1439f766). Built 2026-10-18 with the explainer-page skill (`page-kinds/topic-child.md`). `sh build.sh` writes `../index.html`.

## Tabs (rebuilt 2026-10-23 to the teaching contract)

| Tab | id | What it holds |
|---|---|---|
| Reading | `t-read` | The idea (core sentence, hero of six families as small multiples: mask matrix, input row, scored row; You need; new terms; the six-family table closed); 1 masks (the 12-token matrix toggle, the mask-swap bars, closed: code lines, the full swap table, the 24-token click explorer and the code that ran); 2 objectives (the 40-token six-objective view, CLM, MLM with 80/10/10 and ELECTRA, span corruption with T5's arithmetic, the per-256 table; closed: seven predict-then-reveal questions); 3 the leak (training-curve stepper, layer-by-layer attention on i+1, real output, the real-code warning); 4 encoders (fill-in bars at 15/50/90%, what changed since BERT, Ettin, cost and how to check; closed: fill-in table, ModernBERT recipe, lineage); 5 encoder-decoder (T5 Table 2, Wang et al. 2022, Whisper, T5Gemma 2); 6 prefix LM and UL2; 7 MTP (the two designs, equation, cost and published benefit, the joint-training chart with its tokens/FLOPs toggle, the self-speculative replay of sequential against parallel drafts; closed: parameter bill, DeepSeek-V3 Table 4, frozen-trunk table, per-prompt table, acceptance calculator, module curves); 8 diffusion LMs (the masked-denoising animation of one sentence, AR against 48/12/6 steps, the four steps and the loss, why 1/t, the adaptation run, the shift, quality against steps, the bad-output box, cost and block diffusion, published results; closed: quality table, continuations, LLaDA Table 9, Gemini Diffusion's table, adaptation curve); 9 choosing; Depth (closed: production checkpoints, four mistakes the core does not show, interview rehearsal). |
| Further reading | `t-more` | Root, siblings, neighbouring pages, paper pages, outside sources, timed. |

Parts (2026-11-09): `20_read_a` (Reading CSS, the idea) to `20_read_g` (choosing, depth), `20_read_z`; `02_split.html` (split layout, template); JS `21_js_rd_common.js`, `25_js_s3.js` (renderer v2) and `99_js_tabs.js` are the skill templates (storage key `fo-tab`), `22_js_fo_common.js` (`FO.anim`, now a thin wrapper of the template's `RD.anim`; data placeholders; predict cards; a `toggle` listener that redraws charts when a closed block opens), `23_js_fo_read.js` (hero, the leak's real output, joint chart, tables), `31_js_mk.js` (the closed 24-token explorer and recorded output), `32_js_ob.js` (the objectives stepper), `33_js_mt.js` (draft replay widget, calculator, module curves), `34_js_df.js` (diffusion word replay widget, quality, fill-in, adaptation curve), `40_js_sc0kit.js` (`FOS`, shared scene helpers) and the five scenes `41_js_sc_mask.js` to `45_js_sc_diff.js`. The `3x_js` files keep their old names and prefixes (`mk-`, `ob-`, `mt-`, `df-`).

## The 2026-10-23 rebuild: what changed and why
- **Four lab tabs folded into Reading.** Each explained one mechanism, so its visual now sits beside the claim it proves: the objective view in section 2 (the section had no visual), the swap bars in section 1 (replacing a table), the attention-per-layer bars in section 3, the fill-in bars in section 4 (replacing a table), the draft replay in section 7 (which described it in words), and the masked-denoising animation and quality chart in section 8 (the diffusion section now shows the sampler it describes). Per-item tables, the calculator, training curves, code and the click explorer went into closed blocks.
- **Top added**: core sentence, a static hero (six families as mask matrices with what is scored), You need, new terms. The "in one screen" table is a closed reference block.
- **No autoplay** (reversed on 2026-11-09, see below): `FO.anim` used to start the leak, draft and diffusion animations when they scrolled into view; it then waited for the reader. `21_js_rd_common.js` and `99_js_tabs.js` are the templates. `lab/check_controls.mjs` now scrolls every card into view and fails if anything plays, and opens every closed block before exercising controls.
- **Cut as fat**: wind-ups and headings, pointers to the removed tabs, mistakes that restated sections 1, 3 and 8, the predict card on the shift (its point is now the shift box's title). The "why 1/t" interview answer became core text in section 8.
- **Correction**: the mask-swap evaluation is 20 held-out batches of 32 windows (640 windows of 256 tokens; `lab/masks.py`), not "20 windows" as the old page, this README and `facts.md` said; corrected on the page (marked) and in `facts.md`.
- **Removed**: `lab/reading_time.py` (the header now states the time measured by `html_utils/audit_pages.mjs`), the four `3x_tab_*.html` parts.

## Departures from the topic-child shape
No lab tabs: each old lab explained one mechanism, so its visuals moved inline. The masked diffusion model doubles as the "encoder" in the fill-in experiment (one adapted model instead of a separate BERT-style run: at a fixed rate the LLaDA objective is MLM; the page says so). Encoders and encoder-decoders link to their paper pages, which already train toys (BERT, Ettin, T5Gemma).

## Length judgement
| | Before (2026-10-18 page, audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute) | 31.1 min (7,157 words) | 27.5 min (6,316 words) |
| Reading, closed details | 3.8 min | 13.5 min (3,111 words) |
| Other tabs, core | Mask lab 2.3 + Objective drill 3.0 + MTP lab 2.4 + Diffusion lab 3.5 = 11.1 min | none |
| Core total, excluding Further reading | 42.3 min | 27.5 min |
| Visuals drawn in Reading (audit count) | 3 | 16 (6 are the hero's panels); 5 more in closed blocks |

Why 27 minutes is right: the page owns six families and two objectives that are each a mechanism with its own evidence (the masks and what they cache, the objectives and their signal, the leak, encoders, encoder-decoders, prefix LM and UL2, MTP at equal compute and as a draft, masked diffusion with its sampler, loss, shift, quality and cost). Every core unit in the ledger is needed for one of them, and about a fifth of the core words are now captions and counters of the visuals that used to sit in four tabs. What made the old page long beside its tabs (per-item tables, code, mistakes that repeated sections, interview answers, a production table) is closed and optional; the closed time grew because the labs' tables, calculator and curves moved into closed blocks rather than being cut.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
398 units: core 263, depth 101, fat 34, no owned or volatile units. 373 were drafted from the old page by `ledger.py init`; 25 were added by hand for script-rendered visuals and tables (their numbers are drawn by script, so the key is the static caption) and for the correction. Fat units carry a `note`.

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

`lab/make_page_data.py` (run by `build.sh`, standard library only) turns `lab/out/` into `parts/22_js_fo_0data.js` (`window.FOD`), adds the DeepSeek-V3 MTP parameter bill computed with the root's `src/calc/calc.py` (imported read-only) and DeepSeek-V3 Table 4 from the DeepSeek-V3 paper page's `tables.json`, and the derived numbers (formulas in the file). Prose numbers are `<span data-f="path">` placeholders filled from `FOD`, so prose and data cannot drift; `lab/check_page_data.py` proves the page embeds the recorded outputs.

Rebuild from scratch (with the topic scratch present): `LA_SCRATCH=<scratch>/la`, then `masks.py`, `queue_mps.sh joint joint_s1 base_s1 base_flops`, `collect_runs.py`, `mtp_frozen.py`, `train_diffusion.py --shift --steps 1500`, the `--resume` stage, `diff_eval.py` and `diff_eval.py fo_diffusion_long`, `code_refs.py`, then `sh build.sh`. The page itself rebuilds from the repository alone.

## Files

`build.sh`, `parts/` (above), `lab/` (scripts above, `out/`, `check_controls.mjs`, `check_page_data.py ../index.html`, `shoot_cards.mjs`), `ledger.json`, `facts.md`, `viz_ideas.md`, `coverage.md`.

Reading time: see the length judgement above.

2026-10-26 (final follow-up sweep): section 6 (prefix LM) links Bitune as the fine-tuning-time variant (bidirectional prompt read beside the causal one).

## 2026-11-09: split layout, five 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html`, `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `fo-tab`). `build.sh` is now the template's (C-locale part order, `02_split.html` after `01_head.html`, the em-dash test written as bytes) plus the `lab/make_page_data.py` step. `FO.anim` is now a wrapper of the template's `RD.anim` (step list, autoplay on view, `auto:false` widgets, `start`).
- **Five stages**, one scene file each on `40_js_sc0kit.js` (`FOS`: smooth per-step values, labels that hand over at mid-transition, columns on plinths), each with an `ol.sx` step list and no per-step caption; every number from `FOD`:
  - Fig. 2 `stg-mask` (5 steps, `41_js_sc_mask.js`): the first 12 tokens as a 12 x 12 field under causal, bidirectional, prefix 5 and encoder-decoder masks, flows from the keys a marked query may read; step 5 the measured mask swap (`masks.swap`) as columns. Replaces the 2D mask toggle and the swap bars.
  - Fig. 4 `stg-leak` (5, `42_js_sc_leak.js`): the causal wall, the answer flowing in from i+1, attention on i+1 per layer before and after (`masks.leak.attn_next`), the training loss every 25 steps against the honest 2.278, the loss under the causal mask against the unigram 6.01. Replaces the 31-frame curve stepper and the attention bars.
  - Fig. 5 `stg-encdec` (5, `43_js_sc_encdec.js`): encoder, its K/V plate feeding every decoder layer, decoding with a growing self cache, T5 Table 2 as columns (published, as printed in the section's table). New: the section had no visual.
  - Fig. 6 `stg-mtp` (5, `44_js_sc_mtp.js`): trunk and shared head, parallel head, sequential module with Emb(t i+1), draft acceptance and tokens per forward, parameters (`mtpf`, `d.spec`). Replaces the 2D designs toggle.
  - Fig. 7 `stg-diff` (5, `45_js_sc_diff.js`): the 48-token continuation by the causal model and by diffusion at 12 steps in its recorded commit order, grouped into four stretches of forwards (3, 6, 12, 48), then the token positions processed (`d.ar_positions`, `d.diff_positions12`). New.
- **2D kept, in splits**: the hero (Fig. 1, six small multiples, `.s3side`), the objectives (Fig. 3, now an `RD.anim` stepper with list `sx-ob` replacing the mode buttons; the words must stay readable), the fill-in bars, the joint-training chart, the quality bars. The MTP draft replay (70 to 80 forwards) and the diffusion word replay (up to 48 steps) are widgets under the long-replay rule: no autoplay, no step list, opening on their last frame. Full width: section 6, 9, depth, the tables.
- `check_stages.mjs` (new, adapted from Attention variants'): stages play in view, step to the end with one list item per step, stop off screen, never move under reduced motion; the objectives stepper plays, the widgets never do; list numbers against `FOD`. `lab/check_controls.mjs`: the never-autoplay assertion is inverted (objectives plays in view, widgets do not; reduced motion: nothing).
- **Length**: Reading core 6,451 to 7,711 words (28 to 34 min); closed details unchanged (3,111 words, 14 min). The added words are the 31 step-list items that explain the five stages and the objectives stepper; part of them replace script captions that were shown one at a time and not counted (mask, objectives, leak, MTP designs), the rest explain the two new figures. Visuals inline 16 to 17 as the audit counts them. The length is right because each stage carries a mechanism the page owns and its step list is the explanation the figure needs; no unit was cut.
- **Ledger**: 399 units (core 263, depth 101, fat 34, volatile 1), problems 0; seven visual-unit descriptions updated (375, 376, 379, 380, 383, 385, 392), no key changed.
