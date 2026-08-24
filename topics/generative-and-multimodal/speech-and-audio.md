# Speech and Audio Models

Last updated: 2026-08-24

## Best resources

- Radford et al., [Whisper: Robust Speech Recognition via Large-Scale Weak Supervision](https://arxiv.org/abs/2212.04356): the paper that reset ASR; read for the weak-supervision data recipe.
- Kyutai, [Moshi: a speech-text foundation model for real-time dialogue](https://arxiv.org/abs/2410.00037): best single paper for how modern speech LLMs and the Mimi codec work.
- Wang et al., [VALL-E: Neural Codec Language Models are Zero-Shot TTS](https://arxiv.org/abs/2301.02111): the paper that made TTS a language-modelling problem.
- [kyutai/mimi on Hugging Face](https://huggingface.co/kyutai/mimi) and Défossez et al., [EnCodec](https://arxiv.org/abs/2210.13438): the codec side.
- Hugging Face [Audio Course](https://huggingface.co/learn/audio-course): hands-on grounding if needed.

## Neural audio codecs: how audio becomes tokens

The enabling primitive for everything below. A codec is a convolutional/transformer
autoencoder with **residual vector quantisation (RVQ)**: the encoder downsamples the
waveform to a low frame rate, then a stack of quantisers each encodes the residual left
by the previous one, giving N parallel token streams per frame.

- **EnCodec** (Meta, 2022): 24kHz audio to 75 Hz frames, trained with reconstruction +
  adversarial losses. The original LM-ready codec (VALL-E, MusicGen).
- **Mimi** (Kyutai, 2024): the current reference for speech. 24kHz to **12.5 Hz** at
  ~1.1 kbps; its first RVQ level is distilled from WavLM so it carries **semantic**
  content while the remaining levels carry acoustic detail. This split lets an LM reason
  over the semantic stream while still reconstructing high-fidelity audio.
- Trend: lower frame rates and single-stream codecs (FlexiCodec, Spark-TTS's decoupled
  tokens) to make audio cheaper for LLMs.

With a codec, audio generation = next-token prediction over code streams, and the whole
LLM stack (scaling, prompting, RL) transfers.

## ASR

- **Whisper** (OpenAI, 2022): encoder-decoder transformer trained on 680k hours of weak
  supervision; multilingual, translation, timestamps. Lineage: large-v3, distil-whisper,
  faster-whisper (CTranslate2), whisper.cpp. Still the default open choice for
  robustness across domains.
- **Current SOTA (2026)**: conformer encoders paired with LLM decoders top English
  leaderboards: NVIDIA Canary/Canary-Qwen and Parakeet (open, fast, lead the HF Open ASR
  leaderboard), Granite-Speech, Phi-4-Multimodal. Commercial APIs (Gemini, GPT-4o
  transcribe, AssemblyAI, Deepgram) compete on streaming latency and diarisation more
  than raw WER. Realtime systems return partials in under 250 ms.

## TTS

- **Paradigm shift (VALL-E, 2023)**: treat TTS as a codec LM: condition on text plus a
  3-second acoustic prompt, autoregressively generate codec tokens, decode to waveform.
  Zero-shot voice cloning falls out for free. Practically every modern TTS system is a
  descendant (AR codec LM, sometimes with a flow-matching or diffusion stage for
  refinement of coarse tokens).
- **Leaders (2026)**: closed: ElevenLabs v3, Cartesia Sonic 3.x, Gemini TTS, OpenAI
  realtime TTS. Open weights: Fish Audio S2, Chatterbox (sub-200 ms), Microsoft
  VibeVoice-Realtime, CosyVoice 3, Kokoro (tiny but excellent), Sesame CSM, Orpheus.
  Differentiators now: expressiveness control, sub-300 ms streaming latency, stability
  on long form, and multilingual voice cloning.
- Older mel + vocoder stacks (FastSpeech 2 + HiFi-GAN) survive in constrained/embedded
  settings; note the GAN vocoder link in [vaes-and-gans.md](vaes-and-gans.md).

## Speech LLMs and realtime voice

Two architectures (this is the multimodal-LLM story of
[multimodal-llms.md](multimodal-llms.md) applied to audio):

1. **Adapter style (speech-to-text understanding)**: audio encoder (Whisper-class) ->
   projector -> LLM backbone. Supports ASR, translation, spoken QA. Cheap; output is
   text only, so a separate TTS closes the loop; the pipeline costs latency and drops
   prosody.
2. **Native codec-token models (speech-to-speech)**: the LM consumes and emits audio
   tokens directly. **Moshi** (Kyutai) is the open reference: full-duplex (listens while
   speaking) via parallel token streams for both sides of the conversation plus an
   "inner monologue" text stream that stabilises content; ~200 ms latency.
   **GPT-realtime / GPT-4o voice**, **Gemini Live**, Amazon Nova Sonic, and Qwen3-Omni
   (open, thinker-talker) are this class. Design tension: audio tokens dilute text
   reasoning ability, so omni models interleave text reasoning with talker heads that
   stream speech.

## Music (brief)

- Closed: **Suno v5.5** (leads vocals; licensed via WMG settlement), **Udio** relaunching
  under UMG/WMG licences, Stable Audio 3. Architecture pattern: LM over codec tokens or
  latent diffusion/flow over audio latents, usually both in stages.
- Open: MusicGen (AR over EnCodec), Stable Audio Open (latent diffusion), ACE-Step;
  open models remain clearly behind Suno-class quality.
- The 2025-26 licensing settlements (Suno-WMG, Udio-UMG) turned music gen from a
  copyright fight into a licensed product category.

## Interview-ready summary

Audio became tractable for LLMs when codecs (EnCodec, Mimi) turned waveforms into
discrete token streams; RVQ with a semantically-distilled first level is the key design.
ASR: Whisper lineage, now edged out on English by conformer+LLM decoders (Canary,
Parakeet). TTS: VALL-E-style codec LMs with zero-shot cloning. Realtime voice: native
codec-token omni models (Moshi's full-duplex design, GPT-realtime, Gemini Live) instead
of ASR->LLM->TTS pipelines.
