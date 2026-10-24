# Extraction and filtering: from WARC to clean text (source)

Child page of Topic: data-curation-and-datasets (prefix `ef`). `sh build.sh` writes `../index.html`:
`make_data.py` turns `data/*.json` into `parts/22_js_data.js` (window.EF) and `data/ef_facts.json`; `fill.py` puts
those facts into the prose wherever a part says `[[KEY]]`, so prose numbers come from the same data the widgets draw
(the build fails if one is missing). `node src/check_page.mjs` (from the repo root) exercises every control at 390 px
dark and 920 px light, checks the embedded data, that the rule workbench reproduces run0, prose numbers, and that no
animation plays before the reader acts.

Tabs: Reading, Extraction comparer, Rule workbench, Label browser, Further reading (the Language ID lab was folded into
Reading section 6 on 2026-10-24).
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

## The 2026-10-24 rebuild to the teaching contract (editing only, no new runs)

What changed and why:
- **Top**: the core idea in one sentence, a hero figure (`26_js_ef_figs.js`: run0's funnel from 20,991 responses to
  2,692 kept, bars to scale, the largest drop reason per stage, each stage pointing at its section), "You need"
  (Pretraining corpora for WARC/WET) and new terms. The seven-findings table and the versions are closed blocks.
- **Visuals inline beside their claims**: new static diagrams of trafilatura's cascade with the measured share of each
  branch (replaces the branch bars) and of fastText language ID (one word's ten features, hashing, averaging, softmax;
  the mechanism had no visual). The Language ID lab's threshold slider and presets now drive the threshold curve in
  section 6 (one widget, one variable, a prediction prompt first); the lab's score map, disagreements, label pairs,
  rare-language and second-language tables sit in a closed block there. The tab is gone.
- **Depth into closed blocks**: file:line walk-throughs of resiliparse, trafilatura, jusText (with issue #45) and
  readability; WCEB accuracy; published numbers in full and timings; the three failure case studies; the cache's
  source; how the structure pages were fetched; LID provenance; how FineWeb found its rules; the C4 swap history;
  URL list curation and the case bug; Dolma's classifier detail and the word-list examples; cluster transfer; the
  mistakes (now a one-line checklist, two items merged into sections 6 and 7), the interview rehearsal and the old-page
  corrections.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `ef-tab`); the jusText
  and line-level animations no longer start on a mode switch. `check_page.mjs` asserts it.
- Tabs kept because they are tools used across the page: Extraction comparer (sections 2 to 5), Rule workbench
  (sections 7, 8, 12), Label browser (sections 7, 8, 11).
- No real image: the page is about software, and the canonical figures (FineWeb's ablation curves) are plotted
  curves the page deliberately does not read.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 43.7 min | 29.8 min |
| Reading, closed details | 3.5 min | 23.7 min |
| Other tabs (comparer, LID lab, workbench, labels, further reading) | 5.2 + 6.3 + 9.2 + 27.0 + 3.3 = 51.0 min | 5.2 + 9.2 + 27.0 + 3.3 = 44.7 min |
| SVG or image visuals drawn in Reading | 1 | 4 (plus about 14 HTML bar charts, tables and steppers) |

Why 30 minutes is right: the page owns four extractors, language ID, about 25 heuristic rules, the library defaults,
line-level edits, URL and toxicity filters and their measured effects; every core unit is needed to understand one of
those, and about a fifth of the core words are the content of visuals (the jusText stepper's blocks, the rules table,
the traps table, the line-level document). What made the old page long (source walk-throughs, provenance, case studies,
mistakes, interview answers) is closed and optional. The Label browser's 27 minutes are its listed excerpts, read on
demand.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
383 units drafted by `ledger.py init` from the 2026-10-19 page: core 259, depth 108, fat 16 (headings, wind-ups, the
old reading-time line, pointers to the removed Language ID tab, control labels; each fat unit has a `note`). Keys were
chosen by script as the most distinctive number or phrase of each unit still on the built page, then checked by hand.

## Topic close (2026-10-24)
The root was rebuilt as a map; this page's Further reading now quotes the root as "31 min, plus 7" and siblings as their headers, and its ledger keys that quoted old times were re-keyed. The correction to the Pipeline lab's caption now says the root was fixed.
