# Benchmark grid: sources, gaps and conflicts (read 2026-10-01)

`bench_grid.json` is the collection; `../mk_bench.py` inlines it into `parts/32_js_bench.js`. Rows are the 42 rows of the Capability vs price tab (`iq_data.json`, AA Intelligence Index v4.3), joined to `aa_snapshot.json` by order and checked on the index value.

## Benchmarks (13) and coverage

| Benchmark | Version | Run by | Filled | Independent | Lab-only |
|---|---|---|---|---|---|
| GDPval-AA | v2.1 | Artificial Analysis | 42/42 | 42 | 0 |
| AA-Briefcase | v1.1 | Artificial Analysis | 42/42 | 42 | 0 |
| AutomationBench-AA | AA run, index v4.3 | Artificial Analysis | 42/42 | 42 | 0 |
| Terminal-Bench 4.0 | 4.0 | Artificial Analysis | 42/42 | 42 | 0 |
| DeepSWE | v1.1, mini-swe-agent | Datacurve leaderboard | 20/42 | 12 | 8 |
| Terminal-Bench-Science | 0.1 | Artificial Analysis (outside the index) | 26/42 | 25 | 1 |
| Humanity's Last Exam | AA run | Artificial Analysis | 42/42 | 42 | 0 |
| CritPt | AA run | Artificial Analysis | 42/42 | 42 | 0 |
| FrontierMath Tiers 1-3 | v2 private | Epoch AI | 21/42 | 21 | 0 |
| ARC-AGI-2 | semi-private | ARC Prize Foundation | 21/42 | 21 | 0 |
| AA-Omniscience | AA run (index, -100 to 100) | Artificial Analysis | 42/42 | 42 | 0 |
| AA-LCR | v1.1 | Artificial Analysis | 42/42 | 42 | 0 |
| LMArena Text | style control, votes to 2026-09-30 | LMArena | 32/42 | 32 | 0 |

Total 456 of 546 cells: 447 independent, 9 lab-reported only.

Left out on purpose: SciCode and GDP.pdf (the other two AA index components; low spread, kept the grid at 13), ARC-AGI-3 (only OpenAI, Gemini 3.8 Flash, Opus 5 and Grok 4.6 runs, and its "provider adapter" variants differ by up to 0.9 on a 0--1 scale), SWE-bench Verified (Epoch's own runs stop at GLM-5.2 and DeepSeek V4 Pro), MMMU-Pro, Harvey LAB-AA, ITBench-AA and other AA evaluations outside the index (partial coverage).

## Sources and how they were read
- **Artificial Analysis**: per-evaluation scores from the page data embedded in `https://artificialanalysis.ai/models/<slug>` (`intelligenceIndexEvaluations`, plus `terminalBenchScience`, `omniscienceAccuracy`, `omniscienceHallucinationRate`, `briefcaseBreakdown`). One model page carries all 689 models; values were cross-checked against the Gemini 4 Argon page (identical). Percent scores stored to 0.1 points, Elo rounded to the integer.
- **ARC Prize**: `https://arcprize.org/media/data/leaderboard/v2.json` (generated 2026-10-01T18:51Z), dataset `v2_Semi_Private`, matched by effort.
- **Epoch AI**: `https://epoch.ai/data/benchmark_data.zip`, file `frontiermath_tiers_1_3_v2.csv` (Epoch's own runs; CC BY). Also used for the FrontierCode cross-check (`frontiercode_external.csv`, from Cognition's leaderboard).
- **Datacurve DeepSWE**: `https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json` (generated 2026-09-22, latest job GPT-6 Astra, 113 tasks, pass@1 over 4 runs).
- **LMArena**: page data of `https://lmarena.ai/leaderboard/text` (overall, style control on, vote cutoff 2026-09-30T14:00Z, 410 models).
- **Lab figures**: the previous tab's vendor tables (Anthropic Opus 5.5 system card, Anthropic Fable 5.1 post, Unite.AI for Sonnet 5.5, OpenAI Astra page, VentureBeat for GPT-6 Sol/Luna, MarkTechPost for Grok 4.7, ComputingForGeeks for MiMo, Pandaily for StepFun) and Google's Gemini 4 Argon table, which is an image (`gemini-4-argon_table_blog.gif` on blog.google), transcribed by eye and cross-checked against emergent.sh's transcription.

## Configuration matching
Each independent entry is matched to the row's effort. Where the tester ran a different effort or checkpoint the entry carries `cfgdiff` (asterisk in the grid): LMArena Opus 5.5 (high, row max), GPT-5.6 Terra and Sol (xhigh, row max), DeepSeek V4 Pro (0813 at high, row max), Qwen3.8 Max (undated "qwen3.8-max"), Haiku 4.5 (no thinking setting); ARC-AGI-2 Haiku 4.5 (32K thinking budget shown; AA's budget unstated) and GLM-5.2 (no effort listed); FrontierMath Qwen3.8 Max 0902 (xhigh; AA lists none); DeepSWE Gemini 3.1 Pro Preview (high).

