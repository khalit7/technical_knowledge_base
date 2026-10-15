# Visual ideas: Decontamination, PII and data governance (dg)

The question the page keeps returning to: **what does each rule actually remove, and is it what you meant to remove?**
Every visual makes a rule's output inspectable on real data.

| # | Idea | Placement | Score (of 14) | Status |
|---|---|---|---|---|
| dg1 | **One real pair, four rules, animated**: item and matched document tokenised, 8-gram index, matches marked on both sides, coverage and longest run counted, then GPT-3 / Tulu 3 / ConTAM / datatrove verdicts on the same marks; 8 vs 13-gram toggle; four pairs (copy, passage, phrase, diagram) | Reading, section 2 | 12 | built |
| dg2 | Documents flagged per corpus by each rule (5, 8, 13-gram, Tulu, datatrove), with the two whole FineWeb files | Reading, section 3 | 10 | built |
| dg3 | What the flagged pairs really are: stacked bars of hand labels per corpus | Reading, section 3 | 11 | built |
| dg4 | **Contamination checker**: every flagged item, its documents, rule chips, coverage mask on the item tokens, matched window, label; precision-by-rule table | Own tab | 12 | built |
| dg5 | Embedding nearest neighbours table with labels, plus the LLM judge's agreement | Reading, section 4 | 8 | built |
| dg6 | **PII detector lab**: 41 synthetic sentences, gold vs detected marks, false alarms, masked-output view, Presidio threshold and type controls, real-text counts | Own tab | 11 | built |
| dg7 | Opt-out signals then (2024 WARC) and now (robots.txt fetched 2026-10-15), blocked counts per AI token | Reading, section 8 | 9 | built |
| dg8 | **Provenance chain**, animated: one FDA page from website to FineWeb-Edu, real identifiers at each step, licence layer, removal path; run0's datasheet | Own tab | 10 | built |
| dg9 | Removal unit cost (document / paragraph / span / strings), as a line of measured characters | Reading, section 6 | 7 | built as text |
| dg10 | Min-K% / loss / zlib AUC table per benchmark and model (Qwen3 0.6B, 1.7B; original vs number-shifted items) | Reading, section 5 | 8 | built from the GPU run |
| dg11 | Score-inflation simulator (clean vs dirty accuracy) | rejected: no data of our own; the published tables (GPT-3, Llama 2, Llama 3) are quoted instead |
| dg12 | Court-case timeline, licence-layer widget, robots.txt share across crawls | rejected: owned by the Pretraining corpora sibling (linked) |
| dg13 | Map of corpora by PII policy | rejected: a table says it; no quantity to move |

Inspiration: the root's n-gram coverage demo (kept, not rebuilt; this page uses real pairs and adds rules),
Singh et al.'s ConTAM comparisons, Presidio's demo UI, Data Provenance Explorer.

What the methodology lacked: a way to score "precision by reading" visuals; here labels on every flagged pair are the
reproduction target (the counts must match the labelled data, checked by `scripts/check_numbers.py`).
