# Coverage: old Notion root page (src/live.md) to the HTML

Where every fact, claim, link and resource of the old root page "Topic: ml-fundamentals" now lives. Reading sections: One step (strip), 1 Data and init, 2 Forward, 3 Loss, 4 Backward, 5 Update, 6 Regularise, 7 Measure, Threads 1 to 4, Beyond one network (Classical ML, Contrastive and SSL, Sequence models), When it goes wrong. "More" is the Further reading tab. Tabs owned by other parts of the build: Training lab (t-lab), Defaults across models (t-defaults), When training goes wrong (t-debug; the folded "Debugging training" page and its coverage belong to that tab's agent).

Corrections are marked **C**; each is shown on the page in a "Correction" box with its source.

## Header, video, intro

| Old page | Now |
|---|---|
| Video block and its caption ("ten pages, and the four threads that cut across them") | Stays in Notion under the embed until Khalid deletes it (his decision); not mentioned on the page. |
| "6 min read · +24h 15m resources" | Replaced by the new Reading tab's own time (reported; the header line is the orchestrator's). |
| Intro: core building blocks (losses, activations, optimisers, normalisation, metrics) every network is assembled from | One step, lead paragraph ("every building block acts at exactly one of seven moments"). |
| Intro: plus classical ML, contrastive/self-supervised, pre-transformer lineage | Beyond one network (three subsections). |
| Intro: a practical training-debugging cookbook | When it goes wrong (hand-off) and the t-debug tab. |
| Intro: "mostly review material, formatted for fast refresh; modern developments (SwiGLU, RMSNorm, Muon, JEPA) flagged inline with dates" | Each modern item carries its year where it appears: SwiGLU (Shazeer 2020, step 2), RMSNorm (2019, step 2), Muon (2024, step 5), JEPA (2023, 2024, V-JEPA 2 2025, Contrastive). |

## Taxonomy (mermaid mind map)

| Node | Now |
|---|---|
| Losses: regression (MSE, MAE, Huber); classification (CE, focal, hinge); specialised (KL, penalties, adversarial) | Step 3 (regression table with MSE, RMSE, MAE, MAPE, Huber, log-cosh; CE family, focal, hinge; KL, adversarial, penalties pointer). |
| Activations: sigmoid, tanh, ReLU family; GELU, SiLU; gated GLU, GEGLU, SwiGLU | Step 2 activation table and gated paragraph. GEGLU named in More (Activation functions card); the child page owns it. |
| Regularisation: L1, L2, elastic net; dropout, augmentation, early stopping; decoupled weight decay | Step 6 table; thread 4. |
| Optimisers and schedulers: SGD, momentum, NAG; AdaGrad, RMSProp, Adam, AdamW; warmup plus cosine; Muon, SOAP, Lion, schedule-free | Step 5 optimiser table, challengers table, schedules chart and list. |
| Normalisation and init: BatchNorm, LayerNorm, RMSNorm; Xavier, He, LeCun | Step 2 norm table; step 1 init table; thread 2. |
| Metrics: precision, recall, ROC, PRC; BLEU, ROUGE, perplexity, BERTScore; entropy, CE, KL | Step 7 (classification paragraph and ROC/PR visual; text scores paragraph); thread 1. |
| Classical ML: supervised, unsupervised; trees, ensembles, SVM, kNN; hyperparameter search | Beyond one network, Classical ML (table and paragraph). |
| Contrastive and SSL: InfoNCE, SimCLR, CLIP; DINO, MAE, JEPA | Beyond one network, Contrastive (paragraph and table). |
| Sequence models: word2vec, GloVe, WaveNet; RNN, GRU, LSTM; seq2seq plus attention | Beyond one network, Sequence models (timeline table). |
| Debugging training: fit and gradient pathologies; loss-curve diagnosis; imbalanced data | When it goes wrong (names all four) and t-debug. |
| The taxonomy as a picture | Replaced by the seven-stage step strip, which places every component at the moment it acts. |

## Map of the space

