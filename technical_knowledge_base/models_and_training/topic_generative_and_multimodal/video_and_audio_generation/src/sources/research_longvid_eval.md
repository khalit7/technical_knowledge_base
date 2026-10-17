# Research: long video / temporal consistency, and evaluation of video and audio generation

Compiled 2026-10-17. All numbers below carry a source URL and location. Quotes are verbatim as returned by the fetch tool (short excerpts). UNCONFIRMED marks anything not verified.

## A) Temporal consistency and long video

### A1. Diffusion Forcing (Chen et al. 2024), arXiv 2407.01392 (abs page shows v4, revised 10 Dec 2024)
Source: https://arxiv.org/abs/2407.01392 (abstract)
- Authors: Boyuan Chen, Diego Marti Monso, Yilun Du, Max Simchowitz, Russ Tedrake, Vincent Sitzmann.
- Core idea, quote: "a diffusion model is trained to denoise a set of tokens with independent per-token noise levels".
- Applied to causal next-token prediction: combines variable-length generation (like next-token models) with guidance over the full sequence (like full-sequence diffusion).
- Long rollouts, quote: "rolling-out sequences of continuous tokens, such as video, with lengths past the training horizon, where baselines diverge".
- Theory: abstract says the method optimizes a variational lower bound on the likelihoods of all subsequences of tokens.
- Teaching point: because every frame can carry its own noise level, at inference you can keep past frames clean (or slightly noised) and the next frame fully noisy; this is the root of "rolling" or "diagonal" denoising schedules used later.

### A2. CausVid (Yin et al.), "From Slow Bidirectional to Fast Autoregressive Video Diffusion Models", arXiv 2412.07772 (v4, revised 23 Sep 2025; v1 10 Dec 2024)
Sources: https://arxiv.org/abs/2412.07772 and https://arxiv.org/html/2412.07772v4
- Authors: Tianwei Yin, Qiang Zhang, Richard Zhang, William T. Freeman, Fredo Durand, Eli Shechtman, Xun Huang.
- Method: adapt a pretrained bidirectional video DiT to an autoregressive (causal) generator; extend distribution matching distillation (DMD) to video, 50-step teacher to 4-step student (abstract).
- Asymmetric distillation, quote (Sec 4.2): "we employ bidirectional attention in the teacher model while constraining the student model to causal attention." Rationale (Sec 4.2): "causal diffusion models typically underperform their bidirectional counterparts" and with a causal teacher "issues such as error accumulation would propagate from teacher to student."
- Speed, abstract quote: "fast streaming generation of high-quality videos at 9.4 FPS on a single GPU" (with KV caching).
- Hardware: Sec 5, quote: "The inference times are measured on a H100 GPU."
- Initial latency: Figure 1 caption, "achieves an initial latency of only 1.3 seconds"; Table 3: 1.3 s latency, 9.4 FPS, for 10 s, 120-frame videos at 640x352.
- Teacher: Sec 5, "Our teacher model is a bidirectional DiT" similar to CogVideoX; 3D VAE compresses 16 frames to 5 latent frames per chunk; "trained on 10-second videos at a resolution of 352x640" at 12 FPS.
- Quality: abstract reports VBench-Long total 84.27, which the authors say beats all compared models.
- Failure mode: Sec 5.2, "the causal baseline suffers from error accumulation, leading to rapid degradation in generation quality over time." Sec 6: "Developing more effective strategies to address error accumulation remains future work"; also notes degradation for "extremely long" videos.
- Abstract says long videos are possible despite training only on short clips.

