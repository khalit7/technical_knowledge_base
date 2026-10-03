# Inputs

| File | What | Source |
|---|---|---|
| `paper_v1.txt` to `paper_v4.txt` | Plain text of every arXiv HTML version (v1 16 Sep, v2 18 Sep, v3 22 Sep, v4 30 Sep 2026) | `https://arxiv.org/html/2609.18094v<n>`, extracted by `extract_paper.py` |
| `tables_v4.txt`, `anchors.txt` | v4 tables as text and every anchor id | same, v4 |
| `version_diffs.txt` | Sentence-level diff of v1 to v2, v2 to v3, v3 to v4, number-bearing sentences only | `diff_versions.py` |
| `fig2_daily.json` | Figure 2 (contributions per day by type), decoded from the vector bars | `assets/trace-activity.pdf` in the v4 e-print (`https://arxiv.org/e-print/2609.18094v4`, not kept), `decode_fig2.py` |
| `footnote_nvlabs.txt` | The commented-out "project materials" footnote in the source, and the 404 of the URL it names | v4 e-print `main.tex` lines 59 to 60; checked 2026-10-03 |
| `github_readme.md`, `project_site.txt` | The repository README and the project website as text (both still carry v1 numbers) | `github.com/yifanzhang-pro/Agora`, `yifanzhang-pro.github.io/Agora/`, fetched 2026-10-03 |
| `eval_sample.json` | Ids and checksum of our 200 evaluation texts (texts not kept) | FineWeb-Edu sample-10BT rows 0 to 199 via the datasets-server API, `fetch_data.py` |
| `recompute.json` | Every derived number and check shown on the page | `recompute.py` |
Em-dashes in the extracted paper text (empty cells of Table 4) are written as `--`.
