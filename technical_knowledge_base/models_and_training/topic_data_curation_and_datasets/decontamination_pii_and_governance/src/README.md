# Decontamination, PII and data governance: source

Child page of Topic: data-curation-and-datasets (Notion 3f95c17b0d0d8100b7e4e0f96074c309). Built 2026-10-14/15.
`sh build.sh` writes `../index.html` from `parts/`, `data/dg_data.json` (as `window.DG`) and `data/facts.json`
(the `@@key@@` numbers in the prose). Prefix `dg` for ids, classes and the tab storage key (`dg-tab`).

## Tabs (rebuilt 2026-10-24 to the teaching contract)

- **Reading** (`t-read`, parts `20_read_a` to `20_read_h`, `20_read_z`; JS `21_js_rd_common.js` (skill template; since
  2026-11-09 the autoplaying one), `22_js_dg_rd.js` (predict-then-reveal), `25_js_s3.js` and `26` to `28_js_sc_*.js` (the three 3D stages, below), `23_js_dg_rd2.js` (measured tables in closed
  blocks, opt-out stats), `24_js_dg_vis.js` (the nine inline SVG figures), `32_js_dgpii.js` (PII detector view, section 7),
  `33_js_dgprov.js` (provenance stepper, section 9)): the idea and hero, sections 1 to 9, a depth section.
- **Contamination checker** (`t-dgcc`, `31_*`): every flagged benchmark item, its documents, the rules that fire, the
  coverage mask, the matched text and the hand label; a precision-by-rule table. Kept as a tab: it is an explorer used
  by sections 1 to 3.
- **Further reading** (`39_tab_more.html`).

The PII detector lab and Provenance tabs were removed: each explained one mechanism, so both moved inline into
sections 7 and 9 (ids unchanged, CSS rescoped to `#dg-pii-lab` and `#dg-prov`).

## Run order (CPU only, `nice -n 15`, 4 threads; DC_SCRATCH = the shared dc folder)

```
export DC_SCRATCH=<shared dc folder> HF_HOME=$DC_SCRATCH/hf OMP_NUM_THREADS=4
PY="nice -n 15 $DC_SCRATCH/venv/bin/python -I -B"
cd scripts
$PY dg_contam.py all                     # every n-gram rule at once, every corpus (incl. the two whole FineWeb files)
$PY dg_datatrove.py default; $PY dg_datatrove.py query   # datatrove's own NGramsDecontFilter on the samples
$PY dg_pairs.py; $PY dg_label.py         # flagged pairs, matched windows, labels (labels/overrides.json)
$PY dg_canary.py                         # canary GUID search (also the raw WARC)
DG_BGE=<bge-small-en-v1.5 folder> $PY dg_embed.py   # embedding nearest neighbours (labels/embed_labels.json)
$PY dg_pii_prep.py                       # synthetic set (inputs/pii_synthetic.txt) and run0 final text
$PY dg_pii_detect.py datatrove|extra <in> <out>; $DC_SCRATCH/venv_dolma/bin/python -I -B dg_pii_detect.py dolma ...
$DC_SCRATCH/dg_pii_venv/bin/python -I -B dg_pii_detect.py presidio ...
$PY dg_optout.py; $PY dg_robots_now.py; $PY dg_prov.py
cd ..; $PY build_data.py; sh build.sh; python3 scripts/check_numbers.py; node scripts/check_page.mjs ../index.html <shots>
```

`dg_common.py` is the shared module (benchmark items in one shape, every corpus as a stream, paths); the root's
Post-training data lab can import it and `dg_contam.py` to measure the same overlaps with the same code.

GPU runs (done 2026-10-15 on the M1 Pro GPU under the bench lock): `scripts/run_pending.sh mink` (Min-K%, Min-K%++, loss, zlib on Qwen3 0.6B and 1.7B, ~25 min) and
`run_pending.sh judge` (LLM judge on the top embedding pairs, Qwen3-1.7B, ~10 min). Both were smoke-tested on CPU first.

## Choices and departures

- Tokens are words after datatrove's `simplify_text` with numbers kept; GPT-3 and Tulu 3 used words, Llama model
  tokens (said on the page). Benchmark items are matched as question plus answer, no prompt template.
- Labels are the building agent's reading, not a human annotator's. Rules first (`dg_label.py`), then every uncertain
  pair and at least ten per category read; corrections in `scripts/labels/overrides.json`.
