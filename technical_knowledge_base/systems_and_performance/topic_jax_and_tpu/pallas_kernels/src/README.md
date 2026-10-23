# Pallas kernels: sources

Built 2026-10-15. Pinned: jax/jaxlib 0.11.2 (tag jax-v0.11.2, 32544801), tokamax 0.0.16 (PyPI sdist, sha256 a0114239bd6de90ad5b1a94bedd70b0d834c44cfa684630eff6b8b85f3c3c314), both unpacked in the shared setup folder (`$JX_SCRATCH/src/jax`, `$JX_SCRATCH/src/tokamax_016`). CPU only (Apple M1 Pro), shared venv; see the root's `src/data/README.md` for the running example.

## Run (in order; CPU, low priority)
```sh
export JX_SCRATCH=<shared setup folder>
R="JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B"
cd src/runs
$R pk_run.py        # out/kernels.json: every kernel, production kernels, bugs, lowering (TPU and cuda), timings (about 45 s)
$R pk_grid.py       # out/grid.json: per-step block indices, copies, recorded interpreter orders (needs kernels.json)
$R pk_pipeline.py   # out/pipeline.json: Buffered(1|2|3), the serial vs double-buffered timelines (calculated, v5e figures)
$R pk_tiles.py      # out/tiles.json: the online softmax replayed on a trained head
$R pk_old.py        # out/old.json: checks of the old Notion page's Pallas claims; vmap; fully masked row
$JX_SCRATCH/venv/bin/python -I -B pk_source.py   # out/source.json: file:line located by regex; tuned table; guide outputs
python3 -I -B pk_data.py                          # ../parts/22_js_pk_data.js (window.PK)
cd .. && sh build.sh
python3 -I -B check_page.py                       # embedded data == recorded; 122 prose numbers == data; copy recount; privacy
NPM_CONFIG_USERCONFIG=<empty file> node check_ui.mjs ../index.html <shot folder>   # every control, 390 dark and 920 light
python3 ../../../../../html_utils/ledger.py check systems_and_performance/topic_jax_and_tpu/pallas_kernels   # knowledge ledger, problems 0
```
`runs/pk_kernels.py` holds the kernels; the page shows its `# ---- name` sections verbatim. The root lab's `src/tpu/tp_kernels.py` (matmul, flash forward) is imported, not copied. Timings change from run to run (shared machine, load 30 to 55); `check_page.py` fails if the prose numbers no longer match, so update the prose with the data.

## Shape
A child page (`.claude/skills/explainer-page/page-kinds/topic-child.md`): Reading organised by the subject (the idea in one screen, when a kernel wins, the grid and BlockSpecs, kernels by kind, pipelining, scalar prefetch, semantics, testing, production, block sizes, Triton), closed depth blocks, then the Kernel playground tab (a tool across all kernels) and Further reading. The root's TPU and Pallas lab owns the five ideas, the matmul grid animation, the (8, 128) rule and HBM traffic tables: linked, not rebuilt.

## Parts (since 2026-10-23)
| Tab | Parts |
|---|---|
| Reading `t-read` | `20_read_a` (styles, nav, the idea in one screen: core sentence, hero, you need, new terms, takeaways, the kernels table closed) to `20_read_f` (sections 1 to 12), `20_read_g` (closed design questions), `20_read_z`; JS `21_js_rd_common.js` (skill template), `22_js_pk_data.js` (`window.PK`, generated), `23_js_pk_util.js` (`PKU`: formatting, `PKU.anim` which never autoplays), `24_js_pk_read.js` (tables, toggles, bars, page table, tuned heatmap), `25_js_pk_pipe.js` (s6 timeline), `26_js_pk_grid.js` (s2 grid stepper, moved from its tab), `27_js_pk_tile.js` (s5 online-softmax replay, moved from its tab), `28_js_pk_hero.js` (hero) |
| Kernel playground `t-pkplay` | `31_tab_pkplay.html`, `31_js_pk_play.js` |
| Further reading `t-more` | `39_tab_more.html` |
`99_js_tabs.js` is the skill template (storage key `pk-tab`).

