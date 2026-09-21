# Learning Transferable Visual Models From Natural Language Supervision (CLIP)

⏱ 11 min read · +~4h 10m resources

- **Authors/lab**: Alec Radford, Jong Wook Kim, Chris Hallacy, Aditya Ramesh, Gabriel Goh, Sandhini Agarwal, Girish Sastry, Amanda Askell, Pamela Mishkin, Jack Clark, Gretchen Krueger, Ilya Sutskever (OpenAI)
- **Date**: February 2021 (ICML 2021)
- **Links**: [arXiv](https://arxiv.org/abs/2103.00020) (~2h, long paper) | [code and weights](https://github.com/OpenAI/CLIP) (repo, ~15 min for the README and entry path) | [OpenAI blog](https://openai.com/index/clip/) (~15 min)

### Best resources

- [OpenAI blog: CLIP, connecting text and images](https://openai.com/index/clip/) (~15 min, the same post as the Links line): the authors' condensed account, with the zero-shot classifier construction shown visually
- [Lilian Weng: Contrastive Representation Learning](https://lilianweng.github.io/posts/2021-05-31-contrastive/) (~40 min): places CLIP's loss in the InfoNCE family and derives the surrounding contrastive-learning theory
- [Chip Huyen: Multimodality and Large Multimodal Models](https://huyenchip.com/2023/10/10/multimodal.html) (~40 min): CLIP as the foundation of the modern VLM stack, with a clear walkthrough of the training objective and what came after
- [mlfoundations/open_clip](https://github.com/mlfoundations/open_clip) (repo, ~20 min for the README and entry path): the open reproduction; the fastest way to read a working implementation and see how the recipe scales on LAION-scale data

### Problem

Computer vision in 2021 was trained to predict a fixed set of predetermined categories (1000 ImageNet classes, 18k for weakly supervised work), which caps generality: any new visual concept needs new labeled data and a new head. NLP had already escaped this via task-agnostic pretraining on raw web text with zero-shot transfer (GPT-2/3), but vision still relied on crowd-labeled datasets. Earlier attempts to learn images from text (VirTex, ICMLM, ConVIRT, Visual N-Grams) were proofs of concept at small scale; Visual N-Grams managed only 11.5% zero-shot ImageNet accuracy. The question: does natural language supervision at web scale produce transferable visual representations, and can it deliver flexible zero-shot classifiers instead of static softmax heads?

### Method

**Data**: a new 400M (image, text) pair dataset, WIT (WebImageText), scraped from the public internet. Coverage is enforced by building pairs around 500k queries (words with at least 100 Wikipedia occurrences, plus high-PMI bigrams and WordNet synsets), capped at 20k pairs per query. Total word count is comparable to the WebText corpus used for GPT-2.

**Objective, the key efficiency choice**: predicting the exact caption text (a VirTex-style generative transformer) learns ImageNet-recognizable features 3x slower than a bag-of-words prediction baseline, and swapping prediction for a contrastive objective gives another 4x. So CLIP only learns which text goes with which image. Given a batch of N pairs, both encoders map to a shared embedding space via a linear projection, embeddings are L2-normalized, and all NxN cosine similarities are scaled by a learned temperature (initialized to 0.07, logits clipped at 100). The loss is symmetric cross-entropy over the similarity matrix: each image must pick its own caption out of N, each caption its own image, and the two losses are averaged. This is the multi-class N-pair / InfoNCE loss; the batch size of 32,768 supplies the negatives. Training is from scratch, no ImageNet or language-model initialization, with random square crops as the only augmentation.

**Encoders**: 5 modified ResNets (RN50, RN101, RN50x4/x16/x64 with EfficientNet-style width/depth/resolution scaling, ResNet-D tweaks, antialiased blur pooling, and attention pooling instead of global average pooling) and 3 Vision Transformers (ViT-B/32, B/16, L/14). The text encoder is a 63M-parameter, 12-layer, 512-wide Transformer over lower-cased BPE (49,152 vocab, max length 76); the [EOS] token activation, layer-normalized and linearly projected, is the text feature. All models train 32 epochs with Adam, decoupled weight decay, cosine schedule, mixed precision; RN50x64 took 18 days on 592 V100s, ViT-L/14 took 12 days on 256 V100s. ViT-L/14 fine-tuned one extra epoch at 336px (ViT-L/14@336px) is the best model and is what "CLIP" denotes in the results.

**Zero-shot classification**: embed each class name inside a prompt template ("A photo of a {label}.") with the text encoder; the class whose text embedding has highest temperature-scaled cosine similarity to the image embedding wins. The text encoder acts as a hypernetwork generating the weights of an L2-normalized linear classifier, computed once per dataset and cached. Prompt engineering matters because a bare label is out of distribution for web captions and often polysemous ("crane", "boxer"): the default template gives +1.3% on ImageNet, task-tailored templates ("a photo of a {label}, a type of pet", "a satellite photo of a {label}") help further, and ensembling 80 prompts in embedding space adds another 3.5% on ImageNet, roughly +5% total.

### Results

- **Zero-shot ImageNet**: 76.2% top-1 (95% top-5), matching the original supervised ResNet-50 while using none of its 1.28M labeled examples, versus 11.5% for Visual N-Grams four years earlier.
- **Zero-shot across 27 datasets**: beats a fully supervised logistic regression on ResNet-50 features on 16 of 27 datasets, with big wins on action recognition (Kinetics700 +14.5%, UCF101 +7.7%) and fine-grained sets like StanfordCars and Food101; it loses badly on specialized or abstract tasks (EuroSAT satellite imagery, GTSRB traffic signs, CLEVR counting, lymph-node tumor detection).
- **Data efficiency**: zero-shot CLIP matches a 4-shot logistic regression on its own features and roughly matches the best publicly available 16-shot classifier (BiT-M ResNet-152x2); matching zero-shot on ImageNet takes an estimated 16 labeled examples per class.
- **Linear probes**: CLIP features beat the best prior model (Noisy Student EfficientNet-L2) on 21 of 27 datasets, improving the 27-dataset average by 2.6% to 5%, and CLIP ViTs are about 3x more compute-efficient than CLIP ResNets. Zero-shot error also falls smoothly as a log-log function of model compute over a 44x range.
- **Robustness, the headline finding**: on 7 natural distribution shifts (ImageNetV2, Sketch, ObjectNet, ImageNet-A/R, etc.) zero-shot CLIP closes the gap between ImageNet accuracy and shifted accuracy by up to 75%. At an identical 76.2% on ImageNet, ResNet-101 gets 37.7% on ImageNet-R and 2.7% on ImageNet-A; CLIP gets 88.9% and 77.1%. Fine-tuning CLIP to ImageNet adds 9.2% in-distribution but slightly reduces average robustness, evidence that supervised training on a fixed distribution is itself a source of brittleness.
- **Contamination check**: a duplicate-detection audit finds median 2.2% overlap between WIT and the evaluation sets, moving overall accuracy by more than 0.1% on only 7 of 35 datasets.
- **Limitations**: zero-shot CLIP is on average only competitive with a ResNet-50 linear probe, far from the supervised state of the art; the authors estimate roughly 1000x more compute would be needed to reach it with this recipe, so better methods, not just scale, are required. It also remains weak at systematic tasks like counting and at truly out-of-pretraining-distribution data (weak zero-shot MNIST), and inherits social biases from web data.

### Why it matters

CLIP created the vision-language embedding paradigm: a shared space where images and text are directly comparable, and where a classifier is just text. That single move made image classification open-vocabulary, promoted prompt engineering into vision, and reframed robustness evaluation around zero-shot transfer. Its fingerprints are on most of the modern multimodal stack:

- **VLM vision towers**: CLIP-pretrained ViTs became the default image encoder bolted onto LLMs (LLaVA, Qwen-VL, InternVL, and the lineage behind frontier multimodal models); contrastive pretraining turned out to produce exactly the semantically aligned features an LLM can consume.
- **Diffusion guidance and conditioning**: DALL-E 2 (unCLIP) generates from CLIP image embeddings, Stable Diffusion conditions its U-Net on CLIP text-encoder outputs via cross-attention, and CLIP-score guidance and evaluation (CLIPScore) run through generative modeling practice.
- **Data curation at scale**: LAION-400M/5B were filtered by CLIP similarity, and CLIP-based filtering became a standard pretraining-data quality signal (DataComp, DFN), so CLIP now curates the data its successors train on.
- **Successors**: ALIGN (Google, noisier data at similar scale), OpenCLIP's open reproductions and contrastive scaling laws, EVA-CLIP and MetaCLIP, and the SigLIP line (2023) which replaced softmax InfoNCE with a pairwise sigmoid loss to decouple the objective from batch size, refined further by SigLIP 2 (2025), today's default open vision tower.
- **Retrieval**: CLIP embeddings made cross-modal search (text-to-image, image-to-image) a commodity capability in vector databases.

### Connections

- ViT (2020-10): supplies CLIP's best image encoder; CLIP is the main vehicle through which ViT reached multimodal models
- GPT-3 (2020-05): the zero-shot task-transfer and prompt-engineering paradigm CLIP imports into vision, and the WebText-style data philosophy behind WIT
- Scaling Laws (2020-01): CLIP's zero-shot error follows the same smooth log-log compute scaling
- Latent Diffusion (2021-12): the Stable Diffusion line that conditions generation on CLIP text embeddings
- KB topics: generative-and-multimodal, ml-fundamentals (contrastive learning)
