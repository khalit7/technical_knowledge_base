# Topic: ml-fundamentals

⏱ 6 min read · +24h 15m resources

Core machine learning building blocks: the losses, activations, optimisers, normalisation, and metrics every network is assembled from, plus classical ML, contrastive/self-supervised learning, the pre-transformer sequence-model lineage, and a practical training-debugging cookbook. Mostly review material, formatted for fast refresh; genuinely modern developments (SwiGLU, RMSNorm, Muon, JEPA) are flagged inline with dates.

### Taxonomy

```mermaid
mindmap
  root((ML fundamentals))
    Training components
      Losses
        Regression losses incl MSE, MAE, Huber
        Classification losses incl CE, focal, hinge
        Specialised incl KL, penalties, adversarial
      Activations
        Sigmoid, tanh, ReLU family
        GELU, SiLU
        Gated GLU, GEGLU, SwiGLU
      Regularisation
        L1, L2, elastic net
        Dropout, augmentation, early stopping
        Decoupled weight decay
      Optimisers and schedulers
        SGD, momentum, NAG
        AdaGrad, RMSProp, Adam, AdamW
        Warmup plus cosine
        Modern Muon, SOAP, Lion, schedule-free
      Normalisation and init
        BatchNorm, LayerNorm, RMSNorm
        Xavier, He, LeCun
    Evaluation
      Metrics
        Precision, recall, ROC, PRC
        BLEU, ROUGE, perplexity, BERTScore
        Entropy, CE, KL
    Paradigms
      Classical ML
        Supervised, unsupervised
        Trees, ensembles, SVM, kNN
        Hyperparameter search
      Contrastive and SSL
        InfoNCE, SimCLR, CLIP
        DINO, MAE, JEPA
    History and practice
      Sequence models
        word2vec, GloVe, WaveNet
        RNN, GRU, LSTM
        Seq2seq plus attention
      Debugging training
        Fit and gradient pathologies
        Loss-curve diagnosis
        Imbalanced data
```

### Map of the space

Each band below gets its orienting claim and whatever only becomes visible when all the children are in view. The depth is on the deep-dive pages, mapped in the table that follows.

**Losses** follow from the target type and the outlier profile; classification is all cross entropy, varied by reweighting the terms (label smoothing, class weights, focal). **KL divergence** is the exception that is not a task loss at all but the distance-like quantity between two distributions, the same object in VAE regularisers, in distillation, and in RLHF's policy anchor.

**Activations** are the ReLU family in hidden layers and task-specific at the output. The gated variants (SwiGLU, the transformer FFN default) are the same construction as an LSTM gate, two projections with one gating the other, so the effective slope is learned per neuron rather than fixed.

**Regularisation** is penalty, dropout, augmentation or early stopping. Weight decay is the band's boundary case, a regulariser by intent and an optimiser property by implementation, which is exactly why AdamW exists.

**Optimisers** combine a momentum term with per-parameter adaptive scaling, while a schedule sets the base learning rate they scale relative to, so the two are always chosen together. The 2024-26 challengers (Muon, Shampoo/SOAP, Lion, schedule-free) change the update geometry or remove the schedule rather than tuning it.

**Normalisation and initialisation** chase one invariant between them: roughly constant activation and gradient variance across layers, at step zero and forever after. Which activation you picked is what decides which initialisation scheme is right.

**Metrics** split three ways: threshold-based classification numbers, where the ROC-versus-PR choice turns entirely on whether the denominator is the whole negative class or the model's own positive predictions; n-gram and embedding scores for text; and the entropy, cross-entropy and KL trio, which is the classification loss read as a measurement rather than as an objective.

**Classical ML** still owns tabular data, and its machinery keeps resurfacing elsewhere: hinge loss and the kernel trick, nearest neighbours as the ancestor of vector retrieval, and boosting's use of second-order information, which is the reason some losses have to have a defined Hessian.

**Contrastive and self-supervised learning** is where the objective, not the backbone, is what makes something an embedding model. Its workhorse loss, InfoNCE, is cross entropy again, an N-way classification over one positive against the in-batch negatives, which is why batch size matters so much there and nowhere else in this topic.

**The pre-transformer lineage** earns its place because the transformer is what is left of it: attention was invented to remove seq2seq's fixed-vector bottleneck, and the LSTM's additively updated cell state is a skip connection through time.

One thread runs through four of these bands at once. Vanishing gradients is activation saturation, initialisation scale, normalisation placement and the product of Jacobians in backpropagation through time, seen from four directions, which is why **debugging training** reads as the symptom-to-cause path back through everything above.

