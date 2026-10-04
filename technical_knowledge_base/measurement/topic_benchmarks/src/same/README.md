# Same model, many numbers (tab `t-same`, ids `sm-`)

Files
- `mk_same.py`: the data, case by case, with a source on every reading; writes `../data/same.json` and `../parts/34_js_same_a.js` (`window.SM_DATA`). Run `python3 mk_same.py`, then `sh ../build.sh`.
- `../parts/34_tab_same.html` (markup and CSS scoped under `#t-same`), `34_js_same_a_math.js` (exact binomial maths, `window.SMC`), `34_js_same_b.js` (helpers and the case explorer), `34_js_same_c.js` (calculator), `34_js_same_d.js` (animation).
- `check_calc.py`: runs the page's maths in node on 294 cases and compares with SciPy and statsmodels (Clopper-Pearson at 95% and 99%, Wilson, Fisher two-sided with equal and unequal n, Newcombe, exact McNemar, paired Wald). `uv run --with scipy --with statsmodels python3 check_calc.py`. Last run 2026-10-04: ALL OK, worst error 6e-11.
- `check_ui.mjs`: clicks every control at 390 px dark and 920 px light (534 actions); fails on errors, NaN/undefined, sideways scroll, small SVG text, or a calculator value that disagrees with the Reading tab (AIME SE 7.3 points at 80%) or the TB-Science worked example (p = 0.310). Last run: 0 problems.
- `inputs/`: what was read, as fetched on 2026-10-04 (leaderboard JSON, text excerpts of cards and papers).
- `viz_ideas.md`: visuals built and rejected.

## Sources and how each was read (all 2026-10-04 unless dated)

