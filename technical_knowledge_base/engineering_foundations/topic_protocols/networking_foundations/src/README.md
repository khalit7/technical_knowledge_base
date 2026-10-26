# Networking foundations: source

`sh build.sh` writes `../index.html` from `parts/` (the skill's template build; links written `{{text|url}}`, `n:<id>` for other pages, so they survive the topic's move).

## Parts (rebuilt 2026-10-24)
- `01_head.html` (CSS), `10_header.html` (title, subtitle with reading time, tabs), `05z_errbox.js.html`, `99_js_tabs.js` (skill template, storage key `netfound-tab`).
- Reading: `20_read.html` (scoped CSS, section nav), `20_read_a` (the idea in one screen: core sentence, hero, you need, new terms, comparison table) to `20_read_o` (debugging, then the Reference section with drills, interview answers and glossary in closed blocks), `20_read_z` (closes the tab).
- JS: `21_js_rd_common.js` (skill template: `RD.anim` never autoplays), `22_js_data.js` (generated), `23_js_rd_chart.js`, `24_js_rd_main.js` (number cards, prefix calculator, measured charts and tables), `24a_js_rd_new.js` (hero, 5-tuple, traceroute stepper, round-trip budget), `25_js_rd_fsm.js`, `26_js_rd_cc.js`, `27_js_rd_nat.js`, `28_js_rd_mig.js`, `29_js_rd_drill.js`, `31_js_tcp.js` (TCP timeline, now Reading section 4), `32_js_thru.js` (throughput calculator, now Reading section 13).
- Tabs: only `39_tab_more.html` (Further reading).

## Data
- `meas/`: every measurement, `run_all.sh <python> <scratch>` reruns them all (about 2 minutes; Python 3.13 with aioquic and certifi; ports 30000 to 30099; about 60 MB from Cloudflare's speed-test endpoint and about 120 pings to 1.1.1.1). Outputs in `meas/out/`. Local addresses are redacted by `path_mtu.py`.
- `make_data.py` turns `meas/out/` into `parts/22_js_data.js`.
- `inputs/`: extracts of the sources read on 2026-10-05 (RFC metadata, Linux source and docs, AWS, PyTorch, NCCL, Slurm, W3Techs, Google IPv6 data).
- No new runs in the 2026-10-24 rebuild. New numbers: HPBN table 1-1 (fibre at about 200,000 km/s; New York to London 56 ms and to Sydney 160 ms round trip), fetched 2026-10-24, and derived arithmetic shown on the page (176-byte token packet, 3 against 1 round trips, CUBIC's K of about 9 s for a 1,000-segment window).

## Checks
- `PYTHONDONTWRITEBYTECODE=1 python3 check_embed.py`: the page embeds exactly the recordings; the timeline's inputs equal the root's recording; quoted measurements and derived numbers recompute; the congestion animation matches an independent Python port; no secrets, home paths or local addresses. (Without the variable, the `__pycache__` it creates trips its own privacy scan.)
- `node .../src/check_ui.mjs <out dir>` from the repo root: every control at 390 px dark and 920 px light, and no animation moves before the reader acts.
- `node .../src/shot_el.mjs <index.html> <out dir>`: screenshots of each Reading figure.
- `sh html_utils/checkpage.sh <this folder>`; `python3 html_utils/ledger.py check <this folder>`.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core sentence (one connection moves at most one window per round trip, over packets that may be lost), a new hero drawing a full segment and a streamed token's packet to scale with what each header carries (the layer model as engineers use it), "You need", six new terms, the comparison table. The reading-time note, the long "what is not here" box and the measurement provenance became one line plus a closed block; the twelve numbers are a closed block.
- **Visuals inline**: the TCP timeline tab moved into section 4 (loss) and opens on the before case (token 2 lost, timer only); section 7 has a button that sets it to the Nagle case. The Throughput lab moved into section 13; its measured-runs chart was removed because section 5's bars show the same runs. Four new visuals: the hero, the 5-tuple diagram (section 2), a traceroute stepper (section 1), a round-trip-budget slider landing on HPBN's 56 ms (section 3, the "RTT budgets" this page owns).
- **No autoplay**: template `21_js_rd_common.js`, and the mode switches of the congestion, NAT, migration and timeline cards no longer start playback.
- **Depth closed**: per-section commands, IPv4/IPv6 details and dual-stack share, SYN options and the reuse knobs, the timeline's model rules, the run table, ECN/L4S and BBR fairness, Slurm limits with its correction box, NAT table limits, PPPoE and IPv6 probing, UDP sizes, QUIC visibility and debugging, the slow-transfer checklist, kernel zero-copy work, the RDMA fabrics paragraph, Linux settings and `ss -ti`, drills, interview answers, glossary.
- **Ownership**: section 14 now teaches only where TCP is on a GPU job's critical path (bootstrap, rendezvous, NCCL's socket fallback, the network-layer hang causes) and links Interconnects and scaling for fabrics and Launching distributed training for NCCL's interface choice and launch hangs; the event loop links Concurrency.
- **Privacy**: example addresses are documentation ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24, 2001:db8::/32); the home router appears only as `<home router>` in the recording.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 54.6 min | 41.4 min |
| Reading, closed details | 2.6 min | 17.5 min |
| Other tabs, core | TCP timeline 2.1 + Throughput lab 1.8 = 3.9 min | none (both inline) |
| Further reading | 3.0 min | 3.0 min |
| Visuals drawn inline in Reading | 8 | 14 |

Why about 41 minutes is right: the page owns fifteen mechanisms that each explain a distinct production failure (addressing, ports, handshakes and TIME_WAIT, loss recovery, windows, congestion, Nagle, accept queues, NAT timers, MTU, UDP buffers, QUIC, big transfers, GPU start-up, debugging), and each keeps its number, its picture and its source; the audit also counts the captions, counters and control labels of the fourteen inline visuals. Everything not needed on first read (commands, reference tables, per-run data, provenance, rehearsal) is closed, which is why the closed time grew from 3 to 18 minutes. Further cuts would remove a mechanism, not padding.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
464 units: core 306, depth 119, fat 38, owned 1 (NCCL's interface choice, at Launching distributed training). 457 were drafted from the old page by `ledger.py init` and keyed with a script that picks the rarest phrase of each unit still on the page, then reviewed; 7 were added by hand for script-rendered visuals. Fat units are headings, one-line lead-ins, the old reading-time note and pointers to the removed tabs; each carries a `note`.

## Departures from the child-page shape
- Measurements are on one laptop and one home line (macOS, not Linux); Linux behaviour is taught from kernel source and documentation and labelled. No root access: no packet captures, netem or dummynet.
- No real images: nothing physical on this page teaches the mechanisms.

## Final sweep (2026-10-26)
The closed block "The three RDMA fabrics in one paragraph" moved to its owner, Interconnects and scaling (section 4, closed block); section 14 keeps the one-line list of fabrics and links there. Ledger units 341 to 344 are labelled `owned:systems_and_performance/topic_hardware/interconnects_and_scaling`.