### Map of the deep dives

| Page | Covers | Refresh in one line |
| --- | --- | --- |
| [Loss functions](losses.md) | Regression (MSE/RMSE/MAE/MAPE/Huber/log-cosh), classification (CE family, label smoothing, focal, hinge), KL, penalties, adversarial | Match the loss to the target type and the outlier/imbalance profile |
| [Activation functions](activations.md) | Sigmoid, tanh, ReLU family, softmax, GELU, SiLU, GLU/GEGLU/SwiGLU | ReLU family in hidden layers, task-specific at the output; SwiGLU is the LLM default |
| [Regularisation](regularisation.md) | L1/L2/elastic net, dropout (train vs inference scaling), augmentation, early stopping, decoupled weight decay | Penalise, drop, augment, or stop early; decouple decay from Adam |
| [Optimisers and learning-rate schedulers](optimisers-and-schedulers.md) | GD variants, momentum/NAG, AdaGrad through AdamW, Newton; warmup + cosine; Muon/SOAP/Lion/schedule-free (2024-26) | AdamW + warmup-cosine is the default; Muon is the challenger |
| [Normalisation and initialisation](normalisation-and-initialisation.md) | Feature scaling, BatchNorm (train vs inference), LayerNorm, RMSNorm; naive/random/Xavier/He/LeCun init | Keep activation variance constant across layers, at init and forever after |
| [Evaluation metrics](metrics.md) | Precision/recall/F1, ROC-AUC vs AUPRC on imbalance, BLEU/ROUGE/METEOR/perplexity, BERTScore/MoverScore, entropy vs CE vs KL | Rare positives -> PR curve, not ROC |
| [Classical ML](classical-ml.md) | Supervised/unsupervised map, clustering, anomaly detection, dim reduction, trees/RF/XGBoost, SVM, kNN, grid/random/Bayesian search | Boosted trees still rule tabular; random beats grid |
| [Contrastive and self-supervised learning](contrastive-and-self-supervised.md) | InfoNCE, SimCLR, MoCo, BYOL, CLIP; why contrastive objectives produce encoders; DINO, MAE, JEPA | The objective, not the backbone, makes an embedding model |
| [Sequence models: the pre-transformer lineage](sequence-models.md) | word2vec, GloVe, WaveNet, RNN/BPTT, GRU, LSTM gate-by-gate, seq2seq + attention | Additive cell-state updates beat vanishing gradients; attention removed the bottleneck |
| [Debugging training](debugging-training.md) | Over/underfitting, vanishing/exploding gradients, loss-curve diagnosis (flat/NaN/oscillating/plateau), imbalanced data | Symptom -> causes -> fixes tables; overfit one batch first |

### Related papers

- [Attention Is All You Need (Transformer)](../../papers/2017-06_attention-is-all-you-need/summary.md) (2017): where the sequence-model lineage ends.
- [BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding](../../papers/2018-10_bert/summary.md) (2018): encoder pretraining; referenced from metrics (BERTScore) and contrastive/SSL.
- [Learning Transferable Visual Models From Natural Language Supervision (CLIP)](../../papers/2021-02_clip/summary.md) (2021) and [An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale (ViT)](../../papers/2020-10_vit/summary.md) (2020): contrastive and SSL backbones.

### Best resources for the whole topic

- [A Recipe for Training Neural Networks (Karpathy)](https://karpathy.github.io/2019/04/25/recipe/) (~35 min)
- [Ruder: An overview of gradient descent optimization algorithms](https://www.ruder.io/optimizing-gradient-descent/) (~40 min)
- [Lilian Weng's blog (Lil'Log)](https://lilianweng.github.io/) (blog, ~3h for the core surveys): surveys spanning contrastive learning, SSL, and beyond
- [Deep Learning book (Goodfellow, Bengio, Courville)](https://www.deeplearningbook.org/) (~20h): the textbook backbone for all of the above
- [Activation functions](activations.md)
- [Classical ML](classical-ml.md)
- [Contrastive and self-supervised learning](contrastive-and-self-supervised.md)
- [Debugging training](debugging-training.md)
- [Loss functions](losses.md)
- [Evaluation metrics](metrics.md)
- [Normalisation and initialisation](normalisation-and-initialisation.md)
- [Optimisers and learning-rate schedulers](optimisers-and-schedulers.md)
- [Regularisation](regularisation.md)
- [Sequence models: the pre-transformer lineage](sequence-models.md)
