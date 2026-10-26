# src: Production eval engineering

Build: `sh build.sh` writes `../index.html` (parts in `parts/`, data injected from `inputs/gate_data.json` as `window.PE`).

| File | What it is |
|---|---|
| `live.md` | The old Notion page, verbatim (saved by `save_live.py` from the session transcript, fetched 2026-10-04) |
| `coverage.json`, `mk_coverage.py` | Every old fact and where it is now, or which sibling owns it (55 facts: 37 here, 18 moved) |
| `handoff_statistics.md`, `handoff_human_eval.md` | The old statistics and gold-label sections verbatim, with corrections, for Eval statistics and Human evaluation and annotation |
| `make_data.py` | Builds `inputs/gate_data.json` from LMSYS's released MT-Bench files (URLs in the docstring; raw files not committed). `uv run --with tiktoken python3 make_data.py RAW` |
| `recompute.py`, `recompute.json` | Independent recomputation (scipy t quantiles) of every number the JS shows; `uv run --with scipy python3 recompute.py` |
| `check_core.mjs` | Runs `parts/21_js_common.js` in node and compares with `recompute.json` (51 checks) |
| `check_page.mjs` | Puppeteer: no autoplay (both step controls on step 0 after three seconds on screen), every control at 390 px dark and 920 px light, animation steps in both modes, screenshots to `../.shots/` |
| `shot_figs.mjs` | Screenshots of every Reading figure card at both widths, to `../.shots/fig_*` |
| `ledger.json` | The knowledge ledger (`python3 html_utils/ledger.py check`) |
| `inputs/` | `gate_data.json` (38 KB), 2023 price extracts, `writeups/` (21 team write-ups) and `methods/` (30 primary-source extracts), fetched 2026-10-04, plus `methods/hamel_evals_faq_error_analysis.txt` (fetched 2026-10-24) |
| `viz_ideas.md` | Visual ideas built and rejected |

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md`, rebuilt on 2026-10-24 to `teaching/teaching-contract.md`. One departure kept: the Case file tab of dated team write-ups, because the subject's evidence is mostly practitioner reports rather than papers, and placing them on the promotion path shows which stage caught or missed each problem; it is a dataset view used across the page.

Parts: `10_header` (title, subtitle with the measured reading time, tabs, section nav), `20_read_a` (core sentence, hero, you need, new terms, ownership box, the five-stage table closed), `20_read_b` (1. error analysis), `20_read_c` (2. golden sets), `20_read_d` (3. the swap animation, 4. gates in CI and flaky evals, 5. tools by design with the promptfoo image), `20_read_e` (6. budgets), `20_read_f` (7. online evaluation, 8. shadow, canary, A/B, interleaving), `20_read_g` (9. monitoring and drift, 10. eval-driven development, closed mistakes); `21_js_common.js` (decoding, paired statistics, gate rule, `window.PEC`), `21_js_rd_common.js` (the skill template, `window.RD`), `22_js_gate_anim.js`, `23_js_frontier.js`, `24_js_pe_figs.js` (hero, error-analysis stepper, golden-set anatomy, sampling slider, four designs, drift test); `31_*` Gate designer; `32_*` Case file; `39_tab_more.html`; `99_js_tabs.js` (the skill template, storage key `pee-tab`). Inline numbers written by `22_js_gate_anim.js` into `.pe-v` spans also sit in the static HTML (identical, checked), so the ledger can see them.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence and a static hero of the promotion path (cost, what each stage catches, users exposed, and the loop that promotes later failures into the golden set). The old "In one screen" table is a closed reference block; "You need", "New terms" and one ownership box naming every sibling the page links to.
- **New, owned here and missing before**: section 1, error analysis (open and axial coding, saturation, binary labels, one evaluator per failure mode, the five trace-sampling methods closed), with a seven-step stepper; section 5, the tools compared by design in one dated table (promptfoo, DeepEval, Braintrust, LangSmith, Langfuse, Inspect, OpenAI Evals API) with a real promptfoo web-viewer screenshot (MIT, `img/CREDITS.md`); "Eval drift: when the instrument changes" in section 9.
- **New visuals for mechanisms that had none**: golden-set anatomy (static), online sampling-rate slider (defaults land on the page's own $300 a day derivation), shadow / canary / A/B / interleaving (static, four panels), drift test (static). The swap animation and the frontier slider stayed inline; prediction prompts added before both.
- **No autoplay**: the swap animation never autoplayed; the new stepper uses `RD.anim` from the template; `check_page.mjs` asserts both stay on step 0.
- **Closed**: the leaderboard reproduction, the published-sizes table, the determinism cost figures, experimentation hygiene (Chapelle, Copilot Arena, SRM, CUPED, peeking, Cursor), five mistakes that add something.
- **Deleted as fat** (21 ledger units, each with a note): wind-ups, the "Moved" section (its two summaries are owned by Eval statistics and Human evaluation and annotation, which carry them; the gold-label audit rule stayed here in section 2), mistakes that restated the core.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 25.7 min | 24.0 min |
| Reading, closed details | 1.2 min | 6.1 min |
| Other tabs, core | Gate designer 2.4 + Case file 6.1 + Further reading 2.6 | 2.4 + 6.1 + 2.9 |
| Visuals drawn in Reading | 2 | 9 |

Why 24 minutes is right: the page owns a whole pipeline (ten stages and practices), and the core now also carries three things the old page lacked (error analysis, the tools by design, eval drift) while shrinking by about two minutes, because provenance tables, the leaderboard reproduction, determinism costs and experimentation hygiene moved into closed blocks and the "Moved" section and restating mistakes were cut. Each remaining core section answers one question of the pipeline with its sourced numbers and a visual beside it; a shorter core would drop either the evidence (the GPT-4o and Anthropic incidents that justify online stages) or a stage.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
283 units: core 216, depth 40, fat 21, owned 4 (three by Eval statistics, one by Human evaluation and annotation; each owner's page carries the key), volatile 2 (the OpenAI Evals retirement dates and Anthropic's temperature deprecation, kept in the dated places on this page). 270 drafted by `ledger.py init` from the old page; 13 added by hand for the new content (section "added 2026-10-24").

2026-10-26 (final follow-up sweep): section 8 absorbed the rollout machinery ML system design kept closed: Istio's `mirrorPercentage` (fire and forget), KServe's `canaryTrafficPercent`, Argo Rollouts' analysis steps and `successCondition`, and keying the split by user or tenant. Four ledger units added.