| Case | Readings from | How read |
|---|---|---|
| ARC-AGI-3, GPT-6 Astra | ARC Prize `v3.json` (generated 2026-09-30); blog `arcprize.org/blog/astra` (3 Sep) | JSON, `inputs/arcprize_leaderboard_v3_2026-09-30.json` |
| ARC-AGI-3, Claude Opus 5 | same JSON (30.16%, $20,657); Prime Agent paper and blog via the verified paper page; TechCrunch for Nvidia AVO | KB paper page `reference/papers/prime_agent` |
| Terminal-Bench, GPT-6 Astra | Artificial Analysis page data (2.1 and 4.0 per effort); tbench.ai 4.0 leaderboard page data (330 trials, CI, pass@k, cost); Anthropic Opus 5.5 card section 8.5 (OpenAI's 57.9% at high); Google's Argon table via the Topic: llms grid | `inputs/aa_terminalbench_2026-10-04.json`, `inputs/tbench_4_0_leaderboard_2026-10-04.json`, `inputs/opus55_card_8_5_8_6.txt` |
| SWE-bench Pro, Claude Opus 5 | Opus 5.5 card Table 8.1.A (79.2%); Scale V2 leaderboard and blog (638/642, 222/272, HARD 98.0) | `inputs/opus55_card_table_8_1_A.txt`, `inputs/scale_swe_bench_pro_v2_leaderboard_2026-10-04.txt` |
| SWE-bench Pro v1, GPT-5 | arXiv 2509.16941v1 section 4 (23.3, 14.9, 200 turns); Scale v1 leaderboard page data (41.78 added 2025-11-26; 14.86 added 2025-09-19) | `inputs/swe_bench_pro_paper_v1_s4.txt`, `inputs/scale_swe_bench_pro_v1_leaderboard_2026-10-04.txt` |
| OSWorld, Claude | Epoch `benchmark_data.zip` (`os_world_external.csv` from os-world.github.io, OSWorld-Verified since 2025-07-28; `osworld_2_external.csv` from osworld-v2.xlang.ai); Anthropic Fable 5.1 page (Aug task release); Opus 5.5 card 8.13.3 (Sep 10 task files, new harness); OpenAI's 70.2% via DataCamp (flagged secondary) | `inputs/anthropic_fable_mythos_5_1_excerpt.txt`, `inputs/opus55_card_8_13_3_osworld.txt` |
| HLE, Claude Opus 5.5 | Opus 5.5 card Table 8.1.A and 8.11.1; Artificial Analysis model pages via `topic_llms/src/data/bench_grid.json` | `inputs/opus55_card_8_11_1_hle.txt` |
| AIME 2024, o1 | OpenAI "Learning to Reason with LLMs" (12 Sep 2024), read through the Wayback Machine (openai.com returns 403); Anthropic's 3.7 Sonnet table image for the December o1 | `inputs/openai_learning_to_reason_2024-09-12_excerpt.txt` |
| GPQA Diamond, Claude 3.7 Sonnet | Anthropic 3.7 Sonnet table (image, read by eye: 68.0, 78.2 / 84.8) and the extended-thinking post (256 samples, scorer); Epoch `gpqa_diamond.csv` | `inputs/epoch_gpqa_diamond_subset_2026-10-04.csv` |
| MMLU, Gemini Ultra | Gemini report v1 Table 2 and Appendix 9.1 Figure 7 (printed labels) | `inputs/gemini_1_report_v1_s5_1_1_table2.txt` |
| Legal Research Bench, GPT-6 Astra | OpenAI's figures as reported by The Next Web (openai.com 403); Vals AI leaderboard page (1 Oct update) | WebFetch summaries, numbers quoted |
| SchrodingerRepo, GPT-5.4-mini | Table I via the verified paper page `reference/papers/schrodingers_code_repository/src/tables.json` | |

Calculator presets: each item count is linked on the page (Real-SWE 10, AIME 30, SWE-Bench Pro V2 HARD 51, Terminal-Bench 4.0 66, Terminal-Bench-Science 70, Terminal-Bench 2.1 89, OSWorld 2.0 108, GPQA Diamond 198, Legal Research Bench validation 200, SWE-Bench Pro V2 private 272, SWE-bench Verified 500, SWE-Bench Pro V2 public 642, HLE 2,500, MMLU 14,042).

## Corrections to the old page (shown on the tab)
- ARC-AGI-3 "62.7% vs 99.9%" pairs max effort (standard) with high effort (adapter); equal-effort pairs are 62.7/98.6 and 54.8/99.9.
- Prime Agent "30% to 95.5% on the same model": different harnesses and game sets; 95.5% is best of three on the public set; the released median run is 95.24%.
- SWE-Bench Pro V2 "about 23%": that sentence is the original 2025 Pro description still printed on Scale's page; V2 top scores are 89.9% to 99.4% (Opus 5 638/642). "47 to 80%" for one benchmark mixed models and versions.
- HLE "tools move it 10 to 20 points": set-specific. 3.3 points for Opus 5.5 and 7.0 for Opus 5 on full HLE in Anthropic's own runs (HLE sources blocklisted); 19.3 to 32.2 points on HLE-Diamond in the maintainers' runs (GPT-6 Astra 59.9% to 82.9%, 22 Sep 2026), from the Knowledge and reasoning child.
- Opus 5's OSWorld 2.0 74.0% is a partial-credit score on the 10 Sep task files with a changed harness; strict is 37.2%; the maintainers' run is 68.3% partial, 31.4% strict.
- Astra for Law: same weights but also legal instructions, on OpenAI's private validation set; Vals AI's own leaderboard has GPT-6 Astra at 39.42% and no Astra for Law entry.
- SchrodingerRepo "6 to 14 points" is the paper's own figure (sections I and VIII); the 14.4 end is on a 300-task leakage-selected subset.
- Real-SWE (not a case here, but read for the preset): the leaderboard now shows GPT-6 Astra 46.25% and Fable 5.1 45.00%, not "Fable 5.1 leads at 38.8%" (dated reading 2026-10-04).

## Not sourced, so not on the page
Opus 5's own launch-day SWE-bench Pro and OSWorld numbers (the July announcement shows charts without values); MathArena's per-model AIME pages (not reachable); which rows of Scale's v1 leaderboard are "grayed out" (not in the page data).
