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
- `node check_stages.mjs [shots dir]` (2026-11-09; run from the repo root): the two 3D stages and section 4's animation play by themselves once in view, step to their end with one list item per step (both cut modes), stop off screen and never move under reduced motion; the lineage tree never plays and opens on its full tree; splits two columns at 1400 px only; every number in the step lists against what the page computes (`window.PC`, `PCS`, `PCK`).
- `python3 check_data.py`: the embedded data equals what `build_data.py` makes from `data/`, prose numbers match the data (T5 Table 8 now read from `whats_new/papers/t5`, where that paper page moved), privacy grep (login name and hostname matched case-sensitively, local paths, IPv4 addresses).
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

## 2026-11-09: split layout, two 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html` (after `01_head.html` in `build.sh`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `pc-tab`). `build.sh` writes its em-dash check from octal bytes.
- **Fig. 1 `stg-lin`** (section 3, 5 steps, `30_js_sc_lin.js`): Common Crawl as the base plate, one glass plate per generation, the corpora section 3 names as cubes whose volume is the published token count (`PC.corpora`, side = cube root; hollow when there is no comparable count), dots rising from the crawl or from a corpus taken whole (union or filter), dashed purple lines for a recipe re-used on new data (the `parents` relations of `make_corpora.py`). Each generation's step moves the camera onto its plate; the last pulls back to the stack and names only C4 and FineWeb (about 117 times apart). The 39-row tree stays under the section, now a widget (`auto:false`, opens on the full tree; its 39-frame replay is the long-replay rule's case b).
- **Fig. 2 `stg-uq`** (section 2, 4 steps, `30_js_sc_uq.js`; replaces the three-row table): Nemotron-CC Table 4 as nested blocks, total as a glass shell, the unique core solid, near-copies streaming to a heap; then a 100B-token run beside DCLM-Baseline's core (a tenth of it) and a 15T-token run as 15 copies of that core. The three rows are constants in the scene with their source; the step list carries every number.
- **Section 4** (2D, kept): the per-page cell grid now has step lists `sx-kp3` and `sx-kp2` (the cut toggle swaps them and replays) with the numbers as build facts; the script's captions were removed. New fact `kp_mine_ge2` (654), and `lin_n` (39).
- **Splits** (Reading): the idea, You need and terms beside the hero; 1 in three pairs (what Common Crawl is with the files bars; a crawl as a sample with the crawl sizes; robots.txt and terms with the robots bars); 2 (five questions and tokenizers) with the tokenizer chart; 2's totals and unique tokens (stage); 3 (stage); 4 (2D animation); 5 with the study viewer; 7 with the licence layers; 8 with the measured table. Full width: the what-to-use table, every closed block, the lineage tree and its card, 6 (a table, no visual), 9, Depth. Corpus comparer and What to train on: notes left, controls and charts right.
- **Kept 2D**: the hero (seven mixes compared, a stacked bar reads best flat), the files, crawl-size, robots and tokenizer bars (numbers on axes), the lineage tree (39 names must stay readable; the stage carries the spatial story), section 4's grid (each of 20,617 cells is one real page; a 3D field would need binning, which hides the per-page overlap that step 5 is about, or 20,617 boxes), the study viewer, the licence layers (text in each layer), the measured table, the comparer and the starting-mix tool.
- **Ledger**: 20 keys re-keyed (18 Further-reading keys that began with a quoted minutes figure, now keyed on the words after it; the tree's tap sentence; the comparer's buttons), 6 units added for the stages and step lists (section "added 2026-11-09"). 413 units: core 271, depth 115, fat 26, owned 1; problems 0.
- **Length** (`audit_pages.mjs`, 230 wpm): Reading core 6,549 to 7,251 words (28.5 to 31.5 min; the header says 32), closed 3,492 unchanged (15.2); the other tabs unchanged. The growth is the step lists (about 950 words, of which the hidden lenient-cut list, about 230, is counted though only one list shows at a time); they replace captions that the scripts wrote and the audit did not count, and the three-row table they replace. Visuals counted in Reading 4 to 6.
