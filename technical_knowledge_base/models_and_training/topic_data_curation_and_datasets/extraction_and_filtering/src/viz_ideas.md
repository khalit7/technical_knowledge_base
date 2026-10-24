# Visualisation ideas: Extraction and filtering

Question the page keeps returning to: what does each extraction and filtering choice keep or drop, and is it right?

| # | Idea | Placement | Status | Data |
|---|---|---|---|---|
| EF1 | jusText pass by pass on a real page, toggle to trafilatura and resiliparse on the same page (before/after) | Reading s2 | built | ef_jt_steps.py; passes split at the library's comments, checked equal to justext.justext |
| EF2 | trafilatura's branch shares (own XPath, baseline, readability, jusText) | Reading s2 | built | ef_traf111.py nodedup (instrumented) |
| EF3 | Six extractors, same filters: kept, FineWeb overlap, characters | Reading s3, comparer tab table | built | ef_chain.py |
| EF4 | WCEB accuracy beside the paper's table | Reading s3 | built | ef_wceb.py; published rouge_micro.tex |
| EF5 | trafilatura cache: off / on / shuffled | Reading s4 | built | ef_traf_analysis.py |
| EF6 | Tables, code, TeX survival by extractor on targeted pages | Reading s5, comparer | built | ef_struct.py |
| EF7 | Extraction comparer: any page, two extractors, lines only on the right marked | Own tab | built | ef_pages.py |
| EF8 | Threshold curves for lid.176 and GlotLID, presets for each corpus's threshold, FineWeb2's rule | Reading s6, LID tab | built | ef_lid.py, ef_collect.py |
| EF9 | 2-D English-score heat map, disagreement examples, confusion pairs, low-resource, code-switching | LID tab | built | same |
| EF10 | Rules table with labelled wrong-drop share and Wilson interval | Reading s7 | built | labels |
| EF11 | Rule workbench: every threshold at once, presets (datatrove, papers, Gopher only), labelled losses | Own tab | built | ef_collect.py workbench encoding (reproduces run0 6,971/6,971) |
| EF12 | Default traps table | Reading s8 | built | root Pipeline lab variants, ef_c4var.py, labels |
| EF13 | One document under three line-level schemes, animated | Reading s9 | built | ef_lines.py example |
| EF14 | Blocklist composition against UT1 | Reading s10 | built | ef_url.py |
| EF15 | Toxicity tiles and labelled bad-word matches | Reading s11 | built | ef_tox.py, labels |
| EF16 | Cost per stage | Reading s12 | built | ef_cost.py (rough) |
| EF17 | Label browser | Own tab | built | labels |
| EF18 | Hero: run0's funnel, documents per stage to scale with the largest drop reason | Reading top | built 2026-10-24 | pipe.run0, wb.reasons |
| EF19 | trafilatura cascade diagram with branch shares (replaces EF2's bars) | Reading s2 | built 2026-10-24 | ef_traf.json |
| EF20 | fastText LID mechanism: features, hashing, averaging, softmax | Reading s6 | built 2026-10-24 | lid.176 settings |
| R1 | Animated DOM tree of a page with nodes pruned by each extractor | none | rejected: the jusText block list and the comparer show the same thing with real data; a tree for a real page is unreadable at 390 px |
| R2 | Funnel animation | none | rejected as an animation: the root's Pipeline lab animates it; a static hero funnel (EF18) was built on 2026-10-24 because this page owns what each filter removes |
| R3 | Training proxy models per extractor | none | rejected: GPU scale far beyond one WARC; FineWeb and DCLM published results quoted instead |
| R4 | Per-line LID heat strip per document | none | rejected for now: the code-switching table carries the finding; a per-line strip needs per-line text, too large to embed |

What the methodology lacked here: a rule for hand labels (who labelled, sample design, intervals); this page states
labeller, seed and Wilson intervals everywhere labels are used.
