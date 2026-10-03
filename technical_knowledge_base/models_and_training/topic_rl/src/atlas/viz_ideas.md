# Method atlas and Taxonomy: visual ideas (AT rows)

Chosen with the Methodology (`html_utils/interactive-html-ideas.md`, section 2). The question the tabs serve: "across every RL method, what does each estimate in place of the expected return, what does it need, and which earlier problem did it fix?" The atlas is a data tab (topic_pages.md Part A): every cell sourced and dated, no splicing of versions (DQN 2013 and DQN 2015 are separate rows; RLOO's 2019 estimator and its 2024 RLHF use are kept in separate cells, each with its own source).

Scores: R reproduces a source (x2), P computable from public data (x2), S shows what a sentence cannot, M corrects a misconception, Q measures the central question, N new to the page, A animation against a predecessor; build cost subtracted.

| # | Idea | Placement | R P S M Q N A (cost) | Score | Status |
|---|---|---|---|---|---|
| AT-1 | **The grid**: 47 methods x 9 columns, sortable, filterable by every categorical column, needs (all-of), family and free text; click a cell for source, location, date, quote and note; kinds stated / derived / unconfirmed visible in the cell | Atlas, top | 2 2 2 2 2 2 0 (-1) | 15 | built |
| AT-2 | **Corrections box**: twelve common claims, each with a button that opens the cell whose source settles it | Atlas, above the grid | 2 2 1 2 1 2 0 (0) | 14 | built |
| AT-3 | **Side by side**: tick 2 or 3 methods; all nine columns plus the 14 extra taxonomy axes, differing categorical rows bold | Atlas, under the grid | 0 2 2 1 2 1 0 (0) | 10 | built |
| AT-4 | **Lineage graph**: one node per row placed by year (down) and family (lanes), one edge per "Problem it fixed" predecessor (61 edges); click a node to light ancestors and descendants, click an edge to read the problem with its quote and link; laid out from the measured width | Atlas | 2 2 2 2 2 2 0 (-2) | 14 | built |
| AT-5 | **The three axes as a map**: data (columns) x store (rows), colour = model, model filter; the grid's filters dim what they exclude | Atlas | 0 2 2 1 2 1 0 (0) | 10 | built |
| AT-6 | **Each fix lights up**: two chains animated on one recipe card, Q-learning to Rainbow (each DQN extension shown as its own paper on top of DQN 2015, then combined) and PPO to GSPO (counter: large networks in memory 2, 4, 3, 3, 1, 1, 1-or-2); target formula per step, caption = the row's fixed cell with quote and source; play, pause, step, scrub, speed; animates only on screen in the visible tab and starts paused | Atlas | 1 2 2 2 2 2 2 (-2) | 15 | built |
| AT-7 | **Taxonomy, one method on every axis**: 18 axes, the method's value lit among all values, with the source of each placement and "unconfirmed" flags | Taxonomy | 0 2 2 2 2 2 0 (0) | 12 | built |
| AT-8 | **Any two axes**: pick two of the 18 axes, every atlas method placed on that grid, empty combinations counted | Taxonomy | 0 2 2 2 1 2 0 (0) | 11 | built |
| AT-9 | **Sutton and Barto's unified view** (Figure 8.11): depth x width with the four corners named and every value-updating method placed; methods with no return estimate listed apart | Taxonomy | 1 2 2 1 2 2 0 (0) | 12 | built |
| AT-10 | **One section per axis**: definition (quoted from S&B where it defines it), sides with method chips, common misconception, where the boundary blurs, the atlas's count per value | Taxonomy | 1 2 1 2 2 2 0 (-1) | 12 | built |
| AT-11 | Benchmark scores per method (Atari median, MuJoCo returns) as a column | none | 0 1 1 0 0 1 0 (-2) | 1 | rejected: scores are on different suites, versions and budgets; a column would splice incomparable numbers. The Milestones tab owns benchmarks. |
| AT-12 | Citation counts or "popularity" column | none | 0 1 0 0 0 1 0 (-1) | 1 | rejected: counts change daily and measure attention, not use; "used now" is sourced to library tables instead |
| AT-13 | A force-directed lineage layout | none | 0 2 1 0 1 0 0 (-2) | 2 | rejected: positions would carry no meaning and move on every load; year x family puts time and family on the axes and stays legible at 390 px |
| AT-14 | Running each method live on a toy | none | 1 1 2 1 1 0 1 (-3) | 4 | rejected: the Estimator lab tab owns live experiments; the atlas is the index |
| AT-15 | A single chain from tabular Q-learning to GRPO | none | 0 2 1 1 1 1 1 (0) | 7 | rejected: it would splice two unrelated lines (value methods and LLM policy gradients); two chains with a toggle keep each step a real paper-to-paper fix |
| AT-16 | Compute or memory cost per method in GPU-hours | none | 0 0 1 0 1 1 0 (-2) | 1 | rejected: no comparable published figures; only the qualitative "networks in memory" counter is sourced |

## What the methodology lacked here
- The scoring has no row for "every cell sourced": for a data tab the cell-level provenance (stated, derived, unconfirmed) is the main design decision, so the build checks every quote word by word against the source text (`mk_atlas.py`: 227 quotes, 220 contiguous, 7 matched as in-order words across two-column PDF line breaks).
- Taxonomy placements on 14 extra axes are judgements, not facts a paper states; they are labelled derived (or unconfirmed where the paper does not settle them) rather than dressed as sourced.

## Inspiration
- Sutton and Barto, section 8.13 "Summary of Part I: Dimensions" and Figure 8.11 (the unified view).
- The Defaults across models tab on Topic: ml-fundamentals (grid, cell detail, compare, morph animation).
- OpenAI Spinning Up's "Kinds of RL algorithms" taxonomy figure (a tree), replaced here by axes because a tree forces one order of splits.
