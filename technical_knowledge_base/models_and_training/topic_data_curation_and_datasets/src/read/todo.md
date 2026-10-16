# Reading tab: TODOs

Status 2026-10-16 (final pass after all GPU runs). Filled items were checked against the labs' own outputs (`src/pipe/out/`, `src/qual/out/`, `src/dedup/out/`, `src/post/out/`, `src/mix/`, the child pages' FACTS entries), and `check_read.mjs` asserts the quoted numbers.

| # | Where | Status |
|---|---|---|
| 1 | Section 0, running example | Filled from `src/data/README.md` (CC-MAIN-2024-30 file 00000; FineWeb 2,425, FineWeb-Edu 159; DCLM sample; Nemotron-CC bucket samples; 7 benchmarks; post-training samples; models). |
| 2 | Section 3, page animation | Filled: real page protectnmwater.org from `pipe/out/page_data.json` and `for_reading.json` via `make_read_data.py`; three extractors; live rules agree with datatrove's verdicts (WET fails the alpha rule at 0.751; trafilatura passes at 0.801). |
| 3 | Section 3, step 6 scores | Filled: `qual/q_page_score.py http://www.protectnmwater.org/` (2026-10-15): FineWeb-Edu 2.765 (stored 2.765625), DCLM 0.00164 below the 0.0181 cut. |
| 4 | Section 3, funnel | Filled: running example's document funnel (one WARC) with a toggle to FineWeb's published tokens; token shares and the four-file counts in prose. |
| 5 | Section 3, char-dup box | Filled: 154 more docs at 0.1, 0 in FineWeb; plus the C4 swap, trafilatura `deduplicate=True` and the FineWeb example's language filter. |
| 6 | Section 5, prediction | Filled and corrected: running example 14.4% overlap, Spearman 0.44; Nemotron-CC Table 8 10.1%; its "10% recall" is Table 9's token share. |
| 7 | Section 5, wrong drops | Filled from `qual/out/q_summary.json` labels (agent-labelled, one reader). |
| 8 | Section 6 | Filled from the Decontamination child's scan (via the Post-training lab and FACTS "dg"). |
| 9 | Section 7 | Filled: DoReMi measured on five domains (data_mixing/src/data/proxy_runs.json); RegMix sweep and rank check not run (dropped 2026-10-15). The root Mixing lab now reads the same file (build_data.py handles a DoReMi-only result). |
| 10 | Section 8 | Filled from synthetic_data/src/data/syn_data.json (rephrase_stats) and facts.json rp_*; the root Post-training lab's rephrasing box now shows the full run (via window.RDP.syn). |
| 11 | Section 9 | Filled from `post/out/filter.json`, `stats.json`, `checkers.json`. |
| 12 | Child pages | Filled: nine children linked by id with reading times (stated on the child, or its Reading tab's word count at 200 a minute). |
| 13 | Further reading lab cards | Filled (times from each tab's word count at 200 a minute, rounded). |
| 14 | Reading time | Re-measured 2026-10-16: about 50 minutes (10,148 words outside widgets) plus about 8 for folded answers. Longer than a root should be; candidates to move to children are listed in README.md. |

Still open: none on the Reading tab. The root Post-training lab's checker box (Qwen3-1.7B answers to RLVR prompts) still shows a pending box; it belongs to that lab (the post_training_data child replaced its own run with a not-run note).
