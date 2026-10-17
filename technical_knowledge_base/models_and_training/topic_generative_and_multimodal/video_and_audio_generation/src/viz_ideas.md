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
| 12 | Model timeline from the Model map rows plus method papers | 3/data/-/-/partly (Model map has a timeline of all families)/low | own tab | built; adds method papers and what this page measured, links the Model map for licences |

Rejected:
- Generating a video with Wan 2.1 1.3B: minutes on a datacenter GPU, far more on this Mac, and it teaches less than the arithmetic (brief: cheap demos only).
- A speech generator (F5-TTS, Kokoro): would add a download and a run for a sample that teaches nothing the codec run does not; listed as published.
- An LTX-Video VAE round trip (1.7 GB float32) beside Wan's: a strong before/after (192 vs 48 compression), dropped for memory after Wan's VAE peaked at 7.0 GiB; the clip-to-tokens animation shows the token side to scale instead.
- A WER check of Mimi's semantic codebook with Whisper: would need another model; the page asks the reader to listen instead.
- Arena leaderboard snapshot: changes weekly and the only reading was through a summarising fetch; linked instead.

What the methodology lacked: a rule for media in a no-network page. Audio players are data URIs of 32 kbps MP3 copies; metrics are always computed on the raw decoder output and the page says the players add their own coding.
