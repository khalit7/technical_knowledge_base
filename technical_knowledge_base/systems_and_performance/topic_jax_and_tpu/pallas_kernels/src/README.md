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
node check_stages.mjs <shot folder>                # stages and animations play on view, step lists, widgets, reduced motion (about 4 min)
python3 ../../../../../html_utils/ledger.py check systems_and_performance/topic_jax_and_tpu/pallas_kernels   # knowledge ledger, problems 0
```
`runs/pk_kernels.py` holds the kernels; the page shows its `# ---- name` sections verbatim. The root lab's `src/tpu/tp_kernels.py` (matmul, flash forward) is imported, not copied. Timings change from run to run (shared machine, load 30 to 55); `check_page.py` fails if the prose numbers no longer match, so update the prose with the data.

## Shape
A child page (`.claude/skills/explainer-page/page-kinds/topic-child.md`): Reading organised by the subject (the idea in one screen, when a kernel wins, the grid and BlockSpecs, kernels by kind, pipelining, scalar prefetch, semantics, testing, production, block sizes, Triton), closed depth blocks, then the Kernel playground tab (a tool across all kernels) and Further reading. The root's TPU and Pallas lab owns the five ideas, the matmul grid animation, the (8, 128) rule and HBM traffic tables: linked, not rebuilt.

