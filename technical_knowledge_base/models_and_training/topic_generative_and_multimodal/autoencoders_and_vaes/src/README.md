# Autoencoders and VAEs: latents and image tokenizers (child page, prefix `av`)

Child 1 of Topic: generative-and-multimodal (storage key `av-tab`). Built 2026-10-17 on an Apple M1 Pro; rebuilt 2026-10-23 to the teaching contract (editing only, no new runs). `sh build.sh` writes `../index.html` from `parts/`, then `fill_static.py` writes every recorded number into the static HTML.

## Tabs and parts
| tab | id | parts |
|---|---|---|
| Reading | `t-read` | `20_read_a.html` (styles, nav, top: core idea, hero, five-kinds table closed, you need, new terms, running example) to `20_read_h.html` (sections 1 to 12), `20_read_z.html` (closed depth: mistakes, rehearsal, what transfers). JS: `21_js_rd_common.js` (skill template, never autoplays), `22_js_av_0data.js` (AVD, this page's runs), `22_js_av_1lab.js` (AVL, the Latent lab subset), `23_js_av_read.js` (predicts, sprites, hero, latent spaces, random codes, interpolation, &beta; slider, loss strips, three-loss toggle, scaling factor, channels crops, same-PSNR blur), `24_js_av_pub.js` (token calculator), `26_js_av_pc.js` (collapse), `27_js_av_vq1toy.js` (2-D quantizer toy), `27_js_av_vq2main.js` (VQ runs) |
| Tokenizer comparator | `t-avtok` | `31_tab_avtok.html`, `31_js_avtok.js` |
| Further reading | `t-more` | `39_tab_more.html` |

All CSS is scoped under `.avp`. `05z_errbox.js.html` and `01_head.html` are the root's.

## Pipeline (shared venv and data of the root page: root `src/data/README.md`)
Python is `$GM_SCRATCH/venv/bin/python -I` under `nice -n 15`, 4 threads; GPU (MPS) steps only while holding the shared bench lock.

| script | device | writes |
|---|---|---|
| `train_av.py <runs>` | MPS | `runs/<run>.json(l)`; checkpoints in `$GM_SCRATCH/av/ckpt/` |
| `quant/quantizers.py` | | VQ (plain, restart, EMA, L2), FSQ (ported from the paper's appendix A.1), LFQ (MAGVIT-v2 eq. 3 to 5), on the topic's `ConvAE` |
| `quant/eval_quant.py` | CPU | `out/quant.json` (also re-scores the root Latent lab's `vq_plain` and `vq_restart`) |
| `elbo/eval_elbo.py` | CPU | `out/elbo.json` (the loss-units runs `e_*`) |
| `collapse/pixelvae.py`, `collapse/eval_collapse.py` | CPU | `out/collapse.json` (PixelCNN-decoder VAE: plain, annealed, free bits, no code) |
| `tok/roundtrip.py <key> [dtype]` | MPS | `out/tok/<key>_<dtype>.json`, reconstructions in `$GM_SCRATCH/av/tok/` |
| `tok/metrics.py` | CPU | `out/tok/metrics.json` (PSNR, SSIM, LPIPS) |
| `make_data.py` | CPU | `parts/22_js_av_0data.js` |
| `absorb_lab.py` | CPU, seconds | `parts/22_js_av_1lab.js`: the root Latent lab's runs, sprites and SD VAE measurements, copied field by field from the root's committed `src/retired/parts/31_js_lt_0data.js` (read only; moved there when the Latent lab was retired, 2026-10-24) |
| `fill_static.py` | build | writes every `data-av` value into `../index.html` (fails on an unresolved path) |
| `make_pub_table.mjs` | | the list behind the closed published-tokenizer table of section 10 (written once into `20_read_f.html`) |
| `check_data.py`, `check_page.mjs` | | data match (both data parts against their sources), every `data-av` resolves and is filled; every control at 390 px dark and 920 px light, nothing playing after scrolling |

## The 2026-10-23 rebuild: what changed and why
Ownership changed: per `OWNERS.md` this page owns the autoencoder, the VAE (encoder as a distribution, reparameterisation, KL, the ELBO in working form), posterior collapse, &beta;-VAE, VQ-VAE and discrete codes, and the latents of latent diffusion (the SD VAE and its scaling factor). The 2026-10-17 page deferred the basics to the root's Latent lab; now they are taught here, rebuilt from the lab's recorded data (no new runs, no root files edited). The ELBO derivation stays on the Math page and is linked.
- **Top**: the core idea in one sentence, a hero (four real test images through a plain autoencoder, a VAE and a VQ-VAE, the three latent forms annotated, real reconstructions and PSNR), "You need", new terms. The old "whole subject on one screen" table is a closed reference block.
- **Order follows the subject**: why a latent (drawn-to-scale bars), AE against VAE (the two 2-D latent spaces side by side, random-code samples, interpolation), the VAE (reparameterisation diagram), loss units, &beta; (slider over five runs), collapse, blur, VQ-VAE (2-D toy, usage curves, token map), FSQ and LFQ, VQGAN and tokens per image, diffusion VAEs and scaling factors (scaled against raw noising, three wrong-factor sets, 4 against 32 channels crops), evaluation (same-PSNR blur).
- **Tabs**: Quantizer playground and Posterior collapse moved into the Reading flow (each explained one mechanism); the Tokenizer comparator stays (a dataset view used by sections 10 to 12).
- **No autoplay**: template `21_js_rd_common.js` and `99_js_tabs.js`; the collapse decode animation and the comparator's crop animation became toggles; `check_page.mjs` confirms nothing plays after scrolling.
- **Static numbers**: prose numbers were filled by script; `fill_static.py` now writes them at build time, so the page reads the same without scripts and the ledger and reading-time audit see them. Script-rendered tables (loss units, collapse, VQ, FSQ/LFQ, published tokenizers) became static HTML.
- **Depth closed**: code listings, the LDM loss details, provenance of the collapse fixes, relatives (RQ, VAR, TiTok), the published tokenizer table, the generator autoencoder table and code locations, other levers (BFL, SDXL batch, Qwen-Image decoder, DC-AE), cross-paper metric scales, mistakes, design rehearsal, what transfers.
- **Correction** (visible on the page, section 8): the old page said the plain 1,024-code VQ wasted "7 extra bits per token"; it is 3 (log2 1,024 minus log2 128).
- **Deleted as fat**: wind-ups, restated headings, interview answers that restated a section, pointers to removed tabs.
- **No real image added**: a mechanism page whose pictures are its own real data; the canonical paper figures carry the arXiv default licence, which does not grant reuse.

## Length judgement
| | Before (2026-10-17 page, audit 2026-10-23) | After (2026-10-23) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 34.8 min (8,014 words) | 34.7 min (7,974 words) |
| Reading, closed details | 5.0 min | 11.7 min |
| Other tabs, core | comparator 5.0 + quantizer 2.5 + collapse 1.8 = 9.3 min | comparator 5.1 min |
| Core total, excluding Further reading | 44.1 min | 39.7 min |
| Visuals drawn in Reading (at least 120 by 80 px) | 0 | 26 |

Why about 35 minutes is right: the Reading now carries what two pages split, the root Latent lab's basics (about 30 minutes as a tab there) and this page's depth, in one order with every core idea beside its picture; yet the core reading is the same as the old page's alone and the whole page is 4 minutes shorter. Every core unit in the ledger is needed to understand one of twelve mechanisms; a large share of the core words are captions and table cells of the visuals, which carry the measured evidence. Everything a first read can skip (code, provenance, per-item tables, mistakes, rehearsal) is closed, which is why the closed time grew.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
421 units: core 319, depth 61, fat 41, owned 0, volatile 0. 373 were drafted from the old page by `ledger.py init` (after the build first wrote its numbers statically); 7 were added by hand for the old page's script-rendered tables; 41 record what was absorbed from the root's Latent lab (section "absorbed ...", `where` empty: they live here). Fat units carry a `note` saying why.

## Departures from the page-kind shape, and why
- Prose numbers are `data-av` spans written at build time from the recorded data, not typed, so a rerun cannot leave stale text.
- Absorbed visuals reuse the root Latent lab's committed data part rather than its scratch outputs, so this page rebuilds without the scratch folder and agrees with the lab by construction (`check_data.py` compares them field by field).

Sources and file:line references: `sources.md`; visuals built and rejected: `viz_ideas.md`.

## 2026-10-24, topic close
The root retired its Latent lab tab (parts moved to root `src/retired/parts/`, recordings stay in root `src/latent/out`); this page owns everything the lab taught, and the root's ledger labels those units `owned:` this page with keys such as "fd 611", "0.18159", "30.1 times higher" and "same psnr, different picture" (all present in the built page).
- `absorb_lab.py` and `check_data.py` read `src/retired/parts/31_js_lt_0data.js`; `absorb_lab.py` rerun (data unchanged), `check_data.py` OK.
- Prose that read as "go to the Latent lab" became provenance: "root Latent lab recordings", root `src/latent/sd_scale.py` and `perc_demo.py`; the loss-units table row is now "16-number VAE, &beta; = 1 (reference)".
- Further reading: the root entry rewritten (the topic as a map; no reading time quoted while the root is rebuilt); sibling times corrected to their headers (Latent diffusion 33, Video and audio 28, Tokenizers 42; Math page "about 41 min" de-duplicated). Ledger unit 359's key follows the new wording.
- Reading time unchanged: 35 min, plus 12 in closed details (audit 7,976 and 2,700 words).
- Root fat audit (2026-10-24): "Why 64 tokens of 7 bits beat 16 real numbers", dropped from the root Latent lab at close-out, restored as a closed block under the section 1 figure (ledger unit 422). Reading time unchanged.