## The 2026-10-23 rebuild: what changed and why
Editing only, no new runs; every number is the recorded one (`check_page.py`: 120 prose numbers equal the data).
- **Top**: the core idea in one sentence (a kernel works on tiles in VMEM, the grid and BlockSpecs choose which tile is copied at each step, and you write one only to do less than XLA can), a new static hero (`28_js_pk_hero.js`: one grid step of the bias + GELU kernel, HBM bands, VMEM slots with the double buffer, the single-buffered bias, the body, the write-back), "You need" (JAX core, TPU programming and performance, the root's lab, Triton and Gluon, Writing kernels) and new terms. The kernels-and-errors table is a closed reference block.
- **Labs moved inline** (the strongest visuals were one click away): the Grid and BlockSpec stepper is now section 2, right after the one rule that explains every copy, and opens on the hero's kernel; the Flash tiles replay is now in section 5 beside the online-softmax formula, with a prediction prompt. Their tabs were removed. The Kernel playground stays a tab: it is a tool across all eleven kernels.
- **Moved within Reading**: the testing ladder from the top to section 9 (with a static summary of the eight-bug matrix); the Mosaic against Triton toggle from section 2 to section 12, where the backends are compared.
- **Into closed blocks**: the long kernel code (LayerNorm, flash forward and backward, manual matmul with its Mosaic loop, paged decode; the paged index map stays inline as the core snippet), the flash block sweep and bf16 results, the bf16 softmax and output-dtype results, the scalar-prefetch lowering and production users, the interpret-mode timing table, the production kernels table, the lab's drawing notes and the replay's data provenance.
- **Mistakes and interview folded**: each mistake that restated a section was deleted as fat after its unique words moved into that section (no error raised for `sm_scale`; "parallel, unless the output window does not vary"; always test DMAs under the TPU interpreter; fill stale slots and clamp; decoding at length 0). The output-dtype mistake moved to section 3's precision block. Three interview answers that add something stay as closed design questions (MoE grouped matmul, testing flag by flag, 128-wide statistics); the rest restated sections.
- **No autoplay**: `PKU.anim` no longer starts on first view; `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates. Checked with normal and reduced motion: every animation waits on step 0.
- **Legibility**: SVG text in the moved labs raised to 11 px (it was 9 to 10 px); the replay's error counter no longer prints "1.6e0".
- No photo: the page is about a programming model; a TPU board photo would show nothing about tiles or copies, and hardware images belong to TPU programming and performance.

## Length judgement
| | Before (2026-10-19) | After (2026-10-23) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 39.8 min | 33.2 min |
| Reading, closed details | 4.8 min | 12.6 min |
| Other tabs, core (excluding Further reading) | grid 2.3 + playground 2.1 + tiles 1.4 = 5.7 min | playground 2.1 min |
| Core total, excluding Further reading | 45.5 min | 35.3 min |
| Visuals drawn in Reading (audit count) | 3 | 6 |

Why 33 minutes is right: the page owns a whole kernel language: the model (grid, BlockSpecs, memory spaces), five kinds of kernel each with its own lesson (row kernels, an accumulating backward, flash attention forward and backward, hand-written pipelines, data-chosen tiles), the semantics that decide correctness on megacore, how to test without a chip, production kernels and block sizes. Every core unit in the ledger serves one of those; about a sixth of the core words are the captions, counters and labels of the two labs that moved in. What made the old Reading long and is not needed on first read (kernel listings, sweeps, bf16 results, provenance, timings, the production table) is now closed, which is why the closed time grew.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
376 units: core 274, depth 40, fat 62, owned 0, volatile 0. 359 were drafted from the old page by `ledger.py init`; 17 were added by hand for script-rendered visuals and tables (section "script-rendered: ...", each keyed on a static caption that names its result). Fat units carry a `note`: headings and wind-ups, the removed bias-copy prediction (the hero shows the answer), the removed tabs' intros and try lines, the mistakes and interview answers that restated a section, and the old Further reading cards.
