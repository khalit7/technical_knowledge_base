# Source of the Eval harnesses page

`sh build.sh` writes `../index.html` from `parts/`. Shape: topic-page child (`.claude/skills/explainer-page/page-kinds/topic-child.md`), rebuilt on 2026-10-24 to the teaching contract (`teaching/teaching-contract.md`).

## Tabs and parts
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `10_header.html` (title, subtitle, tab bar, nav), `20_read_a` (core sentence, hero, you need, new terms, design table, boundary rule), `20_read_b` (1. request or program: the GSM8K stepper, the Inspect View image), `20_read_c` (2. benchmark to score: shots, chat template, log-likelihood or generation with the MMLU three-way stepper, extraction with the seven-rule chart and closed bench, normalisation), `20_read_d` (3. why scores differ: ten-settings chart, knob table, LLaMA-65B and the rank chart, six cases closed), `20_read_e` (4. what to pin and report; 5. at scale: tokens figure, batching, concurrency, caching; 6. sandboxes), `20_read_f` (7. which harness: tree and the one dated status table; 8. each harness, app-level tools, mistakes, all closed) | JS: `21_js_rd_common.js` (skill template, `RD`), `21_js_rd_tree.js`, `22_js_data.js` (`HX`), `22_js_scale.js` (`HX_SCALE`), `23_js_anim.js` (GSM8K stepper), `24_js_cards.js`, `25_js_hn_0data.js` (`HN_DATA`), `26_js_hn_cases.js` (`HN_CASES`), `27_js_hn_anim.js` (MMLU stepper), `28_js_hn_spread.js` (ten settings, ranks, cases), `29_js_hero.js` (hero and tokens figure), `31_js_same.js` (files, field table, extraction chart and bench) |
| GSM8K in every harness `t-same` | `30_tab_same.html`, `31_js_same.js` | GSM8K as each harness ships it, files side by side, field by field |
| Inside a run log `t-logs` | `32_tab_logs.html`, `33_js_logs.js` | the real lm-eval and Inspect logs, field by field |
| Further reading `t-more` | `39_tab_more.html` | |
`99_js_tabs.js` is the skill template (storage key `kb-eval-harnesses-tab`). The subtitle's minutes are written by hand from `html_utils/audit_pages.mjs` (build.sh's own count is printed for reference only).

## Pipeline
1. `save_inputs.py <clones dir> <web dir>`: copies the exact lines shown from shallow clones of each repository into `inputs/`, with `sources.json` (repo, commit, date, path, lines, permalink). `inputs/versions.json`: PyPI and npm versions checked 4 Oct 2026.
2. `run_harnesses.sh <venv> <out> 10`: Qwen2.5-0.5B-Instruct on the first 10 GSM8K test problems under lm-eval 0.4.13 (`gsm8k` as shipped) and inspect-ai 0.3.276 + inspect_evals 0.23.0 (`gsm8k` as shipped, plus `do_sample=False`, fp32, 512 max tokens). CPU, 2 threads: 132 s and 763 s. Venv: Python 3.12, `lm-eval[hf]==0.4.13 inspect-ai==0.3.276 inspect-evals==0.23.0 torch transformers accelerate`, and for the bench lighteval from commit c2af9e5 installed `--no-deps` with `sympy latex2sympy2_extended==1.0.6`.
3. In that venv: `mk_runs.py <out> data`, `compute_extract.py <out> data/extract.json`, `gsm8k_checks.py data/gsm8k_checks.json`.
4. `python3 mk_data.py` writes `parts/22_js_data.js`; `python3 mk_scale.py` writes `parts/22_js_scale.js` (share of each Inspect prompt in the identical system message; lm-eval contexts all start differently); `python3 recompute.py` checks 62 facts and the page's JavaScript extractors against the harnesses' code.
5. `spread/`: moved from the parent topic's `src/harness/` on 2026-10-24 with the "Same model, many harnesses" content. `spread/recompute.py <mmlu_test.parquet>` writes `parts/25_js_hn_0data.js` (without the parquet the two micro averages come out NaN; the committed part was copied from the parent, generated with it). `spread/repro_mmlu_knobs.py` is the 200-item offline reproduction (see `spread/README.md`). `parts/26_js_hn_cases.js` is the parent's `32_js_harness_cases.js` unchanged.
6. Checks: `node src/check_ui.mjs [shotdir]` from the repo root (every control at 390 dark and 920 light, both steppers still on step 0 after three seconds on screen, the cases and the bench) and `sh html_utils/checkpage.sh`; `python3 html_utils/ledger.py check`.

