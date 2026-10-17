# Video and audio generation: source

`sh build.sh` writes `../index.html` (one self-contained page; child 8 of Topic: generative-and-multimodal). Then, from the repo root, `sh html_utils/checkpage.sh <page folder>`; here, `node check_page.mjs <shots dir>` (every control at 390 px dark and 920 px light) and `python3 -I check_data.py` (the page embeds exactly the recorded data, the page's JavaScript formulas equal `calc/recompute.py` for every preset, prose numbers match the data).

## Tabs

| Tab | id | What |
|---|---|---|
| Reading | `t-read` | 0 one screen (video against audio); 1 space-time patches (causal VAE code, clip-to-tokens animation with image VAE / Wan / LTX toggle, VAE table with reproduced ratios, measured Wan VAE before/after viewer); 2 full against factorised attention (animation), 3-D RoPE, text in; 3 the video models (table from configs, published claims, closed models); 4 cost (formula checked against a FLOP count, cost table, implied throughput of published speeds); 5 long video (noise-schedule diagram, Diffusion Forcing, CausVid, Self Forcing, FramePack); 6 waveforms and spectrograms (player); 7 neural codecs and RVQ (source loop, measured RVQ animation with Opus toggle, run code and output); 8 generating audio (codec LMs, delay-pattern diagram, Moshi, flow TTS); 9 evaluation; mistakes (real errors, a wrong-sample-rate clip); interview; what transfers |
| Space-time patch calculator | `t-vapatch` | eight models, any size, frames, fps, steps, passes; tokens, FLOPs, attention share, pairs, score-matrix memory; chart of all models by duration; published figures reproduced |
| RVQ codec explorer | `t-varvq` | two clips, three codecs, every recorded depth; original, reconstruction and difference spectrograms; players; error against bitrate; token-rate table of nine codec settings |
| Model timeline | `t-vatime` | the Model map's 34 video and audio rows plus 11 method papers on one axis; filters; details |
| Further reading | `t-more` | |

Prefix `va` (ids `va-*`; tab-local prefixes `pc-`, `rq-`, `tl-`), container class `vap`, data attributes `data-va`; tab storage key `va-tab`.

## Files

- `parts/`: `01_head.html`, `05z_errbox.js.html`, `99_js_tabs.js` from the root (key changed to `va-tab`); `21_js_rd_common.js` from the sibling Latent diffusion page (the root's helpers with tab-aware `onRender`); `10_header.html`; Reading `20_read_a.html` (CSS, generic part copied from the sibling's) to `20_read_h.html`, `20_read_z.html` (closes the tab); `22_js_va_0data.js` (generated); `23_js_va_util.js` (formats, token and FLOPs formulas, prose values, predict cards, one shared audio player); `24_` to `26_js_va_read*.js`; tabs `31_*`, `32_*`, `33_*`, `39_tab_more.html`.
- `make_data.py`: builds `parts/22_js_va_0data.js` from `codec/out`, `vae/out`, `calc/out`, `inputs/` and the root's `src/map/out/mm_data.json` (timeline rows: dates, statuses, families).
- `codec/`: `download.py` (pinned codec checkpoints and the LibriSpeech dummy parquet, under the download lock), `prep.py` (tool env: clips and Opus baselines), `run_codecs.py` (shared venv, CPU: every codebook prefix of EnCodec, DAC, Mimi; `out/codecs.json`), `mistakes.py` (`out/mistakes.json`), `make_assets.py` (tool env: spectrogram WebPs, 32 kbps MP3 players, waveform envelope; `out/assets.json`), `out/inputs_meta.json`.
  Tool env: `UV_CACHE_DIR=<scratch>/inf/uvcache uv run --no-project --python 3.12 --with pyarrow --with soundfile --with av --with pillow --with scipy python -I <script>` (PyAV 19.0.1 bundles libopus and libmp3lame; the Homebrew ffmpeg on this Mac is broken).
- `vae/wan_vae_roundtrip.py`: Wan 2.1 VAE on two 17-frame crops of the topic's test image p01_cat (CPU float32, `out/wan_vae.json` with WebP frames).
- `calc/count_meta.py` (parameters of seven configs and one FlopCounterMode pass on meta tensors: `out/meta.json`), `calc/recompute.py` (every preset number: `out/recompute.json`).
- `sources/find_lines.py`: locates every quoted source line and snippet by pattern (one match each) into `inputs/source_lines.json`; `sources/research_*.md`: research notes with URLs, sections and quotes (fetched 2026-10-17; quotes used on the page were re-checked against the arXiv HTML).
- `inputs/`: `vcfg_*` (diffusers configs of seven video models), `video_models.json` (presets with sources), `source_lines.json`, `arxiv_extra.json` (v1 dates and titles).
- `check_page.mjs`, `check_data.py`; `facts.md`; `sources.md`; `viz_ideas.md`; `coverage.md`.

## Runs (measured on Apple M1 Pro, CPU only, 2026-10-17)

- Codecs: all three on both clips at every depth in about a minute; mistakes script seconds. Opus baselines and MP3s in the tool env.
- Wan 2.1 VAE: about 2 minutes for both clips; peak RSS 7.0 GiB, above the topic's 6 GB guideline (a rerun should use 128 x 128 crops or the VAE's tiling).
- Meta-device counts: seconds. No GPU used, so no bench lock.
- Large files stay in scratch (`gm/va/audio/*.wav`); the page keeps only the 32 kbps MP3 copies and WebP spectrograms (about 0.43 MB) and 96 px WebP frames (about 0.15 MB).

## Departures from the method

- No old page to cover (new page; Notion disconnected): `coverage.md` lists the brief's requirements and where each is.
- Overview depth, research-heavy: no video or audio generator was run (the brief: cheap demos only); the measured parts are the codecs, one video VAE and the counts.
- Page size about 0.8 MB because of the audio players and spectrograms, over the 300 KB guideline and under the topic's 1 MB limit.
