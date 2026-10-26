# Source of the Agentic benchmarks page

Child of Topic: benchmarks (Notion 3c65c17b0d0d811fb926d7b91ef8234e). Built 2026-10-04; rebuilt 2026-10-24 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing only, no new runs.

## Build and checks
- Data: `uv run --with pyyaml python3 mk_data.py` (writes `parts/22_js_data.js` from `inputs/`); `python3 mk_harness.py` (writes `parts/22_js_hs.js` from `inputs/tb2_same_model_agents_2026-10-05.json`).
- Build: `sh build.sh` (the skill template plus `02_css.html` and `03_css_page.html` after the head). Header minutes are set by hand in `10_header.html` from `html_utils/audit_pages.mjs`.
- Checks: `node checks/check_page.mjs` (every control at 390 dark and 920 light, every closed block opened, 646 actions; dumps the page's computations to `checks/js_out.json`), then `uv run --with scikit-learn --with numpy --with pyyaml python3 recompute.py` (ALL OK on 2026-10-24: 27 of 36 τ² files reproduce, every METR horizon within 0.02%, regex verdicts match Python's `re`), `sh html_utils/checkpage.sh <page>` and `python3 html_utils/ledger.py check <page>` (problems 0). `node checks/shots.mjs light 920` and `dark 390` take element screenshots of every visual. No animation moves before the reader acts (template `21_js_rd_common.js`; the regex-log animation no longer starts on a mode switch).
- `ledger_keys.py` drafted the ledger's keys and labels against the rebuilt page; the labels were then reviewed by hand.

## Shape (2026-10-24)
Tabs: Reading, Further reading (storage key `bench-agentic-tab`). Reading:
- **Top**: the core idea in one sentence; a new static hero (`23_js_rd_hero.js`): one agentic run (task, agent = model + harness + settings, environment, checker, score) with the four numbered places where the same weights get a different number, each with a real number (harness 58.0 to 76.4, pass^1 81.58 against pass^4 51.75, exploit 100% with zero lines, OSWorld 2.0 44.33% binary against 77.67% partial); "You need" with the owners linked; new terms.
- **1 Built and checked**: the real regex-log task in numbers, the three-run animation (unchanged), the checker table; the regex grader moved here from the Grade a real task tab as a closed block.
- **2 pass^k**: τ-bench's 61% against 25%, the animation on real trials, the formula, then the rank-change bars moved inline from the pass^k tab with a predict prompt; the rest of that tab (every run, two runs task by task, plug-in curve, non-reproducing files) is a closed block.
- **3 The harness**: a new strip chart (`24_js_rd_hs.js`): every agent listed for four models on the Terminal-Bench 2.0 board (absorbs "about 18 points across nine agents"); HarnessTax, StateM, effort, budget, who ran it, Vals AI, cost and reruns; the Terminal-Bench 4.0 board chart is a closed block.
- **4 The families**: a new map of every benchmark by what the agent acts on, bordered by state; then Terminal (version timeline), Computer use (new: OSWorld's own Figure 2, CC BY 4.0, showing the gold file as a public URL in the task config), Web, Assistants, Customer service, Tools and MCP, Long tasks (the METR fit and trend charts moved inline from the Time horizon tab, concrete then picture then formula), the system as subject (closed).
- **5 Integrity**: RDI's table, now static with the defence and "fixed?" columns from the old task tab; the seven patterns; incidents in the wild closed.
- **6 Reading a score**: eight questions, each with this page's case (replaces Common mistakes and the Checklist); the one dated table (best readings plus the boards to check, merged from In one screen and Leaderboards) is closed.

Removed: the three lab tabs (each explained one mechanism; their visuals now sit beside the claims), the exploit matrix (repeated the animation), the In one screen table and the Common mistakes section (merged as above).

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 wpm) | 39.5 min | 34.1 min |
| Reading, closed details | 1.1 min | 17.1 min |
| Other tabs, core | pass^k 2.7 + horizon 2.4 + task 5.2 = 10.3 min (+ Further reading 2.4) | Further reading 2.7 min |
| Core total, excluding Further reading | 49.8 min | 34.1 min |
| Visuals drawn in Reading (audit count) | 3 inline, 5 in tabs | 11 inline |

Why 34 minutes is right: the page owns about 30 benchmarks in eight families plus four cross-cutting mechanisms (checker isolation, pass^k, harness dependence, time horizons), and for each benchmark the core keeps only how it is built, how it is checked, what broke and what its score means, with the corrections visible. About a fifth of the core words are figure captions and step captions. Everything not needed on first read (vendor-figure provenance, launch numbers, construction details, the system-as-subject cluster, the full Terminal-Bench 4.0 board, every reproduced τ² run, incidents, the dated table) is closed. A further cut would drop whole families that no other page carries.

## Knowledge ledger (`ledger.json`, problems 0)
345 units: core 248, depth 72, volatile 10 (in the dated table), fat 15 (wind-ups, removed-tab pointers and try-prompts, the exploit matrix intro; each carries a `note`). 335 were drafted by `ledger.py init`; 10 were added by hand (the absorbed 18-points unit, the strip chart's spreads, the OSWorld figure, the Terminal-Bench version facts that were script-only and are now also in a closed block, the static RDI defences, HAL's reruns).

## Inputs (all read 2026-10-04 unless marked)
τ²-bench submissions and trajectory files (MIT; per-task trial vectors only), METR eval-analysis-public v1.1 runs aggregated per agent and task (no licence stated; counts only) and `benchmark_results_1_1.yaml`, Terminal-Bench 2.0 regex-log task files and the 3.0/4.0 task surveys (Apache 2.0), the tbench.ai 4.0 board JSON, text of the RDI post, the Arena HarnessTax post, the Real-SWE page and the TB 4.0 announcement (long dashes replaced with `--` on 2026-10-24), arXiv abstracts; `tb2_same_model_agents_2026-10-05.json` (extracted 2026-10-24 from the agentic-harnesses root's `src/atlas/inputs/r4_scores.json`, read from the board 2026-10-05). Image: `img/osworld_task_config.webp`, credits in `img/CREDITS.md`.

2026-10-26 (final follow-up sweep): OWNERS names this page the owner of MLE-bench, which it never described; one paragraph added at the end of Long tasks and real work (75 Kaggle competitions, 22/38/15 by complexity, Kaggle leaderboards as the human baseline, Any Medal, o1-preview with AIDE 16.9% at release; abstract and paper read 26 Oct 2026) with Repo-To-Skill's budget caveat.
