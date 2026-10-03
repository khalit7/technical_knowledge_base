# src: End-to-End Context Compression at Scale (Latent Context Language Models, arXiv 2606.09659)

`sh build.sh` writes `../index.html` (it runs `mk_tables.py`, `recompute.py` and `mk_paper.py` first). Then:
- `python3 mk_coverage.py`: `coverage.json`, every fact of `live.md` checked against the built page.
- `node src/check_page.mjs [shots dir]` from the repo root: every control and the animation in both themes and widths (puppeteer with `headless: 'shell'`).
- `sh html_utils/checkpage.sh technical_knowledge_base/reference/papers/latent_context_language_models` from the repo root.

Rebuilding the inputs (none of this is needed to build the page):
- `python3 extract_paper.py <arXiv HTML>`: `inputs/paper_v1.txt` and `inputs/tables_v1.txt` (v1 is the only version).
- `uv run --with pymupdf python decode_figs.py <e-print>/figs`: `inputs/figs.json`, the markers of Figures 1, 4 and 5 read from the vector PDFs and the printed loss call-outs of Figures 8 to 11 (commands in the docstring).
- `inputs/configs.json`: the released 16x checkpoint's decoder, encoder and adapter shapes (Hugging Face, fetched 2026-10-03).
- `train.py`: the abandoned toy LCLM (see below), kept so the pilots can be rerun; the page does not use it.

| File | What |
|---|---|
| `live.md` | the Notion row page as fetched (saved by `save_live.py` from the session transcript) |
| `paper.json` | headline card, verdict, resources, KB links |
| `tables.json` | Tables 1 to 4, 6, 7, 12, 16, 20, 26, 30 to 33 at printed precision (`mk_tables.py`) |
| `recompute.py` | every derived number and 46 checks against printed values (speed-ups, token sums, Table 4's weighted LongBench, score granularity, loss call-outs); writes `inputs/recompute.json` |
| `train.py` | the toy LCLM in its last pilot form (decoder pre-training plus the four stages of §4.2) |
| `model/pilot/` | the logs of the eight toy designs; the first line of each log is its configuration |

## Shape, and departures from html_utils/methods/papers.md

- **The live ingredient is a simulation, not a toy model.** The paper is part systems (the claim is time and memory) and part architecture (the search). The "Simulate a long prompt" tab animates one prompt through an LCLM, through KV compression and through the uncompressed decoder, driven by the released configuration (KV bytes) and the paper's own measurements decoded from Figure 4 (time, memory); it carries the page's main correction (KV methods are slower than not compressing, so the 8.8x headline has a slow yardstick). A trained toy LCLM for the architecture claims was attempted in eight designs (from scratch as in §5, dense multi-question supervision, a smaller task, a wider model, a pre-trained toy decoder as in §4.2) and none learned key-value retrieval within the CPU budget, not even the decoder alone on raw context; shipping a model at chance would teach nothing, so the architecture claims are tested against the paper's own tables and loss call-outs instead (the claim table in Reading, the Tables tab). The logs are in `model/pilot/`; the page says so in a box on the simulation tab.
- **The figures are decoded, not transcribed.** Figures 1, 4 and 5 hold the only time and memory numbers; the e-print's vector PDFs give them exactly, and the check against Table 6 exposed that the 16x LCLM points of Figures 1 and 5 are not Table 6's model.
- **No "Then and now"**: a June 2026 result with no later lineage yet.
- **The Reading tab is long** (about 21 minutes, not counting details blocks and predict reveals; the old page was 9), because the evidence section has ten specific findings the old summary did not have, and the architecture claims needed a claim-by-claim table to show which survive at scale. The C.4 data-format rules sit in a details block; the predict widgets' details sit inside their reveals.
- KV cache sizes in the animation are computed for bf16 from the config; the "scores" and "eviction" rows of the KV pipeline are drawn generically (labelled illustrative), with FastKVzip's measured time.
- `build.sh` counts the reading time without details blocks and predict reveals (optional content); the Further reading total is summed from the resources.