`live.md` is the old Notion page (fetched 22 Sep 2026); `coverage.json` maps its facts (older format, kept); `ledger.json` is the current knowledge ledger.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (a score is the output of a chain of harness decisions) and a static hero drawing that chain with the measured effect of each link (`29_js_hero.js`); You need and New terms. The old "In one screen" table kept its design columns; versions and status moved to one compact dated table in section 7.
- **Absorbed from the parent root** (its tab "Same model, many harnesses", which OWNERS now gives to this page): the MMLU item read three ways (stepper, now in section 2 beside the log-likelihood claim), the ten-settings reproduction (redrawn as an SVG chart plus a static knob table, section 3), LLaMA-65B and the eight-model rank chart (section 3), the six published cases (closed block), the knob rows (merged into sections 2 and 4) and the status notes (section 7). Data and generator copied into `spread/`.
- **Moved inline**: the extraction bench left the tab; its totals are now an SVG chart beside the extraction rules, the per-output picker and live box a closed block. The tab "One task, every harness" became "GSM8K in every harness" (files and field table only).
- **New**: section 5, running evals at scale (tokens per problem figure from the page's own runs, derived full-test token counts with the formula, lm-eval batching and request grouping quoted from `huggingface.py`, Inspect adaptive concurrency, retries and caching from its docs, `--limit`), and the measured fact that lm-eval's GSM8K draws a different five shots per problem while inspect_evals' system message is identical (87% to 92% of the prompt), which decides prefix-cache reuse. One real image: Inspect View's Messages tab (MIT, `img/CREDITS.md`).
- **No autoplay**: both steppers start paused (`23_js_anim.js`, `27_js_hn_anim.js`); `check_ui.mjs` asserts it.
- **Closed**: each harness's architecture, gotchas and contribution path, app-level tool details, the sandbox environment list, the enclave note, the advice table and the mistakes.
- **Deleted as fat** (21 ledger units, each with a note): wind-ups, pointers to the parent tab whose content now lives here, restatements of the boundary rule and of section 1.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 22.6 min | 22.1 min |
| Reading, closed details | 1.0 min | 12.4 min |
| Other tabs, core | One task 7.1 + logs 3.2 = 10.3 min | GSM8K 4.7 + logs 3.2 = 7.9 min |
| Visuals drawn in Reading (svg, canvas, img) | 0 | 6 |

Why 22 minutes is right: the core now carries the parent's measured spreads (about 5 minutes of content that used to sit one click away on the root) and a new section on running at scale, and still came out half a minute shorter, because per-harness descriptions, contribution paths and the mistakes list (which restated the core) went into closed blocks. Every remaining core section answers one of the questions this page owns (how a benchmark becomes a score, why scores differ, what to report, what it costs), each with its number and a visual; a shorter core would lose either the measured effect sizes or the reporting checklist.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
260 units: core 152, depth 83, fat 21, volatile 4. 219 drafted from the old page by `ledger.py init`; 31 record what was absorbed from the parent's tab (section "absorbed ..."); 10 record the new scale and shot facts.

## Departures
- The tabs show real files and real logs (not score comparisons); the score comparisons are now Reading section 3.
- The extraction chart and the knob table are drawn from data; their key numbers are written statically in captions and tables so the ledger check can see them.
