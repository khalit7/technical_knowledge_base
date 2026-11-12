# Storage and data movement page: sources, runs and checks

- `build.sh`: assembles `../index.html` from `parts/` (Reading parts `20_read_a..g.html`, tab `32_*` Sizing calculator, `39_tab_more.html`; every JS part in its own script, `99_js_tabs.js` last, storage key `sd-tab`). `02_split.html`, `25_js_s3.js` (renderer v2), `21_js_rd_common.js` and `99_js_tabs.js` are the explainer-page skill templates, unchanged (2026-11-12); `01_head.html` and `05z_errbox.js.html` are the root's. Scenes `40_js_sc_pfs.js` to `43_js_sc_burst.js` (Fig. 1 to 4). The Striping lab and Metadata storm tabs were folded into Reading on 2026-10-24: their code is `29_js_sd_stripe.js` and `29_js_sd_meta.js`, now bound to `t-read`. `24_js_sd_hero.js` draws the hero and section 3's two-families diagram, and redraws the tab when a closed block opens (a closed block has no width). Images: `../img/` (WebP, credits in `../img/CREDITS.md`).
- `parts/22_js_sd_data.js` is generated (`window.SD`); `23_js_sd_core.js` holds the shared helpers (`SD_H.mk(tab)`: renders, the step-animation controller with the 2026-11-06 motion rules, segmented buttons; `25_js_sd_ioh.js`'s `IOH.anim` delegates to it); `24_js_sd_rd.js` the Reading tab's tables and its two animations (the same 8 MiB write through NFS and Lustre; resharding reads 4 to 4, 2, 3).
- `runs/`: every measurement, all on 2026-10-16 (Apple M1 Pro, Docker Desktop VM 5 CPUs / 9.7 GiB, shared machine), all containers named `sd-*`, capped and removed afterwards.
  - `tpfs.py` (a toy parallel file system: metadata server, object servers with a 25 MB/s token bucket each, RAID 0 client; stdlib only), `run_tpfs.sh` (stripe count 1/2/4, 64 KiB stripes, four writers in four layouts, metadata storm 1 to 16 clients on 1 and 2 metadata servers), `run_tpfs_cpu.sh` (4/16/32 clients while sampling CPU).
  - `meta_real.py` (create, stat, miss, unlink at 1/4/16 processes on a Docker volume, a host folder shared into the VM and SeaweedFS S3), `s3_lab.py` (chunk map through the filer, semantics, multipart and ranged download, listing, ranged read of one safetensors tensor), `run_seaweed.sh` (SeaweedFS 4.48, `chrislusf/seaweedfs@sha256:4e61d15fd35994cb1e43e1e553dff106794841fd9a99ade2fc8c8bfce4d7872d`, one master, three volume servers, one filer with S3; boto3 mounted read-only from the host venv).
  - `run_import.sh` (strace -f -c of `pass`, `import numpy`, `import torch`, `import torch + torch.distributed + DCP` in the local image `kb-os-cont:1`, read only, Python 3.11, torch 2.14.1+cpu; `--cap-add SYS_PTRACE`, not privileged).
  - `ckpt_formats.py`, `run_formats.sh` (native torchrun, gloo, 1 thread per rank: DCP save by 4 ranks with its `.metadata` read back; safetensors single and sharded at 25 MB with an index; DCP's `HuggingFaceStorageWriter`; load into 2, 3, 4 ranks logging every byte range read). safetensors 0.8.0 installed into scratch, not into the venv.
  - `summarise.py`: `runs/out/raw/` to `runs/out/sd_data.json` to `parts/22_js_sd_data.js`. Raw records are small and scrubbed (container names only).
- `recompute.py`: every derived number in the prose (44 checks) and the sizing model `size()`; writes `out/size_cases.json`.
- `check/check_stages.mjs` (from the repo root: `node <this> [shots dir]`): the 2026-11-06 rollout checks (see the last section).
- `check/check_ui.mjs` (from the repo root: `node <this> <page folder> [shots dir]`): nothing moves after a full scroll before the reader acts; every control and every animation step at 390 dark and 920 light, no errors, NaN, undefined, null or sideways scroll; the page's sizing JS equals `recompute.py` on 8 cases. `check/check_embed.py` (from `src/`): the page embeds exactly `sd_data.json`, prose numbers equal the data, privacy grep, no file over 1 MB.
- `inputs/research_2026-10-16.md`: every external fact with its verbatim quote, URL, date and label (research notes); `facts.md`: the short list appended to the topic's shared FACTS file. `viz_ideas.md`: visuals built and rejected. `coverage.md`: no old page.

Rebuild: run the four `run_*.sh` (headers give the variables), copy their raw output into `runs/out/raw/`, then `python3 -I runs/summarise.py && python3 -I recompute.py && sh build.sh`.

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md`, organised by the storage stack (one server, parallel file systems, other designs, metadata, object stores, caches, movement, formats, sizing, checking). Departures: no old page to cover; Lustre itself could not run (kernel client modules), so the striping and metadata mechanisms are shown on a toy built for the page, with the per-server limit stated as an input and locks stated as not modelled.

## 2026-10-19: absorbed from the root's Storage lab
The root's Storage lab was cut to root depth and its measured sections moved here (verbatim copy in `../../src/for_children/storage_lab_cut/` (removed once absorbed, 2026-10-19; in git history)): big against small files and prefetch (section 4), the same checkpoint on six local stand-ins (section 6), asynchronous checkpointing and the process-group trap (section 7), checkpoint anatomy and the scale table, the five write layouts with DCP's dedup source, and the restore-error gallery (section 8), eight mistakes and five interview questions. Each moved block sits in `<div class="io-moved">` with the root lab's CSS scoped to it (in `20_read_a.html`). The charts are the root lab's code bound to this page's Reading tab (`25_js_sd_ioh.js`, `26_js_sd_io_main.js`, `27_js_sd_io_async.js`, `28_js_sd_io_read.js`) and read `window.IO_D`, written by `make_io_data.py` from the root's `src/io/out/io_data.json` (single source; `check/check_embed.py` verifies the page agrees). Method of those runs (root lab): `ckpt_anatomy.py`, `ckpt_io.py`, `s3_io.py`, `dist_ckpt.py`, `errors.py`, `data_read.py` under the root's `src/io/`, torch 2.14.1, SeaweedFS 4.48, Apple M1 Pro with Docker Desktop's Linux VM, shared machine; containers capped at 2 CPUs and 2 GB. Reading time: 29 to 34 minutes by the page's own count.

## 2026-10-24: rebuilt to the teaching contract
Editing only; no new runs. `.claude/skills/explainer-page/teaching/teaching-contract.md` governs.
- **Top**: the core idea in one sentence (a ladder of tiers, and three bottlenecks: bytes over the servers a file is spread over, names over the few metadata servers, checkpoints from every rank at once), a static hero of the storage ladder with a sourced number on each rung, "You need" and new terms. The old "in one screen" table is a closed reference block; the label legend is one small line.
- **Tabs folded into Reading**, because each explained one mechanism: the Striping lab's stripe-count animation and four-writers bars now sit beside the striping claim in section 2 (the four writers as the reveal of the predict), its byte locator and the Lustre source in a closed block, the toy's build notes in a provenance block; the Metadata storm's one-against-two-servers animation, its curve, the real-store bars and the start-up storm calculator now sit in section 4 (the real-store table and the CPU table in closed blocks), and DNE moved there from section 2. Tabs left: Reading, Sizing calculator (used by sections 4, 8 and 9), Further reading.
- **New visuals**: the hero; section 3's two-families diagram (the old section had a table and no picture); two licensed photos (a storage enclosure beside Lustre's parts, a U.2 NVMe drive beside the local tier).
- **Depth into closed blocks**: code listings (lov_offset.c, filesystem.py, the dedup planner), PFL and Data on MDT with their traps, `lfs` output, the strace output, the copy tools, S3 Express One Zone and the SeaweedFS vacuum failure, GPUDirect Storage, the stand-ins list, the async trap, sharded safetensors and DCP's safetensors writer, ByteCheckpoint, the restore errors, prefetch (loaders are Storage and loading's), eight mistakes and seven interview questions.
- **Order**: in section 7 the copy tools went into a closed block and the asynchronous-checkpoint block now follows the checkpoint path it elaborates; in section 8 the burst follows "what is in a checkpoint" and precedes DCP's files.
- **Corrections**: an interview answer said object storage costs "tens of milliseconds per request" against S3's own 100-200 ms quoted in section 5 (fixed); the two Geminis are now named apart (Amazon's SOSP 2023 system against Google's Gemini 1.0 report).
- **No autoplay**: `SD_H.anim` and `IOH.anim` no longer start on first view; `check_ui.mjs` scrolls the whole Reading tab and finds 0 animations moved at both widths.
- **Deleted as fat**: wind-ups, the old lead and reading-time line, pointers to the removed tabs, ten mistakes and eleven interview answers that restated a core section (each ledger unit carries the note).

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 49.0 min | 41.7 min |
| Reading, closed details | 8.0 min | 18.3 min |
| Other tabs, core | Striping lab 3.6 + Metadata storm 2.7 + Sizing calculator 2.4 + Further reading 2.4 | Sizing calculator 2.4 + Further reading 2.5 |
| Core explanation, Reading plus lab tabs | 55.3 min | 41.7 min |
| Visuals drawn in Reading (audit count) | 5 | 13 |

Why 42 minutes is right: the page owns a wide subject (parallel file systems and four commercial designs, object storage semantics and limits, caches, data movement between tiers and regions, checkpoint I/O at scale, sizing) and every core section carries measured runs or sourced numbers no other page has; about a third of the core words are tables (the two comparison tables, S3's semantics, the cache layers) and captions of the 13 visuals. What made the old page long (code listings, provenance, product detail, eighteen mistakes and fifteen interview answers) is now closed or cut. The closed time grew because the depth was kept, not cut.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
443 units: core 290, depth 109, fat 44, owned 0, volatile 0. 427 were drafted by `ledger.py init` from the old page; 16 were added by hand for the new visuals and for script-rendered tables and charts (their keys are written into captions). Keys were matched automatically against the rebuilt page's static text (the longest window of 3 to 9 words from the unit, numbers preferred), then every key shorter than six words without a number was reviewed by hand; labels follow where the key now lives (core outside closed blocks, depth inside).

2026-10-24 topic close: section 7 links Fault tolerance at scale section 4 (checkpointing strategies); Further reading times fixed (Fault tolerance 40 to 35, Slurm 37 to 31, Interconnects 31 to 30); ledger keys 169, 404, 405, 409 updated.

## 2026-10-26 ownership sweep
Shard sizing is owned by Data curation's Storage and loading at scale (section 7); section 4's "Pack data into big shards" keeps one sentence plus a link (ledger 96 owned there).

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js`, `21_js_rd_common.js` and `99_js_tabs.js` (key `sd-tab`); `build.sh` already wrote the em-dash it greps for as bytes. No new runs; no change to the data parts, `recompute.py` or the runs: every scene draws from `window.SD` and `window.IO_D`.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | 2D hero (the storage ladder), static | no |
| Reading | 1 One server is one pipe | full width | none | no |
| Reading | 2 Lustre's parts | split | photo (storage enclosure) | no |
| Reading | 2 The one idea | split | 2D animation, the same 8 MiB write through NFS and Lustre (mode toggle swaps the list) | yes, 7 + 5 |
| Reading | 2 Striping | split | **3D** `stg-pfs` (Fig. 1) | yes, 7 |
| Reading | 2 Four writers | split | 2D stripe-count replay (a widget, opens on the last frame) and the four-writer bars | no |
| Reading | 2 Locks, depth | full width | closed blocks | no |
| Reading | 3 Other designs | split | 2D two-families diagram; the system table full width under it | no |
| Reading | 4 import torch | full width | table, strace | no |
| Reading | 4 Real stores | split | 2D bars (log scale) | no |
| Reading | 4 Start-up storm | split | calculator | no |
| Reading | 4 More clients | split | 2D metadata replay (a widget, opens on the last frame) and the sweep curve | no |
| Reading | 4 Fixes, big against small files | full width | table | no |
| Reading | 5 Semantics | full width | table | no |
| Reading | 5 Throughput model | split | **3D** `stg-obj` (Fig. 2) | yes, 6 |
| Reading | 5 Measured, cost | split | 2D bars | no |
| Reading | 6 The problem | split | photo (a U.2 NVMe drive); the layer table full width under it | no |
| Reading | 6 When a cache helps | split | **3D** `stg-cache` (Fig. 3) | yes, 5 |
| Reading | 6 Six stand-ins | split | 2D bars with toggles | no |
| Reading | 7 Staging, checkpoint path | full width | none | no |
| Reading | 7 Asynchronous checkpoints | split | 2D timelines (a widget, 61 frames, opens on the last frame) | no |
| Reading | 7 Other regions | full width | none | no |
| Reading | 8 What is in a checkpoint | split | 2D anatomy bar; formula and scale table full width | no |
| Reading | 8 The burst | split | **3D** `stg-burst` (Fig. 4) | yes, 6 |
| Reading | 8 What this shows | split | 2D layout lanes with a toggle | no |
| Reading | 8 DCP files and chunks | full width | tables | no |
| Reading | 8 Resharding | split | 2D animation, reads by 4, 2, 3 ranks (mode toggle swaps the list, written from the recorded reads) | yes, 6 / 4 / 5 |
| Reading | 8 safetensors, formats; 9; 10; depth | full width | tables, closed blocks | no |
| Sizing calculator | | full width (a calculator; its prose is one paragraph) | | no |
| Further reading | | unchanged | | |

**Stages and their data.** Fig. 1 (`40_js_sc_pfs.js`): `SD.tpfs.stripe` (first run's layout per stripe count, write medians 22.2, 44.8, 88.7 MB/s) and `SD.tpfs.nproc` (four files spread 88.9, all on OST 0 25.0); 8 cubes stand for the first 8 MiB; column heights are bytes held. Fig. 2 (`41_js_sc_obj.js`): `SD.multipart` (80 and 112 MB/s up, 363 and 477 down), `SD.semantics.rename` (0.49 against 0.66 s), `SD.list` (5,000 keys, 5 requests); 100-200 ms and the per-prefix rates quoted from S3's documentation; sizes schematic. Fig. 3 (`42_js_sc_cache.js`): `IO_D.read_all` (the same 64 MiB as 16 files from the S3 stand-in and from a Docker volume standing in for local NVMe, 1 and 16 threads); the last step's three readers and shared cache are illustrative. Fig. 4 (`43_js_sc_burst.js`): `IO_D.slow_bind.layouts` (0.98, 2.95, 1.51 with 0.43 of gathering, 1.67 s) and `IO_D.slow_vol.layouts` (56 ms, a 0.50 s gather); the last step's nodes with their own links are illustrative. Each scene exports the numbers it draws (`SD_PFS`, `SD_OBJ`, `SD_CACHE`, `SD_BURST`) and registers itself in `window.SDSTG` for the checks.

**Animations.** `SD_H.anim` (and `IOH.anim`, which delegates to it) now follows `RD.anim`: it plays once at least half in view, pauses off screen, stops for good on any reader control or at its last step, never moves under reduced motion, marks an `ol.sx` (`list`), sets `data-playing`, and with `auto:false, start:'last'` is a widget. The 8 MiB write and the resharding reads play by themselves (4.2 s a step); their caption carousels were folded into step lists (the write's text moved from the script into the page; the resharding lists are written from `SD.loads`). The stripe-count (14 frames), metadata (13) and asynchronous-checkpoint (61) replays are widgets (the long-replay rule, case b): they open on the finished run and keep their live captions; the paragraph on their left explains them. The four-writers predict became prose beside its bars (Fig. 1 now shows the answer as it plays).

**Kept 2D** and why: see `viz_ideas.md` (curves, bars on log or time axes, byte strips, the hero's numbers; Cluster anatomy's Fig. 4 already draws the tiers in 3D).

**Checks**: `check/check_stages.mjs` at 1400 px light, 920 px light and 390 px dark: the four stages play once in view, step to the end with one list item per step, stop redrawing off screen and never move under reduced motion; the two stepped animations play once in view, set `data-playing`, step to the end and their mode buttons swap the list and replay; the three widgets never play by themselves and open on their last frame; 19 Reading splits are two columns at 1400 px and one below 1100 px; scene labels do not overlap or leave the card at 1400 px; every number in the four 3D step lists equals the data. `check/check_ui.mjs` (2026-10-24) asserted that nothing moves before the reader acts; that rule is now inverted and `check_stages.mjs` replaces that part.

**Length judgement.** Reading core 42.1 min before (9,677 words), 50.0 min after (11,499, `audit_pages.mjs`); closed details 17.6 min both times; Sizing calculator 2.4 and Further reading 2.5 unchanged. The added words are step lists: about 3 minutes were the two animations' captions, which lived in the scripts (invisible to the audit) and now sit in the page (the hidden alternative lists for NFS and for 2 and 3 ranks are counted too), and about 4 minutes explain the four new stages, written tersely where a paragraph beside them already argues the point (the layout bullets of section 8 were folded into Fig. 4's list). Nothing the ledger holds was cut. Visuals drawn in Reading: 12 before, 16 after (audit count).

**Ledger**: 447 units (core 293, depth 106, fat 44, owned 4); four added by hand for the stages (keys in their step lists); keys 43, 50, 51, 52, 133, 212, 213, 215 and 217 updated for reworded sentences. `ledger.py check` problems 0 here and on the root.
