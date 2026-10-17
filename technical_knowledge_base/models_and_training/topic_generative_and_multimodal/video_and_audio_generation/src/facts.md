# Verified facts (key va, 2026-10-17; also appended to the topic's shared FACTS file under "va")

## Measured on Apple M1 Pro, CPU only (float32, 4 threads; torch 2.14.1, transformers 5.20.1, diffusers 0.41.0)
- Codecs (codec/out/codecs.json), revisions: facebook/encodec_24khz c1dbe2a, descript/dac_44khz c1bc521, kyutai/mimi 89091b3. Clips: LibriSpeech dev-clean 1272-135031-0008 ("I HOPE HE DOESN'T WORK TOO HARD SAID SHAGGY", 3.67 s, 16 kHz, CC BY 4.0, from hf-internal-testing/librispeech_asr_dummy rev 5be9148) and a 3.5 s synthesised phrase (codec/prep.py, seed 0, 48 kHz).
- Metric: log10 mel power, 80 bands, 24 kHz, 1024 FFT, 10 ms hop, floored 60 dB below the reference peak; mean |difference| ("spectral error"; 0.1 = 1 dB).
- Speech spectral error: EnCodec k=1 0.424, k=2 (1.5 kbps) 0.319, k=8 (6 kbps) 0.216, k=32 (24 kbps) 0.148; DAC k=9 (7.75 kbps) 0.167; Mimi k=1 1.048, k=8 (1.1 kbps) 0.354, k=32 0.266; Opus 6 kbps 0.432, 12 kbps 0.209 (libopus via PyAV 19.0.1; 2,876 and 5,661 bytes for 3.67 s).
- Speech SNR: EnCodec k=32 12.23 dB, Opus 12 kbps 13.22 dB, DAC k=9 13.23 dB.
- EnCodec unexplained share of the encoder output's energy after k stages (speech): 3.93% (1), 1.07% (8), 0.062% (32). DAC's full 1,024-d latent is not approached: 55% after 1 stage, 155% after 9 (stages quantize 8-d projections with cosine lookup).
- Music spectral error: EnCodec k=32 0.461, DAC k=9 0.385, Mimi k=8 0.761, Opus 12 kbps 0.730.
- Frames for 3.67 s: EnCodec 276 (75/s), DAC 316 (86.1/s), Mimi 46 (12.5/s). Decode of all codebooks: EnCodec 0.10 s, DAC 0.96 s, Mimi 0.09 s.
- Real errors (codec/out/mistakes.json): EnCodec bandwidth 5.0 -> "ValueError: This model doesn't support the bandwidth 5.0. Select one of [1.5, 3.0, 6.0, 12.0, 24.0]."; Mimi num_quantizers=40 -> "ValueError: The number of quantizers (i.e codebooks) asked should be lower than the total number of quantizers 32, but is currently 40."; EncodecFeatureExtractor at 16 kHz raises a sampling-rate ValueError; the model itself silently accepts 16 kHz samples (3.67 s comes out as 2.45 s at 24 kHz).
- Wan 2.1 VAE (Wan-AI/Wan2.1-T2V-1.3B-Diffusers rev 0fad780, 126,892,531 parameters), 17-frame 256 x 256 sliding crops of p01_cat: latent 16 x 5 x 32 x 32 for both; PSNR frame 0 37.0 dB both; slow pan (2 px/frame) mean of frames 1 to 16 36.5 dB; fast pan (14 px/frame) 30.0 dB with a period-4 ripple. Encode 23.7 s / decode 33.1 s (slow), peak RSS 7.0 GiB (over the 6 GB guideline).

## Counted (calc/out/meta.json, calc/out/recompute.json)
- Parameters from configs on the meta device: Wan 2.1 1.3B 1,418,996,800; Wan 2.1 14B 14,288,491,584; Wan 2.2 TI2V 5B 4,999,787,712; HunyuanVideo 12,821,012,544; CogVideoX-5B 5,570,283,072; Mochi 1 preview 10,027,677,744; LTX-Video 1,923,385,472.
- Wan 2.1 1.3B at 480 x 832 x 81 (32,760 tokens) under FlopCounterMode: 283.0 TFLOP per pass, bmm 200.9 (71%), addmm 82.1, conv 0.006; formula 2PN + 4LN^2D gives 290.8 (+2.8%).
- Tokens at defaults: Wan 2.1 1.3B 32,760; Wan 2.1 14B 720p 75,600; Wan 2.2 5B 27,280; HunyuanVideo 118,800; CogVideoX-5B 17,550; Mochi 44,520 (= card); LTX-Video 7,392 (512 x 704 x 161); Movie Gen 73,728 (= "~73K").

