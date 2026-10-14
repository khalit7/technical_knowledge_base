# Tool map: visual ideas, built and rejected

Central question for this tab: "for each stage of the pipeline, which tool or corpus would you pick today, and what does that choice commit you to (hardware, licence, maintenance)?" Scores 0 to 2 on: parameter to move, reproduces a published figure, computable from public data, shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, animatable as a before/after (reproduction and computability count double; build cost subtracted).

## Built
| # | Idea | Score | Data | Placement |
|---|---|---|---|---|
| TM1 | **Atlas by pipeline stage**: eight clickable stages filter 43 tool cards; status and search filters; detail panel with release, last commit, repository (moved or archived), licence, corpora built with it, when/avoid, judgement verdict, sources; sortable table; "what the dates say" computed from the dates | 11 | atlas_tools.py plus PyPI, GitHub API and Atom feeds, HF API (fetch_meta.py) | own section |
| TM2 | **Which tool for which job**: four questions (job, hardware, size, commercial use), 144 combinations, a pick per stage with the reason, runner-up and licence caveats; every tool name opens its card | 9 | rules in 36_js_tm_2pick.js, labelled judgement, built from atlas facts | own section |
| TM3 | **Corpus lineage, animated by year, with a before/after toggle**: 25 corpora in lanes by kind on a piecewise time axis, edges for "built from", CC marks; play 2019 to 2026 with a caption per year; switch "as released (kind)" to "today (availability and licence)" on the same diagram, hollow for corpora no longer downloadable | 12 | atlas_corpora.py plus HF API and arXiv API dates (gen_data.py fails on any date mismatch) | own section |
| TM4 | **Licence table** read from card metadata, filterable, plus three traps (model-file licences, gated contracts, compilation vs content) | 8 | HF API cardData | own section |
| TM5 | **Same input, two toolkits** (before/after per stage): 12 illustrative documents through datatrove (inline filters, MinHash) and the Dolma toolkit (tag, Bloom dedupe, mix), measured; table of fates with disagreements highlighted | 12 | toy/toy_datatrove.py, toy/toy_dolma.py | own section |
| TM6 | **Storage sizes**: the same documents as JSONL, gzip, zstd, Parquet (snappy, zstd, text only) and a token shard, measured | 9 | storage/storage_sizes.py on the running example | Storage section |
| TM7 | **Packing animation** (before/after): the same documents one per window vs packed, window by window, with real-token share for all documents at 2,048, 4,096, 8,192 | 10 | storage/storage_sizes.py token counts | Storage section |

## Rejected
- GitHub stars or download charts: popularity is not status or quality, and download counts are not comparable across PyPI and the Hub.
- Throughput bars per extractor or dedup tool: timings on a shared machine at low priority would mislead; DCLM's published 8x is quoted instead and the Pipeline lab owns extraction measurements.
- A tool-by-feature matrix (rows tools, columns features): sparse and unreadable at phone width; the stage filter plus cards carries the same facts.
- Token-count bar chart of all corpora: sizes are stated in different units (tokens of different tokenizers, words, bytes, documents); a single bar axis would join incomparable numbers. The size column keeps each as stated.
- MDS / WebDataset size bars: mosaicml-streaming and webdataset are not installed in the shared env; their containers add little over the bytes of the shards they hold, so the bars would add nothing the token shard does not show.

## What the methodology lacked
A rule for "status": a GitHub archived flag, a quiet default branch and an active fork can all coexist (fastText). Status here is computed from dated records (release, last default-branch commit, archived flag) and the judgement is separate.