| Claim | Now |
|---|---|
| Each band gets its orienting claim; depth is on the deep-dive pages | Every section ends with a "Go deeper (optional)" note naming the child page. |
| Losses follow from the target type and the outlier profile | Step 3, first paragraph and regression table ("Choose it when"). |
| Classification is all cross entropy, varied by reweighting the terms (label smoothing, class weights, focal) | Step 3 ("Classification is all cross entropy"), loss explorer; thread 1 title. |
| KL is not a task loss but the distance-like quantity between two distributions; the same object in VAE regularisers, distillation, RLHF's policy anchor | Step 3 last paragraph; thread 1 (bullets "The loss", "The anchor"), with the Distillation and training-topic links. |
| Activations: ReLU family in hidden layers, task-specific at the output | Step 2, "The rule is short". |
| Gated variants (SwiGLU, the transformer FFN default) are the same construction as an LSTM gate, two projections, one gating the other, so the effective slope is learned per neuron | Step 2, "The gated units borrow the LSTM's trick"; Sequence models table (LSTM row: "its gating is the ancestor of SwiGLU"; WaveNet row). |
| Regularisation is penalty, dropout, augmentation or early stopping | Step 6 table (four kinds, each with the stage it acts at). |
| Weight decay is the boundary case, regulariser by intent and optimiser property by implementation; why AdamW exists: decay applied to the weights directly instead of being rescaled by Adam's per-parameter scaling | Step 6 last paragraph; thread 4 (title, text and the Adam+L2 against AdamW animation). |
| Optimisers combine momentum with per-parameter adaptive scaling; a schedule sets the base rate they scale relative to, so the two are always chosen together | Step 5, first paragraph. |
| The 2024-26 challengers (Muon, Shampoo/SOAP, Lion, schedule-free) change the update geometry or remove the schedule rather than tuning it | Step 5, "The 2024 to 2026 challengers change the geometry", update-geometry animation, challengers table. **C**: Shampoo is 2018, Lion 2023 (correction box). |
| Normalisation and initialisation chase one invariant: constant activation and gradient variance across layers, at step zero and forever after | Thread 2 (first paragraph); step 1; the five-network animation. |
| Which activation you picked decides which init scheme is right | Step 1 (pointer) and thread 2 table (activation to init to norm). |
| Metrics split three ways: threshold-based classification numbers; n-gram and embedding scores for text; the entropy/CE/KL trio as the loss read as a measurement | Step 7 (three paragraphs in that order). |
| ROC-versus-PR choice turns on whether the denominator is the whole negative class or the model's own positive predictions | Step 7 classification paragraph, and the ROC/PR visual (prevalence slider). |
| Classical ML still owns tabular data | Classical ML paragraph (Grinsztajn et al. 2022), with the TabPFN v2 counterpoint marked reported (added). |
| Its machinery resurfaces: hinge loss and kernel trick, nearest neighbours as ancestor of vector retrieval, boosting's second-order information is why some losses need a defined Hessian | Classical ML paragraph (all three, with links to step 3 and Topic: rag-and-retrieval). |
| Contrastive/SSL: the objective, not the backbone, makes an embedding model | Contrastive subsection heading and last paragraph. |
| InfoNCE is cross entropy again, an N-way classification of one positive against in-batch negatives | Contrastive paragraph; thread 1 (bullet and the "InfoNCE, batch of 8" preset). |
| "which is why batch size matters so much there and nowhere else in this topic" | **C** box in Contrastive: batch size matters elsewhere (BatchNorm statistics, optimiser gradient noise); special to InfoNCE is that the batch is the negative set (chance ln N), hence MoCo's queue. |
| The pre-transformer lineage earns its place because the transformer is what is left of it | Sequence models subsection, first sentence. |
| Attention was invented to remove seq2seq's fixed-vector bottleneck | Sequence models table (seq2seq and attention rows). |
| The LSTM's additively updated cell state is a skip connection through time | Thread 3, point 4; Sequence models table (LSTM row); BPTT visual. |
| Vanishing gradients is activation saturation, init scale, normalisation placement and the product of Jacobians in BPTT, seen four ways | Thread 3 (the four, numbered, each with a button into the animation or the BPTT visual); step 4. |
| Which is why debugging training reads as the symptom-to-cause path back through everything above | When it goes wrong (first sentence) and thread 3's last line. |

## Map of the deep dives (table)

