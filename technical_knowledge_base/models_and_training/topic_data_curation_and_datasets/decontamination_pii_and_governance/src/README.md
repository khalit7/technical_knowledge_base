# Decontamination, PII and data governance: source

Child page of Topic: data-curation-and-datasets (Notion 3f95c17b0d0d8100b7e4e0f96074c309). Built 2026-10-14/15.
`sh build.sh` writes `../index.html` from `parts/`, `data/dg_data.json` (as `window.DG`) and `data/facts.json`
(the `@@key@@` numbers in the prose). Prefix `dg` for ids, classes and the tab storage key (`dg-tab`).

## Tabs

- **Reading** (`t-read`, parts `20_read_*.html`, JS `22_js_dg_rd.js`, `23_js_dg_rd2.js`): sections 0 to 9, mistakes,
  interview questions. Animation: one real (item, document) pair through normalisation, n-gram indexing, matching and
  four published rules (GPT-3, Tulu 3, ConTAM longest match, datatrove), with an 8-gram / 13-gram toggle and four pairs
  (copy, passage, phrase, diagram).
- **Contamination checker** (`t-dgcc`, `31_*`): every flagged benchmark item, its documents, the rules that fire, the
  coverage mask, the matched text and the hand label; a precision-by-rule table.
- **PII detector lab** (`t-dgpii`, `32_*`): the synthetic set through datatrove, Dolma, the extra regexes and Presidio
  (threshold, types), marks or masked output; counts on run0's scrubbed text.
- **Provenance** (`t-dgprov`, `33_*`): one FDA page followed from website to FineWeb-Edu with its real identifiers;
  run0's datasheet.
- **Further reading** (`39_tab_more.html`).

Shape: the child-page method (Part B), with three labs instead of one calculator, because the page has three subjects.

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

Pending GPU runs: `scripts/run_pending.sh mink` (Min-K%, Min-K%++, loss, zlib on Qwen3 0.6B and 1.7B, ~25 min) and
`run_pending.sh judge` (LLM judge on the top embedding pairs, Qwen3-1.7B, ~10 min). Both smoke-tested on CPU.

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
