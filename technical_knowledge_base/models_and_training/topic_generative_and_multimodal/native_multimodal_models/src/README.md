# How this page is built (prefix nm)

Child 7 of Topic: generative-and-multimodal: "Native multimodal and any-to-any models". `sh build.sh` writes `../index.html` from `parts/`.

## Tabs and parts (rebuilt 2026-10-24 to the teaching contract)
- Reading (`parts/20_read_a.html` to `20_read_i.html`, closed by `20_read_z.html`). Sections: the idea in one screen (core sentence, hero design grid, you need, new terms, what was measured, the seven-design table closed); 1 early against late fusion with the pipeline-against-early-fusion stepper; 2 two kinds of image token; 3 one token at a time (stepper of one image written, the sweep chart, the 45-setting grid and the sampling code closed); 4 faster decoding (comparison table, method details closed, three-way stepper); 5 equal compute; 6 unified models (the fusion explorer inline, the Transfusion parity chart, scores and Chameleon provenance closed); 7 interleaved data and modality balance (new: data-mix bars, loss weights, MoT diagram and savings); 8 closed systems; 9 speech (cascade and Moshi frame diagram); 10 native or pipeline; 11 depth (six mistakes, two design questions, what transfers, all closed).
  Scripts: `23_js_nm_fa.js` (section 1 stepper), `24_js_nm_read.js` (recorded numbers, token viewer, heat maps, three-way stepper, equal-compute chart), `25_js_nm_fx.js` (fusion explorer, was the Fusion explorer tab), `26_js_nm_gen.js` (sweeps, 45-setting grid and the token-by-token stepper, was the Token generator lab tab), `27_js_nm_sp.js` (Moshi frame diagram).
- Token economics (`33_*`): request tokens, cache, generation calls and FLOPs, speech budget. Its Qwen3.5 and SmolVLM ports are checked by `checks/check_tok.mjs` against the VLM sibling's recorded processor outputs (`inputs/vm_token_rules.json`).
- Further reading (`39_tab_more.html`).
Shared parts: `01_head.html` (title changed), `05z_errbox.js.html`; `21_js_rd_common.js` and `99_js_tabs.js` are the explainer-page skill templates (never autoplay; storage key `nm-tab`). `prefill.py`, run by `build.sh`, writes every recorded number (`data-nm` spans) into the static HTML so the page reads without JavaScript and the ledger check can find them.

## Runs (Apple M1 Pro, MPS under the bench lock, PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45; one model per process)
1. `ar/tokenize_data.py` (CPU): the 70,000 images as 64 tokens with the av sibling's FSQ-1000 tokenizer and the Latent lab's VQ-128; reconstruction FD on 1,000 validation images; FLOPs of TinyUNet and the transformers. Out: `out/tokenize.json`; tokens in `GM_SCRATCH/nm/`.
2. `ar/train_ar.py ar_fsq1000`, `mask_fsq1000`, `ar_vq128`: the Diffusion lab's recipe at its training FLOPs. Out: `ar/runs/*.json(l)`, checkpoints in `GM_SCRATCH/nm/ckpt/`. (The masked model first stopped with an MPS out-of-memory error about 200 steps in, twice, once in a shared process and once alone; its loss used boolean indexing, whose shape changes every step. With a fixed-shape loss it peaked at 2,498 MiB. Each model now runs in its own process.)
3. `ar/sample_ar.py`: every setting at N = 1,000, fixed uniforms per (sample, position); greedy, temperature, top-k, guidance, the 45-setting grid, masked rounds 1 to 64, VQ-128; batch-1 timing; recorded probabilities. Out: `out/samples.json`, images in `GM_SCRATCH/nm/samples.npz`.
4. `ar/mistakes.py` (CPU): the shared-vocabulary IndexError and the wrong-tokenizer decode. Out: `out/mistakes.json`.
5. `make_data.py`: `parts/22_js_nm_0data.js` and `out/images/*.webp` (small sprites kept in the repo so the page rebuilds without scratch).
The DDPM and flow numbers are the root labs' recorded JSON (`src/diff/out`, `src/flow/out`), not re-run.

## Sources
`inputs/published_ar.md`, `inputs/published_unified.md`, `inputs/published_closed_omni.md` (verbatim quotes with versions, collected 2026-10-17), `inputs/published_api_tokens.md`, `inputs/source_lines.json` (transformers v5.20.1 lines located by `checks/source_lines.py`). `facts.md` lists the verified facts this page adds.

## Checks
`checks/check_tok.mjs`, `checks/check_data.py` (embedded data equals the recorded files; static numbers in prose against data), `checks/check_page.mjs` (puppeteer, every control at 390 dark and 920 light; tabs t-read, t-nmtok, t-more), and `html_utils/checkpage.sh`.

