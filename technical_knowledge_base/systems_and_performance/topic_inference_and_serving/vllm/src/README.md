# vLLM: inside the default engine, sources and how to rebuild

Child page of Topic: inference-and-serving. Everything is pinned to vLLM **v0.31.0** (2026-10-05, commit
db9527a46873454610df6dbedf79a36d6bf1a7f6), the same tree the parent's Serving simulator was checked against.
Ids and classes use the `vl-` prefix.

## Tabs (rebuilt 2026-10-23 to the teaching contract)
- **Reading** (`parts/20_read_a.html` to `20_read_k.html`; JS `21_js_rd_common.js` (the skill template: autoplay on view since 2026-11-12), `22_js_vl_path.js`,
  `23_js_vl_mr.js`, `24_js_vl_hash.js`, `25_js_s3.js` (the 3D renderer, a skill template), `25_js_vl_fill.js`, `29_js_vl_pr.js`, `31_js_step_1ui.js`
  (the stepper, data `200_js_vl_stepdata.js`), `32_js_knob.js` (the measured runs, data `201_js_vl_knobdata.js`), `40_js_sc_00data.js` (scene data
  from the recordings), `41_js_sc_hero.js`, `42_js_sc_step.js`, `43_js_sc_fq.js` (the three stages)): the idea in one screen (core sentence, Fig. 1,
  you need, new terms, closed provenance); 1 the request path (step animation) and sync against async scheduling (before/after); 2 the scheduler
  loop (Fig. 2); 3 the KV cache manager (Fig. 3), hash chains, then the recorded scheduler stepper (prefix caching off against on on the same
  arrivals, tight memory, big budget); 4 the model runners with the V1 against V2 toggle; 5 the knobs (with multi-LoRA) and the three measured
  sweeps; 6 the metrics with the 1-second time series and, closed, every exported metric; 7 upgrades (checklist open, release table closed);
  8 the eviction-metric patch, live; a closed interview rehearsal.
- **Further reading** (`39_tab_more.html`).

