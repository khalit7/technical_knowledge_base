# Reading tab: visualisations built and rejected

Central question: at a fixed budget, which tokens, and how many unique ones do you have before you must repeat?

## Built
| Visual | Kind | Why it earns its place | Data |
|---|---|---|---|
| Clickable pipeline map (section 0) | HTML | The whole subject on one screen, each stage linked to its section and lab | none |
| DCLM filter comparison bars (1) | published bars | Same model and compute, only selection changes: the cleanest evidence that data decides | DCLM Table 4 |
| Corpus size against year (2), filter by web-only / top-slice | chart, click for notes | Two trends (100x growth; the split between strict top-slice and keep-and-fix corpora) | cards and papers, see facts.md |
| One page through the pipeline, extractor vs WET toggle (3) | step animation, before/after on the same input | Shows the same article lost at the heuristic filter only because of extraction; rule values, 5-gram Jaccard, 112-hash MinHash and bands computed live | illustrative page; thresholds from FineWeb paper and datatrove v0.10.1 |
| FineWeb funnel (3) | published bars | Scale of each stage | FineWeb paper |
| LSH S-curve with FineWeb and RefinedWeb presets (4) | derived chart | Formula reproduces both papers' published probabilities independently; exposes RefinedWeb's prose/formula swap of bands and rows | FineWeb, RefinedWeb appendices |
| Global dedup bars (4) | published bars | FineWeb's counter-intuitive result | FineWeb 3.4 |
| FineWeb-Edu vs DCLM paired bars (5) | published bars | Each quality model encodes a target | SmolLM2 Table 1 |
| n-gram decontamination demo (6), n and page toggles | live computation | Shows why paraphrases escape and short n-grams false-positive (35% and 19%, computed) | illustrative item |
| OLMo 2 before/after mid-training (7) | animated bars, before/after on the same model | The size of the staging effect (GSM8K 24.1 to 67.5) | OLMo 2 Table 9 |
| Model collapse, replace vs accumulate (8) | step animation, seeded simulation | The mechanism and why accumulation avoids it | illustrative simulation (Gaussian refit, 400 runs) |
| Interview calculator (interview) | derived calculator | Shows that a strict cut cannot supply 2T unique tokens from the crawls that exist; reproduces FineWeb-Edu's 1.3T by construction | FineWeb card, CC June 2025, DCLM Table 16, FineWeb-Edu GPU hours |

## Rejected
- Full corpus table in Reading: owned by the Tool map.
- Interactive bands/rows sliders and measured pairs: owned by the Dedup lab (Reading keeps presets only).
- Mixture calculator and token-budget animation: owned by the Mixing lab.
- DCLM Figure 4 funnel (percent of documents per stage): the figure's numbers exist only in an image; not transcribed.
- T5 repetition chart: the two numbers in prose carry it; a chart would repeat them.
- Contamination checker over real benchmark rows: owned by the Post-training data lab.

## What the methodology lacked
A rule for illustrative inputs inside a "computed live" visual: here the page and test item are made up but every number shown is computed from them by the published rules, and the caption says both. Kept the TODO to replace them with the labs' real pages.
