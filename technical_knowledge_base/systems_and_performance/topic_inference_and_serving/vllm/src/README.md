# vLLM: inside the default engine, sources and how to rebuild

Child page of Topic: inference-and-serving. Everything is pinned to vLLM **v0.31.0** (2026-10-05, commit
db9527a46873454610df6dbedf79a36d6bf1a7f6), the same tree the parent's Serving simulator was checked against.
Ids and classes use the `vl-` prefix.

## Tabs (rebuilt 2026-10-23 to the teaching contract)
- **Reading** (`parts/20_read_a.html` to `20_read_k.html`; JS `21_js_rd_common.js` (the skill template: never autoplays), `22_js_vl_path.js`,
  `23_js_vl_hero.js`, `23_js_vl_fq.js`, `23_js_vl_mr.js`, `24_js_vl_hash.js`, `25_js_vl_fill.js`, `29_js_vl_pr.js`, `31_js_step_1ui.js`
  (the stepper, data `200_js_vl_stepdata.js`), `32_js_knob.js` (the measured runs, data `201_js_vl_knobdata.js`)): the idea in one
  screen (core sentence, hero, you need, new terms, closed provenance); 1 the request path (step animation) and sync against async
  scheduling (before/after); 2 the scheduler loop; 3 the KV cache manager, the free-queue diagram, hash chains, then the recorded
  scheduler stepper (prefix caching off against on on the same arrivals, tight memory, big budget); 4 the model runners with the
  V1 against V2 toggle; 5 the knobs (with multi-LoRA) and the three measured sweeps; 6 the metrics with the 1-second time series
  and, closed, every exported metric; 7 upgrades (checklist open, release table closed); 8 the eviction-metric patch, live;
  a closed interview rehearsal.
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
| `check_ui.mjs`, `shots.mjs`, `check_data.py` | Puppeteer check: no animation moves before the reader acts (normal motion), then every control and every stepper step (390 dark, 920 light); element screenshots; the page embeds exactly the built data and prose numbers match it (including the stepper and time-series lines written as static text). |
| `coverage.md` | Every claim of the old page: verified, corrected, unconfirmed or moved. |
| `viz_ideas.md` | Visuals built and rejected. |
| `ledger.json` | The knowledge ledger of the 2026-10-23 rebuild (`python3 html_utils/ledger.py check`: problems 0). |

Rebuild: `python3 -I stepper/build_trace.py`, `python3 -I knob/build_knob.py <raw knob dir>`, `sh build.sh`,
`python3 -I check_data.py`, `node check_ui.mjs <shots dir>`, and from the repo root
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
