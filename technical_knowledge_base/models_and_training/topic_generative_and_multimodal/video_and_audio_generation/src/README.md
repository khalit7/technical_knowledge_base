# Video and audio generation: source

`sh build.sh` writes `../index.html` (one self-contained page; child 8 of Topic: generative-and-multimodal). Then, from the repo root, `sh html_utils/checkpage.sh <page folder>` and `node <page folder>/src/check_stages.mjs <shots dir>` (the five 3D stages, see the 2026-11-09 section); here, `node check_page.mjs <shots dir>` (every control at 390 px dark and 920 px light) and `python3 -I check_data.py` (the page embeds exactly the recorded data, the page's JavaScript formulas equal `calc/recompute.py` for every preset, prose numbers match the data).

## Tabs (rebuilt 2026-10-24 to the teaching contract)

| Tab | id | What |
|---|---|---|
| Reading | `t-read` | The idea in one screen (core sentence, hero `27_js_va_figs.js`: the two pipelines with what the generator sees, You need, new terms, running examples; the video-against-audio table closed); 1 space-time latents (causal VAE, encode loop closed, clip-to-tokens stepper, measured Wan VAE viewer, VAE table closed); 2 full against factorised attention (stepper), 3-D RoPE; 3 conditioning (new static diagram: text, first frame, audio stream), the levers the open models pulled, model table and per-model vendor notes closed; 4 cost (formula, predict, new one-slider card over clip length, FLOP-count check, second predict, levers; cost table and implied throughput closed); 5 long video (noise-schedule toggle); 6 waveform and spectrogram (player); 7 neural codecs and RVQ (RVQ loop closed, measured RVQ stepper with Opus toggle, run code closed, Mimi); 8 generating audio (codec LMs, delay-pattern diagram, new Moshi streams diagram, new F5-TTS infilling diagram, comparison table); 9 evaluation (one table: what each measure does and its blind spot); Depth (closed: mistakes with real errors, what was measured and what transfers, interview rehearsal) |
| Space-time patch calculator | `t-vapatch` | eight models, any size, frames, fps, steps, passes; tokens, FLOPs, attention share, pairs, score-matrix memory; chart of all models by duration; published figures reproduced |
| RVQ codec explorer | `t-varvq` | two clips, three codecs, every recorded depth; original, reconstruction and difference spectrograms; players; error against bitrate; token-rate table of nine codec settings |
| Further reading | `t-more` | |

Prefix `va` (ids `va-*`; tab-local prefixes `pc-`, `rq-`), container class `vap`, data attributes `data-va`; tab storage key `va-tab`.

## Files

- `parts/`: `01_head.html`, `05z_errbox.js.html` from the root; `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js` (renderer v2) and `99_js_tabs.js` (key `va-tab`) from the explainer-page skill templates, unchanged (2026-11-09); `28_js_sc0kit.js` to `28_js_sc5delay.js` (the five 3D stages); `10_header.html`; Reading `20_read_a.html` (CSS, nav, the idea in one screen) to `20_read_h.html` (closed depth), `20_read_z.html` (closes the tab); `22_js_va_0data.js` (generated); `23_js_va_util.js` (formats, token and FLOPs formulas, prose values, predict cards, one shared audio player); `24_` to `26_js_va_read*.js`; `27_js_va_figs.js` (hero, conditioning diagram, cost slider, Moshi streams, F5-TTS infilling); tabs `31_*`, `32_*`, `39_tab_more.html`.
- `make_data.py`: builds `parts/22_js_va_0data.js` from `codec/out`, `vae/out`, `calc/out` and `inputs/` (since 2026-10-24 it no longer reads the root's Model map rows; `inputs/arxiv_extra.json` fed only the removed timeline and is kept as a record).
- `codec/`: `download.py` (pinned codec checkpoints and the LibriSpeech dummy parquet, under the download lock), `prep.py` (tool env: clips and Opus baselines), `run_codecs.py` (shared venv, CPU: every codebook prefix of EnCodec, DAC, Mimi; `out/codecs.json`), `mistakes.py` (`out/mistakes.json`), `make_assets.py` (tool env: spectrogram WebPs, 32 kbps MP3 players, waveform envelope; `out/assets.json`), `out/inputs_meta.json`.
  Tool env: `UV_CACHE_DIR=<scratch>/inf/uvcache uv run --no-project --python 3.12 --with pyarrow --with soundfile --with av --with pillow --with scipy python -I <script>` (PyAV 19.0.1 bundles libopus and libmp3lame; the Homebrew ffmpeg on this Mac is broken).
- `vae/wan_vae_roundtrip.py`: Wan 2.1 VAE on two 17-frame crops of the topic's test image p01_cat (CPU float32, `out/wan_vae.json` with WebP frames).
- `calc/count_meta.py` (parameters of seven configs and one FlopCounterMode pass on meta tensors: `out/meta.json`), `calc/recompute.py` (every preset number: `out/recompute.json`).
- `sources/find_lines.py`: locates every quoted source line and snippet by pattern (one match each) into `inputs/source_lines.json`; `sources/research_*.md`: research notes with URLs, sections and quotes (fetched 2026-10-17; quotes used on the page were re-checked against the arXiv HTML).
- `inputs/`: `vcfg_*` (diffusers configs of seven video models), `video_models.json` (presets with sources), `source_lines.json`, `arxiv_extra.json` (v1 dates and titles).
- `check_page.mjs`, `check_data.py`; `facts.md`; `sources.md`; `viz_ideas.md`; `coverage.md`; `ledger.json` (the knowledge ledger).

## Runs (measured on Apple M1 Pro, CPU only, 2026-10-17)

- Codecs: all three on both clips at every depth in about a minute; mistakes script seconds. Opus baselines and MP3s in the tool env.
- Wan 2.1 VAE: about 2 minutes for both clips; peak RSS 7.0 GiB, above the topic's 6 GB guideline (a rerun should use 128 x 128 crops or the VAE's tiling).
- Meta-device counts: seconds. No GPU used, so no bench lock.
- Large files stay in scratch (`gm/va/audio/*.wav`); the page keeps only the 32 kbps MP3 copies and WebP spectrograms (about 0.43 MB) and 96 px WebP frames (about 0.15 MB).

## Departures from the method

- No old page to cover (new page; Notion disconnected): `coverage.md` lists the brief's requirements and where each is.
- Overview depth, research-heavy: no video or audio generator was run (the brief: cheap demos only); the measured parts are the codecs, one video VAE and the counts.
- No real images (2026-10-24): every subject here is a mechanism, which a drawing on the page's own data explains better; the real objects the page needs (spectrograms, decoded frames, audio) are its own measured data. Paper figures were not embedded (the video papers' figures are not openly licensed for reuse, and the redrawn diagrams carry the same structure).
- Page size about 0.8 MB because of the audio players and spectrograms, over the 300 KB guideline of the time (retired 2026-10-17) and under the topic's 1 MB limit.