- Nothing from a raw web document enters the page except the matched window (text shared with a benchmark item).
  PII: only synthetic text is shown; on real text only counts. Host names from the robots.txt survey are not stored.
- Presidio on real text ran on a random 500 of run0's 2,617 final documents (seed 0): the full run was taking over an
  hour on a machine with load above 20.
- datatrove's indexer needs lighteval even when given documents (base.py:29-31, n_grams.py:68 and 138), so its
  `compute_hashes` is called on a stand-in object; the filter is unmodified.
- Large outputs live in `$DC_SCRATCH/data/dg/`; downloads are recorded in `$DC_SCRATCH/SETUP.md` (dg section).

## The 2026-10-24 rebuild: what changed and why

- **Top**: the core idea in one sentence, a static hero (`dg-hero`: the three checks, each with its tool, a real catch
  and its cost, from this page's measurements), You need (root, Deduplication; neighbours named), eight new terms. The
  old "In one screen" table is a closed reference block.
- **Visuals inline, beside their claims** (audit: 0 counted before, 8 now; the old HTML bar panels were not counted):
  n-gram share by n (new, one segmented control, with a prediction before it), precision of each rule on web and
  post-training data (new, from `DG.rules`), datatrove's answer-only against question n-grams (new before/after),
  similarity bands and the judge (new), Min-K% AUC dot chart (new; the table moved to a closed block), characters
  removed per unit (new; was "built as text"), PII detectors' recall and false alarms (new), robots.txt now per AI
  token (redrawn as SVG). The n-gram stepper stays in section 2; the PII detector view and the provenance stepper moved
  in from their tabs.
- **Ownership**: score inflation evidence (Yang, GPT-3, Llama 2 and 3, PaLM, DCLM, Magar) is in a closed block with a
  link to Topic: benchmarks, because no benchmarks page carries it yet (reported). Toxicity filtering is taught and
  measured in section 11 of Extraction and filtering; this page links it with one sentence.
- **Moved to closed blocks**: the ten-rule table, measured per-corpus tables and labels, web-scale and variant findings,
  the cross-page IF_multi_constraints result, the embedding and judge numbers and nearest pairs, the full
  model-probe table (a compact table stays core), the Min-K% numbers, eight corpora's PII practice, per-type counts,
  detector bugs and real-text counts, the opt-out signals one by one, the EU template and Kneschke v. LAION, run0's
  datasheet, two mistakes, interview rehearsal.
- **Deleted as fat** (19 ledger units, each with a note): wind-ups, old headings, pointers to removed tabs, and the
  mistakes and interview answers that restated a section (their advice was merged into the core text first).
- No new runs. No real image: the page is about mechanisms and records, not a physical object.

## Length judgement

| | Before (2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 41.0 min | 33.4 min |
| Reading, closed details | 4.2 min | 22.5 min |
| Other tabs, core | checker 2.3 + PII lab 4.1 + provenance 3.4 + further reading 3.2 | checker 2.3 + further reading 3.2 |
| Core total, excluding Further reading | 50.8 min | 35.7 min |
| Visuals counted in Reading | 0 | 8 |

Why 33 minutes is right: the page owns three subjects (contamination, PII, governance), each with its mechanism,
measured results on the running example and the published practice; about 1,400 of the 7,700 core words are the
text of the inline labs (the PII sentences, the provenance chain, the stepper's tokens), which are read as data. What
made it long before (per-lab tables, per-corpus findings, the full probe table, legal detail, mistakes and interview
answers) is now closed; the closed time grew because those blocks now hold it.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)

383 units drafted by `ledger.py init` from the old page: core 249, depth 115, fat 19, owned 0, volatile 0. Keys were
chosen as the first distinctive phrase of each unit found on the rebuilt page (labelled core or depth by whether it now
sits inside a closed block), then the 39 units without one were labelled by hand.

## Topic close (2026-10-24)
The root was rebuilt as a map; this page's Further reading now quotes the root as "31 min, plus 7" and siblings as their headers, and its ledger keys that quoted old times were re-keyed.

## Final sweep (2026-10-26)
The closed block "How much contamination inflates a score" (Yang et al., GPT-3, Llama 2 and 3, PaLM, DCLM, Magar and Schwartz, Singh et al.) moved to its owner, Topic: benchmarks ("Contamination and score inflation"); this page keeps the one-paragraph range (54.8 to 85.9 against nothing) and links there. Units 26 to 36 are labelled `owned:measurement/topic_benchmarks`. Core time unchanged; the closed-details figure was remeasured at 21 (was 23); the eight pages that quote 23 need the next time sweep.

## 2026-11-09: split layout, three 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html` (after `01_head.html` in `build.sh`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `dg-tab`). `build.sh` writes its em-dash check from octal bytes.
- **Fig. 1 `stg-ng`** (section 2, 5 steps; replaces the 2D n-gram stepper, whose five captions became the step list `sx-ng`): the item's tokens as the front row of blocks, the document's matched part behind, a close-up on the first words, a glass window of n tokens sliding along the item into the index and then along the document, covered item tokens rising against Tulu 3's 50% plate with the longest run marked, four verdict plinths. The pair and n switches (`dg-ng-pair`) rewrite the step list's numbers and replay. Data: `DG.anim` (the scan's pairs); marks recomputed from the tokens. The tokens themselves, with the shared ones marked, stay as a readout under the step list.
- **Fig. 2 `stg-fld`** (section 3, 6 steps, new): the running example as two fields of document sets (tile side by square root of size), each rule's flagged pairs (datatrove: documents removed) lifted into a column split into copies, variants or sources, and false positives, then all four rules side by side. Data: `DG.rules`, `DG.corpora`. The old flat chart of the same counts is in a closed block; its caption moved under the step list.
- **Fig. 3 `stg-emb`** (section 4, 5 steps, new): MMLU #4414 and its identical RLVR prompt as two glass plates over a 4-token row shorter than an 8-gram window; both embedded to one point; the 72 nearest pairs the page lists at radius 0.25 + 28 (1 - cosine) (angle arbitrary, said on the page) with the 0.95 and 0.88 rings; the Qwen3-1.7B judge's verdicts by label. Data: `DG.emb.top`, `DG.gpu.judge`.
- **Fig. 4, the provenance stepper** (section 9, 2D, 7 steps): its script-written captions became the step list `sx-pv`; only the current step's fields are expanded, so the card stays in view; it autoplays on view.
- **Splits**: the idea with the hero; section 2 (the n-share chart beside the idea and prediction; Fig. 1 beside how it runs and the published rules); 3 (Fig. 2; the datatrove switch); 4 (Fig. 3; the similarity bands); 5 (Min-K%, its explanation moved out of the card); 6 (removal units); 7 (detector recall; the PII detector view, its notes and the prediction on the left); 8 (robots.txt now, beside the time problem); 9 (Fig. 4). Full width: section 1 (a table), the method and unit tables, the opt-out signals and EU law, documentation formats, the depth section, and the Contamination checker tab (a reader-driven tool used across sections 1 to 3).
- **Kept 2D**: the hero (a three-gate flowchart reads best flat), the n-share chart (log axis), the datatrove switch, similarity bands, Min-K% AUC dots, removal units (log axis), PII recall bars, robots.txt bars, the PII detector view (text), the provenance chain (records). No 3D for removal cost (four numbers on a log axis) or score change (no score data here; Topic: benchmarks owns it).
- **Checks**: `check_stages.mjs` (new, from Data mixing's): the three stages and Fig. 4 play on view, step to their end with one list item per step, stop off screen and under reduced motion; step-list numbers equal what the page computes from `DG`. `scripts/check_page.mjs` and `check_numbers.py` unchanged and passing (no never-autoplay assertion existed).
- **Ledger**: 23 Further-reading keys that began with a minutes figure re-keyed on the title words after it; 4 keys re-keyed for moved stepper and chart captions; 8 units added for the step lists (section "added 2026-11-09"). 391 units: core 257, depth 104, owned 11, fat 19; problems 0.
- **Length** (`audit_pages.mjs`, 230 wpm): Reading core 7,712 to 8,718 words (33.5 to 37.9 min), closed 4,897 to 4,925 (21.3 to 21.4); checker 2.3 and Further reading 3.3 unchanged. The growth is the four step lists (about 1,000 words), whose text was script-written captions before (the stepper's) or did not exist; the one duplicated sentence (index sizes) was cut. Visuals counted in Reading 8 to 11.