### A3. Self Forcing (Huang et al.), "Self Forcing: Bridging the Train-Test Gap in Autoregressive Video Diffusion", arXiv 2506.08009 (v2, revised 10 Nov 2025; v1 9 Jun 2025)
Sources: https://arxiv.org/abs/2506.08009 and https://arxiv.org/html/2506.08009v2
- Authors: Xun Huang, Zhengqi Li, Guande He, Mingyuan Zhou, Eli Shechtman.
- Problem, abstract quote: "addresses the longstanding issue of exposure bias". Teacher forcing / diffusion forcing train on ground-truth context; at inference the model sees its own imperfect outputs (train-test gap).
- Fix: during training, roll out autoregressively with KV caching and condition each frame on the model's own previous outputs; supervise with "a holistic loss at the video level" (abstract); uses "a few-step diffusion model along with a stochastic gradient truncation strategy"; "rolling KV cache mechanism" for extrapolation.
- Speed, Sec 1 quote: "real-time video generation at 17 FPS with sub-second latency on a single H100 GPU." Sec 4: "with all speed tests conducted on a single NVIDIA H100 GPU."
- Table 1 (Sec 4), throughput FPS / first-frame latency s / VBench total:
  - Self Forcing chunk-wise: 17.0 / 0.69 / 84.31
  - Self Forcing frame-wise: 8.9 / 0.45 / 84.26
  - CausVid (chunk-wise, as reimplemented in this paper's setup): 17.0 / 0.69 / 81.20
  - Wan2.1: 0.78 / 103 / 84.26
  - SkyReels-V2: 0.49 / 112 / 82.67
  - MAGI-1: 0.19 / 282 / 79.18
  - LTX-Video: 8.98 / 13.5 / 80.00
  - Pyramid Flow: 6.7 / 2.5 / 81.72
  - NOVA: 0.88 / 4.1 / 80.12
  - NOTE: the CausVid row here (17 FPS, 0.69 s) differs from CausVid's own paper (9.4 FPS, 1.3 s) because Self Forcing reimplements it on its own base; record both, do not mix.
- Sec 4 on CausVid: "CausVid suffers from the error accumulation problem that causes the saturation to increase over time."
- Limitation, Sec 5: "quality degradation remains observable when generating videos substantially longer than those seen during training."
- UNCONFIRMED from this fetch: the base model (believed Wan2.1-T2V-1.3B); not verified in the text read.

### A4. FramePack (Lvmin Zhang, Maneesh Agrawala 2025), arXiv 2504.12626 (HTML v3 read)
Source: https://arxiv.org/html/2504.12626 (served v3)
- Context packing, abstract: compresses past frames "with more important frames having longer contexts". Sec 3.1: per-frame context length follows a progressive compression rule (Eq. 1); with lambda = 2 the total context is a geometric series, so it is bounded. Quote (Sec 3.1): "This bounded context length makes FramePack's compression bottleneck invariant to the input frame number T." Implemented by patchifying older frames with larger kernels (fewer tokens per frame).
- Importance measured by time proximity (Sec 3.1) or feature similarity / hybrid (Sec 3.2).
- Drifting definition, Sec 1 quote: "\"Drifting\" refers to the degradation of visual quality due to error accumulation over time (also called exposure/observation bias)." The paper frames a forgetting vs drifting trade-off: stronger memory can also propagate errors faster.
- Anti-drifting sampling (Sec 4.1): endpoint planning, "the first iteration simultaneously generates both beginning and ending sections", later iterations fill gaps; inverted (anti-drifting) sampling for image-to-video generates toward the user's high-quality first frame; multiple endpoints with different prompts. Sec 4.2 also proposes discrete history tokens.
- Scale claims: abstract "allows for inference with thousands of frames"; Sec 1: "the efficient implementations of FramePack can process thousands of frames with 13B models even on laptops", citing "6GB or 8GB GPU memory". Sec 5.2: "a batch size of about 64 on a single 8xA100-80G node" for 13B HunyuanVideo training at 480p. (Laptop claim is the authors' statement; no separate benchmark seen.)

### A5. MAGI-1 (Sand AI 2025), arXiv 2505.13211 (v1 per figure paths in HTML)
Source: https://arxiv.org/html/2505.13211
- Chunk-wise autoregressive denoising, abstract: "trained to denoise per-chunk noise that increases monotonically over time"; Sec 2.2.1: "earlier chunks are cleaner than later ones".
- Chunk size, Sec 2: "each chunk contains 24 raw frames (equivalent to one second video clip at 24 FPS)".
- Parameters, abstract: "The largest variant of Magi-1 comprises 24 billion parameters"; a 4.5B variant also (Sec 2.2.3, Table 2).
- Context: abstract "supports context lengths of up to 4 million tokens".
- Streaming: abstract "naturally supports streaming generation", "maintaining constant peak inference cost, regardless of video length"; Sec 2: "up to four chunks can be inferred simultaneously" (pipelined: a chunk starts denoising before the previous one is clean).
- Physics-IQ, Sec 5.2, Table 10, quote: "Magi-1 outperforms all competing models by a substantial margin, reaches the score of 56.02." Physics IQ Score: Magi-1 (V2V) 56.02; Magi-1 (I2V) 30.23; VideoPoet (V2V) 29.50; Kling1.6 (I2V) 23.64; Gen 3 (I2V) 22.80; Sora (I2V) 10.00; ground truth 100.0. V2V conditions on video frames, I2V on one frame, so V2V and I2V numbers are not like-for-like.
- Speed of MAGI-1 per Self Forcing Table 1 (different paper, H100): 0.19 FPS, 282 s latency, VBench total 79.18.

### A6. Sora technical report, "Video generation models as world simulators" (OpenAI, Feb 2024): stated capabilities and limitations
Source: https://web.archive.org/web/2024/https://openai.com/index/video-generation-models-as-world-simulators/ (resolved to snapshot https://web.archive.org/web/20250105124831/https://openai.com/index/video-generation-models-as-world-simulators/ ; fetched with curl because WebFetch cannot reach web.archive.org). Note: the original text uses long dashes; they are shown below as " (...) " parentheses to respect the no-em-dash rule, wording otherwise verbatim.
- Length: "Our largest model, Sora, is capable of generating a minute of high fidelity video."
- Method summary: "a transformer architecture that operates on spacetime patches of video and image latent codes."
- Report scope: "qualitative evaluation of Sora's capabilities and limitations. Model and implementation details are not included in this report."
- Long-range coherence (section "Long-range coherence and object permanence"): "A significant challenge for video generation systems has been maintaining temporal consistency when sampling long videos. We find that Sora is often, though not always, able to effectively model both short- and long-range dependencies. For example, our model can persist people, animals and objects even when they are occluded or leave the frame."
- 3D consistency: "As the camera shifts and rotates, people and scene elements move consistently through three-dimensional space." Emergence claim: these properties "emerge without any explicit inductive biases for 3D, objects, etc. (...) they are purely phenomena of scale."
- Limitations (Discussion), verbatim: "Sora currently exhibits numerous limitations as a simulator. For example, it does not accurately model the physics of many basic interactions, like glass shattering. Other interactions, like eating food, do not always yield correct changes in object state. We enumerate other common failure modes of the model (...) such as incoherencies that develop in long duration samples or spontaneous appearances of objects (...) in our landing page."
- So the canonical failure-mode list for teaching: physics of interactions (glass shattering), object state changes (eating food leaves no bite mark), incoherence over long samples (drift), objects spontaneously appearing. Identity drift and objects disappearing are commonly discussed but the specific phrase "identity drift" is NOT in the Sora report (UNCONFIRMED as a phrase from a single canonical source; FramePack's "drifting" definition in A4 is the citable one for quality drift).

### A7. Physics benchmarks (one line each)
- Physics-IQ: Motamed, Culp, Swersky, Jaini, Geirhos, "Do generative video models understand physical principles?", arXiv 2501.09038 (v1 14 Jan 2025, v3 27 Feb 2025). Abstract: "physical understanding is severely limited, and unrelated to visual realism." Best model VideoPoet (multiframe) scored 29.5 against a physical-variance ceiling of 100.0 (Table 1, Figure 4; Figure 4 caption "with the best model scoring 29.5%"). Eight models evaluated: VideoPoet (i2v, multiframe), Lumiere (i2v, multiframe), Runway Gen 3 (i2v), Pika 1.0 (i2v), Stable Video Diffusion (i2v), Sora (i2v). Source: https://arxiv.org/html/2501.09038v3 . Later, MAGI-1 reports 56.02 (V2V) and 30.23 (I2V) on the same benchmark (A5, MAGI-1 Table 10; self-reported).
- VideoPhy: Bansal et al., "VideoPhy: Evaluating Physical Commonsense for Video Generation", arXiv 2406.03520 (v1 5 Jun 2024, v2 3 Oct 2024). Abstract: the best model, CogVideoX-5B, "generates videos that adhere to the caption and physical laws for 39.6% of the instances." Source: https://arxiv.org/abs/2406.03520 (v2).

## B) Evaluation of video and audio generation

### B1. FVD: Unterthiner et al., "Towards Accurate Generative Models of Video: A New Metric & Challenges", arXiv 1812.01717 (v2, 27 Mar 2019; v1 3 Dec 2018)
Sources: https://arxiv.org/abs/1812.01717 ; text from https://arxiv.org/pdf/1812.01717v2 (pdftotext).
- Authors: Thomas Unterthiner, Sjoerd van Steenkiste, Karol Kurach, Raphael Marinier, Marcin Michalski, Sylvain Gelly.
- Motivation (abstract): "the lack of qualitative metrics that consider visual quality, temporal coherence, and diversity of samples." Claim: "FVD correlates well with qualitative human judgment of generated videos" (large human study).
- Definition (Sec 2, "Frechet Video Distance"): Frechet (2-Wasserstein) distance between real distribution P_R and generated P_G; closed form for multivariate Gaussians (Eq. 2): |mu_R - mu_G|^2 + Tr(Sigma_R + Sigma_G - 2 (Sigma_R Sigma_G)^(1/2)). Means and covariances come from fitting a Gaussian to network features of real and generated videos, as in FID.
- Features (Sec 2): "we investigate several variations of a pretrained Inflated 3D Convnet (I3D; [5]), and name the resulting metric the Frechet Video Distance (FVD)." I3D "is trained to perform action-recognition on the Kinetics data set". Rationale: features must capture "the temporal coherence of the visual content across a sequence of frames, in addition to its visual presentation at any given point in time."
- Chosen layer (Sec 4): "the logits layer of the I3D model pre-trained on Kinetics-400 is among the best performing configurations ... Hence, in the remainder of this work we will continue to use this configuration when computing FVD". (Kinetics-400 logits are 400-dimensional; dimension count is inference from 400 classes, not a quote.)
- Contrast with PSNR / SSIM (Sec 1, 3): those need ground-truth frames and score each frame individually; FVD "considers a distribution over entire videos".
- Sanity check (Sec 4, Fig 3): FVD rises as static noise (black rectangles, Gaussian blur, Gaussian noise, salt and pepper) and temporal noise (local frame swaps, global swaps, interleaving, switching to another video) are injected.
- Common practice of 16-frame clips: UNCONFIRMED from this paper text (BAIR setup in Sec 4 uses "2 frames of context with the proceeding 14 output frames", i.e. 16 total).

### B2. Content bias in FVD: Ge, Mahapatra, Parmar, Zhu, Huang, "On the Content Bias in Frechet Video Distance", arXiv 2404.12391 (v1, 18 Apr 2024), CVPR 2024
Sources: https://arxiv.org/abs/2404.12391 ; https://arxiv.org/html/2404.12391
- Key finding, abstract: "Both studies suggest FVD's bias towards the quality of individual frames."
- Remedy, abstract: "FVD with features extracted from the recent large-scale self-supervised video models is less biased toward image quality." The paper uses VideoMAE-v2 features (Sec 1, 3; Fig 4, 5); Fig 5: "the self-supervised training objective contributes the most to mitigating the content bias."
- Corruption study (Sec 3, Table 1): "We find that FVD sometimes fails to detect the temporal quality decrease." Example: "the temporal inconsistency in the FaceForensics dataset only raises FVD by 3%" (Table 1: +3.6% from adding temporal on top of spatial corruption); UCF-101 motion blur 1460.18 to 1705.27 (+16.8%). Other datasets show +14% to +36%, so the effect varies.
- Null-space probe (Sec 4, Table 2): by resampling from a larger candidate pool, FVD can drop a lot with no temporal improvement; "one can still reduce FVD by up to half by selectively choosing from the candidate videos." Example: TATS on Sky Time-lapse, I3D FVD 279.75 to 126.32 (-54.8%), even with frozen (motionless) videos.
- Long-video case (Sec 5, Table 3): StyleGAN-V vs its LSTM variant (visible motion collapse) at 128 frames: I3D FVD rewards the broken one, 190.82 (original) vs 172.71 (LSTM); VideoMAE-SSv2 FVD penalises it, 332.80 vs 616.74. Table 4, DIGAN extrapolation: I3D says frames 128--144 are better than 0--16 (155.58 to 141.82) though they show periodic artifacts; VideoMAE-SSv2 reverses it (133.37 to 150.61).
- Limitation (Sec 6): VideoMAE-v2 attention is quadratic in length, hard for long videos.
- Teaching takeaway: FVD with I3D mostly measures per-frame appearance; it can miss temporal problems, exactly the long-video failures of section A.

### B3. VBench: Huang et al., "VBench: Comprehensive Benchmark Suite for Video Generative Models", arXiv 2311.17982 (abs page showed v1, 29 Nov 2023; venue not listed on abs page; widely cited as CVPR 2024, UNCONFIRMED here)
Sources: https://arxiv.org/abs/2311.17982 ; https://arxiv.org/html/2311.17982 (Sec 3.1, Appendix G) ; official scoring code https://raw.githubusercontent.com/Vchitect/VBench/master/scripts/constant.py and https://raw.githubusercontent.com/Vchitect/VBench/master/scripts/cal_final_score.py (read 2026-10-17)
- Abstract: "VBench comprises 16 dimensions in video generation" (examples: subject identity inconsistency, motion smoothness, temporal flickering).
- The 16 dimensions and the scorer used (Sec 3.1, App. G):
  - Video Quality / Temporal Quality: (1) Subject Consistency, DINO features across frames; (2) Background Consistency, CLIP image features across frames; (3) Temporal Flickering, mean absolute frame difference, normalised so higher is better; (4) Motion Smoothness, motion priors of a frame-interpolation model (AMT); (5) Dynamic Degree, RAFT optical flow, share of videos judged non-static.
  - Video Quality / Frame-wise Quality: (6) Aesthetic Quality, LAION aesthetic predictor; (7) Imaging Quality, MUSIQ trained on SPAQ.
  - Video-Condition Consistency / Semantics: (8) Object Class, GRiT detection; (9) Multiple Objects, GRiT; (10) Human Action, UMT on Kinetics-400 labels; (11) Color, GRiT captions; (12) Spatial Relationship, rule-based on detections; (13) Scene, Tag2Text captions.
  - Video-Condition Consistency / Style: (14) Appearance Style, CLIP frame-text similarity; (15) Temporal Style, ViCLIP video-text similarity (camera motion etc.).
  - (16) Overall Consistency, ViCLIP video-text similarity, an "aiding metric".
- Per-dimension scoring examples (App. G): subject/background consistency average the cosine similarity of each frame to the first frame and to the previous frame; aesthetic 0--10 scores "linearly normalize[d] ... to 0-1"; each model's score is the average over its videos.
- Human alignment (Sec 3.3, 4.2): pairwise human preference per dimension, win ratios (tie = 0.5 each), Spearman correlation with VBench win ratios (Fig 5): "VBench's per-dimension evaluation results are highly correlated with human preference annotations".
- Leaderboard aggregation (official code): each dimension min-max normalised with fixed per-dimension Min/Max (e.g. subject consistency Min 0.1462, Max 1.0), times DIM_WEIGHT (all 1 except "dynamic degree":0.5). Quality Score = weighted mean over 7 quality dims (subject consistency, background consistency, temporal flickering, motion smoothness, aesthetic quality, imaging quality, dynamic degree). Semantic Score = weighted mean over 9 semantic dims. Total = (4 x Quality + 1 x Semantic) / 5 (QUALITY_WEIGHT = 4, SEMANTIC_WEIGHT = 1). This is why VBench totals cluster in the low 80s (e.g. 84.31 for Self Forcing, A3).
- VBench-Long (the variant CausVid reports 84.27 on) evaluates longer videos; details not read here.

### B4. VBench-2.0: Zheng, Huang et al., "VBench-2.0: Advancing Video Generation Benchmark Suite for Intrinsic Faithfulness", arXiv 2503.21755 (v1 27 Mar 2025; v2 20 Aug 2025)
Sources: https://arxiv.org/abs/2503.21755 ; https://arxiv.org/html/2503.21755v2
- Aim, abstract: "pushing beyond superficial faithfulness toward intrinsic faithfulness" (physics, commonsense, anatomy, composition).
- Figure 1 caption: "comprising five broad categories and 18 fine-grained capability dimensions."
- Human Fidelity (3): Human Anatomy, Human Identity, Human Clothes. Creativity (2): Diversity, Composition. Controllability (7): Dynamic Attribute, Dynamic Spatial Relationship, Motion Order Understanding, Human Interaction, Complex Plot, Complex Landscape, Camera Motion. Physics (4): Mechanics, Thermotics, Material, Multi-View Consistency. Commonsense (2): Motion Rationality, Instance Preservation.
- Scorers: generalists "such as SOTA VLMs and LLMs" plus specialists including anomaly detection for generated video (abstract).

### B5. Human preference arena for video: Artificial Analysis Video Arena
Sources (read 2026-10-17): https://artificialanalysis.ai/text-to-video/arena?tab=leaderboard (landing) and https://artificialanalysis.ai/video/leaderboard/text-to-video (leaderboard). Read via WebFetch (a summarising tool), so treat exact digits as "as displayed on 2026-10-17"; the page shows an "Updated" label but no explicit date.
- What it reports: "Ranks video models on generating video with audio from a text prompt, by Elo from pairwise human preference votes." Default view is with audio (landing page: "Sound on. You're judging the sound too."); a "No Audio" filter and a silent variant (AA-Video-T2V-Silent v2.1) exist. FAQ (as summarised): voters see two videos for the same prompt, blind to model identity; votes come from validated private evaluators. Columns: Elo, 95% CI, Samples, Released.
- Top 5, AA-Video-T2V v2.1, overall, as displayed 2026-10-17:
  1. Wan 3.0, Elo 1174 (95% CI 1159 to 1189), 5,861 samples, released Aug 2026
  2. Utopai X, 1169 (1153 to 1185), 5,282, Sep 2026
  3. Dreamina Seedance 2.5, 1160 (1145 to 1175), 5,939, Jul 2026
  4. MiniMax H3 (768p), 1159 (1144 to 1174), 5,962, Jul 2026
  5. MiniMax H3 Max, 1155 (1139 to 1171), 5,613, Aug 2026
  Teaching point: the top CIs overlap, so ranks 1--5 are not statistically separated. Leaderboards move monthly; quote with the date.

### B6. Movie Gen Bench: Polyak et al., "Movie Gen: A Cast of Media Foundation Models", arXiv 2410.13720 (v2, 26 Feb 2025; v1 17 Oct 2024)
Source: https://arxiv.org/html/2410.13720v2 ; benchmark repo https://github.com/facebookresearch/MovieGenBench (as cited in the paper)
- Sec 1: "we publicly release two benchmarks (...) Movie Gen Video Bench (Section 3.5.2), Movie Gen Audio Bench (Section 6.3.2)."
- Movie Gen Video Bench (Sec 3.5.2): "consists of 1003 prompts that cover all the different testing aspects summarized above": human activity, animals, nature and scenery, physics (fluid dynamics, gravity, collisions), unusual subjects and activities; each prompt tagged high / medium / low motion. "In order to enable fair comparison to Movie Gen Video by future work, we also release non cherry picked generated videos from Movie Gen Video on Movie Gen Video Bench."
- Movie Gen Audio Bench (Sec 6.3.2, Table 29): "It includes 527 videos" generated by Movie Gen Video, covering ambient environments (indoor, urban, nature, transportation) and sound effects (human, animal, objects), with human-reviewed sound and music captions; non cherry-picked Movie Gen Audio outputs released too.
- Evaluation method (Sec 3.5, 3.5.1, Table 4): pairwise human A/B, "expert human evaluators assess two videos side-by-side"; axes: Text-alignment (subject match, motion match), Visual quality (frame consistency, motion completeness, motion naturalness, overall quality), Realness and Aesthetics. Majority vote of 3 annotations for text-alignment and visual-quality questions, 6 for realness and aesthetics (Sec 3.5.3).
- Stance on automated metrics (Sec 3.5.3 "Evaluation Discussion"): "we find that automated metrics such as FVD (Unterthiner et al., 2019) and IS (Salimans et al., 2016) do not correlate with human evaluation scores for video quality, and hence do not provide useful signal for model development or comparison." (Cites Ge et al. 2024, B2, among others.)

### B7. Frechet Audio Distance: Kilgour, Zuluaga, Roblek, Sharifi, "Frechet Audio Distance: A Metric for Evaluating Music Enhancement Algorithms", arXiv 1812.08466 (v4, 17 Jan 2019; v1 20 Dec 2018)
Sources: https://arxiv.org/abs/1812.08466 ; text from https://arxiv.org/pdf/1812.08466v4 (pdftotext)
- Abstract: "a novel, reference-free evaluation metric for music enhancement algorithms", adapting FID "used to evaluate generative image models to the audio domain".
- Definition (Sec 3.1): "FAD does not look at individual audio clips, but instead compares embedding statistics generated on the whole evaluation set with embedding statistics generated on a large set of clean music (e.g. the training set)." Gaussians N_b(mu_b, Sigma_b) (background) and N_e(mu_e, Sigma_e) (evaluation); F = ||mu_b - mu_e||^2 + tr(Sigma_b + Sigma_e - 2 sqrt(Sigma_b Sigma_e)) (Eq. 1). Same formula as FID / FVD.
- Embedding (Sec 3.2): "FAD uses embeddings generated by the VGGish [6] model"; VGGish "is trained on a large dataset of YouTube videos, similar to YouTube-8M [1] as an audio classifier with over 3000 classes. The activations from the 128 dimensional layer prior to the final classification layer are used as the embedding." Input: "96 consecutive frames of 64 dimensional log-mel features" over 1 s of audio; 1 s windows every 0.5 s (50% overlap, Appendix A).
- Caveat (Sec 3.2): "ignoring the phase and using mel-scaled bins could lead to certain distortions going undetected."
- Human correlation (abstract): FAD correlation 0.52 with human ratings; "FAD correlates more closely with human perception than either SDR, cosine distance or magnitude L2 distance" (those score 0.39, -0.15, -0.01 respectively, per abstract as summarised).
- Modern use: text-to-audio and music papers report FAD with VGGish and other embeddings (PANNs, CLAP, EnCodec); the specific embedding changes the numbers, so compare only within one embedding. (General practice statement; not from this paper.)

### B8. TTS automatic metrics: WER (intelligibility) and speaker similarity
VALL-E: Wang et al., "Neural Codec Language Models are Zero-Shot Text to Speech Synthesizers", arXiv 2301.02111 (v1, 5 Jan 2023). Sources: https://arxiv.org/abs/2301.02111 ; text from https://arxiv.org/pdf/2301.02111 (pdftotext), Sec 5.1 "Automatic metrics", Sec 5.2, Table 2.
- Setting (abstract): trained on "60K hours of English speech"; clones from "a 3-second enrolled recording of an unseen speaker as an acoustic prompt."
- Speaker similarity (Sec 5.1): "We employ the SOTA speaker verification model, WavLM-TDNN [Chen et al., 2022], to evaluate the speaker similarity between prompt (the decompressed enrolled speech) and synthesized speech." Score range "[-1, 1], where a larger value indicates a higher similarity" (cosine similarity of speaker embeddings).
- WER (Sec 5.1): "We perform ASR on the generated audio and calculate the word error rate (WER) with respect to the original transcriptions. In this experiment, we employ the HuBERT-Large [Hsu et al., 2021] model fine-tuned on LibriSpeech 960h as the ASR model, which is a CTC-based model without language model fusion." Motivation: TTS "sometimes has deletion, insertion, and replacement errors due to wrong attention alignments."
- Human (Sec 5.1): CMOS (-3 to +3, steps of 1, naturalness vs baseline; 12 native speakers) and SMOS (1 to 5, 0.5 steps, similarity to the speaker; 6 native speakers).
- Table 2 (LibriSpeech test-clean, 4--10 s utterances, 3 s prompt), WER / SPK: GroundTruth 2.2 / 0.754; GSLM 12.4 / 0.126; AudioLM* 6.0 / not available (not open source; its WER from a Conformer Transducer); YourTTS 7.7 / 0.337; VALL-E 5.9 / 0.580; VALL-E-continual 3.8 / 0.508. (SPK values were matched to rows from pdftotext column order, with AudioLM having none; check the PDF table before publishing.)
- Abstract-level human results (Sec 1): "+0.12 comparative mean option score (CMOS) and +0.93 similarity mean option score (SMOS) improvement on LibriSpeech" over YourTTS. (Paper writes "option" for "opinion".)

F5-TTS: Chen et al., arXiv 2410.06885 (HTML v3, 20 May 2025). Source: https://arxiv.org/html/2410.06885 (Sec 4 "Metrics" and "Datasets", Appendix B, C, Table 1).
- WER ASR: "we employ Whisper-large-v3" for English "and Paraformer-zh for Chinese".
- Speaker similarity SIM-o: "we use a WavLM-large-based speaker verification model to extract speaker embeddings"; cosine similarity between generated speech and the original (ground-truth) speech ("-o" = original).
- UTMOS (App. B): "an objective metric measuring naturalness" from an open-source MOS predictor. CMOS (App. C): rated "from -3 (bad quality compared to the reference) to +3". SMOS (App. C): "a 1 to 5 with 0.5 as an interval rating is employed (higher better)."
- Test sets: LibriSpeech-PC test-clean; Seed-TTS test-en (1088 samples from Common Voice); Seed-TTS test-zh (2020 samples from DiDiSpeech).
- Table 1 (LibriSpeech-PC test-clean): F5-TTS (32 NFE) WER 2.42, SIM-o 0.66; Ground Truth (1127 samples, 2 hrs) WER 2.23, SIM-o 0.69. Sec 5: "F5-TTS achieves a WER of 2.42 on LibriSpeech-PC test-clean with 32 NFE."
- Teaching point: WER and SIM numbers depend on which ASR and which verification model is used (VALL-E: HuBERT-Large CTC + WavLM-TDNN; F5-TTS: Whisper-large-v3 / Paraformer-zh + WavLM-large verifier), so numbers are comparable only within the same protocol; always show the ground-truth row as the ceiling.

### B9. Listening tests: MOS and MUSHRA
- MOS. Source: https://en.wikipedia.org/wiki/Mean_opinion_score (read 2026-10-17). Absolute Category Rating "maps ratings between Bad and Excellent to numbers between 1 and 5" (5 Excellent, 4 Good, 3 Fair, 2 Poor, 1 Bad); methodology "standardized in Recommendation ITU-T P.800"; MOS is "calculated as the arithmetic mean over single ratings performed by human subjects." ITU-T P.800 official title (https://www.itu.int/rec/T-REC-P.800): "Methods for subjective determination of transmission quality", version 08/96. (The 1--5 ACR scale is not visible on the ITU landing page itself; the full P.800 text was not read.)
- Variants used in TTS papers: CMOS (comparative, -3 to +3 vs a reference), SMOS (speaker similarity, 1--5 in 0.5 steps), see B8. UTMOS is a learned predictor of MOS, not a listening test.
- MUSHRA. Sources: https://en.wikipedia.org/wiki/MUSHRA (read 2026-10-17) and https://www.itu.int/rec/R-REC-BS.1534 . "MUSHRA stands for Multiple Stimuli with Hidden Reference and Anchor"; "defined by ITU-R recommendation BS.1534-3" (ITU title: "Method for the subjective assessment of intermediate quality level of audio systems", BS.1534-3, 10/2015, in force). Listeners rate several stimuli side by side on a 0--100 scale, including a hidden copy of the reference and deliberately degraded anchors; "a low-range and a mid-range anchor should be included", typically "a 7 kHz and a 3.5 kHz low-pass version of the reference." Advantage over MOS (per Wikipedia): "MUSHRA requires fewer participants to obtain statistically significant results." Intended for intermediate quality (codecs, vocoders), not tiny impairments (ABC/HR is used there). The BS.1534-3 PDF itself could not be downloaded (ITU returned HTML), so anchor details rest on Wikipedia.

### B10. CLAP score for text-to-audio
- CLAP model: Wu, Chen, Zhang, Hui, Nezhurina, Berg-Kirkpatrick, Dubnov, "Large-scale Contrastive Language-Audio Pretraining with Feature Fusion and Keyword-to-Caption Augmentation", arXiv 2211.06687 (v4, 21 Mar 2024; v1 12 Nov 2022). Source: https://arxiv.org/abs/2211.06687 . Contrastive audio-text encoder (CLIP for audio); releases LAION-Audio-630K with "633,526 audio-text pairs from different data sources." (An earlier Microsoft CLAP, Elizalde et al. 2022, also exists; not read.)
- CLAP score as a metric: introduced for text-to-audio in Make-An-Audio (Huang et al., arXiv 2301.12661; PDF fetched 2026-10-17 from https://arxiv.org/pdf/2301.12661 , Sec 5.3 "Evaluation Metrics"): "we introduce the CLAP score to measure audio-text alignment for this work. CLAP score is adapted from the CLIP score (Hessel et al., 2021; Radford et al., 2021) to the audio domain and is a reference-free evaluation metric that closely correlates with human perception." Computation: cosine similarity between the CLAP text embedding of the prompt and the CLAP audio embedding of the generated clip (higher = better aligned). The same paper measures fidelity with FID and KL on audio classifier features, and humans rate MOS-Q (quality) and MOS-F (faithfulness) "on a 20-100 Likert scale". Result line (Sec 6.1): Make-An-Audio "scores the highest CLAP with a gap of 0.037 compared to the ground truth audio".
- Teaching split for audio generation: fidelity / distribution match = FAD (or FD, KL on PANNs/PaSST); text alignment = CLAP score; for speech: WER (intelligibility), SIM (voice cloning), UTMOS / MOS (naturalness); humans: MOS, CMOS, SMOS, MUSHRA, arenas.

### B11. TTS Arena (Hugging Face)
- Blog: https://huggingface.co/blog/arena-tts , published February 27, 2024 (byline mrfakename). Mechanism: two models speak the same user text, users vote for the more natural one; "model names will be revealed only after a vote is submitted"; "models will be ranked using an algorithm similar to the Elo rating system." Motivation quotes: "Objective metrics like WER (word error rate) are unreliable measures of model quality"; MOS tests are usually "small-scale experiments conducted with few listeners."
- Current V2: https://huggingface.co/spaces/TTS-AGI/TTS-Arena-V2 (app at https://tts-agi-tts-arena-v2.hf.space/), tagline "voice models, ranked by ear"; "Hear the same line from two anonymous models and pick the better one. Names are revealed only after you vote."
- Leaderboard entries: UNCONFIRMED. The leaderboard renders with JavaScript and was not readable as text on 2026-10-17 (WebFetch and curl both returned only the shell).

## UNCONFIRMED / caveats list
1. Self Forcing base model (believed Wan2.1-T2V-1.3B): not verified in the text read.
2. "Identity drift" as a phrase from a canonical source: not found; Sora report lists long-sample incoherence and spontaneous object appearances; FramePack defines "drifting".
3. FVD 16-frame convention: not stated as a rule in the FVD paper (BAIR setup there is 2 context + 14 generated = 16).
4. VBench venue (CVPR 2024) not shown on the arXiv abs page; HTML version number not recorded (abs showed v1).
5. TTS Arena leaderboard top entries: not readable.
6. Artificial Analysis leaderboard digits came through a summarising fetch tool and have no explicit update date; re-check on the live page before publishing.
7. VALL-E Table 2 SPK values were aligned to rows from extracted PDF text order; verify against the PDF table.
8. MUSHRA anchor details rest on Wikipedia; the ITU BS.1534-3 PDF was not readable. P.800 ACR scale details rest on Wikipedia.
9. FAD human-correlation coefficients for SDR/cosine/L2 (0.39, -0.15, -0.01) are from the abstract as summarised by the fetch tool; 0.52 for FAD likewise.
10. Movie Gen Bench repo URL is as cited in the paper (footnote), repo itself not opened.
11. Make-An-Audio arXiv version not recorded (latest PDF fetched).
