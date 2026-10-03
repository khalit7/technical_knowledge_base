"""Write coverage.json: every fact, number, mechanism, caveat and link of live.md and where the page carries it.
Each item names a phrase that must appear in ../index.html (checked here), so the map cannot drift from the page."""
import json, re, html as H
page = H.unescape(re.sub(r'<[^>]+>', ' ', open('../index.html', encoding='utf-8').read()))
page = re.sub(r'\s+', ' ', page)
raw = open('../index.html', encoding='utf-8').read()
I = [
 ("Reading time line '5 min read · +6h 55m resources'", "Header, recomputed by rtime.py", "min read"),
 ("Resource: Lilian Weng, Contrastive Representation Learning (~50 min), survey from contrastive loss to CLIP", "Further reading, Best resources", "lilianweng.github.io/posts/2021-05-31-contrastive/"),
 ("Resource: Lilian Weng, Self-Supervised Representation Learning (~50 min)", "Further reading, Best resources", "lilianweng.github.io/posts/2019-11-10-self-supervised/"),
 ("Resource: SimCLR paper arXiv:2002.05709 (45 min)", "Further reading; Reading, InfoNCE and SimCLR recipe", "arxiv.org/abs/2002.05709"),
 ("Resource: CPC/InfoNCE paper arXiv:1807.03748 (45 min)", "Further reading; Reading, InfoNCE", "arxiv.org/abs/1807.03748"),
 ("SimCLR and CPC are the two foundational objectives", "Further reading descriptions", "One of the two foundational objectives"),
 ("Resource: I-JEPA arXiv:2301.08243 (45 min), LeCun-school non-generative SSL", "Further reading; Reading, Masked modelling", "LeCun-school non-generative"),
 ("Core idea: embedding space where similar pairs close, dissimilar far; examples: augmented views, image/caption pairs", "Reading, lead paragraph", "pull their embeddings together"),
 ("Self-supervised: the pairing itself is the label, no human annotation", "Reading, lead and 'The pairing is the label'", "The pairing itself is the label"),
 ("InfoNCE formula -log exp(sim(zi,zj)/tau) / sum_k exp(sim(zi,zk)/tau)", "Reading, InfoNCE formula block", "the temperature, a fixed hyperparameter"),
 ("Cross entropy over one positive against N-1 in-batch negatives", "Reading, InfoNCE (with the SimCLR 2(N-1) correction)", "softmax cross entropy of an"),
 ("sim is cosine similarity, tau a temperature", "Reading, formula definitions", "cosine similarity, the dot product of l2-normalised vectors"),
 ("Maximises a lower bound on mutual information between views", "Reading, 'The batch is the task' and correction box (capped at ln N)", "I ≥ ln N − L"),
 ("Needs many negatives, so large batches or memory banks (MoCo) matter", "Reading, 'Hence the engineering that buys negatives' list", "A queue with a momentum encoder"),
 ("Table: SimCLR (2020), two augmentations of one image, in-batch negatives", "Reading, one-screen table and SimCLR recipe", "SimCLR 2020"),
 ("SimCLR notes: strong augmentation + projection head + big batch = the recipe", "Reading, 'The SimCLR recipe'", "matter. Augmentation"),
 ("Table: MoCo (2019), momentum-encoder queue", "Reading, negatives list; family tree", "momentum encoder and a queue"),
 ("MoCo decouples negative count from batch size", "Reading, MoCo bullet", "no longer depends on the batch"),
 ("Table: BYOL/SimSiam, no negatives", "Reading, 'Without negatives'", "Asymmetry: BYOL and SimSiam"),
 ("BYOL/SimSiam: predictor + stop-gradient (plus EMA target in BYOL) avoids collapse", "Reading, Asymmetry section; Collapse lab pairs", "stop-gradient"),
 ("Table: CLIP (2021), image and caption, symmetric InfoNCE both directions", "Reading, Embedding models CLIP paragraph; One real batch symmetric option", "symmetric InfoNCE between an image encoder and a text encoder"),
 ("CLIP: cross-modal contrastive; zero-shot classification via text prompts", "Reading, CLIP paragraph", "zero-shot classification by writing the classes as text"),
 ("CLIP: the vision encoder feeding most multimodal LLMs", "Reading, CLIP paragraph", "the vision encoder that feeds most multimodal LLMs"),
 ("What the training objective forces the model to output determines the architecture", "Reading, 'The objective makes the embedding model'", "what the training objective forces the model to output"),
 ("Contrastive objectives produce encoders: one embedding per input, no decoder; CLIP's image tower, SBERT, SimCSE, retrieval embedders, reranker backbones", "Reading, same section", "Contrastive objectives produce encoders."),
 ("Generative objectives need decoders: next-token (GPT) or denoising-with-generation (T5); representations optimised for next token, not geometric comparability", "Reading, same section", "Generative objectives need decoders."),
 ("BERT sits in between: encoder with masked-token objective; raw embeddings poor for similarity until contrastively fine-tuned (SimCSE)", "Reading, same section, measured on real data (One real batch tab)", "BERT sits between:"),
 ("Contrastive learning is the standard post-training recipe for embedding/retrieval models in 2026, on encoders and increasingly decoder-only LLMs with pooling (E5-Mistral, NV-Embed, Qwen-Embedding)", "Reading, embedding section and pooling table (Qwen-Embedding corrected to Qwen3-Embedding)", "standard post-training recipe for embedding and retrieval models"),
 ("The objective, not the backbone, makes an embedding model; decoder LLMs are contrastively adapted because next-token pretraining does not yield a well-shaped similarity space", "Reading, embedding section", "The objective, not the backbone"),
 ("DINO (2021, 45 min link) / DINOv2 (2023, 90 min link), self-distillation", "Reading, DINO paragraphs; Further reading", "arxiv.org/abs/2304.07193"),
 ("DINO: student matches a momentum teacher's output distribution across views; no negatives", "Reading, DINO paragraph", "a student network matches the softmax output of a momentum teacher"),
 ("DINOv2 with curated data yields frozen features rivalling weakly-supervised models; default vision backbone for dense tasks", "Reading, DINOv2 paragraph (with 86.5% linear, LVD-142M)", "default frozen backbone for dense vision tasks"),
 ("DINOv3 (2025) scales this further", "Reading, DINOv3 sentence (7B, LVD-1689M, Gram anchoring)", "Gram anchoring"),
 ("MAE (2021, 45 min link): mask 75% of ViT patches, reconstruct pixels with a light decoder", "Reading, MAE paragraph and the MAE animation (real checkpoint)", "a high proportion of the input image, e.g., 75%"),
 ("MAE: BERT-style pretraining for vision, cheap and scalable", "Reading, MAE paragraph (3x or more speed-up; 87.8%)", "3x or more"),
 ("I-JEPA / V-JEPA (2023/2024): predict representations of masked target blocks from a context block, in latent space not pixels", "Reading, I-JEPA paragraph and animation", "predict the representations of several large target blocks"),
 ("JEPA avoids both negatives and pixel-level reconstruction", "Reading, one-screen table and V-JEPA sentence", "no pretrained image encoder, text, negatives or reconstruction"),
 ("JEPA is LeCun's proposed path toward world models", "Reading, JEPA paragraph", "A Path Towards Autonomous Machine Intelligence"),
 ("V-JEPA 2 (2025) extends to video", "Reading, V-JEPA 2 sentence (V-JEPA already video; V-JEPA 2 adds scale and action conditioning)", "V-JEPA 2-AC"),
 ("Trend: from contrastive vs not to joint-embedding (contrastive, distillation, JEPA) vs masked generative (MAE); latent-space prediction increasingly favoured for semantic features", "Reading, trend paragraph", "joint-embedding methods"),
 ("Cross-link: InfoNCE is cross entropy (Loss functions page)", "Reading, InfoNCE; Further reading", "3c65c17b0d0d8161a72bc8c572f37d55"),
 ("Cross-link: temperature and softmax (Activation functions page)", "Reading, InfoNCE; Further reading", "3c65c17b0d0d819f8049c255e6f206e2"),
 ("Cross-link: embeddings in retrieval practice (Topic: rag-and-retrieval)", "Reading, CLIP paragraph; Further reading", "3c65c17b0d0d81b89145c37dfe8a3b0b"),
 ("Cross-link: ViT/CLIP architectural detail (Topic: generative-and-multimodal)", "Reading, masked modelling deep note; Further reading", "3c65c17b0d0d817ab6ade318917bff55"),
]
items, missing = [], []
for fact, where, needle in I:
    ok = needle in page or needle in raw
    if not ok: missing.append(needle)
    items.append(dict(fact=fact, where=where, check=needle, found=ok))
out = dict(source='src/live.md (Notion fetch, page last edited 2026-09-22T00:05:55Z, fetched 2026-10-03)', child_pages=[], databases=[], video=None,
           total=len(items), carried=sum(i['found'] for i in items), dropped=0,
           corrected=["InfoNCE MI bound: capped at ln N (Poole et al.), loose; geometry explains success (Wang and Isola)",
                      "SimCLR negatives are 2(N-1), not N-1",
                      "SimCLR 76.5% is ResNet-50 (4x); plain ResNet-50 69.3%; 1%-label 85.8% is top-5",
                      "SimSiam 71.3% is the 800-epoch figure (68.1% at 100)",
                      "Qwen-Embedding is Qwen3-Embedding (2025)",
                      "V-JEPA (2024) was already video; V-JEPA 2 (2025) adds scale and an action-conditioned world model",
                      "BERT 'first-last avg.' baseline: SimCSE Table 5's 53.87 reproduces only with embedding-layer + last-layer averaging; Su et al.'s 59.04 with first + last transformer layers"],
           items=items)
json.dump(out, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print(out['total'], 'items', out['carried'], 'found; missing:', missing)
