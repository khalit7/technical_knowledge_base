# Source of "Topic: hardware"

Root of the topic (storage key `hw-tab`). Built 2026-10-05 by tab agents (`read/`, `chips/`, `calc/`, `roof/`, each with its own README or notes); rebuilt on 2026-10-24 at the topic close, after its six children were rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), with the method of `.claude/skills/explainer-page/orchestration/briefs/rebuild-page.md`. Editing only, no new runs. Examples followed: the CUDA and JAX roots.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/` (`20_read.html` styles and nav, `20_read_0.html` the top, `20_read_a..i.html` sections 1 to 10). Children import `calc/model.py` (Performance math, Interconnects and scaling) and copy `parts/32_js_calc_0data.js` and `32_js_calc_1core.js` (Performance math checks the copies): keep those paths, and recopy after changing them.
- `sh html_utils/checkpage.sh <this page>`: tabs 5, emdash 0, errbox 1, clipped 0, fail=0 (2026-10-24). `python3 html_utils/ledger.py check <this page>`: problems 0.
- Page checks, all clean on 2026-10-24: `python3 read/check/check_prose.py` (from `src/`; prose numbers of the Reading tab), `node <src>/read/check/check_read.mjs <shots>` (every Reading control at 390 px dark and 920 px light; now also fails if an animation moves before the reader acts), `node <src>/chips/check_page.mjs`, `node <src>/calc/check_calc.mjs`, `node <src>/calc/check_prose.mjs`, `node <src>/roof/check/check_page.mjs <shots>`.
- Nothing moves before the reader acts: `parts/21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; the Chip atlas and Roofline lab controllers no longer start on scroll or on a mode switch.

## Tabs
| Tab | Decision on 2026-10-24, and why |
|---|---|
| Reading `t-read` | Rewritten as a map (below). Section numbers 1 to 9 kept for the same subjects, because children and the CUDA root cite them; section 10 is now the child cards and the symptom table. |
| Chip atlas `t-chips` | Kept: the dated atlas a root owns. Two rows added from the accelerators child's research notes: Intel Gaudi 3 (Hot Chips 2024: 1,835 TFLOPS BF16 and FP8, 128 GB at 3.67 TB/s, 900 W air and 1,200 W liquid, 24 x 200 GbE; per-chip scale-up 1.05 TB/s derived, checked against the slides' 67.2 Tb/s per node) and SambaNova SN40L (arXiv:2405.07518: 638 TFLOPS BF16, 520 MiB SRAM, 64 GiB HBM; HBM bandwidth not published in the sources read, shown as "not published"). 27 chips. |
| Performance calculator `t-calc` | Kept (spans every child). **Fixed**: "store all, FlashAttention" used the GPT-3 count, 34sbh, about 1.4 times low for Llama-style models and without the FP32 logits; it now uses Performance math's counted formula per layer per token, 16h + 2a(d<sub>q</sub>+d<sub>v</sub>) + 2k(d<sub>q</sub>+d<sub>v</sub>) + 8f + 4a + 8 bytes, plus 8h + 4V + 8 for the logits (57.1 GB for the 8B at 8,192 tokens, as that page counts). Plain attention and full recompute follow the same count; `act_bytes_gpt3` keeps the old count for comparison. Attention FLOPs stay PaLM's 12LHQT (full square, the convention of published MFUs), and the Reading tab no longer quotes the causal 14% beside it as if it were the same quantity. |
| Roofline lab `t-roof` | Kept unchanged apart from removing autoplay: it holds the measured M1 ceilings that Performance math, the CUDA pages and this Reading tab cite (OWNERS.md). |
| Further reading `t-more` | Tab times measured; child cards with current descriptions and each header's time; neighbour times set to their headers, dropped where the target states none. |

