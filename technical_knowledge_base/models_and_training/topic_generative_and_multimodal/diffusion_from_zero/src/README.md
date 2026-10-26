# Source of "Diffusion from zero: DDPM, samplers and guidance"

Child page 2 of Topic: generative-and-multimodal (prefix `dz`, storage key `dz-tab`). `sh build.sh` writes `../index.html` from `parts/`, then `runs/fill_static.py` writes the recorded numbers and sentences into the HTML as static text.

Tabs (since 2026-10-24): Reading and Further reading.
| Part | What |
|---|---|
| `20_read_a.html` | styles, section nav, the idea in one screen (core sentence, hero, you need, new terms, running example, the five decisions) |
| `20_read_b.html` | 1 forward process (slider), 2 schedules (the schedule designer, the brightness leak, offset noise, zero terminal SNR, resolution) |
| `20_read_c.html` | 3 the denoiser, targets, the training step, error by timestep, one step epsilon against v, loss weighting, training details |
| `20_read_d.html` | 4 three views and the exact-score toy; 5 samplers (trajectory stepper, sampler table, eta, DPM-Solver++, spacing, the workbench, why the stochastic sampler won) |
| `20_read_e.html` | 6 guidance (CFG from zero, the tiny-model strips, the fixes, SD 1.5 sets, accuracy against FD); 7 one orienting sentence on distillation (owned by latent diffusion, section 10) and the measured LCM-LoRA run |
| `20_read_f.html` | 8 when it goes wrong (bug strips, closed causes, the symptom table) |
| `20_read_y.html`, `20_read_z.html` | closed interview rehearsal; closed runs and sources; footer |
| `39_tab_more.html` | Further reading |
| JS | `20_js_dz_0data.js` (window.DZ, from `runs/make_data.py`), `20_js_dz_0more.js` (window.DZX, from `runs/make_data_more.py`), `21_js_rd_common.js` (skill template: never autoplays), `22_js_dz_common.js` (schedules, PRNG, line chart), `23_js_dz_toy.js` (the exact-score toy), `24_js_dz_rd.js` (predictions, toy animation, weighting chart, hedging toy, bugs), `25_js_dz_samp.js` (workbench), `26_js_dz_sched.js` (designer), `27_js_dz_guide.js` (guidance cards and the SD image cards), `28_js_dz_lab.js` (hero, forward slider, error by timestep, one-step strips, trajectory stepper), `99_js_tabs.js` (template) |

It builds on the root's Diffusion lab (`../../src/diff/`): the same checkpoint (`df_ddpm_eps_4000`), noise seeds, chunking and classifier-space scoring, so every tiny-model number lines up with the lab's; `dz_sample.py samplers` first reproduces two of the lab's numbers. The lab's recordings are read from `../../src/diff/out/` and never recomputed.

