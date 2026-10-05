# Networking foundations: source

`sh build.sh` writes `../index.html` from `parts/` (same assembly as the root's `src/build.sh`; links written `{{text|url}}`).

## Parts
- `01_head.html` (the root's CSS), `10_header.html` (tabs), `05z_errbox.js.html`, `99_js_tabs.js`.
- Reading: `20_read.html` (scoped CSS, section nav), `20_read_a` (one screen) to `20_read_r` (glossary), `20_read_z` (closes the tab).
- JS for the Reading: `21_js_rd_common.js` (RD.anim controller, copied from the root), `22_js_data.js` (generated), `23_js_rd_chart.js`, `24_js_rd_main.js` (cards, prefix calculator, measured charts), `25_js_rd_fsm.js`, `26_js_rd_cc.js`, `27_js_rd_nat.js`, `28_js_rd_mig.js`, `29_js_rd_drill.js`.
- Tabs: `31_tab_tcp.html` + `31_js_tcp.js` (TCP timeline), `32_tab_thru.html` + `32_js_thru.js` (Throughput lab), `39_tab_more.html`.

## Data
- `meas/`: every measurement, `run_all.sh <python> <scratch>` reruns them all (about 2 minutes; Python 3.13 with aioquic and certifi; ports 30000 to 30099; about 60 MB from Cloudflare's speed-test endpoint and about 120 pings to 1.1.1.1). Outputs in `meas/out/`. Local addresses are redacted by `path_mtu.py` with the root's `private_patterns.py`.
- `make_data.py` turns `meas/out/` into `parts/22_js_data.js` (and groups the QUIC qlog's packets into the recorded datagrams).
- `inputs/`: extracts of the sources read on 2026-10-05 (RFC metadata, Linux source and docs, AWS, PyTorch, NCCL, Slurm, W3Techs, Google IPv6 data).

## Checks
- `python3 check_embed.py`: the page embeds exactly the recordings; the TCP timeline's inputs equal the root's recording; every quoted measurement and derived number recomputes; the congestion animation matches an independent Python port; no secrets, home paths or local addresses.
- `node src/check_ui.mjs <out dir>` from the repo root: every control at 390 px dark and 920 px light.
- `sh html_utils/checkpage.sh <this folder>`.

## Departures from the child-page method
- Reading is about 45 minutes of prose (55 with tables), longer than most children: the brief asked for teaching from zero to pro depth on a topic Khalid never studied, with every section readable alone.
- Measurements are on one laptop and one home line (macOS, not Linux); Linux behaviour is taught from the kernel source and documentation and labelled as such. No root access: no packet captures, netem or dummynet.