## The 2026-10-24 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing only; no new runs.
- **Top**: the core idea in one sentence and a hero figure (the two pipelines side by side, compress, tokenise, generate, decode, with the token count each generator sees highlighted), "You need" (the sibling owners: latent diffusion and DiTs, diffusion from zero, flow matching, autoencoders and VAEs, native multimodal), and ten new terms. The old "In one screen" table is a closed reference block; the "Where this page starts" box became "You need".
- **Visuals inline, beside the claim**: four new ones, chosen by the kind of concept. Structure: the hero; the conditioning diagram (text through attention, the image as latent frame 0, audio as a time-aligned stream; section 3 had no visual); Moshi's token streams (17 tokens per 80 ms, temporal against depth transformer); F5-TTS's padded text and masked mel frames. Parameter: one slider over clip length for Wan 2.1 1.3B (section 4), splitting a pass into linear and attention terms, its 5 s default landing on the formula value beside the FLOP counter's measurement; the "double the frames" prediction moved in front of it. The three step animations (clip to tokens, full against factorised attention, RVQ stage by stage) now wait for the reader.
- **Tabs**: the Model timeline tab was removed (not a tool used across the page; its model rows are the root Model map's, its method papers are each cited in their Reading section, and its one-line "arc" is now in section 3). The calculator and codec explorer stay: each serves several sections.
- **Moved to closed blocks**: real code (the Wan encode loop, the EnCodec RVQ loop, the codec run), the VAE, model and cost tables, the implied-throughput box, per-model vendor claims (data sizes, win rates, VBench totals, GPU counts), the VAE timings, mistakes (one block, nine items), what transfers, and the interview questions (one block).
- **Rewritten for density**: section 3 is now conditioning plus the four levers the open models pulled (compress harder, split denoising by noise level, sparse attention, scale the context) instead of a per-model list; section 9 is one table (what each measure does, its blind spot).
- **British spelling** in prose (quantise, quantiser); quotes and code keep theirs.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 36.9 min | 27.9 min |
| Reading, closed details | 5.3 min | 16.7 min |
| Other tabs, core (calculator, codec explorer, timeline) | 2.0 + 1.6 + 2.2 = 5.8 min | 2.0 + 1.6 = 3.6 min |
| Further reading | 4.3 min | 4.3 min |
| Visuals drawn in Reading | 12 | 16 |

Why 28 minutes is right: the page owns two media, each with its own compression step, generator family and failure modes (video: causal VAEs, patches, full attention, cost, conditioning, long-video drift; audio: spectrograms and vocoders, codecs and RVQ, semantic tokens, codec LMs and flow TTS; evaluation for both). Every core unit is needed for one of those, and about a quarter of the core words are captions and counters of the visuals. What made the old page long (code, reference tables, per-model vendor claims, mistakes, interview answers, provenance) is closed and optional, which is why the closed time grew.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
375 units: core 249, depth 83, fat 42, owned 1 (the removed timeline's 34 model rows, owned by the root's Model map). 371 were drafted by `ledger.py init` (which also swept the tool tabs and Further reading into the last Reading section; their `tab` field was corrected by hand); 4 were added by hand for script-rendered content (the timeline's rows, the closed tables, the new cost slider). Fat units carry a `note`: section headings and bold lead-ins, citation fragments split off by the sentence splitter, wind-ups, the old reading-time line, and the removed timeline tab's controls and lead.

## 2026-10-24, topic close
- Section 9 no longer re-teaches FVD and FAD: Evaluating generative models (its section 9) owns them. Each keeps one sentence of what is specific to its medium (I3D scores a clip as a whole; a motionless video can score well; FAD on VGGish embeddings), with a link; VBench's dimensions, the Movie Gen Video Bench, MOS, MUSHRA, WER, speaker similarity and CLAP stay here. The stale pointer to the root's Reading section 9 is gone. Ledger: units 233, 234, 235 and 243 are `owned:` Evaluating generative models (keys on its built page); 237 stays core with the Movie Gen quote noted as moved.
- Section 8's Moshi card links Native multimodal models' section 9 (the same frame against a cascade).
- Further reading: the root card no longer names the retired Latent and Flow lab tabs or the root's Reading section 8 (the root is linked as a whole; its Model map tab stays); every sibling and neighbour time now matches its header (`html_utils/check_times.py`: 0 stale).
- Reading time unchanged (measured 6,435 core and 3,846 closed words: 28 min, plus 17).

## 2026-11-09: split layout, five 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html`, `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `va-tab`) and `build.sh` (the old one held a literal em-dash; the template writes it as bytes). The template's `RD.onRender` and `RD.onResize` serve the Reading tab only, so `31_js_vapatch.js` and `32_js_varvq.js` register their redraw in `TAB_RENDER` and keep their own resize handler.
- **Five stages**, one scene file each on `28_js_sc0kit.js`, every number from `window.VA` through `VAU` (nothing new computed outside the page's data and formulas), each with an `ol.sx` step list and no per-step caption:
  - Fig. 1 `stg-lat` (5 steps, `28_js_sc1lat.js`): Wan 2.1's 81 frames as plates in time, frame 0 alone and groups of 4 into 21 latent frames, the 8 x 8 shrink (21 x 60 x 104 x 16, 46 times fewer numbers), 2 x 2 patches (1,560 a latent frame), then 126,360 / 32,760 / 4,290 tokens as columns to scale. Replaces the 2D clip-to-tokens stepper and its three-mode toggle (its LTX captions are now step 5).
  - Fig. 2 `stg-att` (6, `28_js_sc2att.js`): one query in an illustrative 6-frame latent clip; full 3-D, spatial, temporal, the two-hop relay, then Wan's 1,073M against 52M pairs to scale. Replaces the 2D attention stepper and toggle.
  - Fig. 3 `stg-cond` (4, `28_js_sc3cond.js`): Wan's 21 noisy latent frames, 512 umT5 tokens through cross-attention, a first frame encoded alone into latent frame 0, an audio stream aligned in time (one segment per latent frame is illustrative, said in step 4). Replaces the static conditioning diagram; the three conditioning bullets became steps 2 to 4.
  - Fig. 4 `stg-rvq` (6, `28_js_sc4rvq.js`): EnCodec's measured run: one 128-number vector, codebook stages as glass plates the residual flows through (the first frame's recorded stage-1 code, 475), unexplained energy after 1, 2, 3 to 8, 9 to 32 stages as columns (x 25 from step 3), then spectral error against Opus. The measured spectrogram stepper beside it is now a reader-driven widget (`auto:false`; its live caption stays); the "Each codebook adds less" bullet was cut, its numbers are now steps 2 to 5.
  - Fig. 5 `stg-delay` (4, `28_js_sc5delay.js`): a 6 x 4 token grid, column height the generation step, filled in flatten, parallel and delay order. Replaces the 2D three-mode grid; the MusicGen bullet keeps the source and points at the figure.
- **Splits**: top (hero right), 1 (Fig. 1; then the VAE viewer), 2 (Fig. 2), 3 (Fig. 3), 4 (cost slider), 5 (noise schedules), 6 (spectrogram), 7 (Fig. 4; then the RVQ widget), 8 (Fig. 5; then Moshi's streams; then F5-TTS). Full width: new terms, running examples, the levers and model notes of section 3, the token-against-continuous table, section 9 (tables), Depth. The calculator and codec explorer tabs stay full-width tools (reader-driven, almost no prose).
- **Kept 2D**: the hero (a two-lane flow whose message is two highlighted counts; Figs. 1 and 4 build both lanes in depth), the measured VAE frames and PSNR curve, the cost slider (one parameter), the noise-schedule grid (a heatmap), waveform and spectrograms (real audio), Moshi's streams and F5-TTS's padding (flat structure), all tables.
- **Checks**: `check_stages.mjs` (new, adapted from Latent diffusion and DiTs): at 1400 light, 920 light and 390 dark every stage plays when scrolled into view, reaches its last step with one list item per step, stops redrawing off screen and never moves under reduced motion; splits are two columns at 1400 only; the RVQ widget never plays by itself; the step lists' numbers are recomputed from the page's data. `check_page.mjs` had no never-autoplay assertion to invert.
- **Ledger** (problems 0): units 41 to 44, 75 to 77, 189 and 219 re-keyed to the step lists; the 17 Further reading keys that began with a reading time re-keyed without the minutes; unit 338 (a tab reading-time fragment fused with the removed timeline card) is now fat; 9 units added (ids 376 to 384) for the step lists' numbers. 384 units: core 253, depth 83, fat 43, owned 5.
- **Length**: Reading core 6,435 to 7,032 words (28.0 to 30.6 min at 230 a minute; header 28 to 31), closed 3,846 unchanged (17 min); calculator 2.0, codec explorer 1.6, Further reading 4.5 unchanged; visuals inline 16 to 17 (audit count). The growth is the five step lists (about 1,050 words), which replace text that existed only in script (the three steppers' captions, invisible to the audit) and walk through mechanisms the old figures showed without explanation (the relay, where each condition enters, the RVQ residual chain). Nothing knowledge-bearing was cut.
- Page size 0.85 MB (renderer and scenes about 48 KB), under the 1 MB limit.