| Row | Now |
|---|---|
| Loss functions: covers regression (MSE/RMSE/MAE/MAPE/Huber/log-cosh), classification (CE family, label smoothing, focal, hinge), KL, penalties, adversarial; "match the loss to the target type and the outlier/imbalance profile" | More card (covers line); step 3 table and text carry the one-liner. |
| Activation functions: sigmoid, tanh, ReLU family, softmax, GELU, SiLU, GLU/GEGLU/SwiGLU; "ReLU family in hidden layers, task-specific at the output; SwiGLU is the LLM default" | More card; step 2 table and rule. |
| Regularisation: L1/L2/elastic net, dropout (train vs inference scaling), augmentation, early stopping, decoupled weight decay; "penalise, drop, augment, or stop early; decouple decay from Adam" | More card; step 6 table (inverted dropout explained); thread 4. |
| Optimisers and schedulers: GD variants, momentum/NAG, AdaGrad through AdamW, Newton; warmup + cosine; Muon/SOAP/Lion/schedule-free; "AdamW + warmup-cosine is the default; Muon is the challenger" | More card; step 5 (tables, schedules, Choosing). The one-liner is in the challengers table (Muon status) and Choosing. |
| Normalisation and initialisation: feature scaling, BatchNorm (train vs inference), LayerNorm, RMSNorm; naive/random/Xavier/He/LeCun; "keep activation variance constant across layers, at init and forever after" | More card; step 1 (feature scaling, symmetry problem, init table), step 2 (norm table with train/inference), thread 2. |
| Evaluation metrics: P/R/F1, ROC-AUC vs AUPRC, BLEU/ROUGE/METEOR/perplexity, BERTScore/MoverScore, entropy vs CE vs KL; "rare positives: PR curve, not ROC" | More card; step 7 and ROC/PR visual; thread 1. |
| Classical ML: supervised/unsupervised map, clustering, anomaly detection, dimensionality reduction, trees/RF/XGBoost, SVM, kNN, grid/random/Bayesian search; "boosted trees still rule tabular; random beats grid" | More card; Classical ML table and paragraph (both one-liners, with Bergstra and Bengio 2012). |
| Contrastive and SSL: InfoNCE, SimCLR, MoCo, BYOL, CLIP; why contrastive objectives produce encoders; DINO, MAE, JEPA; "the objective, not the backbone, makes an embedding model" | More card; Contrastive table and paragraphs. |
| Sequence models: word2vec, GloVe, WaveNet, RNN/BPTT, GRU, LSTM gate by gate, seq2seq + attention; "additive cell-state updates beat vanishing gradients; attention removed the bottleneck" | More card; Sequence models table; thread 3. |
| Debugging training: over/underfitting, vanishing/exploding gradients, loss-curve diagnosis (flat/NaN/oscillating/plateau), imbalanced data; "symptom to causes to fixes tables; overfit one batch first" | Folded into the root (Khalid's decision): the t-debug tab owns the tables and checklist (another agent); When it goes wrong names all four areas and links it; More card for t-debug. Step 3 keeps the starting-loss check with the toy's own numbers. |

## Related papers

| Old page | Now |
|---|---|
| Attention Is All You Need (2017): where the sequence lineage ends | Sequence models table (Transformer row); step 2 (post-norm); step 5 (inverse square root schedule); More, Key papers (14 min). |
| BERT (2018): encoder pretraining; referenced from metrics (BERTScore) and contrastive/SSL | Step 7 (BERTScore); Contrastive (BERT sits between); More (22 min). |
| CLIP (2021) and ViT (2020): contrastive and SSL backbones | Contrastive paragraph and table (CLIP's ln 32,768; MAE row links ViT); thread 1 preset; More (22 and 20 min). |
| Added | WSM, Chinchilla, OLMo 2, Llama 3, DeepSeek-V3, Mamba paper pages, each where its fact is used, and in More. |

## Best resources for the whole topic

| Old page | Now |
|---|---|
| Karpathy, A Recipe for Training Neural Networks (~35 min) | More, Best resources (about 35 min). |
| Ruder, An overview of gradient descent optimization algorithms (~40 min) | More (about 40 min). |
| Lilian Weng's blog (~3h for the core surveys): contrastive learning, SSL and beyond | More (about 3h). |
| Deep Learning book (~20h): the textbook backbone | More (about 20h). |

## Child page tags

The ten `<page>` tags stay in Notion under the embed; nine are linked from the More tab and from every section's "Go deeper" note. "Debugging training" is folded in (t-debug); marking it "TO DELETE" in Notion is the orchestrator's step.

## Facts added beyond the old root (each sourced inline)

Toy-network numbers (all recomputed in `src/read/recompute.py`); He, Xavier, LeCun, GPT-2 residual scaling, OLMo 2 (σ = 0.02) and DeepSeek-V3 (σ = 0.006) initialisation; norm placement (post, pre, OLMo 2's branch-output norm), Santurkar et al., Xiong et al.; Primer squared ReLU; Shazeer's "divine benevolence" line (from the child page's resource note); MAPE caveat (scikit-learn); label smoothing conventions; Pascanu clipping and Llama 2 / DeepSeek-V3 clip 1.0; Liu et al. on Adam's early variance; Muon's 2x efficiency (Moonshot) and MuonClip on Kimi K2; speedrun record 31.4 to 24.9 min; AlgoPerf results for Shampoo and schedule-free; Llama 3 and DeepSeek-V3 schedules; Hägele et al.; WSM merge-decay identity; SGDR and one-cycle; Davis and Goadrich; TabPFN v2; SimCSE and LLM-based embedders; Jozefowicz et al. forget bias.

## Corrections shown on the page

1. Challenger dates: Shampoo 2018, Lion 2023 (old: "2024-26 challengers").
2. WSM's gain: +1.28 best-against-best, +1.18 at matched tokens, single run, picked on test benchmarks (old child: "~1.3 points"; from the WSM paper page).
3. Batch size "nowhere else": see above.
4. Not a correction but a visible convention note: label smoothing as 1 − ε + ε/K and ε/K (Szegedy et al., PyTorch) against 1 − ε and ε/(K − 1) (the Loss functions child page); minimum at 0.91 against 0.9.
