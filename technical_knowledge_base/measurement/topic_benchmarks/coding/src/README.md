# Coding benchmarks: page source

`sh build.sh` writes `../index.html`. When inputs change: `python3 recompute.py && python3 mk_data.py && sh build.sh`, then `node check_page.mjs` (every control in both themes and widths; the page's numbers against `recompute_out.json`) and `python3 mk_coverage.py`.

Shape: Part B of `html_utils/methods/topic_pages.md` (a child page). Reading tab (about 27 minutes) follows the field's own order: one-screen table; function-level (HumanEval, MBPP, pass@k and its estimator); weak tests (EvalPlus, BigCodeBench); contest problems (LiveCodeBench, LiveCodeBench Pro, Codeforces, ICPC); SWE-bench, Lite, Verified, Multimodal; SWE-bench's flaws; SWE-bench Pro v1 and V2; three answers to contamination (calendar: SWE-rebench, SWE-bench-Live; licensing: Real-SWE; transformation: SchrodingerRepo); Aider Polyglot, DeepSWE, Phi-Bench; what to use; mistakes. Statuses, saturation series and same-model readings are linked to the parent's tabs, not rebuilt.

## Data (all read 2026-10-04; large downloads kept outside the repo, reduced by `mk_inputs.py`)
- `inputs/lcb_compact.json`: LiveCodeBench board, per-problem correct counts for 28 models on 1,055 problems (from performances_generation.json).
- `inputs/humaneval31.json`: HumanEval/31 prompt, tests, and HumanEval+ v0.1.10 base and plus inputs. The three Codex samples are from the Codex paper, Appendix B (indentation restored), run in `recompute.py` with a 1 s per-input limit (this page's rule).
- `inputs/swe_django_11099.json`: the full SWE-bench Verified row (HF datasets-server) plus Django's validator tests at the base commit. `inputs/verified_stats.json`: counts over all 500 rows and the verbatim-leak rule.
- `inputs/rebench_split.json`: SWE-rebench rates before and after each model's release, from the board's embedded data.
- `inputs/realswe_page_2026-10-04.txt`: text of the Real-SWE page (per-task passes out of 8).

## Files
`parts/20_read_a..d.html` Reading; `23_js_math.js` (pass@k, binomial expectations), `24_js_rd_pk.js` (estimator animation), `25_js_rd_he.js` (HumanEval vs HumanEval+ animation), `26_js_rd_misc.js` (LCB split, Verified stats, SWE-rebench split, Real-SWE drop-a-task grid, SchrodingerRepo bars); `30_*` pass@k lab, `31_*` LiveCodeBench by date, `32_*` One SWE-bench task, `39_tab_more.html`; `22_js_data.js` generated. `21_js_rd_common.js`, `05z_errbox.js.html`, `01_head.html` copied from the parent.

## Coverage
`coverage.json` (from `mk_coverage.py`): the 56 coding facts the Math builder assigned to this page in `../../math/src/coverage_math_and_coding.json`, 56 verified in the built page, 19 with corrections.

## Departures and notes
- Verified's status: an independent run (Vals AI, 1 Sep 2026) has Claude Opus 5 at 97.0%; the parent atlas still cites Epoch AI's 83.5% (April 2026). The parent atlas row could be updated.
- OpenAI's Verified post refused automated reading; the "more than two thirds filtered" share is from secondary summaries and is labelled so.
