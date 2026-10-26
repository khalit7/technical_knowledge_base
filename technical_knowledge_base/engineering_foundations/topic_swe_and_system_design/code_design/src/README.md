# Code design: source

`sh build.sh` writes `../index.html` from `parts/` (same build as the root and building_a_backend_api: `{{text|url}}` links, one `<script>` per JS part, tab wiring last).

## Files
- `parts/`: `01_head.html` (the root's CSS), `10_header.html`, `20_read_a.html` to `20_read_h.html` (Reading: the idea in one screen, sections 1 to 13, closed Depth block), `32_tab_review.html` (Review lab), `39_tab_more.html` (Further reading); JS: `21_js_rd_common.js` (the explainer-page skill template: never autoplays), `30_js_data.js` (generated), `40_js_read.js` (numbers, code views, concern colouring, LLM-call comparison, depth chart, benchmark bars), `41_js_refactor.js` (the step animation; no longer plays on a mode switch), `42_js_figs.js` (hero, layers, composition, wrong-abstraction stepper, agent loop, debt quadrant, deprecation timeline), `52_js_review.js` (Review lab), `99_js_tabs.js` (template, key `cd-tab`).
- `refactor/`: `steps/step0.py` is building_a_backend_api's `service/app.py`; `make_steps.py` derives `step1.py` to `step10.py` by exact text edits (each must match), `make_bigbang.py` the one-shot rewrite; `tests/test_send_message.py` the characterization tests (module chosen by `STEP`); `run_steps.py` runs tests, radon and ruff on every step; `probe_crash.py` and `probe_untested.py` the two probes.
- `llmcall/`: `before.py` (tangled, written for the page), `after.py` (core, ports, adapters, shell), `test_after.py`, `measure.py`.
- `bench/bench_models.py`: dataclass vs attrs vs pydantic construction cost.
- `libdemo/`: the `chatsummary` package built from `after.py`, with `check_lib.py`.
- `review/proofs.py` then `proofs2.py` (in that order; the second appends): run each flagged Review lab diff.
- `gen_data.py`: builds `parts/30_js_data.js` from `inputs/*.json`. `recompute.py`: every derived number in Python (since 2026-10-24 also the hero's hidden lines per concern, the 5 idempotency runs, claim_key's 15 lines and 3 parameters, the composition counts); `check_page.mjs` (run from the repo root) clicks every control at 390 px dark with reduced motion and 920 px light with normal motion, checks that neither animation moves before the reader acts, compares with recompute.py and saves element shots to `../.shots/`.
- `inputs/facts_checked.json`: the fact check of every sourced claim (quotes, URLs, dates). `coverage.json`: every fact of `live.md` and where it went. `live.md`: copy of building_a_backend_api's `handoff_code_design.md` (the verbatim code-design half of the old "API and Code Design" page, plus that builder's notes).

## Re-running (all from the folder named, with uv; about 2 minutes in total)
`refactor/`: `python3 make_steps.py; python3 make_bigbang.py; uv run --no-project --python 3.12 --with fastapi --with httpx --with pytest --with radon --with ruff python run_steps.py` and the two probes with `--with fastapi --with httpx`. `llmcall/`: `uv run --no-project --python 3.12 --with pydantic --with httpx --with pytest --with radon --with ruff --with mypy python measure.py`. `bench/`: `--with pydantic --with attrs python bench_models.py`. `libdemo/`: `--with pydantic --with httpx --with build --with mypy python check_lib.py`. `review/`: `--with fastapi --with httpx --with pydantic --with pytest python proofs.py`, then `--with mypy` added for `proofs2.py`. Then `python3 gen_data.py; sh build.sh`.

## The 2026-10-24 rebuild to the teaching contract
**What changed and why.**
- **Top**: the core sentence (keep the next change cheap and safe), a hero computed from the real handler (each line of `send_message` before and after the refactor coloured by concern, and the helpers each concern moved into drawn as Ousterhout modules), "You need" with the owners of neighbouring concepts, and new terms. The one-screen list and the glossary were removed: the hero, core sentence and terms carry them.
- **New owned sections** (brief and OWNERS.md row for this page): 1 cohesion and coupling (Stevens, Myers and Constantine 1974); 6 composition over inheritance (GoF) with a toggle (classes needed: m x 2^k against m + k) and patterns in their Python form (Norvig 1996, "16 of 23"); 10 code an LLM agent can change safely (Claude Code best practices, read 2026-10-24; the agent loop with this page's own checks); 11 technical debt as a decision (Cunningham 1992, Fowler's quadrant 2009, both read 2026-10-24).
- **Regrouped**: abstraction economics split into 3 deep modules and information hiding and 4 when to abstract (new wrong-abstraction stepper, illustrative code, Metz's sequence); structure, Protocols, dependency injection and validated boundaries merged into 5; the old types and tooling sections moved into closed Depth blocks because typing mechanics and the toolchain are the Python page's; the AI section became section 10 with the METR and DORA evidence closed.
- **Visuals inline beside each core idea**: hero, layers diagram (now SVG), depth chart, wrong-abstraction stepper, composition toggle, LLM-call before/after card, exception tree, refactor animation, agent loop, debt quadrant, deprecation timeline, benchmark bars. The long code listings (the 52-line handler, the per-step handler) moved into closed blocks under their figures.
- **No autoplay**: template `21_js_rd_common.js`; the refactor animation no longer plays on a mode switch; `check_page.mjs` waits 4 s on each animation in view and expects step 0.
- **Deleted as fat**: the one-screen list, the common-mistakes list (each item restated a section), the glossary, wind-ups and restatements (57 ledger units, each with a note).
- **Images**: none. The page teaches code structure; a diagram is the right tool and no photo would teach more.

**Length judgement.**
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 wpm, `audit_pages.mjs`) | 48.8 min (11,235 words) | 36.8 min (8,470 words) |
| Reading, closed details | 6.0 min | 17.3 min |
| Review lab, core | 1.2 min | 1.2 min |
| Further reading | 2.7 min | 3.2 min |
| Visuals drawn in Reading (audit count, SVG only) | 2 | 8 (plus 3 HTML figures: concern card, LLM card, benchmark bars) |

Why 37 minutes is right: the page owns thirteen design ideas, four of them new (cohesion and coupling, composition and patterns, agent-changeable code, technical debt), and each keeps its number, picture and source; the ledger's core units are needed to understand one of them. About a tenth of the core words are code inside figures. What made the old page long (tool and checker tables, packaging, the mistakes list, the glossary, evidence on AI speed, full code listings) is closed or deleted.

**Ledger** (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0): 461 units: core 339, depth 65, fat 57. 443 drafted by `ledger.py init`, keys picked by a longest-phrase matcher and the 36 unmatched reviewed by hand; 18 added for the new sections and script-rendered figures (keys written into static captions).

## Departures from the child-page method
- One standalone tab only (Review lab): it is practice across sections 3 to 13, not the explanation of one mechanism; every animation is inline.
- Illustrative code is labelled: `before.py`, the rewrite and the review diffs were written for the page; everything shown about them (tests, metrics, failures, timings) was measured.

2026-10-26 (final follow-up sweep): the type-checking block's checker version table moved to Python (Part 2 section 4 now carries pyrefly and the strict settings beside its measured comparison); one sentence links it (ledger units 163 and 164 `owned:`). The tooling table, the real pyproject and pre-commit configuration, PEP 561 in the library example and the measured `model_construct` result stay here: they are this page's worked example and its own benchmark.