## Runs
```sh
export GM_SCRATCH=<shared setup folder>; PY="nice -n 15 $GM_SCRATCH/venv/bin/python -I"
$PY runs/gmm_toy.py; $PY runs/recompute.py                      # CPU, seconds
# GPU, each under the bench lock (lock.sh acquire bench dz ... release), one at a time:
$PY runs/dz_train.py bad; $PY runs/dz_train.py more             # 2.3 min and about 15 min
$PY runs/dz_sample.py samplers; $PY runs/dz_sample.py extra; $PY runs/dz_sample.py guide
$PY runs/dz_sd.py                                                # SD 1.5 fp16 + LCM-LoRA; needs peft in GM_SCRATCH/dz/pylib
$PY runs/make_data.py                                            # needs the strips in GM_SCRATCH/dz (not in the repo)
python3 runs/make_data_more.py                                   # plain Python: the root lab's recordings into window.DZX
sh build.sh
python3 runs/check_data.py      # page embeds exactly out/page_data.json and out/page_data_more.json; static numbers; prose claims
node runs/check_toy.mjs         # JS toy and schedules against Python
node runs/check_page.mjs <dir>  # every control, 390 dark and 920 light, card screenshots, no animation moves before the reader acts
```
peft 0.21.2 (needed by diffusers' LoRA loader) was installed with `uv pip install --target GM_SCRATCH/dz/pylib peft --no-deps`, not into the shared venv. Large outputs (strips as .npz, full-size SD PNGs, the two checkpoints) are in `GM_SCRATCH/dz/`; `out/` holds the small recorded results and 256-pixel WebP thumbnails. `make_data.py` could not be rerun on 2026-10-24 (the scratch strips were gone), so window.DZ is unchanged and one sentence in it that pointed at a removed tab is corrected through `DZX.txt` (see `make_data_more.py`).

Notes: `facts.md` (every verified fact and measurement), `viz_ideas.md`, `coverage.md`, `ledger.json`, `inputs/published.json` (numbers transcribed from 20 papers with table and page).

## The 2026-10-24 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`). OWNERS.md makes this page the owner of diffusion from zero: the forward process, the denoiser and its target, the training loss, samplers, guidance and schedules. The old page assumed the root's Diffusion lab had taught the first half; it now teaches it.
- **Top**: the core idea in one sentence; a static hero (one dress noised in closed form at five timesteps, the denoiser, and a recorded 20-call DDIM run showing the model's guess as it forms); "You need" with links for the derivations and architectures; new terms; the running example; the five decisions table.
- **Absorbed from the root Diffusion lab** (ledger section "absorbed from the root Diffusion lab", 46 units): the forward process with its closed form and a slider (section 1), the cosine and scaled-linear crossings, the TinyUNet and the targets table with conversions, the training step code and recipe, error by timestep, the one-step epsilon-against-v strips and the v-sampled-as-epsilon bug (section 3), DDPM, DDIM and DPM-Solver defined from zero with the recorded trajectory stepper and per-call costs, the leading-spacing trap (section 5), CFG from zero with its conventions, traps, cost and the lab's sweep (section 6), the lab's symptom table and interview questions (closed). The lab's numbers are read from its recordings (`make_data_more.py`), not recomputed.
- **Tabs moved into the Reading flow** because each explains one mechanism: the Schedule designer (section 2, beside the brightness-leak prediction), the Sampler workbench (section 5, replacing the six-sampler mini chart; the timestep walks are a closed block in the card), the Guidance explorer (section 6: the tiny-model strips after a predict prompt, the SD 1.5 sets, the accuracy-against-FD chart).
- **Concrete, picture, formula** in sections 1 to 3; every core mechanism has its visual beside the claim; card titles say what to notice.
- **Closed depth**: code for zero terminal SNR, EDM preconditioning, Min-SNR, DDIM with eta, the 2M update and CFG rescale; the full sampler table; spacing details and the Karras sigmas; the distillation table; the bug causes and symptom table; interview rehearsal; runs and sources.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; the toy animation and the trajectory stepper reset to step 0 on a mode switch and wait for the reader. `check_page.mjs` scrolls the whole page and confirms every scrubber is still at 0.
- **Fixed on the way**: numbers that were filled by script with `textContent` printed HTML entities literally (the EDM row showed "&minus;1.2"); all numbers and data sentences are now static (`fill_static.py`). The samplers sentence showed an unexpanded "{Sampler workbench|#t-dzsamp}"; corrected. Log-axis charts lost their tick labels below 1 (`22_js_dz_common.js`); fixed.
- **Deleted as fat**: the "Measured here, in one list" recap (each finding is in its section), pointers to the removed tabs, tab intros restated by the cards, the old reading-time footer.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 34.0 min | 36.5 min |
| Reading, closed details | 4.3 min | 15.8 min |
| Other tabs, core | samplers 1.4 + schedules 1.4 + guidance 1.1 + further reading 2.7 = 6.6 min | further reading 2.1 min |
| Visuals drawn in Reading (audit count: at least 120 by 80 px at 920 px) | 10 (plus 7 in tabs) | 15 (the hero's ten tiles are each under 120 px and not counted) |

Why 36 minutes is right: the page now carries the whole subject from an empty start, which used to take the root's Diffusion lab (about 20 min of core) plus this page (34 min) plus three tabs; the core grew by 2.5 minutes while absorbing the lab's from-zero half, because code, per-item tables, the spacing details, the bug causes and the interview moved into closed blocks. Every core unit in the ledger is needed for one of the eight sections, about a fifth of the core words are card captions and counters, and the remaining long passages (the samplers sentence, the guidance-interval and autoguidance results) are measured findings that are the page's own evidence. The closed time grew because the lab's code, tables and interview answers now live here.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
308 units: core 202, depth 72, fat 34, owned 0, volatile 0. 262 were drafted from the old page by `ledger.py init`; 46 record what was absorbed from the root Diffusion lab (section "absorbed from the root Diffusion lab", `where` empty: they live here). Fat units carry a `note` saying why.

## Departures from the page-kind shape, and why
- **No tabs besides Further reading.** The three old tabs each explained one mechanism; the contract puts such visuals beside the claim.
- **Two data parts.** `make_data.py` needs scratch files that no longer exist, so the root lab's recordings come in through a second, plain-Python script (`make_data_more.py`) rather than a regenerated `window.DZ`.
- **No real photographs.** A mechanism page; the SD 1.5 outputs are its real images, and the canonical DDPM figures are not openly licensed.

## 2026-10-24, topic close
- **Section 7 cut to one orienting sentence** linking Latent diffusion and diffusion transformers, section 10, which now owns few-step distillation (the seven-method table, the families, the costs), and Flow matching sections 8 and 9 for flow shortcuts. The measured LCM-LoRA run stays here; latent diffusion quotes and links it. Ledger: units 163, 164, 165 are `owned:.../latent_diffusion_and_dits`, unit 166 (the reflow FD 159.8) `owned:.../flow_matching`. `fill_static.py` no longer requires the distillation table (it fills it if present).
- **Root labs retired**: the Further reading card no longer sends the reader to the root's Flow and Diffusion lab tabs; the flow result moved to the flow-matching card. "(root lab)" provenance now reads "(root lab recordings)", and the running example names the topic's diffusion runs (root `src/diff`) instead of the lab. The workbench's source label reads "root lab recording".
- **Times quoted for siblings** updated to their headers: flow matching 36, latent diffusion 32 (33 after this pass), autoencoders 35.
- **Header**: 36 min core (8,316 words), closed details 16 to 14 min (the distillation table left). Checks: checkpage fail=0, ledger problems 0, `check_data.py` 209 checks 0 failures, `check_toy.mjs` and `check_page.mjs` OK.
- Root fat audit (2026-10-24): the diffusers tip (scheduler_config.json, swap samplers with from_config) restored inside the schedule-mismatch block of section 8 (ledger unit 309). Reading time unchanged.

## 2026-10-26: the Math page's two-moons lab absorbed (Khalid's decision 11)
The Variational inference maths page carried a measured lab that teaches samplers rather than maths: two 2-D two-moons networks (noise prediction and flow matching, 9,858 int8 weights each). It now lives here, merged beside the tiny image model's sampler evidence as closed depth, since the same claims are taught in sections 5 and 6 with a different measurement.
- **Section 5, closed block "A second model you can run"**: the forward-then-back animation (DDPM, DDIM inversion, flow; stepper, never autoplays), the steps-against-schedule table, the straightness of DDIM against flow-matching paths (0.73 against 0.55), and the live sampler lab with its log-SNR strip and the clipping note (1.2% against 95.3%).
- **Section 6, closed block "Guidance on the two-moons toy"**: the fidelity-for-diversity table and the 5-step rescue.
- Files: `src/moons/` (`diffusion.py`, `sampler.py`, `sampler_ref.py`, `dm_w64.json`, `sampler_ref.json`, all unchanged except output paths; `make_data.py` writes `parts/20_js_dz_1moons.js`, window.DZMN), `parts/29_js_dz_mcore.js` (window.DZM: the networks and samplers as pure functions), `parts/29_js_dz_mlab.js` (animation, straightness, lab). Rerun: `cd src/moons; OMP_NUM_THREADS=2 uv run --no-project --with torch --with numpy python diffusion.py 64 30000`, then `python3 sampler_ref.py`, `python3 make_data.py`, `node ../runs/check_moons.mjs`, `sh ../build.sh`.
- Check: `runs/check_moons.mjs` reproduces the NumPy sampler (largest difference 5e-11), three table cells, the no-clip cell, both straightness values, and every number typed into the two blocks (35 checks, 0 mismatches).
- Ledger: 22 units added (section "absorbed from the Math page"); the Math page labels its units `owned:` this page. Reading: core 36 min unchanged, closed details 14 to 19 min (audit 8,359 and 4,418 words).
