# src: Pretraining corpora: lineage, licences and what to use

Build: `sh build.sh` (runs `build_data.py`, which turns `data/*.json` and `inputs/cc/*` into `parts/22_pc_data.js` and `data/facts.json`; every `@@key@@` in the prose is filled from `facts.json` and the build fails loudly if one is missing).

## Shape
A child page (`.claude/skills/explainer-page/page-kinds/topic-child.md`): Reading organised by the subject's own logic (Common Crawl from zero, how to read a corpus card, the lineage by generation, what each corpus kept from the running example's WARC file, how comparisons are made, the non-web domains, licences, measured samples, what to use, mistakes, interview questions), then two tabs: Corpus comparer (the measured samples) and What to train on (a starting mix with an epochs check). The Lineage tab was moved into Reading section 3 on 2026-10-24.

## Data, and how to rebuild it
| File | Made by | From |
|---|---|---|
| `data/corpora.json` | `make_corpora.py` | dataset cards, papers, HF API; every entry lists its sources (checked 2026-10-14) |
| `data/ablations.json` | `make_ablations.py` | cells copied from papers' tables (or FineWeb's eval_results.csv) |
| `data/mixes.json` | `make_mixes.py` | published mixes of open models |
| `data/composition.json` | `make_composition.py` | the hero: each published mix's shares (Pile Table 1, GPT-3 Table 2.2, LLaMA Table 1, OLMo 2 and Dolma 3 cards, Marin, SmolLM3) summed into eight kinds of source; checked 2026-10-24 |
| `data/robots_optout.json` | `scripts/robots_optout.py` (download, measure) | 20 robots.txt WARC files from each of 4 crawls (manifest in `inputs/cc/robots_manifest.json`) |
| `data/measured.json`, `data/kept.json` | `make_measured.py` | the scratch outputs of `scripts/sample_corpora.py`, `scripts/measure_samples.py`, `scripts/score_samples.py`, `scripts/what_each_kept.py` and `scripts/nemo_scan.py` (Nemotron-CC streamed by WARC record id; resumable) |
| `inputs/cc/*` | fetched 2026-10-14 | Common Crawl collinfo.json, cc-crawl-statistics monthly.csv and cumulative.csv @ 9ff265d, the recorded output of `scripts/cc_one_record.sh` |
| `data/samples_manifest.json`, `data/tokenizers_manifest.json` | copied from the scratch area | which file, revision and sha256 each sample and tokenizer came from |

Scratch layout (not committed): `$DC_SCRATCH/data/pc/{samples,measure,scores,robots,tok}`, about 300 MB. Environment: the topic's shared venv plus a small overlay venv with spaCy (datatrove's English word tokenizer needs it; the shared venv lacks it): `uv venv`, a `.pth` file pointing at the shared venv's site-packages, `uv pip install "spacy>=3.7,<4"` (3.8.16 installed).

## Checks
- `node check_page.mjs ../index.html <shots dir>`: every tab at 390 dark and 920 light, every control, animation steps, predict boxes; fails on errors, NaN, undefined or sideways scroll.
- `python3 check_data.py`: the embedded data equals what `build_data.py` makes from `data/`, prose numbers match the data, privacy grep.
- From the repo root: `sh html_utils/checkpage.sh <page folder>`.

## The 2026-10-24 rebuild to the teaching contract
What changed and why (`.claude/skills/explainer-page/teaching/teaching-contract.md`):
- **Top**: the core idea in one sentence, a new static hero (filtered Common Crawl's share of seven published mixes, The Pile 2020 to Olmo 3 2025, `23_pc_rd_hero.js`), "You need", new terms, and the what-to-use table. The "seven ideas" cards and the generation flow line were deleted as fat (each restated a section).
- **Lineage tab moved inline** into section 3 (`31_pc_lin.js` now registers with `RD.onRender`; lane labels raised to 11 px): the tree is the page's strongest visual of how corpora evolved and the prose was describing it in words. The every-corpus table is now a closed block under it, its names opening the tree's card.
- **Every chart has a title saying what to notice**; captions absorbed the paragraphs that described them (files, crawl sizes, robots.txt, tokenizers, the WARC animation, the study viewer, the licence picker, the measured table).
- **Owned elsewhere, linked**: the DCLM Table 4 bar chart was removed (Quality classifiers and data selection draws every row; one sentence with 30.2 against 27.5 stays here); C4's rules, FineWeb's global-dedup experiment and repetition are summarised in a clause each and linked to Extraction and filtering, Deduplication and Data mixing.
- **Closed depth**: the one-record script and its output, crawl provenance, Longpre et al.'s full figures, the T5, RefinedWeb and maths tables, the other corpora of each generation, the Nemotron-CC scan method, per-domain detail, the court table, the measured edu means, size claims and the interview rehearsal. The "Common mistakes" section was dissolved: each mistake restated a section; the two facts only it held (GPT-2's indentation tokens, The Stack's three sizes) moved to section 2's caption and the size-claims block.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `pc-tab`); the WARC animation used to start on scroll and now waits for the reader.
- `check_page.mjs` updated for the removed tab and the hero.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 44.4 min | 28.5 min |
| Reading, closed details | 3.9 min | 15.2 min |
| Other tabs, core | Lineage 2.2, Corpus comparer 2.0, What to train on 1.8 | Corpus comparer 2.0, What to train on 1.8 |
| Visuals in Reading (audit count of SVG at least 120x80) | 2 | 4 (10 visuals in all inline: hero, files, crawl sizes, robots, tokenizers, lineage, WARC animation, studies, licence layers, measured table; several are HTML bars the audit does not count) |

Why 28 minutes is right: the page owns nine distinct things a corpus user needs (the raw crawl, units and uniqueness, the lineage with its experiments, what a pipeline keeps from one file, how to read an ablation, the non-web domains, licences, measured properties, a recommendation by budget), each now one screen or two with its visual; about a fifth of the core words are figure captions and one script-rendered corpus card. What made the old page 44 minutes (restated summaries, mistakes repeating sections, tables, provenance and the interview) is deleted as fat or closed.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
407 units: core 265, depth 115, fat 26, owned 1 (DCLM Table 4's rows, on Quality classifiers and data selection). 402 drafted by `ledger.py init` from the old page; 5 added by hand for script-rendered visuals (keys written into their captions). Fat units carry a `note`.

## Departures from the method
None of note; the "compare everything" data tabs of a root page do not apply. The lineage (now inline in section 3) is drawn as a row per corpus (time down the page) rather than a horizontal timeline so that 39 names stay readable at 390 px.

## Topic close (2026-10-24)
The root was rebuilt as a map; this page's Further reading now quotes the root as "31 min, plus 7" and siblings as their headers, and its ledger keys that quoted old times were re-keyed. The Deduplication card points at section 1 (the 171B bars).
