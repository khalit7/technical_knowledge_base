# Visualisation ideas (Video and audio generation, 2026-10-17)

Central question: what a second of video or audio becomes in tokens, and what that costs and loses.

| # | Idea | Score (teaches / computable / reproduces / animation / absent elsewhere / cost) | Placement | Status |
|---|---|---|---|---|
| 1 | One clip through three compressors (image VAE per frame, Wan causal VAE, LTX 32x32x8), to scale, counters to tokens and pairs | 5/5/yes (Movie Gen, Mochi, LTX ratios in the table beside it)/yes, before-after/yes/low | Reading 1 | built |
| 2 | Measured Wan VAE before/after viewer: original, reconstruction, difference x4, PSNR per frame for slow and fast pans | 5/real data/-/frame scrub/yes/medium (one CPU run) | Reading 1 | built; shows the first-frame-alone and period-4 structure |
| 3 | Who one token sees: full against factorised attention on a moving disc, counters at Wan's real size | 4/5/-/yes, before-after/yes/low | Reading 2 | built |
| 4 | Cost table and formula check against FlopCounterMode | 5/5/formula within 2.8% of the count/-/yes/low | Reading 4 | built |
| 5 | Implied throughput of published speed claims (LTX 2 s on H100, Wan 103 s, 4 minutes on 4090) | 4/5/derived/-/yes/low | Reading 4 box | built |
| 6 | Noise schedule over long video: whole clip, chunk after chunk, rising noise | 4/illustrative/-/toggle/partly (papers draw it)/low | Reading 5 | built, labelled illustration |
| 7 | Waveform envelope and log-mel spectrogram of the running sentence with a player | 3/real/-/-/-/low | Reading 6 | built |
| 8 | RVQ stage by stage: spectrogram filling in, residual share, error against bitrate, players; toggle to Opus at equal bitrate | 5/real/agrees with EnCodec's MUSHRA ordering/yes, before-after/yes/medium | Reading 7 | built |
| 9 | Codebook order diagram (flatten, parallel, delay) | 4/exact/MusicGen's 1500 steps for 30 s/toggle/partly/low | Reading 8 | built |
| 10 | Space-time patch calculator, all models by duration | 5/5/four published figures reproduced/-/yes/medium | own tab | built |
| 11 | RVQ codec explorer with difference spectrograms and token-rate table | 5/real/bitrates of nine settings recomputed/-/yes/medium | own tab | built |
| 12 | Model timeline from the Model map rows plus method papers | 3/data/-/-/partly (Model map has a timeline of all families)/low | own tab | built 2026-10-17; removed 2026-10-24 (repeats the root Model map's timeline; not a tool used across the page) |

Rejected:
- Generating a video with Wan 2.1 1.3B: minutes on a datacenter GPU, far more on this Mac, and it teaches less than the arithmetic (brief: cheap demos only).
- A speech generator (F5-TTS, Kokoro): would add a download and a run for a sample that teaches nothing the codec run does not; listed as published.
- An LTX-Video VAE round trip (1.7 GB float32) beside Wan's: a strong before/after (192 vs 48 compression), dropped for memory after Wan's VAE peaked at 7.0 GiB; the clip-to-tokens animation shows the token side to scale instead.
- A WER check of Mimi's semantic codebook with Whisper: would need another model; the page asks the reader to listen instead.
- Arena leaderboard snapshot: changes weekly and the only reading was through a summarising fetch; linked instead.

What the methodology lacked: a rule for media in a no-network page. Audio players are data URIs of 32 kbps MP3 copies; metrics are always computed on the raw decoder output and the page says the players add their own coding.

## 2026-10-24 rebuild (teaching contract)

| # | Idea | Kind | Placement | Status |
|---|---|---|---|---|
| 13 | Hero: video and audio pipelines side by side (compress, tokenise, generate, decode), the token count each generator sees highlighted | static annotated diagram | Reading top | built |
| 14 | Where conditions enter: text through attention, the image as latent frame 0, audio as a time-aligned stream | static annotated diagram | Reading 3 | built (section 3 had no visual) |
| 15 | One slider over clip length (Wan 2.1 1.3B, 480p): linear against attention FLOPs per pass to scale, 5 s default on the formula value beside the FLOP counter | parameter slider | Reading 4 | built; the calculator tab keeps the many-parameter version |
| 16 | Moshi's streams: text, Moshi and user codes per 80 ms step, temporal against depth transformer | static annotated diagram | Reading 8 | built |
| 17 | F5-TTS infilling: text padded with filler tokens to the mel length, masked frames filled by flow | static annotated diagram | Reading 8 | built |
| 18 | Evaluation as one table (what each measure does, its blind spot) | table | Reading 9 | built |

Rejected in this pass: a 3-D RoPE channel-split bar (a sentence with the three numbers says it); a photo or paper figure (no openly licensed figure teaches more than the page's own measured spectrograms and frames).

## 2026-11-09 rollout (split layout, 3D stages v2)

| # | Idea | Kind | Placement | Status |
|---|---|---|---|---|
| 19 | Fig. 1: Wan 2.1's 81 frames as plates in time, grouped by the causal VAE into 21 latent frames, shrunk, patched, then the token counts of three compressors as columns to scale | 3D stage, 5 steps | Reading 1 | built; replaces the 2D clip-to-tokens stepper and its three-mode toggle |
| 20 | Fig. 2: one query token in a 6-frame latent clip, full against factorised attention, the two-hop relay, the pairs of Wan's real clip as columns | 3D stage, 6 steps | Reading 2 | built; replaces the 2D attention stepper and its toggle |
| 21 | Fig. 3: text tokens, a first frame and an audio stream entering Wan's 21 noisy latent frames | 3D stage, 4 steps | Reading 3 | built; replaces the static conditioning diagram |
| 22 | Fig. 4: EnCodec RVQ stage by stage, unexplained energy and spectral error as columns from the recorded run | 3D stage, 6 steps | Reading 7 | built; the measured spectrogram stepper stays beside it as a reader-driven widget |
| 23 | Fig. 5: a 6 x 4 token grid filled in flatten, parallel and delay order, height the generation step | 3D stage, 4 steps | Reading 8 | built; replaces the 2D three-mode grid |
| 24 | Clip cost in 3D (a latent block lengthening with duration, linear against attention columns) | 3D stage | Reading 4 | rejected: the one-slider card is the right kind for one parameter, and the stage would repeat it |
| 25 | Hero in 3D | 3D stage | top | rejected: a two-lane pipeline whose message is two highlighted counts reads best flat, and Figs. 1 and 4 already build both lanes in depth |
