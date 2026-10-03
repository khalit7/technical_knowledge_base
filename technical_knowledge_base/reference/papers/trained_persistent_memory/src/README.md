# src: Trained Persistent Memory for Frozen Encoder-Decoder LLMs (arXiv 2603.16413)

`sh build.sh` writes `../index.html` (it runs `mk_tables.py`, `recompute.py` and `mk_paper.py` first). Then:
- `python3 check_sim.py`: runs `parts/20_js_sim.js` through node against an independent NumPy implementation of Eqs. 7, 16 and 24 to 28 (15 cases, worst relative difference about 1e-13); writes `inputs/check_sim.json`.
- `python3 locomo_stats.py <locomo10.json>`: lag buckets, sizes and the answer-word overlap counted from LoCoMo's released data (download command in the script's docstring; the file is not kept); writes `inputs/locomo_stats.json`.
- `python3 mk_coverage.py`: `coverage.json`, every fact of `live.md` checked against the built page.
- `node src/check_page.mjs [shots dir]` from the repo root: every control in both themes and widths.

| File | What |
|---|---|
| `live.md` | the Notion row page as fetched (saved by `save_live.py`) |
| `paper.json` | headline card, verdict, resources, KB links |
| `tables.json` | Tables 2 to 5 transcribed at printed precision (`mk_tables.py` from `inputs/table_*.txt`) |
| `recompute.py` | every derived number: means, question-weighted means, standard-error bounds, F1 levels, parameter counts, decay figures, the 19 claim checks; writes `inputs/recompute.json` |
| `parts/20_js_sim.js` | the three write rules, shared by the page and `check_sim.py` |
| `inputs/paper_v1.txt` | the arXiv HTML as text (`extract_paper.py`), the only arXiv version |

## Shape, and departures from html_utils/methods/papers.md

- **Live ingredient: a simulation of the write rules, not a trained toy.** The paper is a method-on-top-of-a-model pilot with no code, weights or traces, so there is no trace to replay and a toy read adapter would test a toy. Its write side, though, is never trained (Sec. 5: random fixed projections), so it can be run exactly as the paper runs it. That simulation carries the page's main findings (decay far faster than LoCoMo's lags; attention-coupled rows collapse to one vector; slot ties waste 10x capacity).
- **No "Then and now"**: a 2026 result paper with no later lineage yet.
- **The Reading tab is long (about 18 minutes against the old page's 4)**, because the old summary missed most of what the tables show (three methods harm answers at 1x, eight text-table contradictions, the metric's clipping). Every predict widget's detail sits inside its reveal, so a reader who skips them reads less.
- The input sizes in the simulation (d = 32, 8 tokens per turn, random latents) are illustrative and labelled as such.
