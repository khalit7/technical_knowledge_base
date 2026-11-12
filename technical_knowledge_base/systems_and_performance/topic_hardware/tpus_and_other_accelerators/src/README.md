# src: TPUs and other accelerators

Build: `sh build.sh` writes `../index.html` from `parts/`. Everything (recompute, build, checks): `sh run_all.sh` (python3, node with html_utils' node_modules).

- `parts/`: 01_head (shared look copied from the root), 02_split (the split layout, skill template, in `build.sh` after 01_head), 10_header (tabs: Reading, Further reading), 20_read_a..i (Reading: a = styles and nav, b = the idea (core sentence and hero in a split, comparison table, you need, new terms), c = s1 systolic arrays (Fig. 2 stage split, the shapes card split, a closed cycle-by-cycle widget), d = s2 inside a TPU (photos split) and s3 generations, e = s4 pods (Fig. 3 stage split; slice builder and racks photo split), f = s5 AMD (board diagram split) and s6 Trainium, g = s7 Groq (fit chart and die photo split) and s8 Cerebras (Fig. 4 stage split), h = s9 other bets, i = s10 your code and a closed interview block), 20_read_z closes it; 21_js_rd_common, 25_js_s3 (renderer v2) and 99_js_tabs are the explainer-page skill templates, unchanged (storage key `tpu-tab`); 22_js_sys_core (the systolic simulator, port of `sim/systolic.py`); 25_js_rd_fit (section 7 chart), 26 predict blocks, 28 hero, 29 AMD board diagram, 31 the shapes card and the cycle-by-cycle widget (section 1), 32 the slice builder (section 4); scenes 40_js_sc_sys (Fig. 2), 41_js_sc_pod (Fig. 3), 42_js_sc_wafer (Fig. 4); 39 Further reading.
- `sim/systolic.py`: cycle-level weight-stationary array and the tiled model; writes `out/systolic_ref.json`.
- `recompute.py`: every derived number on the page; writes `out/recompute.json`.
- `check_embed.py`: prose and table numbers equal `out/recompute.json`; the animation's matrices are reference case 0.
- `check_sim.mjs`: the page's JavaScript (simulator, tiled model, Reading animation, fit chart, pod all-reduce) against the Python (61 comparisons).
- `check_ui.mjs`: clicks every control at 390 px dark and 920 px light under reduced motion; fails on errors, NaN, undefined, sideways scroll, or any scrubber (stages included) that moved by itself; screenshots every card, stage and figure to a given folder.
- `check_stages.mjs` (from the repo root, a few minutes): the 2026-11-06 rollout checks, see the last section.
- `inputs/`: extracts of the primary sources read (scaling book, TPU v4 paper, CACM 2020 Table 1), HF parameter counts, and the research notes (AMD and Trainium; Groq, Cerebras and energy, fetched 2026-10-05; Gaudi 3, SambaNova, Etched and the photo search, `research_other_asics.md`, fetched 2026-10-23) with every quote and URL.
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check`). `../img/`: three TPU v4 photos and a Groq die shot (added 2026-11-12), credits in `../img/CREDITS.md`.
- `live.md`: the old Notion page "TPUs: systolic arrays and pod-scale machines" (copy of the root's `src/read/old/02_tpus.md`); `coverage.json` maps each of its 50 claims to where it is carried, corrected or why dropped.
- `viz_ideas.md`: visuals built and rejected, with scores.

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` (child page). Departure: the old page covered TPUs only; Khalid's new title adds AMD, Trainium, Groq and Cerebras, so the Reading tab is organised as one mechanism (systolic arrays) then one section per machine, each ending with what it changes in training code, plus a cross-machine table (s9). No measurement on this laptop: nothing here has an M1 analogue; the simulator is validated against Python instead.

## The 2026-10-23 rebuild to the teaching contract
**What changed and why.**
- **Top**: the core idea in one sentence (every non-NVIDIA accelerator is a bet on where the weights wait and how many chips share one fast fabric; the systolic array is the shared trick) and a new static hero: memory per chip on a log scale with Llama 3.1 70B's bf16 weights marked, beside chips per fast fabric, for seven accelerators. Then the six-machine table, "You need" and 11 new terms in a closed block.
- **Both lab tabs folded into Reading**, each explained one mechanism: the Systolic array lab's shapes calculator and utilisation sweep now sit in section 1 beside the cost claims they prove (the old cost bullets are its caption); its cycle-by-cycle simulator is a closed block. The Pod builder is now the slice builder in section 4, after the collective rule it computes. Tabs: Reading, Further reading.
- **Photos** (CC BY 4.0, Jouppi et al. 2023, reused from TPU programming and performance): the TPU v4 package and board in section 2, eight racks of a v4 pod in section 4. No openly licensed photo of a Cerebras wafer, Groq chip, AMD Instinct or Trainium exists on Wikimedia Commons (searched 2026-10-23), so none is substituted.
- **New visuals for mechanisms that had none**: the AMD 8-GPU board against an NVSwitch board (toggle: all-reduce against one copy), and a static weight-streaming diagram for Cerebras.
- **Ownership (addendum)**: AMD's chip (XCDs, CUs, wavefronts, LDS, MI300X and MI355X rates, chiplet costs) moved to GPU architecture section 13, which carries every unit; section 5 keeps the 8-GPU board, Helios and ROCm and links there. TPU programming links TPU programming and performance.
- **New section 9, other bets**: Gaudi 3 (output-stationary arrays, all-Ethernet node, clock and port arithmetic derived), SambaNova SN40L (dataflow, three memory tiers), Etched Sohu (vendor claim only), Maia 300 and Jalapeño (moved from section 6, figures in a closed block), and who can get each accelerator, because OWNERS.md gives this page those ASICs and "who can buy them".
- **Fixes**: the CUDA root's ROCm section is section 9 ("Other GPUs"), 25 min; sibling times updated (GPU architecture 29, Memory technology 23); the Sharding and TPU programming children's titles.
- **No autoplay**: template controller; the section 1 mode switch no longer starts the animation. SVG text raised to at least 11 px; chart ticks thinned at phone width.
- **Closed**: source lists, corrections to the old page, the scaling book's worked example against its measurement, Groq TSP and network details, Cerebras's core details, Trainium3's conflicting link figures, Helios shipping status, SN50, Maia and Jalapeño figures, interview rehearsal. **Deleted as fat**: the "How to read this page" paragraph, pointers to removed tabs, six common mistakes and seven interview answers that each restated a section.

**Length judgement.**
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 words a minute) | 34.1 min | 35.0 min |
| Reading, closed details | 2.4 min | 6.7 min |
| Other tabs, core | Systolic array lab 1.5 + Pod builder 1.9 = 3.4 min | none |
| Core total, excluding Further reading | 37.5 min | 35.0 min |
| Visuals in Reading (audit count) | 3 | 9 (plus 3 photos) |

