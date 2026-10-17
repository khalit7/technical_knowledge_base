# How this page is built (prefix nm)

Child 7 of Topic: generative-and-multimodal: "Native multimodal and any-to-any models". `sh build.sh` writes `../index.html` from `parts/`.

## Tabs
- Reading (`parts/20_read_a.html` to `20_read_i.html`, closed by `20_read_z.html`; scripts `23_js_nm_fa.js` for the section 1 animation, `24_js_nm_read.js` for recorded numbers, the token viewer, the three-way decoding animation and the equal-compute table). Sections: in one screen; 1 fusion words and a pipeline-against-early-fusion animation; 2 two kinds of image token; 3 one token at a time; 4 faster decoding; 5 equal compute against the root's DDPM and flow models; 6 unified models; 7 closed systems; 8 speech; 9 native or pipeline; 10 mistakes; 11 interview questions; 12 what transfers.
- Fusion explorer (`31_*`): ten designs, attention masks on one toy request.
- Token generator lab (`32_*`): recorded samples of the tiny AR and masked models.
- Token economics (`33_*`): request tokens, cache, generation calls and FLOPs, speech budget. Its Qwen3.5 and SmolVLM ports are checked by `checks/check_tok.mjs` against the VLM sibling's recorded processor outputs (`inputs/vm_token_rules.json`).
- Further reading (`39_tab_more.html`).
Shared parts copied from the root: `01_head.html` (title changed), `05z_errbox.js.html`, `21_js_rd_common.js`; `99_js_tabs.js` with storage key `nm-tab`. The Reading CSS is the av sibling's, prefixes renamed.

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
`checks/check_tok.mjs`, `checks/check_data.py` (embedded data equals the recorded files; static numbers in prose against data), `checks/check_page.mjs` (puppeteer, every control at 390 dark and 920 light), and `html_utils/checkpage.sh`.

## Departures from the child-page method
None of substance: the Reading tab is organised by the subject's logic, three tabs hold what needs room. The old Notion page could not be read (Notion disconnected): see `coverage.md`.
