# Sources (read 2026-10-17)

Full notes with sections, tables and quotes: `sources/research_video.md`, `sources/research_longvid_eval.md`, `sources/research_audio.md`. Every quote printed on the page was re-checked against the arXiv HTML (or the archived Sora page, the Mochi card, the Veo 3 card) with a script before use; quotes the notes record only through a summarising fetch were reworded or dropped.

- Configs: Hugging Face diffusers configs of Wan 2.1 1.3B and 14B, Wan 2.2 TI2V 5B, HunyuanVideo (hunyuanvideo-community), CogVideoX-5b (zai-org), LTX-Video, Mochi 1 preview (`inputs/vcfg_*`); codec configs from the pinned checkpoints.
- Code: diffusers v0.41.0 and transformers v5.20.1 (shallow clones in the topic's scratch), lines in `inputs/source_lines.json`; Genmo demos/cli.py and genmo/lib/utils.py (Mochi defaults); Tencent HunyuanVideo sample_video.py (24 fps).
- Video papers: Sora report (Wayback 20250105124831), Movie Gen 2410.13720v2, CogVideoX 2408.06072v3, HunyuanVideo 2412.03603, LTX-Video 2501.00103v1, Wan 2503.20314v2, LTX-2 2601.03233v1, HunyuanVideo 1.5 card and 2511.18870, Wan 2.2 cards, Veo 3 model card (May 2025, updated Jan 2026), Video Diffusion Models 2204.03458, Latte 2401.03048.
- Long video: Diffusion Forcing 2407.01392, CausVid 2412.07772, Self Forcing 2506.08009v2, FramePack 2504.12626, MAGI-1 2505.13211, Physics-IQ 2501.09038, VideoPhy 2406.03520.
- Evaluation: FVD 1812.01717, content bias 2404.12391, VBench 2311.17982, FAD 1812.08466, Artificial Analysis Video Arena and TTS Arena (linked, not quoted).
- Audio: SoundStream 2107.03312, EnCodec 2210.13438, DAC 2306.06546, Moshi and Mimi 2410.00037v2, AudioLM 2209.03143, VALL-E 2301.02111, MusicGen 2306.05284, F5-TTS 2410.06885, Stable Audio Open 2407.14358, HiFi-GAN 2010.05646, Whisper 2212.04356, Tacotron 2 1712.05884.
- Data: LibriSpeech dev-clean utterance 1272-135031-0008 via hf-internal-testing/librispeech_asr_dummy (CC BY 4.0); scikit-image chelsea (CC0) as the topic's p01_cat.
