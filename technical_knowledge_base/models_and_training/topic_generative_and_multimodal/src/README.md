# Source of "Topic: generative-and-multimodal"

Root of the topic (storage key `gm-tab`). Built 2026-10-17 by a team of tab agents (setup, five labs, a model map, the Reading tab); rebuilt on 2026-10-24 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`) as the close-out of the topic, after its nine children were rebuilt. Editing only, no new runs.

## 2026-11-09: split layout, one 3D stage (renderer v2), explained and autoplaying animations (layout rollout)

Method: `.claude/skills/explainer-page/orchestration/briefs/rebuild-page.md` with `layout-rollout.md`, after all nine children were rebuilt in the same rollout (none edited here). Copied unchanged from the templates: `parts/02_split.html` (in `build.sh` after `01_head.html`), `parts/25_js_s3.js` (renderer v2), `parts/21_js_rd_common.js`, `parts/05z_errbox.js.html`, `parts/99_js_tabs.js` (key `gm-tab`). `build.sh` writes the em-dash test as bytes. `parts/24_js_rd_gen.js` (the section 1 card) is retired: its arithmetic moved into the scene (git history keeps the old file).

**Reading tab** (anchors `rd-top`, `rd-hero`, `rd-s1` to `rd-s10`, `rd-depth`, `rd-kids`, `rd-cost-card` unchanged; `rd-gen-card` is now the id of section 1's split):
| Section | Layout | Visual | Step list |
|---|---|---|---|
| The idea (`rd-top`) | split | the hero map (static HTML, every box a link to its child), right column | no |
| 1. Five ways to generate, three ways to understand | split, then the family table full width | **3D stage Fig. 1 `stg-fam`** (`parts/26_js_sc_fam.js`), replacing the three-canvas card | yes, 10 items (`sx-fam`) |
| 2. Latents | full width | table; links Autoencoders and VAEs Figs. 1, 2, 5 | no |
| 3. Diffusion and flow | full width | table; links Diffusion from zero Figs. 1, 4 and Flow matching Figs. 1, 3 | no |
| 4. A text-to-image system | full width | the SD 1.5 strip became a three-row table; links Latent diffusion and DiTs Fig. 1, which draws the same pipeline in 3D with times | no |
| 5. Vision encoders | full width | none; links Vision encoders Figs. 2, 5 | no |
| 6. VLMs | full width | the pipeline strip became one sentence; links Vision-language models Figs. 1, 2, 3 | no |
| 7. Native | full width | table; links Native multimodal Figs. 1, 2 | no |
| 8. Video and audio | full width | none; links Video and audio Figs. 1, 3, 4; its section 3 quote follows the child's new wording | no |
| 9. Evaluation | full width | table; links Evaluating Figs. 1, 2 | no |
| 10. Choosing | table full width, then a split | 2D calculator, now Fig. 2 (a widget; its predict prompt moved to the left) | no |
| Depth, child pages | full width | cards; times as each child's header states on 2026-11-09 | no |

**Fig. 1, `stg-fam`.** Five generation lanes, one per family, each with one white marker per sequential network call (1, 1, 49, 50, 8, to scale), the data flowing down the lane as dots and the output as an upright pixel tile; then a reading block: the pullover through a vision encoder (glass plate) into 49 patch tokens, a connector and a language model writing text, and a native model's one transformer taking text and image tokens and writing image tokens. The frames are the retired card's exact arithmetic on the page's own data: the Fashion-MNIST test pullover (`window.RDG.img`), one seeded N(0, 1) draw (the same seed), DDPM's linear schedule with DDIM timesteps 980 to 0, the straight flow path, 49 tokens of 4 by 4 pixels in raster order; the VAE lane's 8 code numbers are the first 8 values of that draw. The VAE and GAN lanes and the native output end on the target image itself (an oracle path, said in the text). Steps 3 to 5 play their frames during the step (the long-replay rule: 49 and 50 frames grouped into one explained step each). The camera moves in close on each lane and on the reading block, other lanes recede, and labels appear only once the camera has arrived. `window.GMF` exposes the counts and shares that the step list quotes; `check_stages.mjs` compares them with the list.

**Other tabs** stay full width (reader-driven tools; the lead's scope: internals unchanged). The VLM lab pipeline (`35_js_vl_1core.js`) and the Model map's two animations (`36_js_mm_1core.js`) now use a copy of the template `RD.anim`: the VLM pipeline (7 steps) and the Model map's text-to-image stack (6 steps) play once at least half in view, 4.2 s a step, pause off screen, stop for good on any control or at their last step, never under reduced motion; the Model map's timeline by year is a widget (`auto:false`) that opens on 2026 and never plays by itself. They keep their in-card captions and have no step list on the left. The Zero-shot lab has no animation.

**Kept 2D, and why**: the comparison tables (a table is the comparison), the hero (an HTML map whose boxes link the children), the calculator (a widget). The one 3D stage is the orienting map; a second stage for section 4 would redraw Latent diffusion and DiTs Fig. 1, so section 4 links it.

**Correction**: the 2026-10-24 rows below say old parts were kept in `src/retired/parts/`; that folder was never committed. The removed lab parts, among them the Flow lab data part `33_js_fw_0data.js` (read by `flow_matching/src/make_data_more.py` and `check_data.py`) and `31_js_lt_0data.js` (read by `autoencoders_and_vaes/src/absorb_lab.py` and `check_data.py`), are in git history as `src/parts/...` in the parent of commit `6a39c3922`. The Zero-shot lab's source note and the page README now say so.

**Length** (230 words a minute, `html_utils/audit_pages.mjs`): Reading 21.3 core + 4.4 closed before, 24.7 + 4.4 after (header 25 + 4; the old header's 3 closed minutes was stale). The rise is Fig. 1's step list, which carries the old card's script-written captions (invisible to the audit) plus the VAE, GAN and three reading steps; the two strips that became a table and a sentence are about the same length. Still a map: each section is a comparison or a definition with a link to the child figure that draws it. Other tabs unchanged in length (Zero-shot 7.2 + 0.6, VLM lab 19.8 + 5.3, Model map 26.4, Further reading 5.6).

**Ledger**: 1,288 units, core 344, depth 66, owned 601, fat 277, volatile 0; problems 0. Re-keyed to the rebuilt children's wording: 336, 348, 351, 359, 388 (Autoencoders and VAEs), 520, 521, 574, 575, 576 (Diffusion from zero), 660, 661 (Flow matching); re-keyed to this page's new wording: 51, 52 (the retired card, now Fig. 1's steps 5 and 6), 115 (section 4's table), 157 (section 6's sentence); 1270 re-keyed off its minutes.

**Checks (2026-11-09)**: `sh html_utils/checkpage.sh`: tabs 5, emdash 0, errbox 1, clipped 0, fail=0; `node src/check_stages.mjs` (new: the stage plays once in view, has 10 list items, reaches its last step, a list click holds; its flows stop off screen; the list's numbers match `window.GMF`; the calculator reads out; the VLM pipeline and Model map stack play in view and stop on a control; the timeline widget never moves by itself and opens on its last year; nothing moves under reduced motion; three Reading splits are two columns at 1400; no errors, NaN, undefined or sideways scroll in any tab at 1400 light, 920 light and 390 dark); the own checks below, all clean (`read/check_read.mjs` no longer drives the retired card's slider).

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
