# src: Pretraining corpora: lineage, licences and what to use

Build: `sh build.sh` (runs `build_data.py`, which turns `data/*.json` and `inputs/cc/*` into `parts/22_pc_data.js` and `data/facts.json`; every `@@key@@` in the prose is filled from `facts.json` and the build fails loudly if one is missing).

## Shape
A child page (Part B of `html_utils/methods/topic_pages.md`): Reading organised by the subject's own logic (Common Crawl from zero, how to read a corpus card, the lineage by generation, what each corpus kept from the running example's WARC file, how comparisons are made, the non-web domains, licences, measured samples, what to use, mistakes, interview questions), then three tabs: Lineage (every corpus, cards and a replay), Corpus comparer (the measured samples) and What to train on (a starting mix with an epochs check).

## Data, and how to rebuild it
| File | Made by | From |
|---|---|---|
| `data/corpora.json` | `make_corpora.py` | dataset cards, papers, HF API; every entry lists its sources (checked 2026-10-14) |
| `data/ablations.json` | `make_ablations.py` | cells copied from papers' tables (or FineWeb's eval_results.csv) |
| `data/mixes.json` | `make_mixes.py` | published mixes of open models |
| `data/robots_optout.json` | `scripts/robots_optout.py` (download, measure) | 20 robots.txt WARC files from each of 4 crawls (manifest in `inputs/cc/robots_manifest.json`) |
| `data/measured.json`, `data/kept.json` | `make_measured.py` | the scratch outputs of `scripts/sample_corpora.py`, `scripts/measure_samples.py`, `scripts/score_samples.py`, `scripts/what_each_kept.py` and `scripts/nemo_scan.py` (Nemotron-CC streamed by WARC record id; resumable) |
| `inputs/cc/*` | fetched 2026-10-14 | Common Crawl collinfo.json, cc-crawl-statistics monthly.csv and cumulative.csv @ 9ff265d, the recorded output of `scripts/cc_one_record.sh` |
| `data/samples_manifest.json`, `data/tokenizers_manifest.json` | copied from the scratch area | which file, revision and sha256 each sample and tokenizer came from |

Scratch layout (not committed): `$DC_SCRATCH/data/pc/{samples,measure,scores,robots,tok}`, about 300 MB. Environment: the topic's shared venv plus a small overlay venv with spaCy (datatrove's English word tokenizer needs it; the shared venv lacks it): `uv venv`, a `.pth` file pointing at the shared venv's site-packages, `uv pip install "spacy>=3.7,<4"` (3.8.16 installed).

## Checks
- `node check_page.mjs ../index.html <shots dir>`: every tab at 390 dark and 920 light, every control, animation steps, predict boxes; fails on errors, NaN, undefined or sideways scroll.
- `python3 check_data.py`: the embedded data equals what `build_data.py` makes from `data/`, prose numbers match the data, privacy grep.
- From the repo root: `sh html_utils/checkpage.sh <page folder>`.

## Departures from the method
None of note; the "compare everything" data tabs of a root page do not apply. The lineage is drawn as a row per corpus (time down the page) rather than a horizontal timeline so that 39 names stay readable at 390 px.
