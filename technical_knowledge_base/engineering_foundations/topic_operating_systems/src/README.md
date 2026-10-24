# Source of "Topic: operating-systems"

Root of the topic (storage key `os-tab`). Built 2026-10-05; rebuilt on 2026-10-24 at the topic close, after its eight children were rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`, `page-kinds/topic-root.md`). Editing only, no new runs.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/` (unchanged script).
- `sh html_utils/checkpage.sh <this page>`: tabs 5, emdash 0, errbox 1, clipped 0, fail=0.
- `python3 html_utils/ledger.py check <this page>`: problems 0.
- Own checks: `python3 read/code/check_embed.py` (RD_DATA equals `read/code/out/`; every number the new Reading tab quotes from those runs, recomputed; the arena pairs now checked on Memory allocators), `node read/check_read.mjs` (Reading and Further reading at 390 dark and 920 light), `python3 sim/check_embed.py` and `node sim/check_js.mjs`, `python3 debug/check_embed.py`, `python3 trace/scripts/check_embed.py`, `node trace/scripts/check_ui.mjs <outdir>`.
- Data other pages read, kept in place: `parts/22_js_rd_data.js` (Virtual memory's `gen_data.py` reads the job's maps from it; it is still embedded, and `read/code/check_embed.py` compares it), `trace/job/` (the running job, mounted by five children's runs), `trace/lab/` (the lab image), `debug/raw/swap.txt`. The three `redact.py` scripts import `engineering_foundations/topic_protocols/src`.

## Tabs and parts
| Tab | Parts | Decision on 2026-10-24, and why |
|---|---|---|
| Reading `t-read` | `20_read.html` (CSS, nav), `20_read_a` (core idea, hero, you need, new terms; the one-screen table and "How this topic knows"), `20_read_b` (1 the boundary with the cost ladder, 2 processes with a closed start-method block), `20_read_c` (3, 4 with a closed TLB block, 5), `20_read_d` (6, 7 with the two stories closed), `20_read_e` (8 with the container view closed, 9), `20_read_f` (10 symptom table and toolbox; ten questions and the OSTEP map closed), `20_read_g` (11 child cards), `20_read_z`; JS `21_js_rd_common.js` (skill template), `22_js_rd_data.js` (kept, see above) | **Rewritten as a map.** The old ten sections re-taught every child (system-call stepper, maps animation, TLB and fault charts, write journey, context-switch chart). Each section is now the definitions the comparisons need, the one distinction that only shows across the children, and a Go deeper to the owner. The old parts and their scripts are in `retired/parts/` (`20_read_*`, `23` to `27_js_rd_*`). |
| OS simulators `t-sim` | `31_*` | **Kept, smaller.** OSTEP's homework simulators across the three pieces (schedulers, the TLB on an array walk, page replacement, x86.py races and deadlock, crash consistency), each checked against OSTEP and beside a real run; children link it as the root's tool. **Retired**: 2a "Translate one address" and 3 "Copy-on-write after fork": Virtual memory owns both (section 2's walk stepper and its Address translator tab; section 7, which now carries this tab's fork measurement, 7,880 pages against 7,814 modelled, in a closed block). The translate and COW cores stay in `31_js_sim_b_core.js` so `sim/check_js.mjs` still checks them; the old UI is in `retired/parts/31_js_sim_f_cow.js` and the old `31_js_sim_e_vm.js`. Autoplay removed: nothing starts on scroll or on a mode switch. |
| Syscall tracer `t-trace` | `32_*` | **Kept.** One job's system calls across every subsystem. Autoplay on scroll removed (`32_js_tr_2core.js`). |
| Debug lab `t-debug` | `33_*` | **Kept.** 27 failures across every subsystem; children link its cases. |
| Further reading `t-more` | `39_tab_more.html` | Child entries carry each child's title and header time; neighbour times from their headers. |

## What the Reading tab keeps, and why
- **Top**: core idea in one sentence; a hero drawn in HTML (the stack from `python train.py` to the hardware, each layer a child, the system-call line priced); "You need"; twelve new terms.
- **One screen**: the eight children on six axes (what the kernel shares out, the mechanism in one line, where it bites a training job, check first, a measured number from that child).
- **Section 1**: the boundary and a log-scale ladder of sixteen measured crossings, from a 1.3 ns function call to a 0.836 s spawn-started DataLoader, each tagged with its owner. This comparison spans every child and no child draws it.
- **Sections 2 to 9**: definitions plus one cross-child distinction each (process or thread; a CPU limit is a stop; four memory numbers; freed is not returned; two kernel queues; returned is not durable; a container is not a VM; the hot path never asks permission).
- **Section 10**: the symptom-to-subsystem table with an owner column and the toolbox; rehearsal and the OSTEP map closed. **Section 11**: child cards.
- Root-owned numbers other pages rely on stay: `0.021 s` (Processes' ledger), "a long job delays everyone behind it" (Scheduling's ledger), the two storage stories (Storage cites them as the root's section 7), the TLB pointer chase (Virtual memory cites section 4).

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 57.5 min | 23.5 min |
| Reading, closed details | 2.8 min | 6.7 min |
| OS simulators | 23.9 + 3.1 | 19.9 + 3.1 |
| Syscall tracer | 23.3 + 1.1 | 23.3 + 1.1 (unchanged) |
| Debug lab | 7.4 + 0.3 | 7.4 + 0.3 (unchanged) |
| Further reading | 5.9 | 6.6 |

Why about 24 minutes is right: the core is a map (hero, one screen, child cards), the definitions each comparison needs for a reader new to OS internals (the topic is taught from zero), the cost ladder and the symptom table, which are the two things only a root can draw; every mechanism is one orienting paragraph and a link. Shorter would drop a definition a comparison relies on. The hero and ladder are HTML-drawn, so the audit's visual count (svg, canvas, img) reads 0 for Reading.

## Knowledge ledger (`ledger.json`)
762 units, drafted by `ledger.py init` from the page as built before the close: core 401, depth 85, owned 178 (Virtual memory 50, Memory allocators 30, Processes 27, Storage 23, Concurrency 15, Scheduling 15, Containers 10, Virtualization 8), fat 98, volatile 0; problems 0. Units kept here are keyed to the new text (or, for the unchanged tabs, to their own text). Owned keys are the owner's own wording of the unit, checked on its built page; where the owner lacked a unit it was added there first: Virtual memory section 7 (the list-of-ints fork run, the model, the PyTorch quote and issue 13246), Memory allocators (the dead-code trap of the first malloc strace). Units no child carries and that the root still needs stayed here in closed blocks (start methods, the container view, the TLB pointer chase, the two storage stories). Fat units carry a `note`: headings and OSTEP chapter tags (the OSTEP map carries the chapters), Go deeper pointers, journey cards restating sections, widget labels of retired figures, old child cards with stale times, question stems.

## Proposed for OWNERS.md (not edited here)
The root owns: the topic map, the boundary-cost ladder, the symptom-to-subsystem table, OSTEP's simulators (scheduling policies, TLB array walk, page replacement, x86.py races, crash consistency), the Syscall tracer and the Debug lab.