## Source lines (inputs/source_lines.json)
- diffusers v0.41.0: autoencoder_kl_wan.py:1147-1158 (first frame alone, then groups of 4 with a feature cache); pipeline_wan.py:341 (num_latent_frames), :293 (height/width divisible by 16 ValueError), :496 (num_frames rounding warning); transformer_wan.py:368-369 (RoPE split 44/42/42 for head 128); pipeline_ltx.py:378 (divisible by 32); pipeline_mochi.py:186 (temporal factor 6).
- transformers v5.20.1: modeling_encodec.py:424-437 (RVQ encode loop), :418 (bw_per_q), :367 (Euclidean nearest code); modeling_mimi.py:1120 (semantic codebook decoded by its own RVQ); modeling_dac.py:370 (from_codes sums out_proj of each codebook).

## Defaults (diffusers v0.41.0 pipelines; fps from cards or code)
- Wan 480 x 832, 81 frames, 50 steps, guidance 5.0, text 512 tokens, example fps 16; HunyuanVideo 720 x 1280, 129 frames, 50 steps, guidance embedded, 24 fps (Tencent sample_video.py); CogVideoX 480 x 720, 49 frames, 50 steps, guidance 6, 8 fps (card); LTX 512 x 704, 161 frames, frame_rate 25, 50 steps, guidance 3; Mochi 480 x 848 default size, 64 steps, guidance 4.5, Genmo CLI 163 frames, save_video fps=30.

## Published (checked against arXiv HTML or the source on 2026-10-17)
- Movie Gen (2410.13720v2): 73K tokens = 16 s at 16 fps; O(100)M video-text pairs, O(1)B image-text pairs; up to 6,144 H100s; factorized learnable positional embedding; Table 6 net win vs Sora 8.23 (sigma 5.07), Kling 1.5 3.87; FVD and IS "do not correlate with human evaluation scores"; Movie Gen Video Bench 1003 prompts.
- LTX-Video (2501.00103v1): 1:192 compression, 32 x 32 x 8, 1:8192 pixels per token; "2 seconds to generate 121 frames at 768x512 pixels and 20 diffusion steps on an Nvidia H100 GPU"; cross attention "work better than MM-DiT".
- CogVideoX (2408.06072v3): Table 7 5B 480 x 720 6 s 113 s on H800 (50 steps); ~35M clips; separated attention "requires extensive implicit transmission of visual information".
- HunyuanVideo (2412.03603) Table 1 PSNR MCL-JCV 35.39 vs CogVideoX-1.5 33.22. Wan (2503.20314v2): first frame only spatially compressed; 8.19 GB VRAM; VBench 86.22% vs Sora 84.28% (Table 4).
- Self Forcing (2506.08009v2) Table 1: Wan2.1 1.3B 0.78 FPS, 103 s latency; LTX-Video 8.98 FPS, 13.5 s; Self Forcing 17.0 FPS, 0.69 s. CausVid (2412.07772): 50-step to 4-step, 1.3 s latency, 9.4 FPS. Physics-IQ best 29.5%; VideoPhy best 39.6% (CogVideoX-5B). FVD content bias: FVD reducible "by up to half" with no motion.
- EnCodec (2210.13438) Table 1 MUSHRA clean speech: Opus 6 kbps 30.1, Opus 12 kbps 76.5, EnCodec 6 kbps 83.1. Mimi (2410.00037) Table 4: Mimi 1.1 kbps MUSHRA 81.0, SpeechTokenizer 4 kbps 74.3; Moshi latency 160 ms theoretical, 200 ms practice.
- HiFi-GAN V1 MOS 4.36 vs 4.45, 167.9x real time on V100; Whisper 80-channel log-mel, 25 ms windows, 10 ms stride; F5-TTS RTF 0.15, ~95K hours; MusicGen 30 s = 1500 steps, 20K hours; Stable Audio Open up to 47 s, 44.1 kHz stereo, latent 21.5 Hz x 64; AudioLM 51.2% (p = 0.23); FAD correlation 0.52.
- Mochi card: "128x" compression stated; its factors (8 x 8 x 6, 12 channels) give 96.