Retired parts are in `retired/parts/`: the old Reading parts, the H100 zoom (`24_js_rd_sm.js`, duplicated GPU architecture's hero), the decode-on-four-memories animation (`25_js_rd_decode.js`, Memory technology owns why bandwidth bounds decode; its full-memory-reads bars moved to `28_js_rd_misc.js`), and the ring all-reduce in and out of the NVLink domain (`27_js_rd_ring.js`, Interconnects and scaling owns collectives). Their data stays in `read/out/expected.json`.

## What changed in the Reading tab
- **Top**: the core idea in one sentence (a step needs arithmetic, bytes from memory and bytes between chips, and runs at the speed of whichever runs out first); a static hero that maps the three demands of the running example (plus the building) to the hardware that supplies each, the section and the owning child; "You need"; 13 new terms in a closed block; the evidence labels.
- **Kept as the root's own** (comparisons and definitions that span children): the CPU, GPU core, tensor core and systolic-array comparison with the tile animation (section 1); the six GPU parts as definitions (2); the four memory packagings in one table, the decode bound with the M1 measurement and the full-memory-reads bars (3); formats, block scaling and peak by format across chips (4); the roofline formula, ridge points across chips, the ridge correction and MFU (5); the link ladder, the definitions and the rule "tensor and expert parallelism inside the NVLink domain" (6); every vendor's bet in one table, now with Gaudi 3 and SambaNova, and the scale ladder with four photos (7); power and failures in three facts (8); choosing and costing (9); the child cards and the symptom table (10).
- **Moved to the owners, one orienting sentence and a link left**: the H100 zoom, latency hiding and the tensor-core generations table (GPU architecture); HBM, GDDR and LPDDR mechanisms and the decode animation (Memory technology); the ring all-reduce animation, TPU pods, ICI, optical switches and Ironwood's pod (Interconnects and scaling); the card-implied 13.9% MFU prediction and the attention conventions (Performance math); Llama 3's failures by part (Power, cooling, reliability).
- **Photos** (section 7, credits under each and in `../img/CREDITS.md`, copied from the children): the A100 die, a P100 package with four HBM stacks, a GB200 NVL72 rack, eight racks of a TPU v4 pod: "at what scale was that number measured" made physical.
- **Into closed blocks**: new terms, two quick estimates (two RTX 5090s over PCIe, Llama 3's and DeepSeek-V3's layouts), interview rehearsal.

## Length judgement
| Tab | Before (230 words a minute, `html_utils/audit_pages.mjs`) | After |
|---|---|---|
| Reading | 39.8 + 1.7 | 27.7 + 2.8 |
| Chip atlas | 11.2 + 4.1 | 11.4 + 4.2 |
| Performance calculator | 17.6 | 17.8 |
| Roofline lab | 14.2 + 1.4 | 14.2 + 1.4 |
| Visuals in Reading (audit count) | 4 | 5, plus the hero map and 4 photos |

Why about 28 minutes: the topic is taught from zero, so the root holds the definitions every child assumes (FMA, SM, warp, tensor core, systolic array, SRAM, DRAM, HBM, intensity, ridge, MFU, scale-up, scale-out, RDMA, all-reduce, the formats) and the comparisons only a root can make: four engines, four memories, peaks by format, ridge points, the link ladder, eight vendors' bets, the scale ladder, prices per dollar-hour and the symptom table (about a third of the core words are tables and captions). Section 9 (choosing and costing, about 4 minutes) is the root's own job. Every section ends in a link instead of a mechanism; shorter would drop a definition the tables rely on.

## Knowledge ledger (`ledger.json`)
611 units drafted by `ledger.py init` from the page before the rebuild: core 475, depth 83, owned 28 (GPU architecture 13, Interconnects and scaling 4, Performance math 4, Memory technology 3, TPUs and other accelerators 3, Power 1; counts by the labelling script), volatile 1 (Ironwood's $12.00 price, kept in the Chip atlas and on the accelerators child), fat 24 (each with a `note`: wind-ups, run-in headings, the retired decode animation's caption, a prediction question retired with its answer). Keys were found by script (the longest phrase of each unit on the rebuilt root, then on a child) and the residue labelled by hand.

## The topic close (2026-10-24): other pages of the topic
- TPUs and other accelerators: section 4 shrunk to the chip's view (ICI and the torus defined in one paragraph, the pod photo, the slice builder with the scaling book's rule as its caption, the mesh box) with a link to Interconnects sections 6 and 7, which absorbed the topology, optical switches, Ironwood and DCN; the torus hop widget and its JS (`retired/24_js_rd_torus.js`) retired; checks updated; header 35 to 32 min. Its Interconnects card now names TPU tori and optical switches.
- Performance math: its copies of the calculator files recopied; `recompute.py` imports `act_bytes_gpt3` for its 34sbh comparison; the two correction boxes say the parent calculator now uses this page's count and states its attention convention.
- Every child's Further reading: the root's time (28 min, plus 3), sibling times as their headers, CUDA root 25 plus 4, JAX root 28 plus 13, Distributed Training 27 plus 5, Quantization 25 plus 10, inference root 28 plus 3, DeepSeek 30 plus 1, Sharding and scale 38 plus 28, training root 22 plus 22; stale descriptions fixed (Memory technology's "KV cache on 13 real configs", the Pod builder, "25 accelerators").
- Child ledgers re-keyed where a key had captured a stale time or description.