Why about 35 minutes is right: the page teaches one mechanism (the systolic array) and then eight machines, each with its bet, its cost and what it changes in code; section 9 is new (Gaudi, SambaNova, Etched and who can get each, about three minutes) because the page owns those chips and had nothing on them. The rest shrank by about five minutes while absorbing both lab tabs, by handing AMD's chip to GPU architecture, collapsing provenance and dated vendor figures, and deleting the mistakes and interview answers that restated sections. Cutting further would drop a machine or the mechanism every other section leans on.

**Ledger** (`src/ledger.json`, check: problems 0): 372 units, core 263, depth 34, fat 55 (each with a note), owned 11 (all by GPU architecture: XCDs and I/O dies, 2 disabled CUs, Infinity Cache, the MI300X and MI355X peaks, chiplet yield and coherence, Blackwell's two dies, TF32 emulation, the wavefront trap and Wave32), volatile 9 (Ironwood's GA date, Helios shipping, Project Rainier, Maia 300, Jalapeño, the Groq licence, Artificial Analysis speeds, SambaNova's claims and SN50; all kept here, closed or dated). 355 drafted by `ledger.py init`, 17 added by hand for the hero, photos, diagrams and section 9.

## Topic close (2026-10-24)
Section 4 now keeps the chip's view of a pod: ICI and the torus defined in one paragraph, the TPU v4 racks photo, the slice builder (its caption carries the scaling book's rule and the 0.178 / 0.059 / 0.357 s v5p numbers), Ironwood's 144 cubes and 1.77 PB, and the mesh box. The topology, the optical circuit switches (48 of 136 ports, twisted tori, under 5% of cost), the scaling book's worked example, Ironwood's pod and DCN are taught on Interconnects and scaling sections 6 and 7, which absorbed them; their ledger units are `owned:` that page. The torus hop widget (`retired/24_js_rd_torus.js`) retired: Interconnects section 5 draws the torus with hop counts. `check_embed.py` drops the book-example and OCS-count numbers; `check_ui.mjs` drops the widget. Reading 35.0 to 32.5 min core (closed 6.7 to 6.5). Further reading: times set to each header; the Interconnects card names TPU tori and optical switches.

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js` and `99_js_tabs.js` (key `tpu-tab`). The page's `#t-read .an-ctl` rules skip `.stg-bar`; `build.sh` writes the em-dash detector's character as bytes. No new runs; `recompute.py`, `sim/systolic.py` and their outputs are unchanged. The 2D systolic animation (`23_js_rd_sys.js`) and the 2D weight-streaming diagram (in `29_js_rd_diag.js`) are removed: Figs. 2 and 4 replace them.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | 2D hero (log scales) | no |
| Reading | Comparison table, predict | full width | table | no |
| Reading | 1 The problem, Horowitz's energies | full width | none | no |
| Reading | 1 How a systolic array answers it | split | **3D** `stg-sys` (Fig. 2): the 4 x 4 array against 16 scalar lanes (mode switch) | yes, 5 + 3 |
| Reading | 1 Padding, small batches, bigger arrays | split | 2D shapes card (a widget: calculator plus utilisation sweep) | no |
| Reading | 1 Tensor cores; cycle by cycle | full width | closed widget (`auto:false`: never plays by itself) | no |
| Reading | 2 Inside a TPU chip | split | photos (TPU v4 package and board) | no |
| Reading | 2 Peaks; 3 Generations | full width | tables | no |
| Reading | 4 ICI and the torus | split | **3D** `stg-pod` (Fig. 3): a cube of 64 chips, rings along it, the pod | yes, 6 |
| Reading | 4 What a slice costs, the mesh | split | 2D slice builder (a widget) and the racks photo | no |
| Reading | 5 AMD | split | 2D board diagram (toggle) | no |
| Reading | 6 Trainium | full width | none | no |
| Reading | 7 Groq | split | 2D fit chart (log scale) and the Groq die photo | no |
| Reading | 8 Cerebras | split | **3D** `stg-wafer` (Fig. 4): dies to scale, defects, weight streaming, inference | yes, 6 |
| Reading | 9 Other bets; 10 Your code | full width | tables | no |
| Further reading | | unchanged | | |

