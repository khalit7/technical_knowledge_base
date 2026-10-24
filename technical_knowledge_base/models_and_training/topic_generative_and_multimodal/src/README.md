# Source of "Topic: generative-and-multimodal"

Root of the topic (storage key `gm-tab`). Built 2026-10-17 by a team of tab agents (setup, five labs, a model map, the Reading tab); rebuilt on 2026-10-24 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`) as the close-out of the topic, after its nine children were rebuilt. Editing only, no new runs.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/`.
- `sh html_utils/checkpage.sh <this page>`: tabs 5, emdash 0, errbox 1, clipped 0, fail=0 (2026-10-24).
- `python3 html_utils/ledger.py check <this page>`: problems 0.
- Own checks (2026-10-24, all pass): `read/check_data.py`, `node read/check_read.mjs <shots>`; `vision/check_data.py`, `node vision/check_vs.mjs <shots>`; `vlm/check_data.py`, `node vlm/check_calc.mjs`, `node vlm/check_vl.mjs <shots>`; `cd map && node check_tab.mjs ../../index.html <shots>`.

## Tabs and parts
| Tab | Parts | Decision on 2026-10-24, and why |
|---|---|---|
| Reading `t-read` | `20_read.html` (CSS, nav), `20_read_a` (core idea, hero map, you need, new terms, running example, section 1), `20_read_b` (2 latents, 3 diffusion and flow, 4 a text-to-image system), `20_read_c` (5 encoders, 6 VLMs, 7 native, 8 video and audio), `20_read_d` (9 evaluation, 10 choosing and the cost card), `20_read_e` (closed depth), `20_read_f` (child cards), `20_read_z`; JS `21_js_rd_common.js` (skill template, never autoplays), `22_js_rd_data.js`, `23_js_rd_drills.js`, `24_js_rd_gen.js`, `25_js_rd_cost.js` | Rewritten as a map (below). |
| Zero-shot lab `t-vision` (was Vision lab) | `34_tab_vision_a.html`, `34_js_vs_*` | **Slimmed.** Keeps only what Vision encoders leaves to the root: the zero-shot prompt study on 10,000 Fashion-MNIST images (prompt sets, confusions, the capitalisation trap, "5,725" T-shirt/top, linear probes) and the CPU timings. Patches, the contrastive loss on the real matrix, temperature and batch size, the chunked sigmoid, the typographic attack and minimal pairs moved to Vision encoders (its `runs/make_lab_data.py` reads the same `vision/out`). Old parts in `retired/parts/` (`34_tab_vision_a/b/c.html`, `34_js_vs_2patch.js`, `34_js_vs_3sim.js`, `34_js_vs_4zs_probes.js`). `vision/check_data.py` now looks for the moved prose on Vision encoders too. |
| VLM lab `t-vlm` | `35_*` | **Slimmed.** Section 1 (connectors, Flamingo), section 5's training-stage teaching and the hallucination explanation are one paragraph and a link to Vision-language models (sections 1, 6, 7); four interview answers that restated that page were cut. Kept: SmolVLM measured end to end (real vectors through the pipeline, token counts and the exact prompt, the parameter split, 30 known-answer questions, the POPE-style probe data, long descriptions, time and memory), which that page reuses but does not show. Old parts in `retired/parts/35_tab_vlm_*.html`. |
| Latent lab `t-latent`, Diffusion lab `t-diff`, Flow lab `t-flow` | `retired/parts/31_*`, `32_*`, `33_*` | **Removed.** Autoencoders and VAEs, Diffusion from zero and Flow matching now teach everything these labs taught, from the labs' own recordings. The data parts stay at `retired/parts/31_js_lt_0data.js` and `33_js_fw_0data.js` because `autoencoders_and_vaes/src/absorb_lab.py` and `check_data.py`, and `flow_matching/src/make_data_more.py` and `check_data.py`, read them there; the recordings in `latent/out`, `diff/out`, `flow/out` are read by those children and by Diffusion from zero, and must stay. The lab scripts (`latent/make_data.py`, `diff/make_page_data.py`, `flow/make_page_data.py`) still write to `parts/`; move the output to `retired/parts/` if they are ever rerun. |
| Model map `t-map` | `36_*` | **Kept** (root-owned data that spans every child). Its go-deeper note now points at the Reading tab and the children; its step controller no longer plays on first view. |
| Further reading `t-more` | `39_tab_more.html` | Tabs and children with their header times, in reading order; stale times of neighbouring topics corrected. |

