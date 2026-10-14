# The running example: one Common Crawl WARC file and what each pipeline kept

Set up 2026-10-14 by the setup agent. Every lab on this page uses this one example, so numbers on
different tabs refer to the same documents. Large files live outside the repo, in the shared
setup folder named by the environment variable `DC_SCRATCH`; this folder holds only the
definition, the loader (`load.py`), manifests, checksums, id lists and small counts.

## Why this file and this crawl

- **Crawl: CC-MAIN-2024-30** (Common Crawl's July 2024 crawl, 90,000 WARC files). It is the
  newest crawl covered by all three curated corpora that publish per-document provenance:
  FineWeb and FineWeb-Edu (every row carries the source WARC path in `file_path`) and
  Nemotron-CC (which stops at CC-MAIN-2024-30). DCLM-baseline was built from crawls before 2023
  (DCLM-pool), so no crawl is shared with it; we use a DCLM sample and run DCLM's own fastText
  classifier on our documents instead.
- **File: segment 1720763514387.30, file 00000** (`CC-MAIN-20240712094214-20240712124214-00000`),
  the first WARC of the crawl. FineWeb's CC-MAIN-2024-30 parquet file `000_00000.parquet`
  starts with this WARC, so the exact FineWeb (and FineWeb-Edu) survivors of this file could be
  read without scanning FineWeb: row groups 0 to 2 of that parquet file hold all of them.
- One WARC is about 1/90,000 of a crawl: big enough for real counts (20,991 HTML responses), small
  enough to run every stage on a laptop CPU. What it cannot show: cross-file and cross-crawl
  duplication (dedup inside one file finds only within-file duplicates; FineWeb deduplicated
  each crawl as a whole), and anything that needs crawl-level statistics.

## What is in DC_SCRATCH/data

| Path | What | Size | Source, revision, licence |
|---|---|---|---|
| `cc/warc/<file>.warc.gz` | Raw WARC: 20,991 request/response/metadata triples, all HTTP 200; 20,625 HTML or XHTML payloads, 230 PDF, 479 truncated at 1 MiB | 718.7 MB | data.commoncrawl.org, Common Crawl terms of use |
| `cc/wet/<file>.warc.wet.gz` | Common Crawl's own text extraction of the same responses | 64.0 MB | same |
| `cc/wat/<file>.warc.wat.gz` | Metadata (HTTP headers, links) of the same responses | 160.9 MB | same |
| `cc/robotstxt/<file>.warc.gz` | robots.txt fetches from the same segment slot | 1.9 MB | same |
| `cc/*.paths.gz` | Full file lists of the crawl (warc, wet, wat, robotstxt) | 0.7 MB | same |
| `curated/fineweb_<file>.parquet` | FineWeb rows whose `file_path` is our WARC: 2,425 | 3.4 MB | HuggingFaceFW/fineweb rev 9bb295dd, ODC-By 1.0 |
| `curated/fineweb_edu_<file>.parquet` | FineWeb-Edu rows from our WARC: 159 (with `score`, `int_score`) | 0.3 MB | HuggingFaceFW/fineweb-edu rev 87f09149, ODC-By 1.0 |
| `curated/fineweb_2024-30_rand50k.parquet` | 50,000 FineWeb rows of CC-MAIN-2024-30, random row groups (seed 0) | 79 MB | as above |
| `curated/fineweb_edu_2024-30_rand50k.parquet` | 50,000 FineWeb-Edu rows of CC-MAIN-2024-30, random row groups (seed 0) | see manifest | as above |
| `curated/dclm_baseline_first50k.parquet` | First 50,000 rows of DCLM-baseline 1.0 (global-shard_01, local-shard_0), with `fasttext_score` | 116 MB | mlfoundations/dclm-baseline-1.0-parquet rev 817d6752, CC-BY-4.0 |
| `curated/fineweb_edu_llama3_annotations_first4files.parquet` | The FineWeb-Edu classifier's training data (Llama 3 70B educational scores 0 to 5), first 4 of 8 files | see manifest | HuggingFaceFW/fineweb-edu-llama3-annotations rev 72df4c92, ODC-By 1.0 |
| `nemotron_cc/quality-*__kind-*__kind2-*__CC-MAIN-2024-30-part-00000.jsonl.gz` | Head samples (first 24 MB compressed of part 00000 for each real-data bucket, 6 MB for each synthetic partition) of Nemotron-CC CC-MAIN-2024-30 | see manifest | data.commoncrawl.org/contrib/Nemotron/Nemotron-CC (hosted by Common Crawl under its terms of use; the hosting page states no separate licence; check NVIDIA's dataset card before reuse) |
| `bench/*.parquet` | Decontamination targets, whole splits: MMLU test 14,042; GSM8K test 1,319; ARC-Challenge test 1,172; ARC-Easy test 2,376; HumanEval 164; MATH-500 500; HellaSwag validation 10,042 | 8 MB | cais/mmlu (MIT), openai/gsm8k (MIT), allenai/ai2_arc (CC-BY-SA-4.0), openai/openai_humaneval (MIT), HuggingFaceH4/MATH-500 (MATH: MIT), Rowan/hellaswag (MIT, via the hub's parquet conversion) |
| `post/tulu3_sft_5k.parquet` | 5,000 rows of the Tulu 3 SFT mixture (random row groups, seed 0; `source` says which subset) | see manifest | allenai/tulu-3-sft-mixture rev b14afda6, ODC-By 1.0 (subsets carry their own licences) |
| `post/ultrafeedback_binarized_prefs_5k.parquet` | 5,000 preference pairs (chosen, rejected, judge scores) | see manifest | HuggingFaceH4/ultrafeedback_binarized rev 3949bf5f, MIT |
| `post/rlvr_gsm_math_if_all.parquet` | All 29,946 Tulu 3 RLVR prompts with `ground_truth` (GSM8K, MATH, instruction-following constraints) | 16 MB | allenai/RLVR-GSM-MATH-IF-Mixed-Constraints rev 7dbd180f, ODC-By 1.0 |
| `post/cosmopedia_web_samples_v2_2k.parquet` | 2,000 synthetic Cosmopedia documents with the prompt and web seed that produced them | see manifest | HuggingFaceTB/cosmopedia rev 0ae6ec63, Apache-2.0 |
| `models/lid176/lid.176.bin` | fastText language ID, 176 languages | 131 MB | fastText (official URL dl.fbaipublicfiles.com; fetched from HF mirror julien-c/fasttext-language-id, identical size and sha256), CC-BY-SA-3.0 |
| `models/fineweb-edu-classifier/` | FineWeb-Edu classifier (Snowflake arctic-embed-m encoder plus a regression head) | 438 MB | HuggingFaceFW/fineweb-edu-classifier rev 284663cb, Apache-2.0 |
| `models/dclm-fasttext-oh-eli5/*.bin` | DCLM's quality classifier (fastText bigram, OpenHermes 2.5 plus ELI5 vs RefinedWeb) | 2.39 GB | mlfoundations/fasttext-oh-eli5 rev cd8b714a, MIT |
| `run0/` | The datatrove run below: `extracted/`, `filtered/`, `deduped/`, `final/`, `removed/<step>/`, `minhash/`, `logs/` (datatrove stats JSON per stage) | see manifest | produced here |

Not downloaded, with reasons: GlotLID (1.69 GB; lid.176 is what FineWeb, DCLM and Dolma used);
a KenLM/CCNet perplexity model (the English Wikipedia model is 4.44 GB and the `kenlm` Python
package must be compiled; perplexity filtering is a pending run with a small local LM instead);
NeMo Curator (needs NVIDIA GPUs: source only).

Exact files, sizes and sha256: `manifest.json` here. Download commands and history:
`SETUP.md` in the setup folder. All counts here were measured on 2026-10-14.

## run0: the WARC through a FineWeb-style datatrove pipeline (measured 2026-10-14)

Script: `$DC_SCRATCH/scripts/run0.py` (datatrove 0.10.1, the steps of its `examples/fineweb.py`
with FineWeb's MinHash settings: 5-grams, 14 buckets of 8 hashes, 64-bit), run on Apple M1 Pro
CPU, one task, low priority on a shared machine. Outputs in `$DC_SCRATCH/data/run0/`; every
removed document is kept under `removed/<step>/` with `metadata.filter_reason`.

| Step | In | Out | Removed | Main reasons (count) |
|---|---|---|---|---|
| WARC response records | | 20,991 | | all HTTP 200; 20,625 HTML or XHTML by Common Crawl's payload type |
| WarcReader (HTML/XHTML, decodable) | 20,991 | 20,463 | 528 | non-HTML payloads (366), undecodable charset |
| 1. URL filter (blocklists) | 20,463 | 20,280 | 183 | blocked domain 106, hard-blacklisted word 57, blacklisted subword 16, subdomain 2, soft words 2 |
| Trafilatura extraction (favour_precision, 1 s timeout) | 20,280 | 19,241 | 1,039 | no main text 840, timeout 199 |
| 2. Language ID (lid.176, English, score > 0.65) | 19,241 | 6,971 | 12,270 | English below 0.65 1,436; Russian 1,257; German 1,112; Spanish 958; Japanese 903; Chinese 899; French 888 |
| 3. Gopher repetition | 6,971 | 5,459 | 1,512 | duplicate-line fraction 586, top 4-gram 252, duplicated 5-grams 249, top 3-gram 150, duplicate-line chars 124 |
| 4. Gopher quality | 5,459 | 3,576 | 1,883 | too few alphabetic words 1,025, too short 668, lines ending in ellipsis 127 |
| 5. C4 quality (no terminal-punctuation rule) | 3,576 | 3,221 | 355 | fewer than 5 sentences 336, curly bracket 13, lorem ipsum 6 (plus 17,301 of 73,752 lines removed inside kept documents) |
| 6. FineWeb quality | 3,221 | 2,692 | 529 | line punctuation ratio 289, duplicated characters 173, short lines 67 |
| 7. MinHash dedup (within this one WARC) | 2,692 | 2,617 | 75 | near-duplicate clusters |
| 8. PII formatter (emails, public IPs replaced) | 2,617 | 2,617 | 0 | 101 documents edited, nothing removed |

Kept: 2,617 of 20,463 HTML documents (12.8 %).

**What FineWeb kept from the same WARC: 2,425 documents.** Joined on WARC-Record-ID:
2,403 of them are in our final output (99.1 %). Of the 22 others, 19 were never extracted here
(timeouts and extraction differences on this machine), 2 were removed by our Gopher quality step
and 1 by our MinHash step. Our output has 214 documents FineWeb does not; the main expected
cause is that FineWeb ran MinHash over the whole crawl (all 90,000 WARCs), which also removes
documents duplicated in other files, while ours sees one file. FineWeb-Edu kept 159 documents
from this WARC; 156 are in our final output.

**A trap in the shipped example.** datatrove 0.10.1's `examples/fineweb.py` calls
`LanguageFilter()` with no languages; with `languages=None` the filter keeps any language whose
top score exceeds 0.65 (`filters/language_filter.py:61-65`). Run as shipped, 2,814 documents pass
the heuristic filters, 122 of them not English (German 18, French 14, Spanish 13, ...). run0
passes `languages=['en']`; the as-shipped outputs are kept in `run0/example_as_shipped/` for the
Pipeline lab.

Common Crawl's own WET extraction of the same file has 20,423 conversion records; its
language header (CLD2) marks 8,934 as primarily English.

Per-stage counts as JSON: `run0_counts.json`; datatrove's own stats per step:
`run0_datatrove_stats.json`; id lists: `ids/` (`fineweb_kept`, `fineweb_edu_kept`,
`run0_filtered`, `run0_final`; WARC-Record-IDs).

## How to load

```sh
export DC_SCRATCH=<the shared dc setup folder>     # contains venv/, venv_dolma/, data/, hf/, src/
export HF_HOME=$DC_SCRATCH/hf
$DC_SCRATCH/venv/bin/python -I -B my_script.py
```

```python
import os, sys; sys.path.insert(0, "<root>/src/data"); import load as L
html = next(L.warc_records())["body"]              # raw bytes of the first HTML response
wet = {r["url"]: r["text"] for r in L.wet_records()}   # Common Crawl's own text, by URL
kept = L.run0("final")                              # documents that survived run0
why = L.run0_removed("3_gopher_rep")                # documents a step removed, with metadata.filter_reason
fw = L.curated("fineweb_warc")                      # what FineWeb kept from the same WARC
```

Privacy when embedding: run0 documents carry `metadata.file_path`, a local absolute path (it contains
the user's name); never copy it into the page or the repo (use the WARC file name from `load.FILE`).
Removed documents (`removed/`) are not PII-scrubbed; only `final/` is. Show short excerpts only.

Joining raw and curated: WARC-Record-ID is the join key (`id` in run0 and FineWeb rows,
`warc_record_id` in Nemotron-CC); URL works too but a URL can appear more than once in a crawl.

## Source code at pinned versions

Shallow clones in `$DC_SCRATCH/src/` (see SETUP.md for commits): datatrove v0.10.1, dolma v1.2.1,
NeMo Curator v1.4.0, trafilatura v1.11.0, resiliparse v1.0.9, fastText v0.9.2, datasketch v2.0.0,
Google's deduplicate-text-datasets (commit 4e9888ac, 2024-05-21), text-dedup (commit 7538f3ec,
2026-03-09). The installed packages in `$DC_SCRATCH/venv/lib/python3.12/site-packages/` are the
same versions, so file:line quotes can be taken from either.
