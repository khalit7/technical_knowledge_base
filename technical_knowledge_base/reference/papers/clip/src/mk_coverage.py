"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header
 ('Reading time line "11 min read, +~4h 10m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read', 'of resources']),
 ('Authors (12) and lab OpenAI', R + ', headline card', ['Alec Radford', 'Jong Wook Kim', 'Chris Hallacy', 'Aditya Ramesh', 'Gabriel Goh', 'Sandhini Agarwal', 'Girish Sastry', 'Amanda Askell', 'Pamela Mishkin', 'Jack Clark', 'Gretchen Krueger', 'Ilya Sutskever', 'OpenAI']),
 ('Date: February 2021 (ICML 2021)', R + ', headline card', ['February 2021', 'ICML 2021']),
 ('Link arXiv (~2h, long paper)', 'card and Further reading', ['https://arxiv.org/abs/2103.00020', '(2h)']),
 ('Link code and weights (repo, ~15 min for the README and entry path)', 'card and Further reading', ['https://github.com/OpenAI/CLIP', 'about 15 minutes for the README and the entry path', 'weights']),
 ('Link OpenAI blog (~15 min), same as best resource 1', 'Further reading, Best resources', ['https://openai.com/index/clip/', '(15 min)']),
 # resources
 ('Blog: the authors condensed account, zero-shot classifier construction shown visually', 'Further reading', ["the authors' condensed account, with the zero-shot classifier construction shown visually"]),
 ('Lilian Weng (~40 min): CLIP loss in the InfoNCE family, contrastive theory', 'Further reading', ['https://lilianweng.github.io/posts/2021-05-31-contrastive/', 'places CLIP\'s loss in the InfoNCE family', '(40 min)']),
 ('Chip Huyen (~40 min): CLIP as foundation of modern VLM stack, objective walkthrough, what came after', 'Further reading', ['https://huyenchip.com/2023/10/10/multimodal.html', 'CLIP as the foundation of the modern vision-language stack', 'what came after']),
 ('open_clip (~20 min): open reproduction, working implementation, LAION-scale', 'Further reading', ['https://github.com/mlfoundations/open_clip', 'the open reproduction', 'LAION-scale data', '(20 min)']),
 # problem
 ('Vision trained on fixed predetermined categories (1000 ImageNet, 18k weakly supervised)', R + ', Problem', ['the 1,000 ImageNet classes, or 18,291 for the largest weakly supervised work']),
 ('Any new concept needs new labelled data and a new head', R + ', Problem', ['needs new labelled data and a new output head']),
 ('NLP escaped via task-agnostic web-text pretraining and zero-shot transfer (GPT-2/3)', R + ', Problem; Zero-shot (GPT-1 and GPT-2)', ['Task-agnostic pre-training on raw web text', 'let GPT-3 transfer zero-shot', "GPT-1 and GPT-2's zero-shot task learning"]),
 ('Vision relied on crowd-labelled datasets', R + ', Problem', ['Vision still pre-trained on crowd-labelled ImageNet']),
 ('Earlier image-from-text attempts (VirTex, ICMLM, ConVIRT, Visual N-Grams) proofs of concept at small scale', R + ', Problem', ['VirTex, ICMLM and ConVIRT in 2020', 'proofs of concept', 'Visual N-Grams']),
 ('Visual N-Grams 11.5% zero-shot ImageNet', R + ', Problem; Table 1', ['Visual N-Grams, reached 11.5% on ImageNet']),
 ('The question: transferable representations from web-scale language supervision, flexible zero-shot classifiers instead of static softmax heads', R + ', Problem', ['does supervision from natural language, at web scale, give visual representations that transfer', 'replace the static softmax head with classifiers written in words']),
 # data
 ('400M (image, text) pairs, WIT (WebImageText), scraped from the public internet', R + ', Data', ['400 million (image, text) pairs from public internet sources', 'WebImageText']),
 ('500k queries: words with at least 100 Wikipedia occurrences, high-PMI bigrams, WordNet synsets', R + ', Data', ['500,000 queries', 'occurs at least 100 times in English Wikipedia', 'high-PMI bigrams', 'WordNet synsets']),
 ('Capped at 20k pairs per query', R + ', Data', ['at most 20,000 pairs per query']),
 ('Total word count comparable to WebText (GPT-2)', R + ', Data', ["similar to GPT-2's WebText"]),
 # objective
 ('Predicting the exact caption (VirTex-style generative transformer) learns 3x slower than bag-of-words prediction', R + ', Objective predict reveal; headline card', ['learns ImageNet classes three times slower than a model that predicts a bag of words']),
 ('Contrastive objective gives another 4x', R + ', Objective; headline card', ['switching that bag of words from prediction to a contrastive objective gives another four times']),
 ('CLIP only learns which text goes with which image', R + ', Idea; Objective', ['which caption, out of a batch, belongs to which image', 'predicting only which text as a whole goes with which image']),
 ('Batch of N pairs; both encoders map to shared space via linear projection; L2-normalised', R + ', Objective', ['Both encoders map into the shared space through a <b>linear</b> projection', 'the embeddings are L2-normalised']),
 ('All NxN cosine similarities scaled by learned temperature (init 0.07, logits clipped at 100)', R + ', Objective; batch demo', ['scaled by a learned temperature', 'the equivalent of 0.07', 'logits clipped at 100']),
 ('Symmetric cross-entropy: each image picks its caption out of N, each caption its image; averaged', R + ', Objective', ['a symmetric cross-entropy asks each image to pick its own caption and each caption its own image, averaging the two losses']),
 ('Multi-class N-pair / InfoNCE loss', R + ', Objective', ['multi-class N-pair loss of Sohn (2016), popularised as InfoNCE']),
 ('Batch 32,768 supplies the negatives', R + ', Encoders and training; What it takes to use this', ['A minibatch of <b>32,768</b>', 'the batch supplies the negatives']),
 ('From scratch, no ImageNet or language-model init', R + ', Objective details', ['Neither encoder is initialised from ImageNet or from a pre-trained language model']),
 ('Random square crops the only augmentation', R + ', Objective details', ['A random square crop from resized images']),
 # encoders
 ('5 modified ResNets (RN50, RN101, RN50x4/x16/x64, EfficientNet-style width/depth/resolution scaling)', R + ', Encoders and training', ['RN50x4, RN50x16 and RN50x64', 'EfficientNet-style', 'width, depth and resolution']),
 ('ResNet-D tweaks, antialiased blur pooling, attention pooling instead of global average pooling', R + ', Encoders', ['ResNet-D improvements', 'antialiased rect-2 blur pooling', '<b>attention pooling</b> in place of global average pooling']),
 ('3 Vision Transformers (ViT-B/32, B/16, L/14)', R + ', Encoders', ['ViT-B/32, ViT-B/16 and ViT-L/14']),
 ('Text encoder 63M, 12-layer, 512-wide Transformer', R + ', Encoders (recounted)', ['63M parameters, 12 layers, 512 wide, 8 heads']),
 ('Lower-cased BPE, 49,152 vocab, max length 76', R + ', Encoders; Tables (49,408 in Table 18 shown beside it)', ['lower-cased byte-pair encoding with a 49,152 vocabulary', 'capped at 76 tokens', '49,408']),
 ('EOS token activation, layer-normalised and linearly projected, is the text feature', R + ', Encoders', ['the top layer\'s activation at [EOS], layer-normalised and linearly projected, is the text feature']),
 ('All models 32 epochs, Adam, decoupled weight decay, cosine schedule, mixed precision', R + ', Encoders (training details)', ['32 epochs; Adam with decoupled weight decay', 'cosine learning-rate decay', 'Mixed precision']),
 ('RN50x64 18 days on 592 V100s; ViT-L/14 12 days on 256 V100s', R + ', Encoders', ['RN50x64 took 18 days on 592 V100s', 'ViT-L/14 took 12 days on 256']),
 ('ViT-L/14 fine-tuned one extra epoch at 336px is the best model and is "CLIP" in results', R + ', Encoders', ['ViT-L/14 then trained one more epoch at 336 pixels', 'the model the paper calls "CLIP" unless it says otherwise']),
 # zero-shot
 ('Embed each class name in a prompt template "A photo of a {label}."; highest temperature-scaled cosine wins', R + ', Zero-shot; Prompts', ['"A photo of a {label}."', 'take cosine similarities, scale by the temperature and apply a softmax']),
 ('Text encoder as hypernetwork generating weights of an L2-normalised linear classifier, computed once per dataset and cached', R + ', Zero-shot', ['<b>hypernetwork</b> producing the classifier\'s weights from text', 'computed once per dataset and cached']),
 ('Prompt engineering: bare label out of distribution for web captions and polysemous (crane, boxer)', R + ', Prompts', ['construction cranes and cranes that fly', '"boxer"', 'In WIT the text is rarely a single word']),
 ('Default template gives +1.3% on ImageNet', R + ', Prompts', ['it alone adds 1.3% on ImageNet']),
 ('Task-tailored templates help further (a type of pet, a satellite photo of)', R + ', Prompts', ['"A photo of a {label}, a type of pet."', '"a satellite photo of a {label}."']),
 ('Ensembling 80 prompts in embedding space adds another 3.5% on ImageNet, roughly +5% total', R + ', Prompts', ['On ImageNet 80 prompts add another 3.5%', 'done in embedding space, not probability space', 'almost 5%']),
 # results
 ('Zero-shot ImageNet 76.2% top-1 (95% top-5), matching original supervised ResNet-50 with none of its 1.28M labelled examples', R + ', headline card; Zero-shot; Table 1', ['76.2%', 'top-5 95%', "the original supervised ResNet-50's level"]),
 ('versus 11.5% for Visual N-Grams four years earlier', R + ', Zero-shot; Table 1', ['11.5% to 76.2% on ImageNet']),
 ('Beats fully supervised logistic regression on ResNet-50 features on 16 of 27 datasets', R + ', How good; Figure 5 recomputed', ['zero-shot CLIP wins on 16, ImageNet included']),
 ('Big wins on action recognition (Kinetics700 +14.5%, UCF101 +7.7%)', R + ', How good', ['+14.5 on Kinetics700 and +7.7 on UCF101']),
 ('Fine-grained sets like StanfordCars and Food101', R + ', How good', ['Stanford Cars and Food101 gain over 20 points']),
 ('Loses badly on specialised or abstract tasks (EuroSAT, GTSRB, CLEVR counting, lymph-node tumour detection)', R + ', How good', ['EuroSAT, RESISC45', 'lymph-node tumours (PatchCamelyon)', 'counting (CLEVRCounts)', 'German traffic signs (GTSRB)']),
 ('Zero-shot matches a 4-shot logistic regression on its own features', R + ', How good predict reveal', ['Zero-shot matches a 4-shot classifier on average']),
 ('Roughly matches the best public 16-shot classifier (BiT-M ResNet-152x2)', R + ', How good predict reveal', ['a BiT-M ResNet-152x2 trained on ImageNet-21k']),
 ('Matching zero-shot on ImageNet takes an estimated 16 labelled examples per class', R + ', How good predict', ['About 16 on ImageNet']),
 ('Linear probes beat Noisy Student EfficientNet-L2 on 21 of 27 datasets', R + ', Linear probes', ['beat Noisy Student EfficientNet-L2 on 21 of 27']),
 ('Improving the 27-dataset average by 2.6% to 5%', R + ', Linear probes (recomputed 2.64 and 4.73)', ['by 2.6% on average', 'the margin grows to 5%']),
 ('CLIP ViTs about 3x more compute-efficient than CLIP ResNets', R + ', Linear probes', ['CLIP ViTs are about 3× more compute-efficient than CLIP ResNets']),
 ('Zero-shot error falls smoothly as a log-log function of model compute over a 44x range', R + ', How good, Scaling', ['log-log linear trend in compute across a 44× range']),
 ('7 natural distribution shifts (ImageNetV2, Sketch, ObjectNet, ImageNet-A/R, etc.)', R + ', Robustness', ['7 natural shifts (ImageNetV2, ImageNet Sketch, Youtube-BB, ImageNet-Vid, ObjectNet, ImageNet Adversarial, ImageNet Rendition)']),
 ('Zero-shot CLIP closes the gap by up to 75%', R + ', Robustness; headline card', ['by up to 75%']),
 ('At identical 76.2% ImageNet, ResNet-101 gets 37.7% on ImageNet-R and 2.7% on ImageNet-A; CLIP 88.9% and 77.1%', R + ', Robustness predict reveal (Figure 13 table redrawn)', ['the ResNet-101 scores 2.7%', '77.1%, as high as its ImageNet score', 'ImageNet-R']),
 ('Fine-tuning CLIP to ImageNet adds 9.2% in-distribution but slightly reduces average robustness', R + ', Robustness; Tables (Table 16 recount)', ['adds 9.2% on ImageNet, to 85.4%', 'average accuracy under shift slightly decreases']),
 ('Evidence that supervised training on a fixed distribution is itself a source of brittleness', R + ', Robustness (the authors hypothesis; Fang et al. 2022 as the later test)', ['High effective robustness seems to result from minimizing the amount of distribution specific training data', 'the more diverse training distribution is the main cause']),
 ('Contamination: median 2.2% overlap; >0.1% shift on only 7 of 35 datasets', R + ', Humans, overlap, bias', ['Median overlap is 2.2%', 'Overall accuracy moves by more than 0.1% on only 7 datasets']),
 ('Limitation: zero-shot only competitive with a ResNet-50 linear probe, far from SOTA', R + ', Limitations', ['only competitive with a linear probe on ResNet-50']),
 ('~1000x more compute to reach SOTA with this recipe; better methods needed', R + ', Limitations', ['about 1,000× more compute would be needed', 'so efficiency has to improve']),
 ('Weak at counting and at truly out-of-distribution data (weak zero-shot MNIST)', R + ', Limitations', ['counting', '88% on MNIST handwritten digits']),
 ('Inherits social biases from web data', R + ', Limitations; Bias details', ['Social biases</b> from uncurated web pairs']),
 # why it matters
 ('Created the vision-language embedding paradigm: shared space where a classifier is just text', R + ', Why it matters', ['where a classifier is just text']),
 ('Made classification open-vocabulary, prompt engineering into vision, reframed robustness evaluation around zero-shot', R + ', Why it matters', ['open-vocabulary', 'brought prompt engineering into vision', 'recentred robustness evaluation on zero-shot transfer']),
 ('VLM vision towers: CLIP ViTs bolted onto LLMs (LLaVA, Qwen-VL, InternVL, lineage behind frontier models)', R + ', Why it matters (frontier lineage marked unconfirmed)', ['the pre-trained CLIP visual encoder ViT-L/14', 'Qwen-VL', 'InternVL', 'that is unconfirmed']),
 ('Contrastive pretraining produces semantically aligned features an LLM can consume', R + ', Why it matters (via the LLaVA, InternVL sources)', ['aligned "using web-scale image-text data"']),
 ('DALL-E 2 (unCLIP) generates from CLIP image embeddings', R + ', Why it matters', ['DALL-E 2 (unCLIP) generates a CLIP image embedding from a caption']),
 ('Stable Diffusion conditions its U-Net on CLIP text-encoder outputs via cross-attention', R + ', Why it matters', ['Stable Diffusion conditions its U-Net', 'through cross-attention layers']),
 ('CLIP-score guidance and CLIPScore', R + ', Why it matters (guidance marked not separately sourced)', ['CLIPScore rates captions without references', 'CLIP-score guidance']),
 ('LAION-400M/5B filtered by CLIP similarity; CLIP-based filtering standard (DataComp, DFN); CLIP curates its successors data', R + ', Why it matters; Then and now', ['LAION-400M and LAION-5B were filtered by CLIP similarity', 'DataComp and Data Filtering Networks', 'curate the data their successors train on']),
 ('Successors: ALIGN (Google, noisier data at similar scale)', R + ', Why it matters; Then and now (corrected: 1.8B pairs, 4.5 times WIT)', ['ALIGN (Google, noisier data', '1.8B alt-text pairs, 4.5 times WIT']),
 ('OpenCLIP open reproductions and contrastive scaling laws; EVA-CLIP; MetaCLIP', R + ', Why it matters; Then and now', ["OpenCLIP's open reproductions and contrastive scaling laws", 'EVA-CLIP', 'MetaCLIP']),
 ('SigLIP line (2023) replaced softmax InfoNCE with pairwise sigmoid to decouple from batch size', R + ', Why it matters; Then and now (softmax against sigmoid demo)', ['SigLIP line (2023)', 'per-pair sigmoid to decouple the loss from the batch size']),
 ('SigLIP 2 (2025), today\'s default open vision tower', R + ', Why it matters (usage claim marked unchecked); Then and now', ['SigLIP 2 (2025)', "today's default open vision tower", 'a claim about usage this page has not checked']),
 ('Retrieval: CLIP embeddings made cross-modal search a commodity capability in vector databases', R + ', Why it matters (marked unconfirmed; LAION kNN indices sourced)', ['a commodity capability in vector databases', 'is unconfirmed here', 'kNN indices']),
 # connections
 ('ViT (2020-10): supplies best image encoder; main vehicle by which ViT reached multimodal models', 'Connections; Further reading', ['3c65c17b0d0d811fa231cfcde6c1954d', 'CLIP is the main vehicle by which ViT reached multimodal models']),
 ('GPT-3 (2020-05): zero-shot task transfer and prompt engineering paradigm; WebText-style data philosophy', 'Connections; Further reading', ['3c65c17b0d0d8193ac92c7648cfaca12', 'the zero-shot task transfer and prompt engineering CLIP imports into vision']),
 ('Scaling Laws (2020-01): same smooth log-log compute scaling', 'Connections; Further reading', ['3c65c17b0d0d81b08a1debb0c15cd252', 'smooth log-log trend in compute']),
 ('Latent Diffusion (2021-12): Stable Diffusion line conditions on CLIP text embeddings', 'Connections; Further reading', ['3c65c17b0d0d81bb98adc0daf8462cb6', 'conditioned on CLIP text embeddings']),
 ('KB topics: generative-and-multimodal, ml-fundamentals (contrastive learning)', 'Connections; Further reading, Topics', ['3c65c17b0d0d817ab6ade318917bff55', '3c65c17b0d0d81d796ccc0a293218c57', 'contrastive learning']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['Contrastive pretraining on 400M web image-text pairs yields a shared embedding space']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:35:40Z)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
