# LLM Architecture Gallery (rasbt) and the architectural deltas that matter: how the page is built

Child 10 of Topic: llm-architecture (Notion 3c65c17b0d0d81be8a07f2562fa2030a; root 3fd5c17b0d0d8172b490dc9f9ac281df).
Rebuilt 2026-10-18 in place of the page built 2026-10-01/02 (moved in from Topic: llms). CPU only: configs parsed, no
model run, no GPU. Page prefix `ag`, storage key `ag-tab`.

## What the page is
How to read a 2026 open model's card and `config.json` in thirty seconds, and the few choices inside the decoder block
that differ between models, for every entry of Sebastian Raschka's LLM Architecture Gallery that has a readable config
(105 of 109), drawn as per-layer strips (mixer, FFN, position) with the KV cache rebuilt layer by layer.

Tabs: Reading (`t-read`), Decode a config (`t-dec`), Compare architectures (`t-cmp`),
Further reading (`t-more`).

## Files
- `inputs/models.yml`: rasbt/llm-architecture-gallery at commit 589d213a (2026-10-04), read 2026-10-18 from
  raw.githubusercontent.com, sha256 33657c01be66...e3a, Apache 2.0. Third-party summaries of vendor cards.
- `inputs/configs/`: 107 `config.json` copies. Most were fetched 2026-10-01 by the earlier build; added 2026-10-18 from
  `https://huggingface.co/<repo>/raw/main/config.json`: Aleph-Alpha/Kolibri-1 (sha256 7e691981...), NaiveAI/Naive-N0.5-Flash
  (cd73b454...), SHSLab/Step-5-Preview-BF16 (ccbbbc22...), unsloth/llama-3-8b (f3982732..., identical to the root map's copy),
  unsloth/Llama-3.2-1B (8f028e2c...), unsloth/Llama-3.2-3B (c0a6833b...), nvidia NVIDIA-Nemotron-3-Ultra-550B-A55B-NVFP4 and
  NVIDIA-Nemotron-3.5-Lightning-30B-A3B-NVFP4 (their 6.9 MB and 1.3 MB `quantization_config` blocks removed; nothing the page
  reads). Removed: nine files that were HTTP error bodies saved as JSON by the earlier build (`unsloth__Meta-Llama-3-8B.json`
  read "Invalid username or password."; eight gated repos read "Access to model ... is restricted"; BTL-3 "Entry not found").
- `inputs/kl.txt`: text of the Kimi Linear paper (arXiv 2510.26692 HTML), for Table 1 quoted in section 8.
- `gen_data.py`: decodes every config (mixer, FFN and position codes per layer; KV bytes per token; windows; indexer keys;
  recurrent state; experts; RoPE), compares with the gallery, writes `out/gallery.json`, `out/census.json`,
  `out/report.txt` and `parts/22_js_ag_0data.js` (window.AGD). The decoding is the root Architecture map's
  `src/map/build_map.py` derive(), copied branch for branch; branches marked GALLERY cover configs the map does not carry.
  A tracking dict records which config fields each row was decoded from (shown on the Decode tab).
- `checks/hf_layer_types.py` (topic venv, transformers 5.20.1, CPU): builds each config with its transformers class and
  compares transformers' own per-layer list with the mixer strip -> `out/hf_layer_types.{json,txt}`: 59 agree, 0 differ.
- `checks/cc_agree.mjs`: runs the root Config calculator's core (`../src/parts/33_js_cc_1core.js`) on every config it
  models; KV at 5 contexts equals this page's for 44 models -> `out/cc_agree.json`.
- `checks/js_eq_py.mjs` + `checks/check_data.py`: page data equals `out/`; the page's JS equals the Python on all rows;
  the 27 models shared with the root map are identical field for field; 55 prose claims checked against the data;
  pasted outputs are the real outputs.
- `checks/check_controls.mjs`: puppeteer, every control at 390 px dark and 920 px light, every model through the Decode
  tab and the Cache animation, reduced motion; optional screenshots to a folder outside the repo.

## Rebuild
```sh
cd <page>/src
python3 gen_data.py                       # repo .venv (PyYAML)
<topic venv>/bin/python3 checks/hf_layer_types.py > out/hf_layer_types.txt
node checks/cc_agree.mjs
sh build.sh && python3 checks/check_data.py
# from the repo root:
sh html_utils/checkpage.sh <page>
node <page>/src/checks/check_controls.mjs <page>/index.html
```

## Departures from the child-page shape, and why
- Generic mechanism sections of the earlier build (RMSNorm/LayerNorm demo, RoPE dial and YaRN bands, the GQA, MLA, DeltaNet
  and KDA derivations, the MoE summary, the KV calculator with presets) were removed: since 2026-10-18 they are owned by the
  sibling pages (attention_variants, positional_encodings, normalisation_residuals_and_stability, beyond_attention,
  mixture_of_experts) and the root's Config calculator. The page keeps what the topic gave it: reading a card and config,
  the per-layer strips, the attention ladder, and the deltas measured across released models. `coverage.md` lists where
  every old claim went.
- No local training or model runs: the subject is configs; "measured" means a script parsed configs on the Mac.
- The running example (the tiny GPT) appears as one row of the gallery, decoded by the same code, rather than as a lab.

## 2026-10-23 pilot: one owner per concept
Attention mechanisms now have one owner, Attention variants, and whole-model KV-cache sizing has one, Long context (teaching contract, "one owner per concept"). This page repeated both, so:
- **Moved to Attention variants:** section 5's seven-design attention ladder animation (`25_js_ag_ladder.js`, removed) and its per-layer 128K numbers; its hero figure now carries what each variant leaves behind. Section 5 is now one paragraph, "Seven answers to one question", that names the answers and links the owners (Attention variants; Beyond attention for the recurrent ones). The Motif 3 "field name as a cache design" mistake (530 KiB per token) is carried there too; Motif's correction in section 1 stays here.
- **Moved to Long context:** the Cache at context tab (`33_tab_ctx.html`, `33_js_ag_ctx.js`, removed): the memory-per-request formula, the one-request animation, the compare-models plot and its defaults (Gemma 3 27B 10.41 GiB, gpt-oss-120b 4.50 GiB, Qwen3-Next's 72 MiB state). Links that pointed at `#t-ctx` now point at the KV-cache calculator (`#t-kv`) on Long context.
- **Kept here:** the ratio-count surveys, section 7's window counts and the Llama 4 chunk drill (with a link added for the mechanism), the corrections of the gallery's figures, the Gemma 3 placement sentence in section 4 (it explains the strips).
- `src/ledger.json` lists only the removed units with the key string that proves the owner carries each (`python3 html_utils/ledger.py check`: problems 0).
- Also: animations no longer autoplay (`21_js_rd_common.js` replaced from the skill template; the same autoplay start removed from `anim` in `23_js_ag_1core.js`, used by the Decode a config tab); the tab script opens a tab named in the URL hash; the header reads "Reading: 30 min, plus 3 in closed details.", measured with `html_utils/audit_pages.mjs` (it counts script-rendered text, so it is set by hand; the build's own counter, which does not, gives 22 and 4).
- Not changed, flagged: section 13 says two Nemotron configs make the root Config calculator throw a TypeError. Re-running `checks/cc_agree.mjs` on 2026-10-23 gives a different picture: the calculator now rejects four Nemotron 3 configs with an explicit "Nemotron MoE layers ... are not modelled here" error, 42 of 46 models agree. The sentence and `out/cc_agree.json` were left as they were for the full rebuild.
- Length: the Reading tab stays at 30 minutes of core text (most of the ladder's words were step captions shown one at a time), the page loses the Cache at context tab (about 3 minutes) and 32 KB. What left is carried by the owners; what stays is this page's own survey of released configs. Side effect to fix in the full rebuild: the ladder was the Reading tab's only SVG figure, so the audit now counts no inline visual there (the strips and tables are HTML).

