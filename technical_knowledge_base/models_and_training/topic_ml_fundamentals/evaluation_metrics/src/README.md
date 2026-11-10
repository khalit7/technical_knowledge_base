Source of the interactive HTML on the Notion page "Evaluation metrics" (https://app.notion.com/p/3c65c17b0d0d81a29acef722e842a29b), a child of Topic: ml-fundamentals.

Build: `sh build.sh` writes `../index.html` from `parts/` (parts listed explicitly in `build.sh`).

## Shape

`.claude/skills/explainer-page/page-kinds/topic-child.md` (a child page), rebuilt 2026-10-24 to the teaching contract (see below). Reading: the idea in one screen (core sentence, the threshold hero, new terms, the all-metrics table closed), then 1 threshold metrics, 2 ROC and PR, 3 calibration, 4 multi-class averaging, 5 regression, 6 ranked lists, 7 text overlap (with the own-sentences editor), 8 perplexity (entropy and KL closed), 9 embedding scores and judges, 10 error bars (bootstrap and the ten checks closed). Tabs: Reading, Further reading. No child pages, databases or video on the Notion page.

Not rebuilt, linked instead: the root's ROC against precision-recall prevalence widget (Reading, step 7) and its entropy / cross entropy / KL thread (thread 1); imbalanced-data training fixes (root tab "When training goes wrong", where the deleted Debugging training page went); LLM judges (Topic: evaluation-and-llm-judges, not migrated; RocketEval and Re-grading paper pages).

## Data (all real, computed offline, small extracts in `inputs/`)

| Script | Output | What |
|---|---|---|
| `data_sst2.py` | `inputs/sst2_scores.json` | SST-2 validation scored by LR, naive Bayes, NB + isotonic (scikit-learn) |
| `data_glass.py` | `inputs/glass_cm.json` | UCI Glass (OpenML 41), CV logistic regression confusion matrix |
| `data_ppl.py` | `inputs/ppl_tokens.json` | Per-token log-probs of 4 texts under GPT-2, SmolLM2-135M, Qwen2.5-0.5B |
| `data_text.py` | `inputs/text_presets.json` | sacrebleu, rouge-score, NLTK METEOR, bert-score (roberta-large L17) on 8 presets, plus similarity matrices and a Porter check list |
| `data_text_fuzz.py` | `inputs/text_fuzz.json` | 150 random perturbed sentence pairs scored by the libraries |
| `mk_data.py` | `parts/30_js_data.js` | packs the above into `window.EM` |
| `data_reg.py` | `inputs/reg_diabetes.json` | scikit-learn's bundled diabetes data (442 patients), 5-fold CV linear regression, metrics from scikit-learn (seconds, no download) |
| `rank_example.py` | `inputs/rank_example.json` | the illustrative ranked list of section 6: every list metric at every k, nDCG checked against scikit-learn's `ndcg_score` |
| `recompute.py` | `inputs/recompute.json` | every default number and prose figure with scikit-learn / NumPy from the shipped data |

Python environments: `uv run --with scikit-learn --with pandas --with pyarrow` (SST-2, Glass, recompute with `--with numpy`), `uv run --with torch --with transformers` (perplexity; threads capped at 2), a venv with `sacrebleu rouge-score nltk bert-score torch transformers` for the text scripts (NLTK WordNet downloaded on first run).

## Checks

- `node check_core.mjs` (from `src/`): the page's metric engine `parts/31_js_core.js` against `recompute.json` and the libraries: 1,124 checks, 0 mismatches; 150 of 150 random text pairs match on BLEU, chrF, ROUGE-1/2/L and METEOR.
- `node <page>/src/shot_parts.mjs` (from the repo root): screenshots of every Reading visual in both themes and widths into `../.shots/`, every control exercised (every 2D animation step of every mode, hero buttons and slider extremes, the regression and k sliders, the perplexity texts, odd custom text), and a normal-motion pass that scrolls to each 2D animation and confirms it plays (inverted from the old never-autoplay check, 2026-11-10): no errors, no NaN.
- `node <page>/src/check_stages.mjs [shots dir]` (from the repo root, about 4 minutes): the rollout checks, see the 2026-11-10 section.
- `sh html_utils/checkpage.sh <page folder>`: fail=0, emdash 0, errbox 1.

## Parts

`01_head.html` (CSS shared with the root, plus this page's), `02_split.html` (template), `10_header.html`, `20_read_a.html` (styles, nav, top, sections 1 to 4) / `20_read_b.html` (sections 5 to 10), `59_tab_more.html`; JS: `21_js_rd_common.js` (the skill template: `RD.anim` autoplays on view, with step lists), `22_js_rd_fmt.js` (this page's number formats), `30_js_data.js` (generated), `31_js_core.js` (metric engine `MX`), `40_js_rd_basic.js` (inline numbers, accuracy trap, averaging, paraphrase chart, bootstrap), `41_js_rd_cal.js` (calibration stepper), `42_js_rd_text.js` (five-scorer stepper), `44_js_rd_rp.js` (ROC and PR, all against rare), `45_js_rd_reg.js` (regression slider), `46_js_rd_rank.js` (k slider), `51_js_thr.js` (the hero, ids `th-`), `53_js_text.js` (own-sentences editor and presets table, ids `tx-`), `25_js_s3.js` (template, renderer v2), `35_js_sc_thr.js`, `36_js_sc_rank.js`, `37_js_sc_ppl.js` (the three 3D scenes), `99_js_tabs.js` (template, key `evm-tab`) last. `43_js_rd_ppl.js` (the 2D token-by-token perplexity stepper) was removed on 2026-11-10: Fig. 3 replaces it.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core sentence (one threshold, every threshold, the probabilities; each blind to what it leaves out) and a hero that is the old Threshold lab moved inline: a threshold slider on the real SST-2 scores moving one point along ROC and PR, with the confusion matrix, every ratio and a prediction prompt whose answer (ROC dot +0.23, precision dot -0.52 for the same 97 false alarms) is printed under it. The sentence browser is a closed block; the lab's reliability panel was dropped because section 3 draws reliability for all three models. The "In one screen" table is a closed reference block, with rows added for regression and ranking.
- **Labs into Reading**: the Threshold lab became the hero, the Text metrics lab's editor sits in section 7 and its presets table is a closed block. Both tabs removed.
- **New visuals**: section 2's ROC and PR overlay of the same classifier on all against rare positives (before/after on one input); section 5 regression on real data with one slider (one unit slip moves MAE by 2.3, RMSE by 18); section 6 a ranked list with a k slider for precision@k, recall@k, RR, AP and nDCG (illustrative grades, checked against scikit-learn).
- **Owned elsewhere, now linked**: the bootstrap widget moved into a closed block in section 10 (paired tests and sample size are Eval statistics'); entropy, cross entropy and KL into a closed block (the root's thread 1); retrieval practice on BEIR is RAG and retrieval evaluation's.
- **Stale number removed**: the old page quoted the root widget's "ROC-AUC stays at 0.856 while AUPRC falls from 0.85 to 0.11"; the root's widget is now binormal with a separation slider, so the link stays and the numbers went.
- **Common mistakes** became a closed "ten checks" list: each repeated a section.
- **No autoplay**: template `21_js_rd_common.js`; the perplexity stepper no longer plays on a mode switch and opens on its final state.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 wpm, `html_utils/audit_pages.mjs`) | 19.8 min | 22.0 min |
| Reading, closed details | 1.0 min | 6.6 min |
| Other tabs, core | Threshold lab 2.0 + Text lab 2.4 + Further reading 2.8 | Further reading 2.8 |
| Core excluding Further reading | 24.2 min | 22.0 min |
| Visuals in Reading | 5 | 12 |