Not matched, so left empty rather than spliced: DeepSWE "qwen3-8-max" (Epoch's hub maps it to the 0802 checkpoint, not 0902) and "deepseek-v4-pro" (checkpoint unstated); ARC-AGI-2 and FrontierMath "DeepSeek V4 Flash 0731" (a different model from V4.1 Flash); LMArena "claude-sonnet-5-high" (Sonnet 5, not 5.5) and "muse-spark-1.2 (xHigh)" (not 1.3).

## Conflicts kept in the data (independent shown, lab in the detail)
- Terminal-Bench 4.0: Opus 5.5 AA 59.6 vs Anthropic 66.4 (Google's table also 66.4); Sonnet 5.5 AA 63.6 vs Anthropic 70.6; Fable 5.1 AA 52.0 vs Anthropic 55.8 vs Google 57.9; Opus 5 AA 49.0 vs Anthropic 52.3; GPT-6 Astra AA 59.1 vs OpenAI 57.9 vs Google 58.2 (the one case where the lab is lower); Gemini 4 Argon AA 57.1 vs Google 57.4; Grok 4.7 AA 25.8 vs xAI 38.0 (and 33% measured by AA inside Grok Build, per MarkTechPost).
- Humanity's Last Exam: Opus 5.5 AA 61.4 vs Anthropic 67.7; Opus 5 AA 54.9 vs 63.6; Astra AA 54.7 vs 57.2 (Anthropic's table, values assigned by sentence order).
- Terminal-Bench-Science 0.1: Opus 5.5 AA 59.0 vs Anthropic 58.7 vs Google 63.3; Astra AA 63.3 vs Anthropic 64.6 vs Google 68.1; Opus 5 AA 28.6 vs Anthropic 29.0; Fable 5.1 AA 43.3 vs Anthropic and Google 52.6.
- DeepSWE v1.1: Google's 74.1% for Astra is the leaderboard's xhigh run; the max-effort run (the row's effort) is 73.2%.
- GDPval-AA and AA-Briefcase: the labs' figures (Anthropic 1846/1708/1542, xAI 1695 and 1657) are AA's own ratings quoted, and match.
- AutomationBench: the labs' percentages (Opus 5.5 40.0 Anthropic / 42.5 Google, Astra 41.4, Fable 5.1 31.4, Argon 51.3) are AutomationBench's own score, not AA's partial-credit score; kept with `cmp: false`, shown only in the detail. Anthropic and Google disagree on Opus 5.5.
- FrontierCode v1.1 (not a column): Anthropic's table gives Opus 5 48.0 where Cognition's leaderboard gives 53.4; Opus 5.5 54.4 vs 54.6; Astra 53.3 both; Sonnet 5.5 46.2 vs 52.1.

## Gaps (no independent figure and no lab figure found)
- DeepSWE: Sonnet 5.5, GPT-6.1 Sol, Haiku 4.5, gpt-oss-120b, Muse Spark 1.3 (both), Muse Glimmer, DeepSeek V4.1 Flash and V4 Pro 0813, all four Qwen rows, MiniMax-M3, the three Mistral rows, MiMo-V2.6-Flash, Hy3. Lab-only cells: Opus 5.5 74.2 and Fable 5.1 67.4 (Google's table), Argon 77.9 (Google), GPT-6 Sol 68.8 and Luna 66.6 (OpenAI via VentureBeat), Grok 4.7 71.0 (xAI, high effort), Step 5 Preview 67.7 (StepFun), MiMo-V2.6-Pro 72.6 (Xiaomi, printed as points).
- ARC-AGI-2: no ARC Prize run, and no lab figure found, for Sonnet 5.5, Gemini 4 Argon, Grok 4.7, Muse Spark 1.3, Muse Glimmer, DeepSeek V4.1 Flash, Qwen3.8 Max, 2.4T and Flash-Next, GLM-5.3, MiniMax-M3, Mistral, MiMo, Step 5, Hy3, gpt-oss-120b.
- FrontierMath: no Epoch run for Gemini 4 Argon, Grok 4.7 and 4.6 high (only xhigh, so not used), DeepSeek V4.1 Flash, open small models, MiMo, Step, MiniMax, Mistral, Hy3.
- LMArena: no entry for Sonnet 5.5, GPT-6.1 Sol, Qwen3.8 2.4T and Flash-Next, Mistral Small 4, Step 5 Preview; no separate entries for the extra effort rows.
- Terminal-Bench-Science: AA has no run for 16 rows (Haiku 4.5, gpt-oss-120b, Gemini 3.7 Flash, 3.1 Pro, Muse xhigh, Glimmer, Grok 4.7, Qwen 2.4T and Flash-Next, Kimi K3, GLM-5.2, three Mistral rows, MiMo-V2.6-Flash, Hy3); only Argon has a lab figure (Google 57.6).
- AA-Briefcase shows 0 for gpt-oss-120b (rubric pass rate 2.3%), which looks like the floor of the scale.

## Dropped from the previous tab
MiMo-V2.5 (not a current row; Xiaomi's 58.4 on DeepSWE v1.1) and the vendor AutomationBench column as a column (now detail only).
