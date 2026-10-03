# Inputs

- `paper_v1.txt`, `tables_v1.txt`, `anchors.txt`: `extract_paper.py` run on the arXiv HTML of 2608.23552v1 (fetched 2026-10-03). The HTML itself is not kept.
- `figs.json`: `decode_figs.py` run on the vector SVGs of Figures 5, 7, 9 and 10 (`https://arxiv.org/html/2608.23552v1/<name>.svg`; the command is in the script's docstring). The SVGs are not kept.
- `arc_cards/*.json`: ARC Prize scorecards as served by `https://arcprize.org/api/v3/scorecards/<id>` (fetched 2026-10-03): Prime Agent's released median run (2af780b4...) and the ten ARC-AGI-3 community-leaderboard entries that share its 25 public games and human baselines (TELL, a-evolve, Polyphony and a one-game debug card are left out: different baselines or game sets).
- `arc3_community.json`: the ARC-AGI-3 entries of the community leaderboard (names, self-reported scores and costs, dates, scorecard links), from the data embedded in `https://arcprize.org/leaderboard/community`.
- `arc_agi3_extracts.txt`: the scoring section (RHAE), the public-set description, the no-harness official leaderboard policy and the community-leaderboard caveat from the ARC-AGI-3 paper (arXiv 2603.24621v2).
- `blog_2026-08-05.txt`: text of the Prime Intellect launch post (three ARC runs, Best@3, the earlier Table 1, Factorio details, "built on top of pi").
- `repo_facts.txt`: GitHub API facts for PrimeIntellect-ai/prime-agent: licence, LICENSE history, the May 2026 README ("a fork of pi-mono"), releases around the paper, the absence of evaluation code.
- `recompute.json`: written by `recompute.py`.
