# Tool map: visual ideas, built and rejected

Central question for this tab: "which tool at each layer, and what does it actually run?" Scores 0 to 2 on: parameter to move, reproduces a published figure, computable from public data, shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere (reproduction and computability count double; build cost subtracted).

## Built
| # | Idea | Score | Data | Placement |
|---|---|---|---|---|
| M1 | **Same query, the defaults you get** (before/after animation): one SciFact test question through ten tools, rows revealed step by step, cells green/red against exact top 10, relevant abstracts underlined; toggle Defaults / One knob turned; counters for this question and the 300-question means; table with ANN recall@10, nDCG@10, recall@10 | 13 | `defaults_real.py` on the setup agent's bge-small vectors; exact nDCG@10 0.7127 reproduces the MTEB results repo value for bge-small on SciFact independently | own section |
| M2 | Filterable atlas (layer, licence class, deployment, status, search) with a detail panel: owner, licence, latest release with source, status with source and GitHub last push, what it runs with evidence label, model facts from HF configs, measured checks, choose/avoid | 11 | atlas_*.py plus PyPI, GitHub API, HF API | own section |
| M3 | The stack: nine clickable layers that filter the atlas | 6 | atlas counts | top |
| M4 | Which-store chooser: six questions, additive rule points, every reason linked to its card, exclusions shown | 9 | rules in `34_js_map_6choose.js` from atlas facts (labelled rules of thumb) | own section |
| M5 | Timeline 2016 to 2026 (lanes by layer, dots by kind: paper, release, ownership or licence, last release before a silence), year-by-year animation; second view: every tool sorted by latest release date, quiet names in red | 9 | `timeline.py`, dates re-checked by gen_data.py | own section |
| M6 | MTEB zero-shot table computed with mteb's own functions; SciFact scores by who ran them (results repo, vendor, BEIR, measured here); two predict-then-reveal questions | 10 | `checks_frameworks.py` (mteb 2.24.13), setup FACTS | own section |

## Rejected
- QPS / latency bars per store: no timing on this tab (setup agent holds the GPU; vendor numbers are not comparable). The Vector search lab owns timing.
- A pgvector filtered-search animation: the Search and vector databases page already has one (owner of engine internals).
- Leaderboard average table for 30 models: would copy a moving leaderboard into a static page; the zero-shot table makes the point with computed data instead.
- Price comparison of hosted APIs: prices change monthly and Khalid removed price tabs elsewhere; links to pricing pages are enough.
- GitHub stars chart: popularity is not a quality or status signal.

## What the methodology lacked
A rule for "local or lite modes": two tools report an index they do not use (Qdrant local mode, Milvus Lite). Benchmarks of a library should state the mode and read the index back.