**Stages and their data.** Fig. 2: reference case 0 (`X` 5 x 4, `W` 4 x 4, the matrices `check_embed.py` compares) run through `SYS.simulate`; every busy cell, partial sum, result, input read and hand-off comes from its frames, grouped into the long-replay rule's stretches (load 4 cycles; fill 1 to 3; full flow 4 to 8, until the last input enters; drain 9 to 11; done), each stretch playing its cycles during its step; the lanes mode plays two rounds of 4 steps. The scene exports `window.__tpuRdSys` (for `check_sim.mjs`) and `window.TPU_SYS` (for `check_stages.mjs`). Fig. 3: `POD.slice` on v5p with 16.06 GB: one axis of a 4 x 4 x 4 cube 0.178 s, three axes 0.059 s, a 2 x 2 x 4 slice without wraparound 0.357 s; 96 optical links per cube; Ironwood's 144 cubes; chips on a grid and switch paths schematic. Fig. 4: areas 46,225, 814 and 25 x 29 mm drawn to scale (1 unit = 20 mm), ratios about 57 and 64 derived; the core patch, MemoryX, SwarmX and the wafers schematic; 70,553,706,496 parameters x 2 bytes = 141.1 GB over 44 GB wafers = 4.

**Kept 2D and why**: the hero, the fit chart and the utilisation sweep are log scales or curves; the shapes card and slice builder are widgets with many controls (the slice builder's numbers are what Fig. 3 animates); the AMD board diagram is a flat graph, and Interconnects and scaling's Fig. 2 already draws the switch against the mesh in 3D (now linked from the caption); the peak and generation tables are tables. Trainium (section 6) has no visual: its NeuronCore is a 128 x 128 systolic array (Fig. 2 draws the mechanism) and no die area or layout is published in the page's sources, so a 3D chip would be invented.

**Real image**: Groq's first-generation die (Wikimedia Commons, CC BY-SA 4.0, found on a new search on 2026-11-12) beside the fit chart in section 7: it shows how regular a cache-free, arbiter-free chip looks. Still no openly licensed photo of a Cerebras wafer, an AMD Instinct or a Trainium chip.

**Length judgement.** Reading core 34.0 min before (7,823 words, `audit_pages.mjs`), 37.7 min after (8,674); closed details 6.5 min both times; Further reading 2.6 min unchanged. Visuals in Reading 8 before, 9 after by the audit's count (three 3D stages and a photo added; the 2D systolic animation and weight-streaming diagram retired). The four minutes are the step lists that now explain the three stages on the left (the systolic list has two modes), as the rollout requires; prose the stages carry moved into the lists instead of being repeated (Cerebras's training paragraph is now steps 3 to 5 of Fig. 4; the slice paragraph of section 4 is steps 3 to 6 of Fig. 3; section 1's "What it shows" lost the sentence the done step carries). Nothing the ledger holds was cut.

**Ledger**: 388 units (core 264, depth 33, fat 59, owned 22, volatile 10): 11 units added for the step lists' new results (section "added 2026-11-12"); no key changed. `ledger.py check` problems 0 here and on the root.
