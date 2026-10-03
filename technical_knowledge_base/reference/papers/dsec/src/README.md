# DSec page: source

`sh build.sh` writes `../index.html` (runs `recompute.py`, `mk_paper.py`, `mk_figdata.py`, then assembles `parts/`).

| File | What it does |
|---|---|
| `live.md` | The Notion row page before migration, saved verbatim by `save_live.py` from the session transcript. |
| `extract_paper.py` | arXiv HTML v1 to `inputs/paper_v1.txt` (section ids marked). |
| `decode_figs.py` | Decodes every figure from the vector PDFs in the arXiv e-print (`uv run --with pymupdf`; usage in the docstring), each axis calibrated on its tick marks; writes `inputs/figs.json`. PDFs are not kept. |
| `recompute.py` | Every derived number and every text-against-figure check (`inputs/recompute.json`, shown in the figures tab). |
| `mk_figdata.py` | Thins the decoded curves (RDP, kept points are decoded vertices) into `parts/_gen_figs.js`. |
| `mk_paper.py`, `paper.json`, `tables.json` | Headline card (with the verdict), Further reading, `window.PAPER`. |
| `mk_coverage.py` → `coverage.json` | Every fact of `live.md` and where the page carries it (27 of 27 verified). |
| `check_page.mjs` | Every control in both themes and widths, every animation mode stepped end to end, mid-play screenshots, text size, overflow. |
| `inputs/` | Paper text, decoded figures, the AgentENV README head, the Hacker News item (API, 3 October 2026). |

## Departures from `html_utils/methods/papers.md`

- **Live ingredient: the paper's placement algorithm, simulated** ("Place a burst"), rather than a cost-model before/after. DSec is a systems paper, but its evaluated mechanisms (lazy loading, page-cache sharing, core scheduling) are kernel features whose cost models the paper does not give; the only algorithm it states exactly is power-of-k placement with a per-engine overlay and edge admission (§3.2, §7). The simulation runs that algorithm and three alternatives on the same burst, with the published scale (160 nodes, 32K bursts, 5,000 a second, 3,200 per node) and labelled illustrative inputs (k, engine count, refresh interval, starting load). It finds what the text does not say: small k already makes staleness harmless, and the overlay matters mainly at large k, less as engine instances grow.
- **"Tables rebuilt" became "figures rebuilt"**: the paper has three small tables and thirteen figures, all shipped as vector PDFs, so the evidence lives in the figures. They are decoded, not read by eye, and every text claim is checked against them.
- **No Then and now tab**: a 2026 infrastructure report has no later work yet; Why it matters places it (AgentENV, related work).
- **Reading tab is long (about 26 minutes)** because the paper page owns every mechanism; the per-component architecture list is folded into a details block.
- **Animations in Reading**: the request path (container or VM against FnCall), composable layers against monolithic images (to scale with Table 2), and a rollout through a preemption (V4.1 design against the earlier one). The last is an illustrative scenario built only from §6.2 and §6.3, since the paper measures none of it.

## What reproduces and what does not

All numbers come from `recompute.py`. Reproduces from the decoded figures: 45.2% and 17.3% QoS inflation, SCHED_IDLE's at most 3.4% (inside error bars at all five loads), pmem's 40.2% peak memory cut (40.3%), free-page reporting's 21.2% (21.3% over 0 to 46 min), 57% fewer writes (57.3%), 5.5× and 3.4× tar against EROFS (5.6×, 3.5×), the Figure 2, 7, 8 percentiles, the Figure 6 peaks (1,048 and 524), about 90% under 5% CPU (92%, 91%). Partly: 1.71× (curves end at 34.2 and 57.0 min, 1.67×; cold pulling ends before the 60-minute edge, not after), tar 79 against 45 min (figure about 47 for EROFS), pmem CPU 26.5% to 41.4% (27.4% to 39.4%, second burst only). Not testable: every production scale figure and the whole RL co-design (outside the paper's evaluation).
