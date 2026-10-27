# Inputs (where every file came from)

- `paper_v1.txt`, `tables_v1.txt`, `anchors.txt`: `extract_paper.py` on https://arxiv.org/html/2609.04148v1 (fetched 3 October 2026; v1 is the only version).
- `figures.json`: `decode_figs.py` on the vector figure PDFs of the arXiv e-print (https://arxiv.org/e-print/2609.04148v1, not kept). Printed labels only.
- `replay_stats.json`, `replay_expected.json`: `replay.py` on 640 trajectories of https://huggingface.co/datasets/gyung/LFM2-Terminal-SFT-Processed fetched by `fetch_sample.py` (16 pages of 40 rows at seeded random offsets; the raw pages, about 35 MB, are not kept).
- `recompute.json`: `recompute.py`.
- `web_checks.txt`: dated checks of the Terminal-Bench leaderboard, the 2.1 pull request and the dataset card.