## Evidence and scripts
| Path | What |
|---|---|
| `stepper/record.py` | Runs inside `vllm/vllm-openai-cpu:v0.31.0-arm64`: the real engine (engine core in-process), `Scheduler.schedule` and `update_from_output` wrapped only to copy out the block pool, free queue and request state each step. |
| `stepper/run_trace.sh` | One container per scenario (`INF_DIR`, `VL_WORK` point at scratch folders; never in the repo). |
| `stepper/inputs/trace_*.json` | The raw recordings (pc_off, pc_on, nochunk, tight runs). |
| `stepper/build_trace.py` | Derives each step's events by diffing vLLM's own state, checks invariants (ref counts equal block-table holders; tokens within budget), writes the stepper data. |
| `knob/one.sh`, `knob/scrape.py`, `knob/session.sh` | One server run: start, wait for health, /metrics before and after, a scrape per second, the parent's `src/bench/scripts/loadgen.py`, stop; the session runs every configuration under the shared bench lock. |
| `knob/build_knob.py`, `knob/results/` | Compact results (summaries, scrapes, metric lists, process list, start-up lines with paths removed) and the Knob lab data. |
| `patch/apply_patch.py`, `patch/eviction_metric.diff` | The example contribution: a `vllm:prefix_cache_evicted_blocks` counter and its unit test. |
| `patch/tests_docker.sh`, `patch/tests_*.txt` | vLLM's own tests in the image: baseline 373 passed with the new test failing (AttributeError); patched 374 passed. |
| `inputs/release_v0.2*.md`, `inputs/pr_51726.txt` | Release-note highlights and the PR behind the batch-token correction, fetched 2026-10-08. |
| `check_ui.mjs`, `shots.mjs`, `check_data.py` | Puppeteer check: the two 2D animations play once in view and the recorded stepper does not (inverted 2026-11-12 from the old never-autoplay check), then every control and every stepper step (390 dark, 920 light); element screenshots; the page embeds exactly the built data and prose numbers match it (including the stepper and time-series lines written as static text). |
| `check_stages.mjs` | The 2026-11-06 rollout checks: the three stages and the two 2D animations play once in view, step to the end with one list item per step, stop off screen and under reduced motion; the stepper widget stays put; 13 two-column splits at 1400 px; scene labels do not collide at 1400 px; every number in the three step lists recomputed from `VL_STEP` and the free-queue model (whose queues must equal test_evict's assertions). |
| `coverage.md` | Every claim of the old page: verified, corrected, unconfirmed or moved. |
| `viz_ideas.md` | Visuals built and rejected. |
| `ledger.json` | The knowledge ledger of the 2026-10-23 rebuild (`python3 html_utils/ledger.py check`: problems 0). |

Rebuild: `python3 -I stepper/build_trace.py`, `python3 -I knob/build_knob.py <raw knob dir>`, `sh build.sh`,
`python3 -I check_data.py`, `node check_ui.mjs <shots dir>`, `node check_stages.mjs [shots dir]`, and from the repo root
`sh html_utils/checkpage.sh technical_knowledge_base/systems_and_performance/topic_inference_and_serving/vllm`.

## Departures from the method
No `src/live.md`: the old page is already saved verbatim by the root (`../src/read/old/vllm.md`) and `coverage.md` maps it.
The stepper records the real engine rather than reusing the root's harness with a fake model runner, because a real model
gives real text in every block and a real chat template (which exposed the Qwen3 multi-turn cache miss).

## The 2026-10-23 rebuild: what changed and why
- **Top**: the core idea in one sentence and a new static hero (processes, the loop, the scheduler, the block pool, the GPU worker,
  with each knob drawn where it acts); "You need" links the owners of the mechanisms (Batching, KV cache and scheduling for
  continuous batching, paged attention and prefix caching as ideas; Long context's `#t-kv` for KV sizing); six new terms. The old
  "five sentences" box became the hero's numbered caption. Provenance (the CPU image, MD5 check, not-run list, the four Docker
  traps) and the project's history are closed blocks.
- **Lab tabs moved inline**: the Scheduler stepper is the end of section 3 (it shows the scheduler and the pool together), the
  Knob lab's sweeps sit beside the knob table (headline charts open, the other measures closed), the metrics time series in
  section 6, every exported metric closed in section 6, the live patched metric in section 8. Both tabs are gone.
- **New visuals for mechanisms that had none**: the free queue as the eviction policy (static annotated), V1 against V2 runner
  rows on the same event (toggle; V1's row moves verified in `gpu_input_batch.py` and `gpu_model_runner.py` at v0.31.0).
- **Absorbed from PEFT**: the vLLM multi-LoRA knobs (`max_loras` 1, `max_lora_rank` 16, `max_cpu_loras` defaulting to
  `max_loras`, read in `vllm/config/lora.py` at v0.31.0; the scheduler's max_loras skip at `scheduler.py` L911 to L922; buffers
  preallocated per `max_loras` x `max_lora_rank` in `lora/layers/base_linear.py`). They fit here rather than on LLM serving in
  production, because this page owns vLLM configuration; that page keeps why multi-LoRA batching works and its measurements, and
  the row links to its section 4.
- **No autoplay**: the template `21_js_rd_common.js` replaces the page's copy (which played each animation once on first view);
  the async card no longer plays on a mode switch; `99_js_tabs.js` is the template (key `vl-tab`, opens a tab named in the URL).
- **Closed or cut**: release table v0.28 to v0.32 closed (volatile, dated); V1 fallback list, the five-row V1/V2 table, four
  minor knobs, the diff and the contributing guide closed. Cut as fat: the Common mistakes table (every row restated a section;
  its two new facts, CPU offload as a connector tier and two servers' utilisation summing below 1, moved into sections 2 and 5),
  five of eight interview answers, wind-ups, the Reading summary line that repeated the Knob lab notes, the tab bar entries.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 35.6 min | 33.9 min |
| Reading, closed details | 2.1 min | 14.7 min |
| Other tabs, core (stepper 2.6, Knob lab 7.9) | 10.5 min | 0 (moved inline) |
| Core total, excluding Further reading | 46.1 min | 33.9 min |
| Visuals drawn in Reading (svg, audit count) | 1 | 8 (plus the HTML-built stepper, request path and hash chains) |

Why about 34 minutes is right: the page teaches one real system end to end, and the core still carries what an engineer needs
to operate and read it: the request path and process count, the scheduler's admission and preemption rules, the block pool's
four operations and hash chain, the runner, eight knobs with their defaults at v0.31.0 and three measured trades, the metrics'
diagnostic table, and an upgrade checklist. About a fifth of the core words are now the stepper's, the knob sweeps' and the hash
cards' captions and data (each block's real text is shown), which were a click away before. What made the page long without
teaching (mistakes that restated sections, interview answers, release chronicle, provenance) is cut or closed.

## Knowledge ledger (`ledger.json`)
330 units: core 245, depth 53, fat 28, volatile 4 (the release table and the old page's release notes, kept closed here until
the tech-news pass). 310 drafted by `ledger.py init` from the old page; 20 added by hand for script-rendered visuals (stepper
summary, knob sweeps, time series, every-metric table, the live patched metric) and the new units (core idea, hero, free queue,
V1/V2 toggle, multi-LoRA knobs). Fat units carry a `note`. No unit is `owned:`: every mechanism unit here is about vLLM's own
code, and the generic concepts were already linked rather than taught.

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js`,
`21_js_rd_common.js` (autoplay on view; replaces the never-autoplay copy), `99_js_tabs.js` (key `vl-tab`). The page's `#t-read .an-ctl` rules skip
`.stg-bar`; `build.sh` writes the em-dash detector's character as bytes. Removed: `23_js_vl_hero.js` (the static hero) and `23_js_vl_fq.js` (the
static free-queue diagram), both replaced by stages.

**No new runs.** The stages draw from what the page already embeds: `40_js_sc_00data.js` derives `window.VLS` from the recordings in
`VL_STEP` (Fig. 1: customer C in the prefix-caching-on run, admitted in step 4 with 64 of its 104 tokens cached in blocks 1 and 2, 42 of the
64-token budget used, finished in step 24; Fig. 2: step 4 of the prefix-caching-off run, A 1, B 24 and C 39 tokens, blocks 8, 9 and 10).
Fig. 3 (`43_js_sc_fq.js`) is a small exact model of the four operations as section 3 states them; its queues after the two frees equal the
assertions of vLLM's `test_evict`, and its last two steps (a hit, an eviction) are labelled illustrative. `check_stages.mjs` recomputes every
number in the three step lists.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | Top: core idea | split | **3D** `stg-hero` (Fig. 1): one request through vLLM, recorded counts, schematic layout | yes, 7 |
| Reading | You need, terms, provenance (closed) | full width | none | no |
| Reading | 1 Request path | split | 2D animation: lanes of functions | yes, 12 |
| Reading | 1 Consequences, predict | full width | none | no |
| Reading | 1 Async scheduling | split | 2D animation, two modes, 4 steps each | yes, 4 + 4 |
| Reading | 2 Scheduler loop | split | **3D** `stg-step` (Fig. 2): one recorded engine step | yes, 6 |
| Reading | 2 Preemption, admission rules, predicts, cost | full width | none | no |
| Reading | 3 Classes, operations | split | **3D** `stg-fq` (Fig. 3): the free queue in test_evict | yes, 7 |
| Reading | 3 Hash chain | split | 2D real block hashes (toggle) | no |
| Reading | 3 Two details, cost | full width | none | no |
| Reading | 3 Recorded engine | split | 2D widget (48 to 121 steps; opens on A2's admission or the first preemption, never plays by itself) | no (live caption on the left) |
| Reading | 4 Model runner | split | 2D toggle, V1 against V2 rows | no |
| Reading | 4 Fallbacks, CUDA graphs | full width | none | no |
| Reading | 5 Knob tables, per-hardware defaults | full width | tables | no |
| Reading | 5 Three sweeps | 3 splits | 2D bar charts, measured | no |
| Reading | 6 Metrics | split | 2D time series, measured | no |
| Reading | 6 Symptom table, every metric | full width | table | no |
| Reading | 7 Upgrades | full width | none | no |
| Reading | 8 A first patch | split | 2D live counter tiles, measured | no |
| Further reading | | unchanged (own reading time updated) | | |

Kept 2D and why: the request path is lanes of named functions with source lines (text in boxes reads best flat); the async timeline is a
timeline; the hash chains are real block text; the stepper is a long replay the reader drives (long-replay rule, case b); the V1/V2 toggle is
two row tables; the sweeps and the time series are charts. No 3D for CUDA graphs: the page measures nothing about them.

The async animation went from 12 per-event frames with a script caption to 4 explained frames per mode; the request path's script caption
became its 12-item step list (same words); the four-card "one call of schedule()" box became Fig. 2's step list (its preemption card a
paragraph after it); the unit-test predict became Fig. 3, whose steps state the answer.

### Length judgement
| | Before (2026-10-23) | After (2026-11-12) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 7,794 words, 34 min | 9,420 words, 41 min |
| Reading, closed details | 3,373 words, 15 min | 3,373 words, 15 min |
| Visuals in Reading (audit count) | 8 | 9 (3 of them 3D stages) |

The 1,626 extra words are step lists and their figure notes: 421 for the request path's twelve steps (the same words as its old
script-written caption, which the audit did not count), 440 for Fig. 1, 349 for Fig. 2 (less the 219 of the four-card box it replaces), 317
for Fig. 3 (less the 159 of the predict it replaces), 205 for the two async lists, and about 290 for the figures' titles, source notes and the
async introduction. No explanation was added besides these. If the page must shrink: the request path's list could
lose its source-line parentheses into a closed block, and Fig. 1's list could lose its section pointers.

### Knowledge ledger
344 units: core 257, depth 53, fat 30, volatile 4 (`ledger.py check`: problems 0). 14 units added for the step lists (note "added 2026-11-12");
keys reworded for 10, 29, 68, 69, 70, 73, 75, 121, 312 and 317; 123 and 124 (the unit-test predict's question and wrong options) are fat now;
the Further reading keys no longer start with a reading time (299, 301 to 310). The root's ledger (problems 0) and the three other ledgers keyed
on this page (PEFT, PagedAttention, LLM serving in production) still find their units.
