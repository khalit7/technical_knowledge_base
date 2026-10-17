# Audio generation: research notes (overview depth)

Collected 2026-10-17 via WebFetch. Quotes are as returned by the fetch tool (it paraphrases lightly and normalises LaTeX); treat quotes as near-verbatim and re-check wording before printing as a direct quote. Anything not confirmed in a source is marked UNCONFIRMED. "My arithmetic" means computed here, not stated in the source.

## 1. Neural audio codecs

### 1.1 SoundStream (Zeghidour et al., Google, 2021)
Source: https://arxiv.org/html/2107.03312 (v1, submitted 7 Jul 2021; abstract page https://arxiv.org/abs/2107.03312)

- Sample rate 24 kHz. Abstract: "audio at 24 kHz sampling rate"; Sec IV-A: models trained "at 24 kHz sampling rate".
- Frame rate 75 Hz. Encoder strides (2,4,5,8), product 320 samples per embedding (Sec III-A). Sec III-C: one second "is represented by S=75 frames at the output of the encoder". (24000 / 320 = 75, my arithmetic agrees.)
- Bitrate per frame. Sec III-C: the 6 kbps target "corresponds to r=6000/75=80 bits allocated to each frame". Sec V-D: "when operating at 6 kbps, the residual vector quantizer has a budget of 80 bits per frame."
- Codebooks. Sec III-C: "when using Nq=8, each quantizer uses a codebook of size N=1024". Table II (Sec V-D) compares, all at 6 kbps: 8 quantizers x N=1024, 16 x N=32, 80 x N=2.
- RVQ. Sec III-C: the quantizer "cascades Nq layers of VQ"; "The unquantized input vector is passed through a first VQ and quantization residuals are computed" (then the next VQ quantizes the residual, and so on).
- Quantizer dropout (bitrate scalability). Sec III-C: "For each input example, we sample nq uniformly at random in [1;Nq] and only use quantizers Qi for i=1...nq"; described as "a form of structured dropout applied to quantization layers".
- Bitrate range. Abstract: one model operates at "variable bitrates from 3 kbps to 18 kbps". The Nq used at 18 kbps is NOT stated in the text the fetch tool read: UNCONFIRMED. My arithmetic: 18000 / 75 = 240 bits per frame = 24 codebooks of 1024 entries.
- Discriminators (Sec III-D): "a wave-based discriminator, which receives as input a single waveform" (multi-resolution) and "an STFT-based discriminator, which receives as input the complex-valued STFT of the input waveform".
- Losses (Sec III-E): adversarial hinge loss (Eq. 2) "used to promote perceptual quality"; feature loss = "the average absolute difference between the discriminator's internal layer outputs" (Eq. 3); "a multi-scale spectral reconstruction loss" (Eqs. 4-5); weights lambda_adv = 1, lambda_feat = 100, lambda_rec = 1 (Eq. 6).
- Size: Table I, "8.4 M" parameters for the default C_enc = C_dec = 32 configuration.
- Data (Sec IV-A): LibriTTS (clean speech), Freesound noise mixed in for noisy speech, MagnaTagATune (music).
- Joint compression and enhancement (Abstract): "we are able to perform joint compression and enhancement either at the encoder or at the decoder side with no additional latency."
- Evaluation: "a crowd-sourced methodology inspired by MUSHRA" with hidden reference (Sec IV-B). Abstract: "SoundStream at 3kbps outperforms Opus at 12kbps and approaches EVS at 9.6kbps." Fig. 5(a): at low bitrate SoundStream "significantly outperforms both Opus at 6 kbps and EVS at 5.9 kbps". Fig. 5 error bars are 95% CIs; Fig. 6 splits by content type. Exact MUSHRA numbers are in figures only (no table): UNCONFIRMED as numbers.
- Weights: Google did not release SoundStream weights (open reimplementations exist). UNCONFIRMED from a source; not checked.
- Token arithmetic: 75 frames/s x 8 codebooks = 600 tokens/s at 6 kbps; 75 x 8 x log2(1024)=10 bits = 6000 bit/s. Reproduces the paper's 6 kbps. 3 kbps would be 4 codebooks (300 tokens/s), my arithmetic.

### 1.2 EnCodec (Defossez et al., Meta, 2022)
Source: https://arxiv.org/html/2210.13438 (v1). Repo: https://raw.githubusercontent.com/facebookresearch/encodec/main/README.md

- Sample rates. Abstract: "considering both 24 kHz monophonic and 48 kHz stereophonic audio."
- Frame rate. Sec 3.1: "the encoder outputs 75 latent steps per second of audio at 24 kHz, and 150 at 48 kHz."
- Codebooks. Sec 3.2: "we use at most 32 codebooks (16 for the 48 kHz models) with 1024 entries each, e.g. 10 bits per codebook."
- Bandwidths. Paper Sec 3.4: 1.5, 3, 6, 12, 24 kbps at 24 kHz; 3, 6, 12, 24 kbps at 48 kHz. README: "The 24 kHz model can compress to 1.5, 3, 6, 12 or 24 kbps", "the 48 kHz model support 3, 6, 12 and 24 kbps".
- Codebooks per bandwidth (README, not the paper): 24 kHz model uses 2 / 4 / 8 / 16 / 32 codebooks for 1.5 / 3 / 6 / 12 / 24 kbps; README: "The number of codebooks used will be determined bythe bandwidth selected" [sic], e.g. 6 kbps uses n_q = 8; for 48 kHz the number "of codebooks for each is half that of the 24 kHz model".
  - Text inconsistency to note: paper Sec 3.2 says during training "we select randomly a number of codebooks as a multiple of 4", which does not fit the 2-codebook 1.5 kbps setting; Sec 3.4 says one bandwidth is selected per batch. Record both; the README counts are the operational truth.
