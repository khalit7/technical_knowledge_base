# Visualisation ideas: Evaluating generative models (prefix ev)

The question the page keeps returning to: **when a number says one generator is better than another, what did it actually measure, and would a different (equally standard) choice of features, distance, sample count or preprocessing have said the same?** A visual earns its place when it makes one of those choices visible on the same samples.

Scores: quantity the reader moves (0-2), reproduces a published figure (x2), computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, step animation point; minus build cost.

## Built
| # | Idea | Placement | Score | Notes |
|---|---|---|---|---|
| ev1 | **FID in four steps, animated, one set against the same reference** (images, points in PC1/PC2 of real Inception features, fitted Gaussians as 2-sigma ellipses, mean term, covariance term, sum), with a toggle running the same steps for DDPM, VAE, half the classes, strong guidance and the real floor; counters are the full 2,048-d terms | Reading, section 2 | 13 | Before/after on the same reference; shows which term each failure moves. The 2-D projection is labelled as a picture only. |
| ev2 | **FID against N for eight sets**, log N or 1/N axes, three draws per point, Chong and Forsyth's straight-line extrapolation | Reading, section 3 | 12 | Reproduces the setup's real-vs-real floor (2.54 at 10k; 1k and 500 within the setup's three draws). |
| ev3 | **Precision against recall**, Inception or DINOv2 space | Reading, section 4 | 10 | Separates the two failures FID merges (guidance and the half set). |
| ev4 | **Rank table across five metrics at 10k**, and per-N ranks in the comparator | Reading section 4, Metric comparator | 10 | Shows where metrics disagree. |
| ev5 | **JPEG before/after animation** (PNG, JPEG, difference x 8, FID bars), quality toggle | Reading, section 5 | 11 | Same images; reproduces clean-fid's qualitative finding at toy scale. |
| ev6 | **Same prompt and noise at four guidance scales** with CLIPScore, CLIP L/14 cosine, VQA P(yes) and element questions | Reading, section 6 | 11 | Before/after on the same input (no guidance vs guidance). |
| ev7 | **Metric comparator tab**: five metrics x eight sets x six N, log/linear/gap views, rank table with rank at 10k | Own tab | 11 | Every recorded number. |
| ev8 | **Pitfall explorer**: resize and model-JPEG cases with images and bars; clean-fid Table 1 redrawn (published) | Reading, section 5 (was its own tab until 2026-10-24) | 10 | The three one-side JPEG cases and the both-sides JPEG case were dropped from it: the ev5 stepper shows them. |
| ev9 | **Which metric? chooser**: eight questions x sample budget | Own tab | 7 | Static recommendations, linked to the evidence. |
| ev10 | Predict-then-reveal x 4 (half vs VAE, floor at 1k, guidance direction, the missing horse) | Reading | 8 | |

| ev11 | **Hero (2026-10-24)**: three pipelines (set against data, image against prompt, image against image) with the features box highlighted and the two knobs (N, pixels) named | Reading, top | static | Static annotated diagram (structure); HTML boxes so it stacks on phones. |
| ev12 | **Reward models on one test set (2026-10-24)**: HPD v2 accuracy bars for HPS v2, PickScore, ImageReward, CLIP ViT-H/14 | Reading, section 7 | static | One source, one test set, so the bars are comparable; the per-model table moved to a closed block. |

## Rejected
- Running PickScore / HPS v2 / ImageReward here: about 1B-parameter CLIP-H or BLIP models that would only add one more column of similar numbers; their papers' accuracy tables carry the lesson (Khalid's 2026-10-15 rule: skip expensive runs that teach little).
- GenEval itself (Mask2Former detector): a second heavy model for the same lesson the SmolVLM questions already show.
- A downsampling-aliasing demo on the 28-pixel running example: the resize is an upsampling, so aliasing cannot occur; the published clean-fid table carries the FFHQ-scale result instead, labelled.
- FID on the 16 colour test images or 64 SD images: far below 2,048 samples, the covariance is singular; a misleading number.
- FVD/FAD runs: too heavy for the lesson; this page owns the metrics in words (the hero names their feature extractors), the Video and audio page owns the models.
- A real image or a paper's figure (2026-10-24): the page is about metrics, not a physical object; the Stable Diffusion samples and Fashion-MNIST strips already are the real images it needs.
- A DINOv2 ViT-L/14 run (Stein et al.'s model): the Vision encoders page's B/14 embeddings were reused instead; departure stated on the page.

## What the methodology lacked here
A rule for metrics whose output depends on hidden preprocessing: every measured cell on this page carries the extractor, resize, format and N, because those, not the model, are what the page is about.
