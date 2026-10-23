# Mistral AI, interactive page (v3)

`visual.html` replaces all the text of the Notion page "Mistral AI" (https://app.notion.com/p/3c65c17b0d0d814a9882e6ebc326fa56, child of Topic: llm-landscape). The page has no child pages, databases or video (only the old HTML embed), so one `replace_content` (embed first) is allowed. Old text: `live.md` (backup `live_before_delete.md`). `coverage.json` maps every fact to where the HTML carries it.

## Build
`./build.sh` concatenates `parts/` into `visual.html`: HTML `00_top`, `01_css`, `02_header`, `03_read_a` (intro, Mistral 7B, cache animation), `04_read_b` (Mixtral, MoE animation, routing chart, current line, lineage, Shieldstral/Robostral/Leanstral), `05_read_c` (training and GRPO calculator, licences and chooser, business, catalogue, AA position, which model, mistakes), `06_tabs` (Lineage, Weights and cache), `07_more`; then the jsErr box, `05z_errbox.js.html`, and one `<script>` per JS part: `10_js_common`, `11_js_swa`, `12_js_moe`, `13_js_read`, `14_js_line`, `15_js_fit`, `90_js_tabs`. Links are `{{text|@alias}}` or `{{text|n:<notion id>}}`; the build fails on unknown aliases and reports unexpanded links or em-dashes, and fills in reading time and resource time.

## Data and checks
- `recompute.py`: parameter counts and KV sizes from the configs in `src/` (`parts_params.json`).
- `factcheck.json`: every claim of the old text checked against sources (subagent); `src/` holds the fetched sources.
- `node tabshot.mjs <tab> <scheme> <width> <out>`, `node snap.mjs ...` (element shot after running JS); `shots/`.
- `node check.mjs` exercises every control in both themes and widths; `node check2.mjs` checks animation frames, reduced motion and the accounting table; `node render.mjs` writes `rendered.txt`; `python3 mk_coverage.py` writes and verifies `coverage.json`.

## 2026-10-23 pilot: KV-cache sizing has one owner
Whole-model KV-cache sizing now lives only on [Long context](n:3fd5c17b0d0d81059ee1ce20c0326dc5) (KV-cache calculator, tab t-kv, 45 presets); this page keeps a one-line conclusion and a link. The "Weights and cache" tab became "Weights": section 3 (cache per sequence against context) was removed and section 2 lost its context and sequence sliders and cache column, keeping weights at BF16, FP8 or 4-bit against H100, H200 and an 8 x H200 node (still reproducing the Large 3 FP8 node claim). One summary sentence (5.6 GiB on Small 4, 17.2 GiB on Large 3, 88 GiB on Medium 3.5 at 256K) links the calculator, where every Mistral model is a preset. The Reading tab's Mistral 7B rolling-buffer example stays (sliding windows are Mistral's own choice). Core reading 27 min, unchanged. Removed units and where the owner carries them: `src/ledger.json` (`python3 html_utils/ledger.py check`). Also: animations no longer autoplay (they wait on step 0), a tab named in the URL hash opens, and the header reading time uses the "Reading: N min, plus M in closed details." format.