- RVQ. Sec 3.2: RVQ refines VQ by "computing the residual after quantization" and quantizing it with a further codebook.
- Variable bandwidth: random number of codebooks per batch (Sec 3.2, 3.4), i.e. quantizer dropout in the SoundStream sense.
- Discriminator. Sec 3.4: MS-STFT discriminator, "identically structured networks operating on multi-scaled complex-valued STFT", five scales, window lengths 2048 down to 128.
- Losses (Sec 3.4): time-domain L1 on waveform; frequency-domain L1 + L2 over mel-spectrograms at several scales (Eq. 1); hinge adversarial loss; relative feature-matching loss (Eq. 2); commitment loss between each residual and its quantized value (Eq. 3).
- Loss balancer (Sec 3.4, Eq. 5): losses normalised by gradient scale; "each weight can be interpreted as the fraction of the model gradient" coming from that loss (when weights sum to 1).
- Optional entropy coding (Sec 3.3): small Transformer LM (5 layers, 8 heads, 200 channels, 800-dim FFN) driving a range-based arithmetic coder; Sec 4.5 reports about 25-40% bandwidth reduction.
- Headline MUSHRA, Table 1 (streamable, 24 kHz; columns Clean speech / Noisy speech / Music set-1 / Music set-2):
  - Opus 6.0 kbps: 30.1 / 19.1 / 20.6 / 17.9
  - Opus 12.0 kbps: 76.5 / 61.9 / 77.8 / 65.4
  - EVS 9.6 kbps: 84.4 / 80.0 / 89.9 / 87.7
  - Lyra-v2 3.0 kbps: 53.1 / 52.0 / 69.3 / 42.3
  - Lyra-v2 6.0 kbps: 66.2 / 59.9 / 75.7 / 48.6
  - EnCodec 1.5 kbps (0.9 entropy coded): 49.2 / 41.3 / 68.2 / 66.5
  - EnCodec 3.0 kbps (1.9): 67.0 / 62.5 / 89.6 / 87.8
  - EnCodec 6.0 kbps (4.1): 83.1 / 69.4 / 92.9 / 91.3
  - EnCodec 12.0 kbps (8.9): 90.6 / 80.1 / 91.8 / 92.9
  - Sec 4.5: EnCodec "at 3kbps reaches better performance on average than Lyra-v2 using 6kbps and Opus at 12kbps".
  - Caveat: numbers came through the fetch tool's table extraction; re-check against the PDF Table 1 before printing.
