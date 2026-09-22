# BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding

⏱ 9 min read · +~2h 40m resources

- **Authors**: Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova (Google AI Language)
- **Date**: October 2018 (arXiv v1; v2 May 2019, NAACL 2019 best paper)
- **Links**: [arXiv:1810.04805](https://arxiv.org/abs/1810.04805) (~45 min) | [code + checkpoints](https://github.com/google-research/bert) (repo, ~20 min for the README and entry path) | [Google AI blog](https://research.google/blog/open-sourcing-bert-state-of-the-art-pre-training-for-natural-language-processing/) (~10 min)

### Best resources

- [The Illustrated BERT, ELMo, and co.](https://jalammar.github.io/illustrated-bert/) (Jay Alammar) (~30 min): the classic visual walkthrough of how BERT relates to ELMo and GPT and how fine-tuning works
- [BERT 101](https://huggingface.co/blog/bert-101) (Hugging Face) (~25 min): practical intro with code, good for the fine-tuning workflow
- [Finally, a Replacement for BERT: ModernBERT](https://www.answer.ai/posts/2024-12-19-modernbert.html) (Answer.AI, Dec 2024) (~30 min): where the encoder lineage stands today and why it still matters
- Original [Google AI blog post](https://research.google/blog/open-sourcing-bert-state-of-the-art-pre-training-for-natural-language-processing/) (~10 min, the same post as the Links line): concise author framing of the contribution

### Problem

By 2018, pretraining then transferring language representations was clearly effective (ELMo, ULMFiT, OpenAI GPT), but both dominant strategies were handicapped by unidirectionality. Standard language models can only be trained left-to-right (or right-to-left), because in a deep bidirectional network each word could indirectly "see itself" through higher layers. So GPT attends only to leftward context, and ELMo merely concatenates two independently trained shallow unidirectional LSTMs. For token-level tasks like QA and NER, where right-side context is essential, this is a real limitation. The gap: a way to pretrain a genuinely deep bidirectional model on unlabeled text, transferable to many tasks with minimal task-specific architecture.

### Method

BERT is a stack of Transformer encoder layers (from Vaswani et al. 2017) pretrained on unlabeled text with two self-supervised objectives, then fine-tuned end-to-end per task.

**Architecture and input.** BERT-Base: L=12 layers, H=768, A=12 heads, 110M params (sized to match GPT-1); BERT-Large: L=24, H=1024, A=16, 340M params. Input is WordPiece tokens (30k vocab); every sequence starts with `[CLS]` and sentence pairs are packed into one sequence separated by `[SEP]`. Each token embedding is the sum of token + learned position + segment (A/B) embeddings. The final hidden state of `[CLS]` serves as the aggregate representation for classification.

**Objective 1: Masked LM (MLM).** Randomly select 15% of tokens; the model predicts the original token from its full bidirectional context via a softmax over the vocabulary. This is the trick that makes deep bidirectionality trainable: predict only corrupted positions instead of autoregressing. To reduce the pretrain/fine-tune mismatch (no `[MASK]` at fine-tuning time), a selected token is replaced by `[MASK]` 80% of the time, a random token 10%, and left unchanged 10%. Cost: only 15% of positions produce a loss signal per batch, so MLM converges somewhat slower than a left-to-right LM, but it overtakes the LTR model in accuracy almost immediately.

**Objective 2: Next Sentence Prediction (NSP).** Binary classification from `[CLS]`: is sentence B the actual next sentence after A (50%) or a random sentence (50%)? Intended to teach inter-sentence relationships for QA/NLI. The paper's ablation shows it helping QNLI/MNLI/SQuAD by roughly 1-2 points; later work (notably RoBERTa) showed NSP is largely unnecessary given better training.

**Pretraining setup.** BooksCorpus (800M words) + English Wikipedia (2,500M words), document-level corpora for long contiguous sequences. 1M steps, batch 256 sequences x 512 tokens (~40 epochs over 3.3B words), Adam lr 1e-4 with 10k-step warmup and linear decay, GELU activations, dropout 0.1. 90% of steps at sequence length 128, final 10% at 512 to learn positional embeddings. 4 days on 4 Cloud TPUs (Base) or 16 Cloud TPUs (Large).

**Fine-tuning.** Plug in task inputs/outputs and fine-tune all parameters for 2-4 epochs at lr 2e-5 to 5e-5. Classification adds a single layer over `[CLS]`; SQuAD adds only start/end span vectors S, E scored by dot products with token states; NER classifies each token's final state. Typically under an hour on a TPU. The feature-based alternative (frozen BERT features into a BiLSTM) works nearly as well: concatenating the top four layers comes within 0.3 F1 of full fine-tuning on NER.

**Ablations.** Removing NSP hurts modestly; switching MLM to a left-to-right LM (GPT-style) hurts badly (MRPC 86.7 to 77.5, SQuAD F1 88.5 to 77.8, and a BiLSTM on top only partially recovers it). Bigger models monotonically help even on tiny datasets (3.6k examples), an early scaling signal.

### Results

New state of the art on 11 NLP tasks at the time:

- **GLUE**: 80.5 average (BERT-Large) vs 72.8 for OpenAI GPT; +7.7 points absolute over prior SOTA. MNLI 86.7% (+4.6).
- **SQuAD v1.1**: 93.2 F1 (ensemble + TriviaQA augmentation; 91.8 single model), beating the top leaderboard ensemble and exceeding human performance (91.2).
- **SQuAD v2.0**: 83.1 F1, +5.1 over the previous best.
- **SWAG**: 86.3%, +8.3 over GPT and roughly at expert-human level.
- **CoNLL-2003 NER**: 92.8 test F1 with fine-tuning, matching heavily engineered task-specific systems.
Base vs Large: Large wins across every task, especially low-data ones. The same pretrained checkpoint with a one-layer head beat specialized architectures across sentence-level and token-level tasks, which was the headline claim.

### Why it matters

BERT ended the era of task-specific NLP architectures: after it, the default recipe became "pretrain a big Transformer, fine-tune per task", and MLM became the canonical self-supervised objective for encoders. It triggered a huge family of descendants (RoBERTa, ALBERT, ELECTRA, DistilBERT, DeBERTa, multilingual XLM-R), and its ideas leak everywhere: masked-prediction pretraining underpins vision methods like BEiT and MAE, and pooled `[CLS]`-style representations underpin modern embedding models. It also cemented the GLUE/SQuAD leaderboard eval culture and was an early clean demonstration that scaling model size keeps paying off even on small downstream datasets.

Status of the encoder lineage in 2026: decoders won generation, but encoder-only models never went away where you need one cheap forward pass producing representations rather than text. BERT descendants dominate embedding and retrieval stacks (bi-encoders for vector search, cross-encoder rerankers, ColBERT-style late interaction), plus classification, moderation, and NER at production scale. The recipe was refreshed by ModernBERT ([Answer.AI/LightOn](http://answer.ai/LightOn), Dec 2024: RoPE, GeGLU, alternating local/global attention, unpadding, 8k context, 2T training tokens) and the Ettin suite (2025), which trains paired encoders and decoders identically and confirms encoders still win understanding and retrieval tasks per FLOP. For an AI engineer today, BERT-family models are what you reach for when the task is "represent or label text" rather than "write text".

### Connections

- `papers/2017-06_attention-is-all-you-need`: BERT is the Transformer encoder stack, transplanted to transfer learning
- `papers/2025-07_ettin`: modern controlled comparison of the encoder (BERT) and decoder (GPT) lineages using the ModernBERT recipe
- `papers/2020-05_gpt-3`: the rival unidirectional lineage; GPT-3 replaced fine-tuning with in-context learning, ending BERT-style per-task heads for generation tasks
- `papers/2020-05_rag`: RAG's dense retriever (DPR) is a pair of BERT encoders; retrieval and embeddings are BERT's main living habitat
- `papers/2021-04_roformer-rope`: RoPE replaced BERT's learned absolute positions in modern encoders (ModernBERT) as well as decoders
- Topics: `topics/llm-training-and-post-training` (pretraining objectives, transfer learning), `topics/rag-and-retrieval` (embeddings, rerankers), `topics/ml-fundamentals` (sequence-model history)
