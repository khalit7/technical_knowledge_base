# Extraction and filtering: from WARC to clean text (source)

Child page of Topic: data-curation-and-datasets (prefix `ef`). `sh build.sh` writes `../index.html`:
`make_data.py` turns `data/*.json` into `parts/22_js_data.js` (window.EF) and `data/ef_facts.json`; `fill.py` puts
those facts into the prose wherever a part says `[[KEY]]`, so prose numbers come from the same data the widgets draw
(the build fails if one is missing). `node src/check_page.mjs` (from the repo root) exercises every control at 390 px
dark and 920 px light, checks the embedded data, that the rule workbench reproduces run0, and prose numbers.

Tabs: Reading, Extraction comparer, Language ID lab, Rule workbench, Label browser, Further reading.
Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` (a child owns its details); the labs follow the subject's stages
(extract, identify language, apply rules, read what was dropped) rather than one lab per method.

## Measurement scripts (`scripts/`), run order

Environment: `DC_SCRATCH=<shared dc folder>`, `nice -n 15`, one thread per process, at most four processes. Two
venvs, both outside the repo: the topic's shared `$DC_SCRATCH/venv` (datatrove 0.10.1, trafilatura 1.11.0) and this
page's `$DC_SCRATCH/ef/venv` (trafilatura 2.3.1, jusText 3.0.2, readability-lxml 0.9, resiliparse 1.0.9, fastText).
Large outputs go to `$DC_SCRATCH/data/ef/`; downloads are recorded in `$DC_SCRATCH/SETUP.md` (section "ef downloads").

| Script | Venv | What |
|---|---|---|
| `ef_traf111.py nodedup|dedup|shuffled` | shared | trafilatura 1.11 on the 20,280 pages, instrumented branches; its cache on/off; shuffled order |
| `ef_extract_more.py justext|readability|traf231` | own | three more extractors on the same pages |
| `ef_chain.py <names>` | shared | run0's filter chain on every extractor's text (`data/ef_chain.json`) |
| `ef_traf_analysis.py` | own | branch shares and cache effects (`data/ef_traf.json`) |
| `ef_wceb.py <name>` | either | Web Content Extraction Benchmark, bag-of-words P/R/F1 |
| `ef_targeted.py fetch` then `ef_struct.py <names>` | own (traf111: shared) | 131 pages from CC-MAIN-2024-30 via cluster.idx; tables, code, TeX survival (`data/ef_struct.json`) |
| `ef_jt_steps.py candidates|dump`, `ef_jt_fix.py` | own | jusText pass-by-pass data; effect of fixing its dead first pass |
| `ef_lid.py` | own | lid.176, GlotLID, CLD2 per document and per line |
| `ef_url.py` | shared | datatrove's blocklist against today's UT1 (`data/ef_url.json`) |
| `ef_tox.py` | own | C4 bad-words rule and Dolma's Jigsaw classifiers (`data/ef_tox.json`) |
| `ef_lines.py`, `ef_lines.py example <id>` | shared | C4 line edits (checked equal to datatrove), RefinedWeb reconstruction |
| `ef_c4var.py`, `ef_cost.py` | shared | C4's two numbers both ways; rough cost per stage |
| `ef_label_sample.py draw|show`, `ef_labels.py` | shared / own | labelling sample (seed 1) and label aggregation |
| `ef_pages.py`, `ef_collect.py` | own | comparer pages; workbench encoding, WCEB means, timings, LID aggregates |

## Labels

`labels/ef_labels_raw.json` (495 rule-drop and kept documents) and `labels/ef_tox_labels_raw.json` (30 bad-word
matches): labelled by Claude, the agent that built the page, one reader, 2026-10-15. The page says so wherever they are
used. Excerpts shown are cut, PII-scrubbed and withheld for adult pages and private individuals' pages.

## Departures and caveats

- The RefinedWeb line-wise filter is a reconstruction from the paper's description (its code was not released).
- WCEB scores here are bag-of-words F1, not the paper's ROUGE-LSum; the page compares rankings.
- Timings are rough (load average 20 to 90 on a shared machine). Counts and decisions are deterministic.
- No GPU run is needed for this page (no `scripts/run_pending.sh`): every model used is a fastText model run on CPU.
  Not run here, and why: proxy-model training ablations of extractors and filters (FineWeb's 1.71B-parameter,
  28B-token runs are far beyond one WARC file's 8 million kept characters).