- Training data (HF card https://huggingface.co/facebook/encodec_24khz/raw/main/README.md): speech (DNS Challenge 4, Common Voice), general audio (AudioSet, FSD50K), music (Jamendo). README: 24 kHz model trained on "a variety of audio data", 48 kHz on "music-only data"; 24 kHz model is causal mono, 48 kHz non-causal stereo, processing "chunks of 1 seconds, with an overlap of 1%".
- Licence. LICENSE file (https://raw.githubusercontent.com/facebookresearch/encodec/main/LICENSE): "MIT License", "Copyright (c) Meta Platforms, Inc. and affiliates." README: "The code in this repository is released under the MIT license as found in the LICENSE file." The README says nothing separate about the weights, and the HF cards facebook/encodec_24khz (cardData only `inference: false`, no license tag via https://huggingface.co/api/models/facebook/encodec_24khz) state no licence. So: code MIT; weights have no separately stated licence. Any claim that the weights are CC-BY-NC is UNCONFIRMED (checked 2026-10-17).
- Token arithmetic (24 kHz): tokens/s = 75 x n_q: 150 (1.5 kbps), 300 (3), 600 (6), 1200 (12), 2400 (24). Bitrate = 75 x n_q x 10 bits: 1500, 3000, 6000, 12000, 24000 bit/s. All reproduce. 48 kHz: 150 frames/s x (n_q/2) x 10 bits gives the same bitrates (e.g. 6 kbps = 150 x 4 x 10).

### 1.3 DAC, "High-Fidelity Audio Compression with Improved RVQGAN" (Kumar et al., Descript, 2023)
Source: https://arxiv.org/html/2306.06546 (v2). Repo: https://raw.githubusercontent.com/descriptinc/descript-audio-codec/main/README.md

- Abstract: "90x compression of 44.1 KHz audio into tokens at just 8kbps bandwidth."
- Table 1 (Sec 3): striding factor 512, frame rate 86 Hz, 9 codebooks of 10 bits (1024 entries), compression factor 91.16.
- Codebook improvements (Sec 3.2): "factorized codes and L2-normalized codes"; lookup in a low-dimensional space (8d or 32d tried); final model uses 8-dim lookup (Sec 4.5). Purpose: better codebook usage (fewer dead codes).
- Quantizer dropout (Sec 3.3, 4.5): "we instead apply quantizer dropout to each input example with some probability p"; final p = 0.5, because it "closely matches the reconstruction quality of baseline at lower bitrates"; the original always-on dropout "degrades the audio reconstruction quality at full bandwidth".
- Discriminators (Sec 3.4, 4.3): multi-period discriminator (periods 2, 3, 5, 7, 11) plus a complex multi-scale STFT discriminator (windows 2048, 1024, 512) split into sub-bands (multi-band), said to help high frequencies and reduce aliasing.
- Losses and weights (Sec 3.5): multi-scale mel reconstruction 15.0; feature matching 2.0; adversarial (hinge) 1.0; codebook 1.0; commitment 0.25.
- Size (Sec 4.3): "In total, our model has 76M parameters" (22M encoder, 54M decoder).
- Evaluation (Sec 4.6): Fig. 3 vs EnCodec at 44 kHz: "achieves much higher MUSHRA scores than EnCodec at all bitrates"; Fig. 4 vs EnCodec at 24 kHz matched configuration; Fig. 5 per category. MUSHRA numbers are in figures only: UNCONFIRMED as numbers. Opus appears only in objective metrics (Table 3), not in MUSHRA.
- Releases and licence: README: "We release weights for models that can natively support 16 kHz, 24kHz, and 44.1kHz sampling rates"; "Weights are released as part of this repo under MIT license." LICENSE (https://raw.githubusercontent.com/descriptinc/descript-audio-codec/main/LICENSE): "MIT License", "Copyright (c) 2023-present, Descript". Bitrates of the 16/24 kHz variants not stated in README: UNCONFIRMED.
- Token arithmetic (my arithmetic): 44100 / 512 = 86.13 frames/s; x 9 codebooks = 775 tokens/s; x 10 bits = 7752 bit/s, i.e. about 7.75 kbps, which the paper rounds to "8 kbps". Compression factor: 44100 x 16 bit = 705.6 kbit/s; 705600 / 7752 = 91.0 (Table 1 says 91.16; small difference presumably from the exact frame rate or rounding used; the source of the 91.16 is not explained in what I read: UNCONFIRMED).

### 1.4 Mimi (Kyutai, inside the Moshi paper, 2024)
Source: https://arxiv.org/html/2410.00037 (v2), Sec 3.3 and Sec 5.2. Repo README: https://raw.githubusercontent.com/kyutai-labs/moshi/main/README.md. Card: https://huggingface.co/kyutai/mimi/raw/main/README.md

- Sample and frame rate. Sec 3.3.1: "Mimi's encoder projects a 24kHz waveform to a latent representation of 12.5 frames per second" (latent dim 512). "Both its initial frame size and overall stride correspond to 80ms."
- Codebooks and bitrate. Sec 3.3.1 ("Quantization rate"): "We use Q=8 quantizers, each with a codebook size of N_A=2048", giving 1.1 kbps at 12.5 Hz. Card: "audio tokens running at 12.5Hz and a bitrate of 1.1kbps". README: "processes 24 kHz audio, down to a 12.5 Hz representation with a bandwidth of 1.1 kbps, in a fully streaming manner (latency of 80ms, the frame size)".
- Architecture. Sec 3.3.1: inspired by SoundStream and EnCodec, "a SeaNet ... autoencoder and a Residual Vector Quantizer"; Transformers placed "one right before quantization and one after", each 8 layers, 8 heads, dim 512, 250-frame (20 s) context, causal.
- Quantizer dropout. Sec 3.3.1: "Consistently with previous work, we use quantizer dropout ... to provide the codec with bitrate scalability." Also: "we only apply quantization 50% of the time, on a per-sequence basis, during training."
- Semantic distillation (Sec 3.3.2): "we distill semantic information from a self-supervised model (WavLM ... in our case) into the first level of the RVQ." Targets: "downsampling the input waveform to 16kHz before computing WavLM embeddings followed by average pooling with a stride of 4 and a kernel size of 8, to reach 12.5 Hz." "it was critical for performance to perform this average pooling in a non-causal way." Loss: "a cosine distance between the output of the first quantizer and the transformed WavLM embeddings". Split RVQ: "we distill semantic information into a plain VQ and apply an RVQ with 7 levels in parallel", the two outputs summed (so 1 semantic + 7 acoustic = 8 codebooks).
- Losses. Baseline: reconstruction + adversarial (EnCodec-style mix). Mimi variant "where we only keep the feature loss and discriminator loss" (adversarial-only). Sec text: "removing reconstruction losses majorly degrades objective metrics", but MUSHRA favours it: 81.0 (adversarial only) vs 58.8 (with the EnCodec loss mix) (Table 3 ablation, as reported by the fetch tool). Table 4 labels the compared Mimi "adv. loss only", which implies the released Mimi is adversarial-only; an explicit sentence saying so was not found: partly UNCONFIRMED.
- Headline evaluation, Table 4 (Sec 5.2): columns frame rate / bitrate / ABX (lower better) / VisQOL / MOSNet / MUSHRA
  - Mimi, adv. loss only: 12.5 Hz / 1.1 kbps / 8.7% / 1.84 / 3.10 / 81.0 +- 1.3
  - SemantiCodec: 50 Hz / 1.3 kbps / 42.2% / 2.43 / 3.12 / 64.8 +- 1.5
  - SpeechTokenizer: 50 Hz / 1.5 kbps / 3.3% / 1.53 / 2.67 / 45.1 +- 1.5
  - SpeechTokenizer: 50 Hz / 4.0 kbps / 3.3% / 3.07 / 3.10 / 74.3 +- 1.5
  - Note: VisQOL disagrees with MUSHRA (Mimi lower VisQOL than SemantiCodec); the authors argue VisQOL correlates poorly with perceived quality here. Re-check table values against the PDF before printing.
- Licence. Card YAML: "license: cc-by-4.0". Moshi README: "The weights for the models are released under the CC-BY 4.0 license"; code: "MIT license for the Python parts, and Apache license for the Rust backend."
- Token arithmetic: 12.5 frames/s x 8 codebooks = 100 tokens/s; bitrate 12.5 x 8 x log2(2048)=11 bits = 1100 bit/s = 1.1 kbps. Reproduces.

## 2. Audio representations

### 2.1 Mel spectrogram, Tacotron 2 (Shen et al., Google, 2017)
Source: https://arxiv.org/abs/1712.05884 (v2, revised 16 Feb 2018); text extracted from https://arxiv.org/pdf/1712.05884 with pdftotext. Section numbering is from the PDF: Sec 2.2 "Spectrogram Prediction Network".

- Verbatim (Sec 2.2): "As in Tacotron, mel spectrograms are computed through a short-time Fourier transform (STFT) using a 50 ms frame size, 12.5 ms frame hop, and a Hann window function. We experimented with a 5 ms frame hop to match the frequency of the conditioning inputs in the original WaveNet, but the corresponding increase in temporal resolution resulted in significantly more pronunciation issues."
- Verbatim (Sec 2.2): "We transform the STFT magnitude to the mel scale using an 80 channel mel filterbank spanning 125 Hz to 7.6 kHz, followed by log dynamic range compression. Prior to log compression, the filterbank output magnitudes are clipped to a minimum value of 0.01 in order to limit dynamic range in the logarithmic domain."
- Vocoder (Sec 2.3): modified WaveNet "to invert the mel spectrogram feature representation into time-domain waveform samples"; 30 dilated conv layers; "a 10-component mixture of logistic distributions (MoL) to generate 16-bit samples at 24 kHz"; "To work with the 12.5 ms frame hop of the spectrogram frames, only 2 upsampling layers are used in the conditioning stack".
- Abstract: "maps character embeddings to mel-scale spectrograms, followed by a modified WaveNet model acting as a vocoder to synthesize time-domain waveforms from those spectrograms"; "a mean opinion score (MOS) of 4.53 comparable to a MOS of 4.58 for professionally recorded speech."
- Arithmetic (mine): 12.5 ms hop = 80 frames/s of 80-dim vectors; at 24 kHz that is 300 samples per frame; 50 ms window = 1200 samples.

### 2.2 Vocoder: HiFi-GAN (Kong, Kim, Bae, Kakao, 2020)
Source: https://arxiv.org/pdf/2010.05646 (header "arXiv:2010.05646v2 [cs.SD] 23 Oct 2020"), pdftotext.

- Two-stage pipeline (Sec 1, verbatim): "Most neural speech synthesis models use a two-stage pipeline: 1) predicting a low resolution intermediate representation such as mel-spectrograms ... or linguistic features ... from text, and 2) synthesizing raw waveform audio from the intermediate representation". "the second stage model synthesizes raw waveforms with up to 24,000 samples per second and up to 16 bit fidelity." The second stage is the vocoder.
- Structure (Sec 2.1, verbatim): "HiFi-GAN consists of one generator and two discriminators: multi-scale and multi-period discriminators." Multi-period discriminator (MPD) sub-discriminators each look at samples spaced by a period; multi-scale discriminator (MSD) from MelGAN.
- Generator (Sec 2.2): "a fully convolutional neural network. It uses a mel-spectrogram as input and upsamples it through transposed convolutions until the length of the output sequence matches the temporal resolution of raw waveforms."
- Key idea (Abstract): "As speech audio consists of sinusoidal signals with various periods, we demonstrate that modeling periodic patterns of an audio is crucial for enhancing sample quality." (Multi-period discriminator, plus multi-scale discriminator.)
- Losses: GAN loss + "Mel-Spectrogram Loss": "The mel-spectrogram loss is the L1 distance between the mel-spectrogram of a waveform synthesized by the generator and that of a ground truth waveform." (Sec 2.3, verbatim) + feature matching.
- Mel settings (Sec 4.1, Experiments): "We used 80 bands mel-spectrograms as input conditions. The FFT, window, and hop size were set to 1024, 1024, and 256, respectively."
- Data: LJSpeech, "13,100 short audio clips of a single speaker with a total length of approximately 24 hours. The audio format is 16-bit PCM with a sample rate of 22 kHz". (Abstract says "22.05 kHz"; text says "22 kHz". LJSpeech is 22,050 Hz.)
- Table 1 (MOS with 95% CI; CPU speed kHz; GPU speed kHz; params M):
  - Ground truth: 4.45 (+-0.06)
  - WaveNet (MoL): 4.02 (+-0.08); GPU 0.07 kHz (x0.003); 24.73 M
  - WaveGlow: 3.81 (+-0.08); CPU 4.72 (x0.21); GPU 501 (x22.75); 87.73 M
  - MelGAN: 3.79 (+-0.09); CPU 145.52 (x6.59); GPU 14,238 (x645.73); 4.26 M
  - HiFi-GAN V1: 4.36 (+-0.07); CPU 31.74 (x1.43); GPU 3,701 (x167.86); 13.92 M
  - HiFi-GAN V2: 4.23 (+-0.07); CPU 214.97 (x9.74); GPU 16,863 (x764.80)
  - HiFi-GAN V3: 4.05 (+-0.08); CPU 296.38 (x13.44); GPU 26,169 (x1,186.80)
  - (Table extracted with pdftotext; column alignment for WaveNet/WaveGlow CPU cells reconstructed, re-check. V2/V3 params not captured: UNCONFIRMED here.)
  - Text: "V 1 has 13.92M parameters and achieves the highest MOS with a gap of 0.09 compared to the ground truth audio". Abstract: "22.05 kHz high-fidelity audio 167.9 times faster than real-time on a single V100 GPU"; small version "13.4 times faster than real-time on CPU".
- Arithmetic (mine): hop 256 at 22,050 Hz = 86.13 mel frames/s; window 1024 = 46.4 ms; the generator upsamples by 256 total.

### 2.3 Whisper input (Radford et al., OpenAI, 2022)
Source: https://arxiv.org/pdf/2212.04356 (header "arXiv:2212.04356v1 [eess.AS] 6 Dec 2022"), pdftotext, Sec 2.2 "Model".

- Verbatim: "All audio is re-sampled to 16,000 Hz, and an 80-channel log-magnitude Mel spectrogram representation is computed on 25-millisecond windows with a stride of 10 milliseconds. For feature normalization, we globally scale the input to be between -1 and 1 with approximately zero mean across the pre-training dataset."
- Stem: "two convolution layers with a filter width of 3 and the GELU activation function ... where the second convolution layer has a stride of two" (so 100 mel frames/s become 50 encoder positions/s, my arithmetic).
- Segments: "We break audio files into 30-second segments" (Sec 2.1). Data: "680,000 hours of labeled audio data" (Sec 1); "Of those 680,000 hours of audio, 117,000 hours" cover other languages (sentence continues; not fully quoted).
- large-v3 card (https://huggingface.co/openai/whisper-large-v3/raw/main/README.md): "The spectrogram input uses 128 Mel frequency bins instead of 80"; "trained on 1 million hours of weakly labeled audio and 4 million hours of pseudo-labeled audio" (last word of the quote follows the card's sentence; check); "license: apache-2.0".
- large-v3 preprocessor_config.json (https://huggingface.co/openai/whisper-large-v3/raw/main/preprocessor_config.json): feature_size 128, sampling_rate 16000, hop_length 160, n_fft 400, chunk_length 30, n_samples 480000, nb_max_frames 3000.
- Arithmetic (mine, consistent with the config): n_fft 400 at 16 kHz = 25 ms window; hop 160 = 10 ms = 100 frames/s; 30 s x 100 = 3000 frames; 30 x 16000 = 480000 samples. So one 30 s chunk = a 128 x 3000 (v3) or 80 x 3000 (v1/v2) image.

## 3. Generation lines

### 3.1 AudioLM (Borsos et al., Google, 2022)
Source: https://arxiv.org/pdf/2209.03143 (header "arXiv:2209.03143v2 [cs.SD] 26 Jul 2023"), pdftotext. Two-column text; sentences reassembled from interleaved columns.

- Acoustic tokens (Sec III-B): SoundStream configured "to produce embeddings at 50 Hz (one every 20 ms) for input waveforms at 16 kHz. This is a 16000 / 50 = 320-fold reduction in the sampling rate." "using N = 1024, Q = 4 results in a bitrate of 2000 bps (50 . 4 . log2 1024)" (the paper itself states the bitrate formula).
- Semantic tokens (Sec III-B): "we select an intermediate layer of the MLM module of w2v-BERT and compute embeddings at this level. We train a k-means with K clusters on these embeddings and use the centroid indices as semantic tokens." w2v-BERT is "a 0.6B-parameter Conformer-based model"; features are "computed at a sampling rate of 25 Hz (one every 40 ms)"; "when T = 16000, K = 1024, this results in a bitrate equal to 250 bps" (25 x 10 bits).
- Chosen config (Sec IV-B): "We identified the 7th layer in the MLM module of w2v-BERT XL and K = 1024 clusters as our best candidate." "We train a SoundStream codec with 12 residual vector quantizer layers with a codebook size of 1024 per layer and 4 convolutional blocks having strides (2, 4, 5, 8). This results in embeddings sampled at 50 Hz for 16 kHz inputs and a bitrate of 6000 bps (with 600 tokens per second)." "we set Q' = 4 such that we predict the flattened tokens corresponding to the coarse 4 layers in the second stage, whereas the third stage models the fine 8 layers. Hence, the third stage increases the audio bitrate from 2000 bps to 6000 bps".
  - Arithmetic check: 50 x 12 x 10 = 6000 bps, 50 x 12 = 600 tokens/s. Reproduces. Note 16 kHz / 320 = 50 Hz here, versus SoundStream paper's 24 kHz / 320 = 75 Hz.
- Three stages (Sec III-C): "AudioLM performs three subsequent stages ... In all stages, we use a separate decoder-only Transformer trained for predicting next tokens". "Semantic modeling. The first stage models p(z_t | z_<t), the autoregressive prediction of semantic tokens to capture long-term temporal structure." "Coarse acoustic modeling. ... it only predicts the acoustic tokens from the coarse Q' SoundStream quantizers, conditioned on the semantic tokens." "tokens from the coarse quantizers recover acoustic properties like speaker identity and recording conditions, while leaving only the fine acoustic details to the fine quantizer tokens". Coarse tokens are flattened "in a row-major order". "Fine acoustic modeling. The third stage operates on acoustic tokens corresponding to the fine quantizers, using the Q' coarse tokens as conditioning".
- Model (Sec IV-B): "identical decoder-only Transformers in all stages, with 12 layers, 16 attention heads, embedding a dimension of 1024, feed-forward layer dimension of 4096 and dropout of 0.1 ... resulting in a model parameter size of 0.3B per stage." Training crops equivalent to "30, 10 and 3 seconds for the three stages".
- Data (Sec IV-A): all components "are trained on the unlab-60k train split of Libri-Light [53], consisting of 60k hours of English" speech.
- Key claim (Sec IV-E, human eval with 3 s prompts): "Based on the 1000 ratings collected ... the rate of success for assigning the correct label (original vs. synthesized) is 51.2%, which, according to a binomial test, is not statistically significantly different (p = 0.23) from assigning labels uniformly at random (50% success rate)."
- Also: AudioLM uses "prompts of 3 seconds" for speech continuation; also trained on piano music (Sec on piano continuation; details not extracted).

### 3.2 VALL-E (Wang et al., Microsoft, 2023)
Source: https://arxiv.org/pdf/2301.02111 (header "arXiv:2301.02111v1 [cs.CL] 5 Jan 2023"), pdftotext.

- Abstract: "we train a neural codec language model (called VALL-E) using discrete codes derived from an off-the-shelf neural audio codec model, and regard TTS as a conditional language modeling task rather than continuous signal regression as in previous work." "we scale up the TTS training data to 60K hours of English speech which is hundreds of times larger than existing systems." "high-quality personalized speech with only a 3-second enrolled recording of an unseen speaker as an acoustic prompt."
- Codec (Sec 3.1? "Speech quantization"): "We adopt a pre-trained neural audio codec model, EnCodec ..., as our tokenizer." "The encoder produces embeddings at 75 Hz for input waveforms at 24 kHz, which is a 320-fold reduction in the sampling rate." "we choose eight hierarchy quantizers with 1024 entries each ... This configuration corresponds to EnCodec at 6K bitrates for 24 kHz audio reconstruction." "given a 10-second waveform, the discrete representation is a matrix with 750 x 8 entries".
- AR + NAR split (Sec 4.2): "For the discrete tokens from the first quantizer c_{:,1}, we train an autoregressive (AR) decoder-only language model. It is conditioned on the phoneme sequence x and the acoustic prompt". "For the discrete tokens from the second to the last quantizers, c_{:,j in [2,8]}, we train a non-autoregressive (NAR) language model." Rationale (Fig. 2 caption, partial): "Because RVQ is employed, the first quantizer plays" the most important role (caption continues; exact remainder not extracted); text: "Each quantizer is trained to model the residual from the previous quantizers."
- Data (Sec 5.1): "LibriLight ... which contains 60K hours of unlabelled speech from audiobooks in English. The number of distinct speakers is around 7000". Transcripts from "a hybrid DNN-HMM ASR model on 960 hours labeled LibriSpeech".
- Model (Sec 5.1): "Both the AR model and the NAR model have the same transformer architecture with 12 layers, 16 attention heads, an embedding dimension of 1024, a feed-forward layer dimension of 4096, and a dropout of 0.1." Crops of 10-20 s; NAR acoustic prompt is "a random segment waveform of 3 seconds from the same utterance". "16 NVIDIA TESLA V100 32GB GPUs ... for 800k steps." Total parameter count not stated in what I read: UNCONFIRMED.
- Key result (Sec 1): vs YourTTS on LibriSpeech, "+0.12 comparative mean option score (CMOS) and +0.93 similarity mean option score (SMOS) improvement"; on VCTK "+0.11 SMOS and +0.23 CMOS"; "It even achieves a +0.04 CMOS score against ground" truth (on VCTK; sentence continues).
- Token arithmetic: 75 Hz x 8 = 600 tokens/s (but only 75/s are generated autoregressively; the other 7 levels come from 7 NAR passes); 75 x 8 x 10 = 6000 bit/s = "6K bitrates". Reproduces.

### 3.3 MusicGen (Copet et al., Meta, 2023)
Source: https://arxiv.org/pdf/2306.05284 (header "arXiv:2306.05284v3 [cs.SD] 30 Jan 2024"), pdftotext. Repo licence: https://raw.githubusercontent.com/facebookresearch/audiocraft/main/README.md

- Abstract: "a single Language Model (LM) that operates over several streams of compressed discrete music representation, i.e., tokens. Unlike prior work, MusicGen is comprised of a single-stage transformer LM together with efficient token interleaving patterns, which eliminates the need for cascading several models, e.g., hierarchically or upsampling."
- Patterns (Sec 2.2): a codebook pattern is a partition of all (time, codebook) pairs into steps P_s, "We model Q by predicting in parallel all the positions in P_s, conditionally on all the positions in P_0, P_1, ..., P_{s-1}." Parallel pattern: P_s = {(s, k) : k in 1..K} (Eq. 5). "It is also possible to introduce a "delay" between the codebooks, as in Kharitonov et al. [2022], e.g., P_s = {(s - k + 1, k) : k in {1, ..., K}, s - k >= 0}" (Eq. 6). I.e. codebook k is shifted by k-1 steps, so at step s the model emits codebook 1 of frame s, codebook 2 of frame s-1, and so on.
- Tokenizer (Sec 3, Implementation): "We use a non-causal five layers EnCodec model for 32 kHz monophonic audio with a stride of 640, resulting in a frame rate of 50 Hz ... The embeddings are quantized with a RVQ with four quantizers, each with a codebook size of 2048." (Trained on one-second random crops.)
- Steps: "We use the "delay" interleaving pattern from Section 2.2, This translates 30 seconds of audio into 1500 autoregressive steps." (30 x 50 = 1500; the delay adds K-1 = 3 steps, which the paper does not count; my note.)
- Sizes: "300M, 1.5B, 3.3B parameters." Text conditioning: T5 encoder (FLAN-T5 and CLAP also tried); optional melody conditioning from chromagrams.
- Data (Sec 4.1): "We use 20K hours of licensed music to train MusicGen. Specifically, we rely on an internal dataset of 10K high-quality music tracks, and on the ShutterStock and Pond5 music data collections with respectively 25K and 365K instrument-only music tracks. All datasets consist of full-length music sampled at 32 kHz". Mono downmix unless stated.
- Table 1 (MusicCaps test set; FAD_vgg lower better, KL lower, CLAP score higher, OVL and REL human ratings with CI95):
  - Riffusion: FAD 14.8, KL 2.06, CLAP 0.19, OVL 79.31+-1.37, REL 74.20+-2.17
  - Mousai: 7.5, 1.59, 0.23, 76.11+-1.56, 77.35+-1.72
  - MusicLM: 4.0, -, -, 80.51+-1.07, 82.35+-1.36
  - Noise2Music: 2.1, -, -, -, -
  - MusicGen w.o melody 300M: 3.1, 1.28, 0.31, 78.43+-1.30, 81.11+-1.31
  - MusicGen w.o melody 1.5B: 3.4, 1.23, 0.32, 80.74+-1.17, 83.70+-1.21
  - MusicGen w.o melody 3.3B: 3.8, 1.22, 0.31, 84.81+-0.95, 82.47+-1.25
  - MusicGen w. random melody 1.5B: 5.0, 1.31, 0.28, 81.30+-1.29, 81.98+-1.79
  - (Reassembled from pdftotext columns; re-check before printing. Note FAD gets worse with size while human OVL improves.)
- Licence (audiocraft README): "The code in this repository is released under the MIT license"; "The models weights in this repository are released under the CC-BY-NC 4.0 license as found in the LICENSE_weights file." (This covers audiocraft's own 32 kHz EnCodec weights too; the original facebookresearch/encodec repo states only an MIT code licence, see 1.2.)
- Token arithmetic (mine; the paper does not state a bitrate): 50 Hz x 4 codebooks = 200 tokens/s; 50 x 4 x log2(2048)=11 = 2200 bit/s = 2.2 kbps. With the delay pattern the LM emits 4 tokens per step but only 50 steps/s.

### 3.4 Stable Audio Open (Evans et al., Stability AI, 2024)
Source: https://arxiv.org/html/2407.14358 (v2, revised 31 Jul 2024; v1 19 Jul 2024). Card page: https://huggingface.co/stabilityai/stable-audio-open-1.0 (raw README is gated, HTTP 401; the rendered page was read).

- Sec 2: generates "variable-length (up to 47s) stereo audio at 44.1kHz from text prompts". Latent diffusion: autoencoder 156M params, "parameterized as a variational autoencoder with a latent size of 64"; T5-based text encoder 109M (card: t5-base); "a transformer-based diffusion model (DiT of 1057M parameters)".
  - Total: the paper gives no total in what I read; components sum to 156 + 109 + 1057 = 1322M (my arithmetic). The card lists model size "1B params". A "1.21B" figure is UNCONFIRMED (not found).
- Latent rate: tables (Sec 3.1, Tables 3-4) list the autoencoder latent rate as 21.5 Hz. Downsampling factor not stated; 44100 / 21.5 = 2051, consistent with 2048 (44100 / 2048 = 21.53 Hz), my arithmetic: downsampling 2048 is UNCONFIRMED as a stated number. Latent for 47 s: about 47 x 21.53 = 1012 frames x 64 channels (my arithmetic).
- Objective and sampling (Sec 4.2): DiT trained with "the v-objective"; inference DPM-Solver++ 100 steps, classifier-free guidance scale 7.0.
- Data (Sec 3): "CC recordings from Freesound and the Free Music Archive (FMA)": 486,492 recordings (about 7,300 h): Freesound 472,618 (6,330 h), FMA 13,874 (970 h); licences CC0, CC-BY, CC Sampling+. Card gives the per-licence split after copyright filtering: Freesound 266,324 CC0, 194,840 CC-BY, 11,454 CC Sampling+; FMA 8,967 CC-BY, 4,907 CC0.
- Results (Sec 5, Tables 1-2; FD_openl3 lower better / KL_passt lower / CLAP higher):
  - AudioCaps: Stable Audio Open 78.24 / 2.14 / 0.29; AudioLDM2-48kHz 101.11 / 2.04 / 0.37; AudioLDM2-large 170.31 / 1.57 / 0.41. (Best FD; not best KL or CLAP.)
  - Song Describer instrumental: Stable Audio Open 96.51 / 0.55 / 0.41; MusicGen-large-stereo 190.47 / 0.52 / 0.31; Stable Audio 2.0 71.25 / 0.37 / 0.42.
- Speed (Sec 5.4): about 8 diffusion steps/s on RTX 3090, 11 on RTX A6000, 20 on H100. Memory (App. B): DiT about 5.9 GB in diffusion, about 14.5 GB peak with decoding.
- Limitations (Sec 6.1): "cannot generate intelligible speech" (no intelligible singing/lyrics either, Sec 5.3); struggles with connectors like "and"/"then"; for music "it is not competitive against state-of-the-art music models"; mostly English prompts.
- Licence: card metadata "stable-audio-community" (Stability AI Community License); "For commercial use, please refer to https://stability.ai/license". Revenue threshold terms not on the card: UNCONFIRMED.
- Key contrast for the page: continuous VAE latents (21.5 Hz x 64 floats) + diffusion, not discrete tokens + LM.

### 3.5 F5-TTS (Chen et al., SJTU and others, 2024)
Source: https://arxiv.org/html/2410.06885 (v3, 20 May 2025). Repo: https://raw.githubusercontent.com/SWivid/F5-TTS/main/README.md

- Abstract: "fully non-autoregressive text-to-speech system based on flow matching with Diffusion Transformer (DiT)"; "the text input is simply padded with filler tokens to the same length as input speech"; no "complex designs such as duration model, text encoder, and phoneme alignment"; ConvNeXt blocks refine "the text representation, making it easy to align with the speech"; Sway Sampling, an inference-time non-uniform flow-step schedule usable "without retraining"; "achieves an inference RTF of 0.15".
- Motivation: "the original design of E2 TTS makes it hard to follow due to its slow convergence and low robustness".
- Training task: text-guided speech infilling; "A random 70% to 100% of mel frames is masked for infilling task training."
- Features (Sec 4): 100-dim log mel-filterbank, 24 kHz, hop length 256 (my arithmetic: 93.75 mel frames/s). Vocoder: pretrained Vocos.
- Duration (Sec 3.1): no duration model; it "simply estimate[s] the duration based on the ratio of the number of characters" in the target text vs the reference text (times the reference audio length).
- Size: 335.8M params (Sec 4); Table 1 lists 336M.
- Data (Sec 4): Emilia filtered to "approximately 95K hours of English and Chinese data" (abstract says a public 100K-hour multilingual dataset).
- Speed (Table 1, Sec 5): RTF 0.15 at 16 NFE, 0.31 at 32 NFE, measured generating 10 s of speech on an RTX 3090.
- Results (32 NFE): LibriSpeech-PC test-clean WER 2.42, SIM-o 0.66; Seed-TTS test-en WER 1.83, SIM-o 0.67; test-zh WER 1.56, SIM-o 0.76 (Tables 1-2).
- Licence: "Our code is released under MIT License." "The pre-trained models are licensed under the CC-BY-NC license due to the training data Emilia, which is an in-the-wild dataset."
- Key contrast: continuous mel + flow matching, non-autoregressive, versus VALL-E's discrete tokens + AR LM.

### 3.6 Moshi (Defossez et al., Kyutai, 2024)
Source: https://arxiv.org/html/2410.00037 (v2). Repo: https://raw.githubusercontent.com/kyutai-labs/moshi/main/README.md. Codec details in 1.4.

- Abstract: "the first real-time full-duplex spoken large language model"; "with a theoretical latency of 160ms, 200ms in practice"; Inner Monologue: "first predict time-aligned text tokens as a prefix to audio tokens".
- Latency breakdown (README, not the paper): "Moshi achieves a theoretical latency of 160ms (80ms for the frame size of Mimi + 80ms of acoustic delay), with a practical overall latency as low as 200ms on an L4 GPU." The paper compares 160 ms with a 230 ms average in natural conversation (the paper does not spell out 80 + 80 in what I read).
- Full duplex (Intro): "it always listens and always generates sound, either speech or silence"; "a model that explicitly processes the input and output audio streams jointly into two autoregressive token streams". Sec 3.4.3: "In practice, A will correspond to Moshi, while A' models the user."
- Streams: "a total number of K=2Q+1 streams, with Q=8 in the experiments", i.e. 17 tokens per 80 ms step: 1 text + 8 Moshi audio + 8 user audio.
- RQ-Transformer (Sec 3.4.1): "the RQ-Transformer consists in two Transformer models": a large Temporal Transformer once per timestep (initialised from Helium: dim 4096, 32 layers, Table 1) and a small Depth Transformer over the codebooks within a step: "our Depth Transformer has 6 layers, a dimension of 1024, and 16 attention heads."
- Acoustic delay: "introducing a delay of 1 or 2 steps between the semantic and acoustic features" improves quality (pretraining uses delay 2, fine-tuning delay 1, per Sec 5 text as reported by the fetch tool).
- Inner Monologue (Sec 3.4.4): "We build W such that when a word starts, (W_t) contains its text tokens, followed by PAD until the next word." "padding tokens represent about 65% of the tokens" in English conversational speech. Conclusion: "a new method that generates text tokens as a prefix to audio tokens, while remaining compatible with streaming inference."
- Scale: Helium "a 7B parameter text LLM" pretrained on 2.1T tokens (rendered text garbled; Table 1 500k steps x 4.2M-token batch = 2.1T). Audio pretraining: "We use an audio collection of 7 million hours" (Sec 4.2). Fisher: "2000 hours of phone conversations between randomly paired participants". Synthetic dialogues: "more than 20k hours of synthetic speech data". Total Moshi parameter count (Helium 7B + Depth Transformer) not stated in what I read: UNCONFIRMED (commonly quoted 7.6B or similar; do not print without a source).
- Licence: weights CC-BY 4.0; code MIT (Python) / Apache (Rust) (README).
- Token arithmetic: 12.5 steps/s x 17 streams = 212.5 tokens/s modelled; Temporal Transformer runs 12.5 times/s; Depth Transformer generates up to 16 audio tokens per step (my arithmetic: whether the user's 8 are predicted or only conditioned on at inference is not stated in what I read).

### 3.7 Recent open TTS (2025-2026), quick facts
**Kokoro-82M** (hexgrad). Card: https://huggingface.co/hexgrad/Kokoro-82M/raw/main/README.md
- "open-weight TTS model with 82 million parameters"; built on StyleTTS 2 and ISTFTNet; "Decoder only: no diffusion, no encoder release."
- Data: "A few hundred hours of audio" (v1.0). Cost: "About $1000 for 1000 hours of A100 80GB vRAM" (both releases). v1.0: 8 languages, 54 voices.
- Licence: "With Apache-licensed weights, Kokoro can be deployed anywhere from production environments to personal projects" (Apache-2.0).
- Teaching point: small, mel/ISTFT-style non-LM pipeline; shows quality from small models plus curated data.

**Chatterbox / Chatterbox Turbo** (Resemble AI; Turbo is the narrator used by this repo's explainer-video skill). README: https://raw.githubusercontent.com/resemble-ai/chatterbox/master/README.md; card: https://huggingface.co/ResembleAI/chatterbox/raw/main/README.md; LICENSE: https://raw.githubusercontent.com/resemble-ai/chatterbox/master/LICENSE
- Chatterbox: "0.5B Llama backbone"; "Trained on 0.5M hours of cleaned data"; "Ultra-stable with alignment-informed inference"; "the first open source TTS model to support emotion exaggeration control".
- Turbo: "Built on a streamlined 350M parameter architecture"; "reducing generation from 10 steps to just one" (the README does not say which component; that it is the speech-token-to-mel decoder is UNCONFIRMED); "Paralinguistic tags are now native to the Turbo model". Nano: "110M parameter package". Multilingual model: 23 languages.
- Watermark: "Every audio file generated by Chatterbox includes Resemble AI's Perth (Perceptual Threshold) Watermarker".
- Licence: LICENSE "MIT License", "Copyright (c) 2025 Resemble AI"; card "license: mit".
- Architecture detail (LM over speech tokens then a flow-matching mel decoder plus vocoder, CosyVoice-style) is not stated in the README/card read: UNCONFIRMED.

CosyVoice 2 (2412.10117) and Dia: not researched (time); UNCONFIRMED.

## 4. Token-rate arithmetic (summary)

Formula: tokens/s = frame rate x codebooks; bitrate = frame rate x codebooks x log2(codebook size). AudioLM states the formula explicitly: "using N = 1024, Q = 4 results in a bitrate of 2000 bps (50 . 4 . log2 1024)" (https://arxiv.org/pdf/2209.03143, Sec III-B).

| Codec (config) | Sample rate | Frame rate | Codebooks x size | Tokens/s | Bitrate computed | Bitrate stated | Match |
|---|---|---|---|---|---|---|---|
| SoundStream (6 kbps) | 24 kHz | 75 Hz (stride 320) | 8 x 1024 | 600 | 6000 bps | 6 kbps; "80 bits per frame" | yes |
| SoundStream (18 kbps) | 24 kHz | 75 Hz | 24 x 1024 (Nq inferred) | 1800 | 18000 | 18 kbps | Nq UNCONFIRMED |
| SoundStream as used in AudioLM | 16 kHz | 50 Hz (stride 320) | 12 x 1024 | 600 | 6000 | "6000 bps (with 600 tokens per second)" | yes |
| w2v-BERT semantic (AudioLM) | 16 kHz | 25 Hz | 1 x 1024 (k-means) | 25 | 250 | "250 bps" | yes |
| EnCodec 24 kHz | 24 kHz | 75 Hz | 2/4/8/16/32 x 1024 | 150/300/600/1200/2400 | 1.5/3/6/12/24 kbps | same (README) | yes |
| EnCodec as used in VALL-E | 24 kHz | 75 Hz | 8 x 1024 | 600 | 6000 | "6K bitrates" | yes |
| EnCodec 32 kHz (MusicGen) | 32 kHz | 50 Hz (stride 640) | 4 x 2048 | 200 | 2200 bps | not stated | n/a |
| DAC 44.1 kHz | 44.1 kHz | 86 Hz (stride 512; 86.13) | 9 x 1024 | 775 | 7752 bps | "8kbps" (rounded) | approx |
| Mimi | 24 kHz | 12.5 Hz (80 ms) | 8 x 2048 | 100 | 1100 bps | "1.1 kbps" | yes |
| Stable Audio Open VAE | 44.1 kHz stereo | 21.5 Hz | continuous, 64 dims | n/a (64 floats/frame) | n/a | n/a | n/a |

Raw PCM reference (my arithmetic): 24 kHz x 16 bit mono = 384 kbit/s, so EnCodec 6 kbps is 64x smaller and Mimi 1.1 kbps is about 349x smaller; 44.1 kHz 16 bit mono = 705.6 kbit/s (DAC "90x").
Sequence-length reference (my arithmetic): 10 s of speech is 240,000 samples at 24 kHz; 750 EnCodec frames (6000 tokens at 8 codebooks); 125 Mimi frames (1000 tokens); 1000 Whisper mel frames (10 ms hop); about 215 Stable Audio Open latent frames of 64 floats (21.5 Hz).