Why 22 minutes is right: the page now covers everything its OWNERS row assigns (regression and ranked-list metrics were missing and add about 3.5 minutes), and two lab tabs were folded into the Reading flow, so the total core fell by two minutes while the subject grew. What stays in the core is one claim per metric family with its number, picture and source; formulas an MSc reader knows (the confusion-matrix table), the reference table, NLTK internals, the presets table, the bootstrap widget, the entropy definitions and the checks are closed.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
232 units: core 185, depth 27, owned 3 (the root's prevalence widget and entropy thread, Eval statistics' clustered errors), fat 17 (wind-ups, pointers to removed tabs, the stale reading time, the removed reliability panel; each with a `note`). 212 were drafted by `ledger.py init`; 20 were added for the new sections and for script-rendered numbers.

Departures from the method: none of substance. The page is about 273 KB, of which 118 KB is data. No real images: a mechanism page with no physical object; hand-built SVG throughout.

- 2026-10-24, topic close: the sentence pointing to the root's prevalence widget removed (the widget was retired; section 2 here is the owner); the root card in Further reading updated; the garbled bootstrap sentence in section 10 repaired; the bootstrap caption now says the widget's seed gives -1.1 to +3.2 against NumPy's -1.0 to +3.4 (resampling noise). Times set to headers. Ledger unit 37 relabelled fat.

2026-10-26 (final follow-up sweep): the calibration paragraph links Probability for ML section 8 (next-token calibration measured on GPT-2 and Qwen2.5-0.5B).

## 2026-10-26 absorb
Section 6 now defines hit@k (success@k, and recall@k in some dense-retrieval papers) and when it equals recall@k, absorbed from RAG and retrieval evaluation, which keeps one sentence plus a link.

