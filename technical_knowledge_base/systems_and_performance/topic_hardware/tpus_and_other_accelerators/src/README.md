# src: TPUs and other accelerators

Build: `sh build.sh` writes `../index.html` from `parts/`. Everything (recompute, build, checks): `sh run_all.sh` (python3, node with html_utils' node_modules).

- `parts/`: 01_head (shared look copied from the root), 10_header (tabs: Reading, Further reading), 20_read_a..i (Reading: a = styles and nav, b = the idea (core sentence, hero, comparison table, you need, new terms), c = s1 systolic arrays with the shapes card and a closed cycle-by-cycle block, d = s2 inside a TPU (photos) and s3 generations, e = s4 pods (racks photo, slice builder), f = s5 AMD (board diagram) and s6 Trainium, g = s7 Groq and s8 Cerebras (weight-streaming diagram), h = s9 other bets (Gaudi, SambaNova, Etched, in-house, who can get each), i = s10 your code and a closed interview block), 20_read_z closes it; 21_js_rd_common and 99_js_tabs are the explainer-page skill templates (storage key `tpu-tab`; nothing moves before the reader acts); 22_js_sys_core (the systolic simulator, port of `sim/systolic.py`); 23 to 26 Reading JS; 28 hero; 29 AMD board and weight-streaming diagrams; 31 the shapes card and cycle-by-cycle block (section 1); 32 the slice builder (section 4); 39 Further reading.
- `sim/systolic.py`: cycle-level weight-stationary array and the tiled model; writes `out/systolic_ref.json`.
- `recompute.py`: every derived number on the page; writes `out/recompute.json`.
- `check_embed.py`: prose and table numbers equal `out/recompute.json`; the animation's matrices are reference case 0.
- `check_sim.mjs`: the page's JavaScript (simulator, tiled model, Reading animation, fit chart, pod all-reduce) against the Python (61 comparisons).
- `check_ui.mjs`: clicks every control at 390 px dark and 920 px light; fails on errors, NaN, undefined, sideways scroll, or any scrubber that moved before the reader acted; screenshots every card and figure to a given folder.
- `inputs/`: extracts of the primary sources read (scaling book, TPU v4 paper, CACM 2020 Table 1), HF parameter counts, and the research notes (AMD and Trainium; Groq, Cerebras and energy, fetched 2026-10-05; Gaudi 3, SambaNova, Etched and the photo search, `research_other_asics.md`, fetched 2026-10-23) with every quote and URL.
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check`). `../img/`: three TPU v4 photos, credits in `../img/CREDITS.md`.
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
