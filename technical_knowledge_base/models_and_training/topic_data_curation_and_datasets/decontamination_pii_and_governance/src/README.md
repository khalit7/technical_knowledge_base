# Decontamination, PII and data governance: source

Child page of Topic: data-curation-and-datasets (Notion 3f95c17b0d0d8100b7e4e0f96074c309). Built 2026-10-14/15.
`sh build.sh` writes `../index.html` from `parts/`, `data/dg_data.json` (as `window.DG`) and `data/facts.json`
(the `@@key@@` numbers in the prose). Prefix `dg` for ids, classes and the tab storage key (`dg-tab`).

## Tabs (rebuilt 2026-10-24 to the teaching contract)

- **Reading** (`t-read`, parts `20_read_a` to `20_read_h`, `20_read_z`; JS `21_js_rd_common.js` (skill template, never
  autoplays), `22_js_dg_rd.js` (n-gram stepper, predict-then-reveal), `23_js_dg_rd2.js` (measured tables in closed
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