## 2026-11-10: the split layout and three 3D stages (renderer v2)
The 2026-11-06 rollout (briefs `rebuild-page.md` and `layout-rollout.md`). Templates copied unchanged: `02_split.html` (after `01_head.html` in `build.sh`), `25_js_s3.js` (after the data, engine and 2D parts, before the scenes), `21_js_rd_common.js`, `99_js_tabs.js` (key `evm-tab`).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea (core, terms, reference table) | split | hero, 2D widget (threshold explorer) | no (reader-driven) |
| Reading | 1 Classification at a threshold | split | **3D** `stg-thr` (Fig. 1, new) | yes, 6 |
| Reading | 2 ROC and PR | split | 2D chart (all against rare) | no |
| Reading | 3 Calibration | split | 2D animation `rd-cal` | yes, 6 (the old script captions) |
| Reading | 4 Many classes | split | 2D widget (averaging toggle) | no |
| Reading | 5 Regression | split | 2D widget (one slider) | no |
| Reading | 6 Ranked lists | split | **3D** `stg-rk` (Fig. 2, new) | yes, 6 |
| Reading | 6, every k | split | 2D widget (k slider) | no |
| Reading | 7 Text overlap: table, BLEU notes, correction | full width | table | no |
| Reading | 7, the five scorers | split | 2D animation `rd-tx` | yes, 8 / 3 / 5 / 3 / 5 (one list per scorer) |
| Reading | 7, paraphrase against negation | split | 2D bars | no |
| Reading | 7, your own sentences | split | editor (lab) | no |
| Reading | 7, presets, NLTK details, status | full width | closed tables | no |
| Reading | 8 Perplexity | split | **3D** `stg-px` (Fig. 3, replaces the 2D token stepper) | yes, 6 (four texts) |
| Reading | 9 Embeddings, judges; 10 Error bars | full width | none (the bootstrap widget stays closed) | no |
| Further reading | | unchanged | | |

**The stages and their data.** Fig. 1 (`35_js_sc_thr.js`): the logistic regression's 872 SST-2 validation probabilities as two rows of columns (0.025 bins; front the 444 positives, back the 428 negatives), a glass threshold plane, the four confusion-matrix cells as stacks with flows from each side of each row; six steps: 0.5, the best-MCC threshold (0.79, found as in the accuracy-trap table), rare positives (`MX.sst(true)`), always negative, the best threshold again. A bin the plane cuts is drawn as two columns so the counts are exact. Fig. 2 (`36_js_sc_rank.js`): the illustrative list of `rank_example.py`, cut at k = 5, the first hit, precision at each hit, the log discount shrinking the columns into a DCG tower, the ideal order and its tower. Fig. 3 (`37_js_sc_ppl.js`): the real per-token log-probabilities of `data_ppl.py`, one row per tokenizer, each token a column as wide as its bytes and as tall as its bits per byte; side columns for bits per token (log2 of perplexity) and bits per byte; the four texts are a mode toggle that rewrites the step list's numbers and replays. Every number in the three step lists is a static `data-tc`, `data-rk` or `data-px` span written by the scene from the data; `check_stages.mjs` compares them with the static page and recomputes a few with `MX`.
**Kept 2D:** the hero (a reader-driven explorer with two curves, a histogram and a matrix: flat reads best), ROC and PR (curves), the reliability diagram and its dots (a calibration plot), the glass averaging bars and matrix, the regression scatter (a scatter), the k slider (kept as the reader-driven companion of Fig. 2), the five scorers (token chips and a similarity heatmap), the paraphrase bars, the editor, and the bootstrap histogram.
**Text.** The calibration and five-scorer captions (script-written before, so invisible to the audit and the ledger) are now static step lists; the scorer animation keeps a one-line live caption with this candidate's numbers only. Section 7 is split into five sections (`rd-s7` to `rd-s7e`) so each visual sits beside its paragraph. The accuracy-trap caption's repeated numbers were dropped (Fig. 1 and the table carry them).
**Phones:** under 520 px the three stages turn the camera to a side view (theta about 0.7) so the wide scenes fill the card, and labels that would be grouped on wide screens are drawn ungrouped (grouped labels hide on phones).

### Length judgement
| | Before (2026-10-24) | After (2026-11-10) |
|---|---|---|
| Reading, core (230 words a minute) | 22.2 min (5,105 words) | 28.6 min (6,572 words) |
| Reading, closed details | 6.7 min (1,551 words) | 6.7 min (1,551 words) |
| Further reading | 3.0 min | unchanged |
| Visuals counted in Reading (audit) | 12 | 14 |
The step lists are 1,630 words. About 860 of them are not new: the calibration and five-scorer captions were drawn by script before, so the audit never counted them; and four of the five scorer lists (421 words) are alternative modes, of which a reader sees one. Genuinely new: the three figures' lists (773 words), which give the threshold, ranked-list and perplexity sections the pictures they lacked, minus the perplexity "Try" paragraph and the trap caption's numbers. A reader of one scorer reads about 27 minutes. The length is right: every remaining core unit is needed for one of the page's ten sections.

### Ledger
243 units: core 196, depth 27, owned 2, fat 18, problems 0. Re-keyed two units whose sentences moved into Fig. 1 ("higher than the classifier's", "doubles MCC"); ten units added for the stages' findings and the step lists that used to be script text.
