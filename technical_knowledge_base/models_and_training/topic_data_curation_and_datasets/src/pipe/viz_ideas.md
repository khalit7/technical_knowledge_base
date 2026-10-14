# Pipeline lab: visual ideas, built and rejected

The question the tab keeps returning to: **what does each stage remove, and is it right to?**

## Built
| Idea | Why | Data |
|---|---|---|
| Funnel animation, stage by stage, with an extractor switch (trafilatura, resiliparse, WET) and a documents/characters switch | Before/after on the same 20,280 pages: the extractor changes every later stage (2,692 / 2,150 / 877 kept) | run0 stats, `pip_funnel.py` |
| Our funnel against FineWeb's and Dolma 3's published funnels | Shows which shares transfer (heuristics 14.0% vs 15%) and which do not (dedup, one file) | GPT-2 tokens, papers |
| Same page, three extractors, animated (7 steps, 3 pages) | The mechanism behind "WET trains worse": calendar widgets, merged menus, dropped data tables | `extract_all`, outcomes |
| LID histogram with threshold slider, boundary pages | Shows the 0.65 boundary is made of English non-prose, not other languages | lid.176 on trafilatura text |
| Rule explorer: rule, threshold slider, alone / in chain / kept by FineWeb counts, histogram, examples both sides with labels | Lets the reader test a threshold against FineWeb's own output (0.01 vs 0.1) | `pip_rules.py`, labels |
| Label table per rule | A drop count is not a quality measure | `labels/drops.json` |
| PII before/after on a constructed text, caught vs still-there bars | What two regexes do and miss, without showing real personal data | `pip_pii.py` |
| Predict-then-reveal: biggest stage, WET outcome, 0.01 vs 0.1 | Belief elicitation before the number | |

## Rejected
- Showing real removed documents of the URL filter: adult content; only the ten wrong drops are named.
- A per-document scatter of all 6,971 rule values: too large to embed; histograms plus counts at 41 thresholds carry the same decisions.
- Animated dedup clusters: the Dedup lab owns MinHash; one file has 75 removals.
- Timing as a main chart: shared-machine timings are rough; kept to one labelled box.

## What the methodology lacked
A rule for labels made by the agent rather than a person: the page says who labelled and how many, and treats them as patterns, not rates.
