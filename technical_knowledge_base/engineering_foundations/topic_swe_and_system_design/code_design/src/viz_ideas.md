# Visual ideas built and rejected (Code design)

The page's question: *what makes Python code cheap to read and safe to change, and how do you get there from code that already exists?* The reader has never maintained a large codebase, so the strongest visuals are **real code changed and run**: the backend API page's real handler refactored step by step with its tests and metrics measured at every step, a tangled LLM call measured before and after, and review diffs whose problems were demonstrated by running them. All Reading animations use `RD.anim` (copied from the root via building_a_backend_api).

## Built
| # | Where | Idea | Before / after | Why it earns its place | Data |
|---|---|---|---|---|---|
| B1 | Reading s10 | **Main animation**: the real 52-line `send_message` handler refactored in ten steps; per step the handler code (new lines highlighted), the whole-file diff, 14 to 15 test pills, counters (lines, McCabe complexity, functions, ruff findings) and a bar/dot chart of all steps | ten small steps vs one rewrite (same end state: 4 of 14 tests red, plus one untested behaviour change found by a probe) | Shows the discipline, not just the result: a red test at step 8 caught a real behaviour change (401 vs 422 ordering); step 10 fixed a latent bug (stuck key after a crash, 409 forever) | `refactor/run_steps.py` -> `inputs/refactor_steps.json`; `probe_crash.py`, `probe_untested.py` |
| B2 | Reading s2 | The same handler coloured by concern (auth, rate limit, idempotency, database, model) before and after | 52 interleaved lines vs 17 lines, one per concern | "One level of abstraction" made visible | step0 and step10 handlers; colouring by keyword rules (labelled approximate) |
| B3 | Reading s4 | A tangled LLM call and its functional-core/imperative-shell refactor run through seven situations with a scripted fake server: result, HTTP calls, seconds slept, saved | before (None four times, 3 calls and 7 s twice) vs after (typed exceptions, 1 call) | Turns "don't catch Exception" and "don't return None" into measured consequences | `llmcall/measure.py` -> `inputs/llmcall.json` (also radon, ruff, mypy --strict) |
| B4 | Reading s5 | Ousterhout-style module rectangles for every helper of the refactored service (interface = params, height = body lines) | n/a | Makes deep vs shallow concrete on code the reader has seen; labelled a proxy | counted by `gen_data.py` from `steps/step10.py` |
| B5 | Reading s6 | Bars: ns per object for dict, dataclass, attrs, pydantic (with and without constraints), model_construct, model_validate_json | n/a | Grounds "pydantic at the boundaries" in a number (about 5x a dataclass) and surprises usefully (model_construct slower) | `bench/bench_models.py` -> `inputs/bench_models.json`, Apple M1 Pro |
| B6 | Reading s3 | Layer diagram in HTML (main, api, services, domain/ports; adapters beside) with import arrows | n/a | Dependency direction in one picture, responsive at 390 px | static |
| B7 | Reading s9 | A real package built from the refactored code (`libdemo/`): wheel contents, mypy --strict result, the deprecation shim run with the warning it emits | rename without shim (TypeError, from the Review lab) vs with shim | Packaging and deprecation from a real build, not a description | `libdemo/check_lib.py` -> `inputs/libdemo.json` |
| T1 | Review lab tab | Eleven PRs against the page's code; reveal reviewer comments (blocking, question, nit, praise) anchored to diff lines, the run evidence and the verdict | flagged diff vs the evidence of running it | Review is judgement; practice on diffs with proof trains it faster than rules | `review/proofs.py`, `proofs2.py` -> `inputs/review_proofs.json` |

## Rejected
- A full "Refactor lab" tab separate from the Reading: the animation is the core teaching of section 10, so it stays inline; the full-file diff per step is a collapsible inside it.
- A code-metrics dashboard (maintainability index, Halstead): radon computes them, but they add numbers without teaching; complexity and line counts are shown, with a box on their limits.
- An interactive "is this abstraction worth it?" calculator: any inputs would be invented.
- Real GitHub PR threads for the Review lab: licensing and context make them hard to show self-contained; diffs against this page's own code let every problem be run.
- A type-checker playground: needs a checker in the browser; replaced by real mypy output on real files.

## What the methodology lacked here
Code design has few published numbers to reproduce. The substitute was real artefacts: every metric, test result and failure on the page comes from running the scripts in `src/`, and `recompute.py` and `check_page.mjs` agree on every derived value.

## 2026-10-24 rebuild (teaching contract)
Built: hero (handler lines coloured by concern, before and after, plus helper boxes as Ousterhout modules; from the real step files), layers SVG (replaced the HTML boxes), wrong-abstraction stepper (illustrative code, Metz's sequence), composition toggle (m x 2^k against m + k, derived), agent loop (static), debt quadrant (static, Fowler 2009, cells paraphrased), deprecation timeline (static).
Rejected: a coupling matrix of the service's modules (the hero and layers already show it; a matrix of 12 helpers says little more); Fowler's quadrant image itself (not openly licensed; redrawn with paraphrased cells); photos of any kind (nothing physical to show).

## 2026-11-07 rollout (split layout, renderer v2 stages)
Built, 3D (each from the page's own measured files):
- Fig. 1 `stg-hero`: the real handler as slabs, one per line (length and indentation as in the file, concern colour by the page's keyword rules), before (52 lines) and after (17), then the helpers behind each concern as Ousterhout modules (red interface top, height the lines hidden). Replaces the 2D barcode hero.
- Fig. 2 `stg-deep`: every function of step 10 as a module block (CD.depth), then step 9 against step 10 for the idempotency code (CD.depth9, CD.release_calls). Replaces the 2D depth chart.
- Fig. 3 `stg-dir`: the section 5 service as terraces (api, services, domain plus ports), adapters and the outside world on the floor, import arrows inward, a call flowing out, main.py wiring, fakes at the same ports (the LLM call's real test count). Replaces the 2D layers diagram; the structure is illustrative and labelled so.
- Fig. 4 `stg-fcis`: before.py as one block, after.py as a pure core on a glass plate inside the I/O shell, the call flowing through ports and adapters, and the measured refusal (CD.fcis, CD.llm.scen).
Kept 2D, with step lists where they animate: the wrong-abstraction stepper (code is the content), the refactor animation (code, diffs, counters and a bar chart per commit), the concern toggle (the handler's code), the composition toggle, the benchmark bars, the agent loop, the debt quadrant, the deprecation timeline, the exception tree, tables and the Review lab (a reader-driven tool, full width). None of them has spatial structure that depth would show better.
Rejected: a 3D refactor sequence (the steps are code edits; slabs per commit would hide the diff that is the point); a 3D Review lab (diffs need width); images (nothing physical to show).