## The 2026-10-24 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing only, no new runs.
- **Top**: the core idea in one sentence and a static hero, the design grid (what an image becomes going in against how it is written out, every named model placed, cells linking to their sections); "You need" (VLM, autoencoders, diffusion, flow siblings); seven new terms; the measured summary written statically; the old "In one screen" table closed as reference.
- **Lab tabs folded into Reading.** The Fusion explorer became the visual of section 6 (masks and losses are what separate the unified designs); the Token generator lab's token-by-token stepper and sweep chart became section 3's visuals, its 45-setting grid a closed block. Token economics stays a tab: a calculator used by sections 2, 8 and 9.
- **New visuals where a core idea had none**: the hero grid; Transfusion's parity FLOP ratios on six metrics (section 6, Table 3); the data-mix bars (Chameleon, Transfusion, Janus and Janus-Pro) and the MoT diagram with its savings (section 7); the cascade against Moshi's 17-tokens-per-80-ms frame diagram (section 9). The temperature table was replaced by the sweep chart, which carries the same rows.
- **New section 7, interleaved data and modality balance**, which this page owns but barely covered; every number is from `inputs/published_unified.md` (Chameleon 2.2.1, Transfusion 1 and 3, Janus-Pro 2.2 and 2.3, MoT abstract and 6.1, BAGEL 2.2, Llama 4 blog). MoT's figures moved here from section 6.
- **No autoplay**: template controller; the two mode switches that called `play()` (sections 1 and 4) no longer do. Checked under normal and reduced motion: all three steppers stay on step 0.
- **Closed (depth)**: the four faster-decoding methods' details, Chameleon's evidence and release, Emu3's numbers, unified-model scores and Gemma's config, the Gemini API units, AnyGPT and licences, NExT-GPT, the sampling code, positions-per-image table, six mistakes, two design questions, what transfers.
- **Deleted as fat** (23 ledger units, each with a note): wind-ups and headings, pointers to removed tabs, the greedy and "native means no encoder" mistakes (the core shows both), six interview answers that restated sections 1 to 6.
- **Figures at least 11 px**: the fusion explorer's labels went from 9 to 11 px (column labels turned); the heat-map numbers from 9 to 11 px.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `audit_pages.mjs`) | 8,068 words, 35 min | 7,515 words, 33 min |
| Reading, closed details | 1,081 words, 5 min | 2,690 words, 12 min |
| Other tabs, core | Fusion explorer 375, Token generator lab 446, Token economics 678: 6.5 min | Token economics 678: 3 min |
| Core of the subject (Reading plus lab tabs) | 41.5 min | 35.6 min |
| Visuals inline in Reading | 8 | 15 |

Why 33 minutes is right: the Reading tab now holds what two lab tabs used to carry (the explorer and the generator's stepper and sweeps, about 820 words of captions and controls) and a new section on data and balance that this page owns, while the core of the subject fell by six minutes. Every core unit explains one of the two design choices in the hero, measures its price on the running example, or records what a design's own document says. What could still go: the closed-systems table (section 8) is long, but it is the only place the omni systems' disclosures and silences are set side by side, which this page owns.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
351 units: core 245, depth 83, fat 23. 335 were drafted from the old page by `ledger.py init`; 16 were added by hand (script-rendered tables and the explorer, the moved lab, and the new section 7 and figures). Fat units carry a `note`.

## Departures from the child-page method
The Reading tab is organised by the subject's logic; one tool tab (Token economics) remains. The old Notion page could not be read (Notion disconnected): see `coverage.md`.

## 2026-10-24, topic close
- Section 9 keeps the Moshi frame diagram only for the native-against-cascade point: its caption and the Moshi bullet no longer teach the streams (inner monologue, temporal and depth transformers, acoustic delay); they link Video and audio generation section 8, which owns them. Ledger: units 202, 218 and 351 are `owned:` Video and audio generation; 352 and 353 added for the trimmed bullet and caption.
- The root's Diffusion, Flow, Latent and VLM labs are retired or slimmed: references that read as places to visit now name the owning child (SmolVLM's 1,088 tokens and Flamingo's gate: Vision-language models; DDPM recipe: Diffusion from zero; VQ training: Autoencoders and VAEs); the reused DDPM, flow and VQ-128 numbers keep their provenance as "root ... lab recordings" (root `src/diff/out`, `src/flow/out`). The generated `22_js_nm_0data.js` still labels two equal-compute rows "(Diffusion lab)" and "(Flow lab)" as provenance; regenerating it needs the scratch sample files, so it was left.
- The pointer to Autoencoders and VAEs' tokenizer table now says its section 10 (was 8).
- Further reading: root card rewritten (no Reading section number, no lab tabs); every quoted time matches its target's header (`html_utils/check_times.py`: 0 stale).
- Reading time unchanged (7,491 core and 2,694 closed words: 33 min, plus 12).
