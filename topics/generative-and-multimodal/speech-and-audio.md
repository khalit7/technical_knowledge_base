# Speech and Audio Models

⏱ 6 min read · +11h 20m resources

### Best resources

- Radford et al., [Whisper: Robust Speech Recognition via Large-Scale Weak Supervision](https://arxiv.org/abs/2212.04356) (45 min): the paper that reset ASR; read for the weak-supervision data recipe.
- Kyutai, [Moshi: a speech-text foundation model for real-time dialogue](https://arxiv.org/abs/2410.00037) (45 min): best single paper for how modern speech LLMs and the Mimi codec work.
- Wang et al., [VALL-E: Neural Codec Language Models are Zero-Shot TTS](https://arxiv.org/abs/2301.02111) (45 min): the paper that made TTS a language-modelling problem.
- [kyutai/mimi on Hugging Face](https://huggingface.co/kyutai/mimi) (model card, ~10 min) and Défossez et al., [EnCodec](https://arxiv.org/abs/2210.13438) (45 min): the codec side.
- Hugging Face [Audio Course](https://huggingface.co/learn/audio-course) (course, ~8h): hands-on grounding if needed.

### Neural audio codecs: how audio becomes tokens

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

### ASR

- **Whisper** (OpenAI, 2022): encoder-decoder transformer trained on 680k hours of weak
  supervision; multilingual, translation, timestamps. Lineage: large-v3, distil-whisper,

  faster-whisper (CTranslate2), whisper.cpp. Still the default open choice for

  robustness across domains.

- **Current SOTA (2026)**: conformer encoders paired with LLM decoders top English
  leaderboards: NVIDIA Canary/Canary-Qwen and Parakeet (open, fast, lead the HF Open ASR

  leaderboard), Granite-Speech, Phi-4-Multimodal. Commercial APIs (Gemini, GPT-4o

  transcribe, AssemblyAI, Deepgram) compete on streaming latency and diarisation more

  than raw WER. Realtime systems return partials in under 250 ms.

- **Meta Muse Voice Transcribe** (Sep 2026): real-time multilingual transcription across more than 25 languages, shipped alongside Muse Spark 1.3. A release note only; Meta published no technical detail.

### TTS

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

- Qwen3 TTS reached sub-50ms response latency at frontier quality per Nari Labs' cost and speed analysis (Aug 21). [Nari Labs](https://nari-labs.com/blog/qwen3-tts-speed-cost-frontier/) (~10 min)
- **AuK** (Tencent Hunyuan, Sep 2026): an open-source foundation model for speech generation **and editing**, editing being the less common capability: modifying existing speech rather than synthesising it from scratch. 217 Hugging Face upvotes at release. [arXiv 2609.08936](https://arxiv.org/abs/2609.08936) (45 min)
- Older mel + vocoder stacks (FastSpeech 2 + HiFi-GAN) survive in constrained/embedded
  settings; note the GAN vocoder link in [VAEs and GANs: Review and Where They Survive](vaes-and-gans.md).

### Speech LLMs and realtime voice

Two architectures (this is the multimodal-LLM story of [Multimodal LLM Architectures](multimodal-llms.md) applied to audio):

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

**GPT-Live-1** (OpenAI, Sep 2026) brought the full-duplex design to a production API: it listens and speaks simultaneously rather than taking turns, which is what makes interruption work as it does between people. 12 real-time voices at $0.05 per minute for the voice layer, served over WebRTC, WebSockets, telephony and SIP.

**Gemini 3.8 Live and 3.8 Live Extended Thinking** (Google, Sep 15, 2026) are production voice-agent models; the design idea is worth more than the scores. Both do near real-time speech with visual grounding and automatic language detection across **97 languages**. Extended Thinking **speaks while it reasons**, emitting verbal cues like "Let me check that" to keep the conversation alive while tool calls and multi-step reasoning run in the background, instead of going silent. Every other approach to test-time compute spends the budget and makes the caller wait; this one hides the latency behind speech, a product answer to a systems constraint and the first shipped one in this category.

Scores: number one on Artificial Analysis' speech-to-speech index at **82.6**, 68.6% on tau-Voice, **35.1%** on Sierra's tau-Voice-banking, 97.7% on Big Bench Audio. Hold on to the banking figure, because it is the agentic one: the distance between 97.7% on audio reasoning and 35.1% on a real banking workflow is the same capability gap Real-SWE found between public agent benchmarks and private production code. Live in the Gemini API and AI Studio, private preview in Gemini Enterprise, already behind Search Live, Gmail and Keep. Google publishes no millisecond latency figure. [Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-gemini-3-8-live-extended-thinking/) (8 min)

### Music (brief)

- Closed: **Suno v6** (Sep 2026; leads on vocals), **Udio** relaunching
  under UMG/WMG licences, Stable Audio 3. Architecture pattern: LM over codec tokens or

  latent diffusion/flow over audio latents, usually both in stages.

- Open: MusicGen (AR over EnCodec), Stable Audio Open (latent diffusion), ACE-Step;
  open models remain clearly behind Suno-class quality.

- The 2025-26 licensing settlements (Suno-WMG, Udio-UMG) turned music gen from a
  copyright fight into a licensed product category. **Suno v6** (Sep 2026) went further: built with Warner Music Group, BMG and Believe, participating repertoire entering the model opt-in with rightsholders compensated, the first major generative-audio release to arrive with licences rather than litigation attached. **Universal Music and ElevenLabs** signed a comparable multi-year deal on Sep 10, 2026 for a licensed fan-remix platform.

### Interview-ready summary

Codecs (EnCodec, Mimi) made audio tractable for LLMs by turning waveforms into discrete

token streams; RVQ with a semantically-distilled first level is the key design. ASR:

Whisper lineage, now edged out on English by conformer+LLM decoders (Canary, Parakeet).

TTS: VALL-E-style codec LMs with zero-shot cloning. Realtime voice: native codec-token

omni models (Moshi's full-duplex design, GPT-realtime, Gemini Live) instead of

ASR->LLM->TTS pipelines.
