Source of the interactive HTML on the Notion page "Evaluation metrics" (https://app.notion.com/p/3c65c17b0d0d81a29acef722e842a29b), a child of Topic: ml-fundamentals.

Build: `sh build.sh` writes `../index.html` from `parts/` (parts listed explicitly in `build.sh`).

## Shape

Part B of `html_utils/methods/topic_pages.md` (a child page). Reading follows the subject's own logic: in one screen (what each metric rewards and cannot see), then 1 threshold metrics, 2 ranking curves, 3 calibration, 4 multi-class averaging, 5 text overlap, 6 perplexity, 7 embedding scores and judges, 8 error bars, information quantities, common mistakes. Tabs: Reading, Threshold lab, Text metrics lab, Further reading. No child pages, databases or video on the Notion page.

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
| `recompute.py` | `inputs/recompute.json` | every default number and prose figure with scikit-learn / NumPy from the shipped data |

Python environments: `uv run --with scikit-learn --with pandas --with pyarrow` (SST-2, Glass, recompute with `--with numpy`), `uv run --with torch --with transformers` (perplexity; threads capped at 2), a venv with `sacrebleu rouge-score nltk bert-score torch transformers` for the text scripts (NLTK WordNet downloaded on first run).

## Checks

- `node check_core.mjs` (from `src/`): the page's metric engine `parts/31_js_core.js` against `recompute.json` and the libraries: 1,124 checks, 0 mismatches; 150 of 150 random text pairs match on BLEU, chrF, ROUGE-1/2/L and METEOR.
- `node src/shot_parts.mjs` (from the page folder's repo root path, see the file): screenshots of every visual in both themes and widths into `../.shots/`, and every control exercised (every animation step of every mode, every lab button, slider extremes, odd custom text): no errors, no NaN.
- `sh html_utils/checkpage.sh <page folder>`: fail=0, emdash 0, errbox 1.

## Parts

`01_head.html` (CSS shared with the root, plus this page's), `10_header.html`, `20_read_a.html` / `20_read_b.html` (Reading), `50_tab_thr.html` + `51_js_thr.js` (ids `th-`), `52_tab_text.html` + `53_js_text.js` (ids `tx-`), `59_tab_more.html`; JS: `21_js_common.js` (the root's RD helpers and step-animation controller), `30_js_data.js` (generated), `31_js_core.js` (metric engine `MX`), `40_js_rd_basic.js` (inline numbers, accuracy trap, averaging, paraphrase chart, bootstrap), `41_js_rd_cal.js` (calibration animation), `42_js_rd_text.js` (five-scorer animation), `43_js_rd_ppl.js` (perplexity animation), `99_js_tabs.js` last.

Departures from the method: none of substance. The page is about 250 KB, of which 113 KB is data (872 sentences and three score vectors).