## Parts (since 2026-10-23)
| Tab | Parts |
|---|---|
| Reading `t-read` | `20_read_a` (styles, nav, the idea in one screen: core sentence, Fig. 1 and its step list, you need, new terms, takeaways, the kernels table closed) to `20_read_f` (sections 1 to 12), `20_read_g` (closed design questions), `20_read_z`; JS `21_js_rd_common.js` (skill template, `RD.anim`), `22_js_pk_data.js` (`window.PK`, generated), `23_js_pk_util.js` (`PKU`: formatting, `PKU.anim` for the two reader-driven widgets), `24_js_pk_read.js` (tables, toggles, bars, page table, tuned heatmap), `25_js_pk_pipe.js` (s6 timeline widget), `25_js_s3.js` (skill template, 3D renderer v2), `26_js_pk_grid.js` (s2 Grid and BlockSpec lab, a widget), `27_js_pk_tile.js` (s5 online-softmax replay, `RD.anim` in four stretches), `40_js_sc_hero.js` (Fig. 1), `41_js_sc_ln.js` (Fig. 2), `42_js_sc_flash.js` (Fig. 3), `43_js_sc_be.js` (Fig. 4) |
| Kernel playground `t-pkplay` | `31_tab_pkplay.html`, `31_js_pk_play.js` |
| Further reading `t-more` | `39_tab_more.html` |
`02_split.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `25_js_s3.js` and `99_js_tabs.js` are the skill templates (storage key `pk-tab`), copied unchanged on 2026-11-12. `check_stages.mjs` is the rollout check (below).

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

## The 2026-11 rollout: split layout, four 3D stages, explained and autoplaying animations (2026-11-12)
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js`, `21_js_rd_common.js`, `05z_errbox.js.html`, `99_js_tabs.js` (key `pk-tab`). `build.sh` now writes the em-dash it looks for as bytes. No new runs: every scene draws from `window.PK` (`runs/out/*.json` via `pk_data.py`, unchanged).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` Fig. 1, bias + GELU on HBM, VMEM and the core | yes, 6 |
| Reading | You need, new terms, takeaways, kernels table | full width | table | no |
| Reading | 1 When a kernel wins | split | 2D bars (Google's matmul guide) | no |
| Reading | 1 Predict, situation table | full width | table | no |
| Reading | 2 The model | split | Grid and BlockSpec lab (widget: opens on the last step, never plays by itself) | no (live caption) |
| Reading | 2 Pieces, transformations | full width | table | no |
| Reading | 3 Row kernels | full width | code | no |
| Reading | 4 LayerNorm and its VJP | split | **3D** `stg-ln` Fig. 2, one accumulator on one or two cores | yes, 5 |
| Reading | 5 Forward loop | split | 2D online-softmax replay (`RD.anim`, four stretches, three modes) | yes, 4 per mode (three lists) |
| Reading | 5 IO link, lse | full width | none | no |
| Reading | 5 Skipping, and not even copying | split | **3D** `stg-fl` Fig. 3, naive against clamped index map | yes, 6 |
| Reading | 5 Backward, code, results, sm_scale, block sizes | full width | formula, table | no |
| Reading | 6 Pipelining | split | 2D timeline (widget: opens on the last step) | no (live caption) |
| Reading | 6 By hand, buffers, emit_pipeline | full width | code, table | no |
| Reading | 7 Scalar prefetch | split | 2D page table (static, hover) | no |
| Reading | 7 Stale entries, lowering | full width | none | no |
| Reading | 8 Semantics | full width | predict | no |
| Reading | 9 Testing | split | ladder and the eight-bug matrix | no |
| Reading | 10 Production kernels | full width | table (closed) | no |
| Reading | 11 Block sizes | split | 2D heatmap (v5 against v6) | no |
| Reading | 12 Pallas against Triton | split | **3D** `stg-be` Fig. 4, one kernel lowered two ways | yes, 6 |
| Reading | 12 Code toggle, comparison table | full width | code, table | no |
| Kernel playground | | full width | tool (code, measures, VMEM calculator across all kernels) | no |
| Further reading | | unchanged | | |

**Stages and their data.**
- Fig. 1 (`40_js_sc_hero.js`): the bias + GELU kernel (`PK.G.kernels` bias_gelu: x and o [4,096 x 512] in 8 blocks of 512 rows, b [1 x 512]); HBM as a gold glass floor, VMEM as a teal plate with two slots for x, two for o and one for b, the TensorCore in front; copies, the body and write-backs as flows; step 4 is grid step 2 (block 2 computing, block 3 arriving, o block 1 writing back), step 6 the recorded counts (`PK.G.ix.bias_gelu.copies`: 8, 1, 8). Replaces the static 2D hero (`28_js_pk_hero.js`, removed) and carries its note as the step list.
- Fig. 2 (`41_js_sc_ln.js`): the LayerNorm backward (`PK.G.kernels` ln_bwd, 16 bands of 256 rows; copies 16, 16, 16, 16, 1, 1), the dscale and dbias block growing in VMEM, written back once; then two cores, each with its own copy (only the core that runs step 0 zeroes it, from the kernel's `pl.when(pl.program_id(0) == 0)`), and the TPU interpreter's three seeds (`PK.K.bugs[0]`: NaN, off by 140, off by 153 on values up to 176). Which band goes to which core is drawn illustratively (said on the page). The warn box of section 4 became steps 4 and 5.
- Fig. 3 (`42_js_sc_flash.js`): the causal flash forward for one head, every grid step, block index and copy flag from `PK.G.kernels` flash_fwd naive and clamped; tiles rise when the body runs, a teal marker for each K and V copy, dark grey when the body was skipped; chips switch the map and replay. Totals 16 against 9 copies, 10 of 16 tiles.
- Fig. 4 (`43_js_sc_be.js`): the fused softmax on [16,384 x 128]: on the TPU side 32 blocks of 512 rows swept one after another into VMEM (`PK.K.kernels.softmax_rows`, Mosaic op counts); on the GPU side 1,024 programs of 16 rows (the 16 read from the printed Triton module, the 1,024 derived as 16,384 / 16 and labelled so), with a close-up of one program's 16 x 128 addresses.
- Scenes export `window.PK_SC` (what each draws, for checks) and `window.PKSTG` (the stage handles); `window.S3PH` gives every view a steeper camera on phones so the wide scenes fill the card.

**Motion.** The four stages and the replay play once at least half in view, pause off screen, stop for good on a reader control or the last step, never move under reduced motion; Fig. 3's chips and the replay's mode buttons swap the list and replay. The replay was 8 key-block frames with a per-step caption; it is now four explained stretches (block 0, blocks 1 to 5, block 6, block 7; the naive mode's four steps), each mode with its own step list, and the caption was removed (its text is in the lists; the counters stay). The Grid and BlockSpec lab (up to 64 frames over ten kernels) and the pipeline timeline (32 or 12 frames) are widgets the reader drives: they open on their last step, the informative frame, and keep their live captions.

**Kept 2D, and why.** The matmul-guide bars, the pipeline timeline and the interpret timings are numbers on an axis; the online-softmax replay is a heatmap of real scores plus a bar row; the tuned block-size table is a heatmap; the page table is a table the reader hovers; the bug matrix and comparisons are tables; the Grid and BlockSpec lab draws ten kernels' operands to their own scales, which a single 3D scene would not (Figs. 1 to 3 give the three kernels whose grids teach most a 3D view). Code stays text. Considered and not built: a 3D paged-decode scene (the 2D page table already shows the scatter; its copy counts are in the lab) and a 3D double-buffer timeline (Fig. 1 step 4 shows the overlap; timings stay 2D).

**Checks.** `check_stages.mjs` (new, adapted from JAX core's): at 1400 light, 920 light and 390 dark every stage and the replay play when scrolled into view, step to the last step in every mode with one list item per step, the two widgets never play by themselves and open on their last step, no redraws off screen, every split is two columns at 1400; under reduced motion nothing moves; no errors, `undefined`, `Infinity` or sideways scroll. `check_page.py`: the new step lists' numbers are `pkv` spans and are checked with the rest (137 prose numbers). `check_ui.mjs`: the hero shot now targets `stg-hero`.

**Length.** Reading core 7,641 words (33.2 min) before, 8,692 (37.8 min) after; closed 2,907 (12.6) unchanged; playground 2.1 and Further reading 2.9 unchanged. The growth is the step lists of the four figures and the replay's three lists (about 1,050 words); the replay's and the hero's script-drawn captions and the section 4 warn box moved into them. Visuals drawn inline (audit count): 6 before, 9 after.

**Ledger** (`python3 html_utils/ledger.py check`: problems 0): 376 units, core 274, depth 40, fat 62. Re-keyed: 63 ("compiled on this CPU"), 132 ("Same arithmetic, fewer copies", the sentence now Fig. 3's last step), 134 ("plays both maps on the recorded grid"). The root's ledger still checks with problems 0.
