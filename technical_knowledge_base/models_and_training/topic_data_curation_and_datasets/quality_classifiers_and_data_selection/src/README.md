# Source of "Quality classifiers and data selection" (prefix qc)

Child page of Topic: data-curation-and-datasets. Built 2026-10-14/15 on an Apple M1 Pro, CPU only (4 threads, `nice -n 15`,
shared machine). `sh build.sh` writes `../index.html` from `parts/`, embedding `data/qc_data.json` as `window.QC` and filling
`@@key@@` in the prose from `data/facts.json` (both written by `scripts/qc_make_data.py`; an unfilled key means its run is pending).

## Layout
| Path | What |
|---|---|
| `parts/` | `01_head`, `02_split` (split layout, skill template), `10_header`, Reading `20_read_a` (styles, nav, the idea in one screen) to `20_read_i` (sections 1 to 12), `20_read_j` (closed depth), `20_read_z`; `39_tab_more` (Further reading). JS: `21_js_rd_common.js` (skill template, autoplay rules of 2026-11-06), `22_qc_rd1.js` (Pareto curve, predict-then-reveal), `23_qc_rd2.js` (Table 5 bars, reference table, Nemotron-CC matrix, repetition calculator, Qwen histogram), `24_qc_figs.js` (hero, LLM-graded pipeline, DSIR length bars, gradient diagram), `25_js_s3.js` (3D renderer v2, skill template), `31_qc_tr.js` (classifier replay, section 3), `32_qc_th.js` (threshold explorer, section 5), `33_qc_bi.js` (bias heatmap, edits and pairs), `34_js_sc_ft.js` (Fig. 1, section 1), `35_js_sc_ref.js` (Fig. 2, section 2), `36_js_sc_th.js` (Fig. 3, section 5), `99_js_tabs.js` (template, storage key `qc-tab`) |
| `ledger.json` | knowledge ledger of the 2026-10-24 rebuild (`python3 html_utils/ledger.py check`) |
| `check_page.mjs`, `check_stages.mjs`, `shot_el.mjs` | page checks (below), the 2026-11-06 stage checks, element screenshots |
| `scripts/` | every run, below |
| `labels/` | `labels_qc.jsonl`: 200 run0 documents drawn uniformly at random (seed 1, excluding the root's 100), labelled by the agent that built this page (Claude) from the first 1,000 characters: keep y/u/n, WebOrganizer topic and format, region guess, generated-like flag, one-line note. `sample_ids.json`, `explain_docs.json` (16 documents for token-level views) |
| `data/` | `qc_data.json`, `facts.json`, `out/` (small JSON results of every run) |
| `viz_ideas.md`, `coverage.md` | visual ideas built and rejected; claims checked |

## Environment
```sh
export DC_SCRATCH=<the shared dc setup folder> HF_HOME=$DC_SCRATCH/hf OMP_NUM_THREADS=4 MKL_NUM_THREADS=4
PY="nice -n 15 $DC_SCRATCH/venv/bin/python -B"     # run from scripts/
```
Reuses the root's `src/data/load.py` (running example) and `src/qual/q_common.py` (published scorers). Downloads are recorded
with revision, size and sha256 in `$DC_SCRATCH/SETUP.md` under "qc downloads"; raw files were deleted after use (disk).

## Runs, in order
| Step | Command | Writes | Time (rough, loaded machine) |
|---|---|---|---|
| 1 | `qc_ftexplain.py check <dclm.bin> 2617` | verifies the hand rebuild of fastText (max diff 1.4e-5) | 1 min |
| 2 | `qc_perturb.py edu 300` | `out/perturb.json` typography, case, bullets edits | 2 min |
| 3 | `qc_dialect.py dclm edu` | `out/dialect.json` pass rate by domain, spelling swaps | 3 min |
| 4 | `qc_sample.py`, then hand labelling | `labels/` | |
| 5 | `qc_refsets.py` | `$DC_SCRATCH/qc/ref/*.txt` reference and negative sets | 20 min |
| 6 | `qc_model_all.py dclm`, then `qc_model_all.py <kind> <n>` for oh_eli5 50000, wiki 50000, owt2 50000, gpt3 50000, oh_eli5 200000 | scores, `out/vocab_*.json`, explanations; each model deleted after use | 15 to 30 min each |
| 7 | `qc_train_ref.py gpt3`, `qc_score_ft.py gpt3_lr`, `qc_score_ft.py edu_ft` | GPT-3-style classifier and the root's fastText scores | 15 min |
| 8 | `qc_encoders.py nemo_mixtral` / `nemo_nemotron` (run0, nemo, fw2k), `qc_nemotron.py` | Nemotron-CC graders, ensemble rebuild `out/nemotron.json` | 40 min |
| 9 | `qc_encoders.py wo_topic run0`, `wo_format run0` | WebOrganizer topic and format of run0 | 20 min |
| 10 | `qc_ppl.py run0` | Pythia-160M perplexity of run0 | 20 min |
| 11 | `qc_dsir.py` | DSIR log weights toward three targets, `out/dsir.json` | 30 min |
| 12 | `qc_pairs.py fetch 60` (download lock), `qc_pairs.py score` | Nemotron-CC rewrites paired with their source pages | network-bound |
| 13 | `qc_make_data.py`, `sh ../build.sh` | the page | 2 min |
| 14 | `node check_page.mjs`, `node check_stages.mjs [shots dir]` | every control at 390 px dark and 920 px light, embedded data, facts, recomputed prose numbers (Fig. 3's counts, DSIR), the stages play on view; then the three stages at 1400, 920 and 390 px: autoplay, one list item per step, stop off screen and under reduced motion, step-list numbers against `QC` (Fig. 1 for all nine page and classifier pairs) | 2 + 6 min |
GPU queue (`scripts/run_pending.sh`): job 1 (encoders on 50,000 FineWeb rows) dropped 2026-10-15; job 2 (Qwen3-1.7B perplexity on 2,000 FineWeb rows, `qc_qwen_ppl.py`, float16 + float32 chunked log-softmax) run 2026-10-16 on mps in 836 s, with the FineWeb-Edu classifier rescored on the same rows.

**Scratch wipe (2026-10-15 reboot).** `$DC_SCRATCH/qc` was lost, so `qc_make_data.py` can no longer be rerun as a whole; `data/qc_data.json` and `data/facts.json` hold every recorded value. `scripts/qc_refresh_pending.py` adds the job 2 results and the root's new Qwen3-0.6B and 50,000-row numbers without touching recorded values (one fact, the reading of the 12 lowest-perplexity rows, was written by hand into facts.json).

## Departures from DCLM's recipe (said on the page)
OpenWebText (Skylion007/openwebtext) for OpenWebText2 (absent from pile-uncopyrighted); Project Gutenberg chunks from the Pile
for RedPajama books; sentence-transformers/eli5 (no vote scores) for DCLM's vote-filtered ELI5; real RefinedWeb for DCLM's
RefinedWeb reproduction; 50k + 50k training sets for the reference-set comparison (DCLM: 200k + 200k, rebuilt once at full size);
hyperparameters read from DCLM's model file (lr 0.05) rather than its training script's default (0.1).

## Privacy
Excerpts only from run0 `final/` (PII-scrubbed), at most 220 to 600 characters; hosts reduced to their top-level domain in the
bias browser; pages about a private individual are never excerpted. Labels hold WARC record ids and short notes, no text.

## The 2026-10-24 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing only: no new runs. Every number is from `data/qc_data.json`, `data/facts.json` or `data/out/`, or published with its source.
- **Top**: the core idea in one sentence (a scorer plus a cut; the idea of good decides who survives; only training judges it), a hero figure (pool, the five scorer families, run0's real DCLM logit histogram with the published cut, the kept sets of DCLM and FineWeb-Edu), "You need", new terms, and the five-family comparison table with a "what it bought" column (DCLM Table 4, FineWeb-Edu, DSIR, LESS).
- **The three lab tabs moved inline**, because each explains one mechanism: the Classifier replay into section 3 (what a reference set teaches; the token-level reader in a closed block, since the section 1 animation already shows it), the Threshold explorer into section 5 (with a predict prompt and a closed reveal counted from the data), the Bias browser's heatmap into section 10 and its edit and pair tables into section 3 (closed). Tabs left: Reading, Further reading.
- **New visuals where a mechanism had none**: the LLM-graded pipeline (static), DSIR's length bias on the recorded medians (static bars), gradient alignment (static, labelled illustrative), DCLM Table 4 as bars (it is the owned comparison and keeps every row and "fastText OH-2.5 + ELI5 30.2" in static text).
- **Concrete, then picture, then formula** in section 1: the animation on a real page first, then the logit as the mean of pushes.
- **Closed depth**: fastText's source walk-through and the int32 trap, training provenance and departures, the full edit table, the pair table, the six other LLM-graded classifiers, the Qwen3-0.6B detail, DSIR's cost and KL, why FineWeb-Edu's DSIR selection is long, LESS's steps, the WebOrganizer readout, DCLM's benchmark design, the dropped 50,000-row run, four interview questions.
- **Correction (visible box, section 7)**: the old page said the sign of DSIR's length effect flips toward FineWeb-Edu; the recorded Spearman is negative for all three targets (-0.68, -0.89, -0.30), and the selection is long anyway.
- **Deleted as fat**: the one-screen bullet summary (each bullet restated a section), most of "Common mistakes" (each restated a section; the two that taught something new, the "" join flipping 115 decisions and negatives drawn away from run0, moved into section 12 and section 2's closed block), interview answers restating sections, the old tab intros and pointers.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; `check_page.mjs` scrolls the page under normal motion and finds nothing playing.
- **No real image**: the page is about mechanisms and data, not a physical object.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 39.3 min | 38.5 min |
| Reading, closed details | 3.9 min | 13.0 min |
| Lab tabs, core | replay 3.3 + threshold 2.3 + bias 4.4 = 10.0 min | none (moved inline) |
| Core total, excluding Further reading | 49.3 min | 38.5 min |
| Visuals drawn in Reading (svg at least 120 x 80 px) | 4 | 10 |

Why about 39 minutes is right: the page teaches five selection families with their mechanism, measured behaviour on the same 2,617 documents, and published payoff, plus the threshold, the scale trade-off, bias and how a filter is judged; the ledger's core units are all needed for one of those. About 1,800 of the core words are the text of the inline widgets (the bias heatmap's cells, the replay's word lists, the threshold explorer's overlap labels), which is scanning rather than reading, so the prose itself is nearer 31 minutes. What made the old page long (restated summaries, mistakes, interview answers, three tabs repeating Reading sections) is cut or closed.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
498 units: core 346, depth 90, fat 62. 477 were drafted by `ledger.py init` from the old page; 21 were added by hand for script-rendered tables and the new visuals (section "hand: ..."). Keys were matched to the rebuilt page's static text; fat units carry a `note`.

## Topic close (2026-10-24)
The root was rebuilt as a map; this page's Further reading now quotes the root as "31 min, plus 7" and siblings as their headers, and its ledger keys that quoted old times were re-keyed. The Continued pretraining card (old page, now merged) is folded into the Data mixing card (its section 6).

## 2026-11-09: split layout, three 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
Editing only, no new runs; every number in the stages is `window.QC` (the recorded runs) or DCLM's published Table 5.
- **Templates** copied unchanged: `02_split.html` (after `01_head.html` in `build.sh`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `qc-tab`). `build.sh` writes its em-dash check from octal bytes.
- **Fig. 1 `stg-ft`** (section 1, `34_js_sc_ft.js`; replaces the 2D fastText stepper, whose six captions became the step list `sx-ft`): the page's first tokens as tiles, first on a glass page as text (each tile as wide as its characters), then in reading order on a see-through plinth; word pushes stand up toward high quality or hang down toward crawl, fed by flows from the glass word table; bigram shares stack in amber from the bucket table; everything flows into one column on a logit axis (one scale for all nine page and classifier pairs), and a glass plane at the cut's logit decides. The page and classifier chips stay; the step list's numbers follow them; the coloured-token text and counters remain as a live readout under the steps. Data: `QC.a1`.
- **Fig. 2 `stg-ref`** (section 2, `35_js_sc_ref.js`, new): six fastText lanes (DCLM published, the OH-2.5 + ELI5 rebuilds at 200k and 50k, Wikipedia, OpenWebText, GPT-3 approx), rows from front to back for overlap with DCLM's top 10%, hand-label precision (labelled kept in brackets), Llama AUC above chance, and DCLM's published 7B-1x Core for the four reference sets it trained; the camera moves to the row of each step. The old table is a closed block under the steps. Data: `QC.reftab`, `QC.t5`.
- **Fig. 3 `stg-th`** (section 5, `36_js_sc_th.js`, new; replaces the closed "Reveal" in the threshold explorer): the 200 uniformly drawn labelled pages as columns by rank (square-root scale, said on the page), coloured by label; a glass plane rises from the top 60% to 5% with DCLM's precision at each cut (54 of 116, 34 of 63, 16 of 28, 7 of 16), then the columns re-sort to FineWeb-Edu's ranks (56 of 116 at 60%, 13 of 16 at 10%). The threshold explorer stays as a widget beside the bullets.
- **Splits** (Reading): the idea with the hero; 1 (Fig. 1) and GPT-3's Pareto curve; 2 twice (Table 5 bars; Fig. 2); 3 twice (classifier replay; edit table); 4 twice (LLM-graded pipeline; Nemotron-CC matrix); 5 twice (Fig. 3; threshold explorer); 6 (Qwen histogram); 7 (DSIR bars and the correction box); 8 (gradient diagram); 9 (repetition calculator); 10 (bias heatmap); 11 (Table 4 bars). Full width: the families table and running example, closed blocks, the LLM-rewrite pair study, section 12 (code) and the depth section; Further reading unchanged.
- **Kept 2D, and why**: see `viz_ideas.md` (curves, bars on one axis, heatmaps, flowcharts, reader-driven widgets). No DSIR point-cloud scene: only DSIR's summary numbers survived the 2026-10-15 scratch wipe, so per-page points would be invented.
- **Correction**: the paragraph after Fig. 2 said OH-2.5 + ELI5 trains "5 to 6 Core points" ahead of the other three reference sets; Table 5 gives 3.5 (GPT-3 Approx) to 6.3 (OpenWebText2), now written so.
- **Checks**: `check_stages.mjs` (new, from Extraction and filtering's); `check_page.mjs`: the never-autoplay assertion is inverted (each stage plays once scrolled into view) and it reloads with a cleared tab memory first.
- **Ledger**: 24 Further-reading keys that began with a minutes figure re-keyed on the title words after it; 4 units re-keyed to the step lists that now carry them (68, 109, 489, 497); 6 units added for the step lists (section "added 2026-11-09"). 504 units: core 352, depth 90, fat 62; problems 0.
- **Length** (`audit_pages.mjs`, 230 wpm): Reading core 8,862 to 9,633 words (38.5 to 41.9 min), closed 2,988 to 3,035 (13.0 to 13.2); Further reading unchanged (724 words, 3.1). The growth is the three step lists (about 900 words): Fig. 1's text was script-written captions before (not counted), Fig. 3's was a closed reveal, Fig. 2's is new. Visuals counted in Reading 10 to 13. No real image (the page is about mechanisms and data).