## What changed in the Reading tab
- **Top**: the core idea in one sentence, a hero map (two pipelines from shared parts, every box a link to the child that owns it), "You need", eight new terms, the running example and labels as static text.
- **One comparison per section**, each with an orienting paragraph and a Go deeper link: the five families table and the three-ways card (section 1, cross-child, kept); the three kinds of autoencoder (2, new table, replacing the AE, VAE, VQ and scaling-factor paragraphs); diffusion against flow with the measured equal-steps result (3); SD 1.5's three networks with counted parameters and measured seconds (4); encoders, zero-shot numbers from the Zero-shot lab (5); the VLM pipeline and token counts (6); native designs as a table (7); video and audio, linking Video and audio generation's hero and section 3 (8); evaluation as five questions, five kinds of number, each with its owner (9); choosing and the cost card (10).
- **Re-teaching removed**: diffusion in four sentences, samplers, CFG details, flow in three sentences, few-step distillation, the SD autoencoder's losses, conditioning, DiT and MMDiT paragraphs, CLIP and SigLIP details, the training recipe, the FID formula and pitfall list, the FID predict, eight mistakes and eight interview answers. Each is now one line or a link to its owner.
- **Closed depth**: mistakes that cross pages (one line each with the owning page), five facts kept from the retired labs that no child carries yet (listed below), the FID-bias toy (`read/fid_bias.py`), two design questions.
- **No script-filled prose**: the `data-rd` fills are static HTML; `22_js_rd_data.js` keeps only the pullover image and the seconds per pass (`read/make_read_data.py` would rewrite the old fields: trim them again if it is rerun). `read/check_data.py` checks the embedded subset and still checks every recorded sentence in `read/read_data.json` against the recordings.
- **Correction**: the Vision lab's "falls from ln 8 = 2.079 at t = 1" (ln 8 is the loss at t = 0; at t = 1 it is 1.94, per Vision encoders) left the root with the section that held it; Vision encoders states it correctly.

## Length judgement
| | Before (2026-10-24, audit) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 31.1 min | 21.3 min |
| Reading, closed details | 7.3 min | 3.1 min |
| Latent lab | 24.2 + 2.9 | removed |
| Diffusion lab | 20.3 + 1.4 | removed |
| Flow lab | 27.2 + 3.6 | removed |
| Vision lab, then Zero-shot lab | 24.7 + 3.4 | 7.2 + 0.6 |
| VLM lab | 22.5 + 6.3 | 19.8 + 5.3 |
| Model map | 26.4 | 26.4 |
| Further reading | 6.1 | 5.6 |
| Page size | 1.43 MB | 0.58 MB |

Why about 21 minutes is right: the core is now a map, the comparisons that only show across children (families and calls per sample, the three autoencoders, diffusion against flow at equal steps, what one image costs, encoders and zero-shot, VLM tokens, native designs, evaluation's five questions, choosing) and the definitions they need. No mechanism is explained step by step; each is one orienting sentence and a link. Shorter would drop a comparison or a definition a comparison relies on.

## Knowledge ledger (`ledger.json`)
1,288 units: core 326, depth 66, owned 364 (Autoencoders and VAEs 100, Flow matching 93, Diffusion from zero 90, Vision encoders 59, Vision-language models 9, Latent diffusion 5, Native multimodal 4, Evaluating 3, Video and audio 1), fat 532, problems 0. 1,272 drafted by `ledger.py init` from the page as built on 2026-10-17; 16 added by hand for the script-filled Reading sentences (`RDG.lab`). Keys were found by script (phrases of five or more words, or distinctive numbers, on the root or the owner) and the rest labelled by hand. Fat units carry a `note`: most are headings, wind-ups, widget instructions, question stems and source lists of the retired labs, or lab sentences whose numbers were filled by script from recordings the owning child now embeds (the static text of those sentences had blanks where the numbers were).

## For the children (units kept here until they absorb them)
In the closed block "Kept from the retired labs" of the Reading tab:
- Vision encoders: CNN inductive bias and the 2L + 1 receptive field; raw cosines do not compare across models (0.3 against 0.1 to 0.2); the CAT sticker 0.2926 against 0.2846; temperature too high or too low (CLIP clipped its scale at 100).
- Vision-language models: Flamingo-80B on the 70B Chinchilla.
- Flow matching: training took 893.3 s against the DDPM's 906.7 s; diffusers' shift formula (line 351).
- Diffusion from zero: DPM-Solver++ 2M as the SD 1.5 default (scheduler line 227).
- Autoencoders and VAEs: 28 to 43 distinct codes per image on the 128-code token map.
- Evaluating generative models: the numpy FID-bias toy (3.3324 at n = 500 down to 0.0331 at 50,000).
