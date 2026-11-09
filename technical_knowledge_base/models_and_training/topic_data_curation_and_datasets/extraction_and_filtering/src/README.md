# Extraction and filtering: from WARC to clean text (source)

Child page of Topic: data-curation-and-datasets (prefix `ef`). `sh build.sh` writes `../index.html`:
`make_data.py` turns `data/*.json` into `parts/22_js_data.js` (window.EF) and `data/ef_facts.json`; `fill.py` puts
those facts into the prose wherever a part says `[[KEY]]`, so prose numbers come from the same data the widgets draw
(the build fails if one is missing). `node src/check_page.mjs` (from the repo root) exercises every control at 390 px
dark and 920 px light, checks the embedded data, that the rule workbench reproduces run0, prose numbers, and that the
animations play once scrolled into view; `node src/check_stages.mjs [shots dir]` checks the 3D stages and the line-level
animation against the 2026-11-06 motion rules and the step lists' numbers against window.EF.

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

## 2026-11-09: split layout, three 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html` (after `02_css.html` in `build.sh`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `ef-tab`). `build.sh` writes its em-dash check from octal bytes.
- **Fig. 1 `stg-jt`** (section 2, `27_js_sc_jt.js`; replaces the 2D jusText stepper, whose six captions became the step list `sx-jt`): the WARC record (49,971 characters of HTML) turned into the page's 37 blocks, left to right in page order, each plate as deep as its text is long; a glass bar walks the page for each pass and plates take their new class as it passes; pass 2 and pass 4 draw flows from each changed block's deciding neighbours; the last step peels the boilerplate away (12 blocks, 3,156 of 4,291 characters). The comparison mode (`sx-jtc`, 3 steps) puts the same blocks through trafilatura 1.11 and resiliparse as three rows, their kept text streaming into an output box. Data: `EF.jt` (jusText's own features and classes per pass), `EF.pages` (HTML size). The block texts at the current step stay as a readout in a closed block, with the counters.
- **Fig. 2 `stg-x6`** (section 3, `28_js_sc_x6.js`, new; replaces the 2D bar chart with its five metric chips): six extractor lanes, rows from front to back for extraction (glass plates), characters extracted (own scale), English documents and kept documents (one scale), then the FineWeb overlap coloured into the kept columns. Data: `EF.chain`. Every number is also in the Extraction comparer's table.
- **Fig. 3 `stg-gate`** (section 7, `29_js_sc_gate.js`, new): run0's 6,971 English documents through one glass gate per rule family, one pile per rule (first rule to fire), survivors as columns, the camera moving in on each gate; the last step tops each pile with the wrong-drop share of its labelled sample (a share, said on the page; caps too thin to read are left out). Data: `EF.wb.reasons`, `EF.pipe.run0`, `EF.labels.summary`.
- **Fig. 4, the line-level animation** (section 9, 2D, `RD.anim` with `list`): its script-written captions became three step lists (`sx-ln-fw`, `sx-ln-c4`, `sx-ln-rw`), swapped by the mode chips; the caption box and the paragraph that repeated the verdicts were cut to one sentence.
- **Splits** (Reading): the idea with the hero funnel; section 1 with the illustrative page tree; section 2 twice (resiliparse and trafilatura beside the cascade; jusText beside Fig. 1); 3 (Fig. 2); 4 (cache table); 5 (structure bars); 6 twice (fastText diagram with the model table; the threshold widget); 7 twice (Fig. 3; the labelled rules table); 9 (Fig. 4); 10 (UT1 bars); 11 (toxicity tiles); 12 (cost bars). Full width: the findings and provenance blocks under the idea, readability and the prediction in section 2, section 8 (the defaults table), section 13 (checklists), and the Extraction comparer, Rule workbench and Label browser tabs (reader-driven tools used across the page; their intros are one paragraph above the controls).
- **Kept 2D, and why**: the hero funnel (counts per stage on one axis, and Fig. 3 carries the rule stage in 3D), trafilatura's cascade (a flowchart with shares), the cache table, the structure-survival bars (shares of a whole), the fastText mechanism diagram (a flow of operations, no spatial structure), the threshold curves (a curve with a slider), the rules table (Wilson intervals read best flat), the defaults table, URL, toxicity and cost bars (numbers on one axis), and the LID score map and tables in closed blocks.
- **Checks**: `check_stages.mjs` (new, from Decontamination's): the three stages and Fig. 4 play on view, step to their end with one list item per step in every mode, stop off screen and under reduced motion; step-list numbers equal what the page computes from `EF`. `check_page.mjs`: the never-autoplay assertion is inverted (the animations play once scrolled into view); its element shots now include the stages.
- **Ledger**: 21 Further-reading keys that began with a minutes figure re-keyed on the title words after it; unit 66 (the old chart's metric chips) re-keyed to Fig. 2's step list; 12 units added for the step lists (section "added 2026-11-09"). 395 units: core 271, depth 108, fat 16; problems 0.
- **Length** (`audit_pages.mjs`, 230 wpm): Reading core 6,844 to 7,655 words (29.8 to 33.3 min), closed 5,452 to 5,779 (23.7 to 25.1); other tabs unchanged (comparer 5.2, workbench 9.2, label browser 27.0, further reading 3.4). The growth is the five step lists (about 1,000 words), whose text was script-written captions before (the jusText and line steppers, not counted) or did not exist (Figs. 2 and 3); two paragraphs that the step lists now carry were cut to a sentence. Visuals counted in Reading 4 to 7. No new runs; no real image (the page is about software).
