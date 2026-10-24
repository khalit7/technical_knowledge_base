# Visualisation ideas: Pretraining corpora (child 1 of Topic: data-curation-and-datasets)

The question the page keeps returning to: **for a given training run, which corpus (or mix) should I use, and how do I know its numbers mean what they seem to?** Every visual either makes a corpus's card readable (what it is, how big in which unit, under what licence), shows how corpora relate (lineage, what each kept from the same crawl), or measures them side by side on the same metrics.

## Built

| # | Idea | What it shows, what the reader does | Why it earns its place | Data and sources | Placement |
|---|---|---|---|---|---|
| PC1 | One crawl's files to scale | Bars of compressed TiB per file type for CC-MAIN-2026-39 | WET is about 7% of WARC: most bytes of a page are not text, the reason extraction matters | crawl index page, checked 2026-10-14 | Reading s1 |
| PC2 | Crawl sizes 2008 to 2026 | Bars of page captures (or unique URLs) for all 128 index collections, tap a bar for dates | Shows the 2025 drop and the captures-per-URL duplication every multi-crawl corpus must remove | cc-crawl-statistics monthly.csv and cumulative.csv @ 9ff265d | Reading s1 |
| PC3 | robots.txt opt-outs across four crawls (measured) | Pick a crawler (GPTBot, CCBot, ClaudeBot, Google-Extended...), bars of the share of sites blocking it in 2023-23, 2024-30, 2025-30, 2026-39 | A live, dated measurement of the shrinking crawlable web, set beside Longpre et al.'s token-weighted figures | robots.txt captures from CC, robotparser; src/scripts/robots_optout.py | Reading s1 |
| PC4 | The same text counted with four tokenizers (measured) | Characters per token per corpus sample for GPT-2, GPT-NeoX, OLMo 2, Qwen3; predict-then-reveal on FineWeb's 18.5T | "Tokens" is not a unit without its tokenizer; code and maths differ most | samples of s8, tokenizers pinned | Reading s2 |

| PC5 | Every corpus, one table | Chips by kind; name, release, tokens, tokenizer, licence field; tap a name to open its Lineage card | One place to compare headline sizes with their units and licences | data/corpora.json | Reading s3 |
| PC6 | DCLM Table 4 bars | Eight quality filters on the same pool, Core score | The learned-filter result in one picture, with an honest axis note | DCLM paper Table 4 | Reading s3 |
| PC7 | What each corpus kept from one WARC file (before/after animation) | 20,617 HTML pages as cells, steps raw -> FineWeb -> FineWeb-Edu -> the classifier re-run here; toggle the strict (3+) and lenient (2+) cut; counters for pages, share and GPT-2 tokens | The same input before and after each corpus's pipeline, drawn to scale (one cell per page); reproduces FineWeb-Edu's 159 within 2 pages independently; a fifth step shows the Nemotron-CC pages found by streaming its files, coloured by quality bucket | WARC scan + FineWeb rows of the running example; classifier on CPU | Reading s4 |
| PC8 | Published-study viewer | Pick one of 8 studies; bars with the study's own corpus highlighted (vendor) and the rest independent; alternate metric where the paper gives one | Makes "who ran it" and "which metric" visible; every cell copied from a table | data/ablations.json | Reading s5 |
| PC9 | Licence layers | Pick a corpus; its four layers (content, crawler terms, dataset licence, access gate) filled from its card | Shows why a licence field is not the whole answer | data/corpora.json + per-corpus layer text | Reading s7 |
| PC10 | Measured-samples table | 19 samples: docs, median length, characters per GPT-2 token, top language, Gopher pass rate, mean edu score | The summary of section 8 | data/measured.json | Reading s8 |
| PC11 | Predict, then reveal (2) | FineWeb's 18.5T in Qwen3 tokens; DCLM against FineWeb-Edu under another harness | Belief elicitation on the two most counter-intuitive facts | measured ratios; DCLM appendix G | Reading s2, s5 |
| PC12 | Lineage tab | 39 corpora as rows in date order, lanes by kind, edges by relation (filtered, recipe, union), circle area by tokens, ring by licence class; full card on tap; replay animation with counters (corpora so far, largest English web corpus, open licences) | The family tree and the growth of the field in one view | data/corpora.json | Own tab |
| PC13 | Corpus comparer tab | Seven metrics across 19 samples (length spans, tokens per tokenizer, language mix, domains, duplicates, rule pass matrix, edu score histograms), per-sample detail with failure reasons and two scrubbed excerpts | Opens the corpora instead of describing them | data/measured.json | Own tab |
| PC14 | What to train on tab | Size, token budget, goal and licence -> a mix from published recipes, epochs per corpus with spill-over to larger corpora past 4 epochs, nearest published recipe | Turns the page's advice into a checkable plan; the epochs check is the common error | data/corpora.json, data/mixes.json | Own tab |

| PC15 | Hero: what each published mix was made of | Static stacked bars, seven mixes (The Pile 2020 to Olmo 3 2025) by eight kinds of source, filtered Common Crawl highlighted | The whole subject on one picture: web went from a fifth to nearly all of the mix, and the rest is code, maths, papers | data/composition.json (make_composition.py, from each table) | Reading top (2026-10-24) |

2026-10-24: PC12 moved from its own tab into Reading section 3; PC6 (DCLM Table 4 bars) removed because Quality classifiers and data selection owns and draws every row; PC5 moved into a closed block.

## Rejected

| Idea | Why rejected |
|---|---|
| Horizontal timeline for the lineage | 39 labels do not fit at 390 px; rows in date order keep every name readable |
| DCLM membership in the WARC animation | DCLM has no 2024 documents (built partially instead: Nemotron-CC by a streamed scan of 168 of its 722 files for the crawl, coverage stated) |
| A map of crawl languages | Common Crawl publishes the table; one sentence carries it |
| Re-plotting FineWeb's smoothed curves | Read from plots; the csv's final values are used instead |
| Price or cost tab | Not the page's subject (such tabs were removed from other pages at review) |

## What the methodology lacked for this page
- A rule for samples: a first-N sample of one file is not a random sample of a corpus. The page says so beside every measured number; a future method note could ask for random row-group sampling when the budget allows.
- A rule for library defaults: datatrove's C4 filter is not the T5 paper's (5 against 3 sentences). Reproduction claims should name the library version and its defaults.
- A rule for corpora whose size is quoted in different units: always carry the tokenizer (or "words") with the number, and convert with a measured ratio, never assume.
