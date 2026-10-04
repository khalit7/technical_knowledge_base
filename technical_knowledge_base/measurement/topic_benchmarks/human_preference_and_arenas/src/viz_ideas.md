# Visualisation ideas: Human preference and arenas

| Rank | Idea | Score (teach / data / cost) | Placement | Data |
|---|---|---|---|---|
| 1 | Style control step by step on all 2024 votes: plain, + length, + markdown, then LMArena's published board (before/after, rows slide) | 5/5/4 | Reading, animation | public log of 26 Aug 2024 (1.76M votes), FastChat code reimplemented; coefficients reproduce the published 0.249/0.024/0.031/0.019 |
| 2 | Same votes, two raters: online Elo (K = 4) against Bradley-Terry, in time, reversed and shuffled order (before/after method) | 5/5/4 | Reading, animation | 6,000-vote sample, ten models |
| 3 | Fit the votes: Bradley-Terry with style features, online Elo with K and order, ties, vote count, sandwich against bootstrap, against LMArena's full-data rating | 5/5/3 | Tab | same sample; full-data published ratings |
| 4 | Today's board through three published lenses (raw, style control, factuality) with rank spreads, rows sliding between lenses, 12 categories | 5/5/4 | Tab | Arena leaderboard-dataset, latest split (2 Oct 2026) |
| 5 | Intervals and rank spreads for the top 15 (Arena's rule computed over all 413 models) | 4/5/5 | Reading | same |
| 6 | Best-of-N private variants: expected inflation σ·E[max of N], checked against Arena's "+11 after 50 tests and 3000 votes" | 4/4/5 | Reading, widget | σ from a real CI on the Oct 2026 board; exact integral |
| 7 | Arena score against the AA Intelligence Index for 35 matched models, Spearman overall and frontier only | 4/4/4 | Reading | leaderboard-dataset; topic_llms aa_snapshot.json |
| 8 | Null model against best real entry on three judge boards | 3/4/5 | Reading | arXiv 2410.07137; board readings |

Rejected: an Elo-over-time history chart of the board (a release-history view, not a mechanism, and the history omits pre-release variants); a judge-bias demo (owned by the LLM-as-judge page); an AlpacaEval length-control toy on illustrative data (the real verbosity numbers in the text carry it); a vote-rigging simulator (the papers' own setups are not reproducible from released data at this size); the 140k 2025 dataset (the 2024 log reproduces published boards exactly, which the 2025 sample cannot).

What the methodology lacked: guidance for a leaderboard whose published history is itself cleaned (pre-release variants removed); here the absence is reported as a finding and never filled from secondary sources.
