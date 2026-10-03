# Sources: Defaults across models (tab t-defaults)

Read 2026-10-03. Authoring source: `rows.py` (writes `../data/defaults.json`); `mk_defaults.py` validates and inlines it; `recompute.py` recomputes every derived cell and checks cited config values against `inputs/` (58 checks); `check_defaults.mjs` clicks every control at 390 dark and 920 light. Verbatim extracts of the non-arXiv and code sources are in `inputs/extracts.txt`; the arXiv papers were read through the repo paper pages (`technical_knowledge_base/reference/papers/*/src/inputs/paper_v*.txt`) where they exist, and fetched from arXiv HTML otherwise.

Rules applied: one checkpoint per row, never spliced; release config.json files are used for architecture only (activation, widths, norm epsilon), never for training values; training configs published by the lab (OLMo 2, SmolLM3) and released training code (BERT) count as published; "inherited" only where the paper names the predecessor it follows.

## AlexNet (U. Toronto, 2012-12-03)
Report: [ImageNet Classification with Deep Convolutional Neural Networks](https://papers.nips.cc/paper_files/paper/2012/file/c399862d3b9d6b76c8436e924a68c45b-Paper.pdf)
- [AlexNet paper, section 3](https://papers.nips.cc/paper_files/paper/2012/file/c399862d3b9d6b76c8436e924a68c45b-Paper.pdf), 2012-12-03: act, norm, place, neps
- [AlexNet paper, section 5](https://papers.nips.cc/paper_files/paper/2012/file/c399862d3b9d6b76c8436e924a68c45b-Paper.pdf), 2012-12-03: init, istd, opt, betas, lr, warm, sched, fin, wd, batch
- [AlexNet paper, section 4.2](https://papers.nips.cc/paper_files/paper/2012/file/c399862d3b9d6b76c8436e924a68c45b-Paper.pdf), 2012-12-03: drop
- Not disclosed: clip, loss, prec

## ResNet-50 (Microsoft Research, 2015-12-10)
Report: [Deep Residual Learning for Image Recognition](https://arxiv.org/abs/1512.03385)
- [ResNet paper, section 3.2](https://arxiv.org/html/1512.03385v1#S3.SS2), 2015-12-10: act
- [ResNet paper, section 3.4](https://arxiv.org/html/1512.03385v1#S3.SS4), 2015-12-10: norm, place, init, istd, opt, betas, lr, warm, sched, wd, drop, batch
- Not disclosed: neps, fin, clip, loss, prec

## Transformer (base) (Google, 2017-06-12)
Report: [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [Transformer paper, section 3.3](https://arxiv.org/html/1706.03762v7#S3.SS3), 2017-06-12: act, ffn
- [Transformer paper, section 3.1](https://arxiv.org/html/1706.03762v7#S3.SS1), 2017-06-12: norm, place
- [Transformer paper, section 5.3](https://arxiv.org/html/1706.03762v7#S5.SS3), 2017-06-12: opt, betas, oeps, lr, warm, sched, fin
- [Transformer paper, section 5.4](https://arxiv.org/html/1706.03762v7#S5.SS4), 2017-06-12: drop, loss
- [Transformer paper, section 5.1](https://arxiv.org/html/1706.03762v7#S5.SS1), 2017-06-12: batch
- Not disclosed: neps, init, istd, wd, clip, prec

## GPT (OpenAI, 2018-06-11)
Report: [Improving Language Understanding by Generative Pre-Training](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf)
- [GPT paper, section 4.1](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf), 2018-06-11: act, ffn, norm, init, istd, opt, lr, warm, sched, fin, wd, drop, loss, batch
- [Transformer paper, section 3.1 (GPT follows its decoder)](https://arxiv.org/html/1706.03762v7#S3.SS1), 2017-06-12: place
- Not disclosed: neps, betas, oeps, clip, prec

## BERT-Large (Google, 2018-10-11)
Report: [BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding](https://arxiv.org/abs/1810.04805)
- [BERT paper, appendix A.2](https://arxiv.org/html/1810.04805v2#A1.SS2), 2018-10-11: act, betas, lr, warm, sched, drop, loss, batch
- [bert-large-uncased config.json](https://huggingface.co/google-bert/bert-large-uncased/blob/main/config.json), 2018-10-31: ffn, norm, neps, init, istd
- [BERT paper, section 3 (the original Transformer encoder)](https://arxiv.org/html/1810.04805v2#S3), 2018-10-11: place
- [BERT official code, optimization.py](https://github.com/google-research/bert/blob/master/optimization.py), 2018-10-31: opt, oeps, fin, wd, clip
- Not disclosed: prec

## GPT-2 1.5B (OpenAI, 2019-02-14)
Report: [Language Models are Unsupervised Multitask Learners](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf)
- [GPT-2 released code, model.py](https://github.com/openai/gpt-2/blob/master/src/model.py), 2019-02-14: act, ffn, neps, istd
- [GPT-2 paper, section 2.3](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf), 2019-02-14: norm, place, init, batch
- [GPT paper, section 4.1 (GPT-2 "largely follows" GPT)](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf), 2018-06-11: opt
- [gpt2-xl config.json (Hugging Face port)](https://huggingface.co/openai-community/gpt2-xl/blob/main/config.json), 2019-11-05: drop
- Not disclosed: betas, oeps, lr, warm, sched, fin, wd, clip, loss, prec

## T5-11B (Google, 2019-10-23)
Report: [Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer](https://arxiv.org/abs/1910.10683)
- [T5 paper, section 3.1.1](https://arxiv.org/html/1910.10683v4#S3.SS1.SSS1), 2019-10-23: act, drop
- [t5-11b config.json](https://huggingface.co/google-t5/t5-11b/blob/main/config.json), 2019-10-23: ffn, neps
- [T5 paper, section 2.1](https://arxiv.org/html/1910.10683v4#S2.SS1), 2019-10-23: norm, place
- [T5 paper, section 3.1.2](https://arxiv.org/html/1910.10683v4#S3.SS1.SSS2), 2019-10-23: opt, lr, warm, sched, fin
- [Mesh TensorFlow transformer.py (Unitransformer)](https://github.com/tensorflow/mesh/blob/master/mesh_tensorflow/transformer/transformer.py), 2019-10-23: loss
- [T5 paper, section 3.7](https://arxiv.org/html/1910.10683v4#S3.SS7), 2019-10-23: batch
- Not disclosed: init, istd, wd, clip, prec

## GPT-3 175B (OpenAI, 2020-05-28)
Report: [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165)
- [GPT-2 paper, section 2.3 (GPT-3 uses "the same model and architecture as GPT-2")](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf), 2019-02-14: act, norm, init
- [GPT-3 paper, Table 2.1](https://arxiv.org/html/2005.14165v4#S2.T1), 2020-05-28: ffn, lr, batch
- [GPT-3 paper, section 2.1](https://arxiv.org/html/2005.14165v4#S2.SS1), 2020-05-28: place
- [GPT-3 paper, appendix B](https://arxiv.org/html/2005.14165v4#A2), 2020-05-28: opt, betas, oeps, warm, sched, fin, wd, clip
- [GPT-3 paper, author contributions](https://arxiv.org/html/2005.14165v4), 2020-05-28: prec
- Not disclosed: neps, istd, drop, loss

## ViT-H/14 (JFT) (Google, 2020-10-22)
Report: [An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale](https://arxiv.org/abs/2010.11929)
- [ViT paper, section 3.1](https://arxiv.org/html/2010.11929v2#S3.SS1), 2020-10-22: act, norm, place
- [ViT paper, Table 1](https://arxiv.org/html/2010.11929v2#S4.T1), 2020-10-22: ffn
- [ViT official code, models_vit.py](https://github.com/google-research/vision_transformer/blob/main/vit_jax/models_vit.py), 2020-10-22: neps, init, istd
- [ViT paper, section 4.1](https://arxiv.org/html/2010.11929v2#S4.SS1), 2020-10-22: opt, betas
- [ViT paper, Table 3](https://arxiv.org/html/2010.11929v2#A2.T3), 2020-10-22: lr, warm, sched, wd, drop, clip, batch
- Not disclosed: oeps, fin, loss, prec

## CLIP ViT-L/14 (OpenAI, 2021-02-26)
Report: [Learning Transferable Visual Models From Natural Language Supervision](https://arxiv.org/abs/2103.00020)
- [CLIP official code, model.py](https://github.com/openai/CLIP/blob/main/clip/model.py), 2021-01-05: act, ffn, norm, place, init, istd
- [clip-vit-large-patch14 config.json](https://huggingface.co/openai/clip-vit-large-patch14/blob/main/config.json), 2021-01-05: neps
- [CLIP paper, section 2.5](https://arxiv.org/html/2103.00020v1#S2.SS5), 2021-02-26: opt, sched, loss, prec
- [CLIP paper, Tables 18 and 20](https://arxiv.org/html/2103.00020v1#A6), 2021-02-26: betas, oeps, lr, warm, wd, batch
- Not disclosed: fin, drop, clip

## Chinchilla 70B (DeepMind, 2022-03-29)
Report: [Training Compute-Optimal Large Language Models](https://arxiv.org/abs/2203.15556)
- [Gopher paper, section 3.1 (Chinchilla keeps Gopher's architecture)](https://arxiv.org/html/2112.11446v2#S3.SS1), 2021-12-08: act, norm, place
- [Chinchilla paper, Table 4](https://arxiv.org/html/2203.15556v1#S4.T4), 2022-03-29: ffn, lr, batch
- [Chinchilla paper, section 4.1](https://arxiv.org/html/2203.15556v1#S4.SS1), 2022-03-29: opt, prec
- [Gopher paper, section 3.2 (Chinchilla keeps Gopher's setup)](https://arxiv.org/html/2112.11446v2#S3.SS2), 2021-12-08: warm, clip
- [Chinchilla paper, appendix B](https://arxiv.org/html/2203.15556v1#A2), 2022-03-29: sched, fin
- Not disclosed: neps, init, istd, betas, oeps, wd, drop, loss

## LLaMA 65B (Meta, 2023-02-27)
Report: [LLaMA: Open and Efficient Foundation Language Models](https://arxiv.org/abs/2302.13971)
- [LLaMA paper, section 2.2](https://arxiv.org/html/2302.13971v1#S2.SS2), 2023-02-27: act, norm, place
- [llama-65b config.json (community conversion)](https://huggingface.co/huggyllama/llama-65b/blob/main/config.json), 2023-04-05: ffn, neps
- [LLaMA paper, section 2.3 and Table 2](https://arxiv.org/html/2302.13971v1#S2.SS3), 2023-02-27: opt, betas, lr, warm, sched, fin, wd, clip, batch
- Not disclosed: init, istd, oeps, drop, loss, prec

## Llama 2 70B (Meta, 2023-07-18)
Report: [Llama 2: Open Foundation and Fine-Tuned Chat Models](https://arxiv.org/abs/2307.09288)
- [Llama 2 paper, section 2.2 and Table 1](https://arxiv.org/html/2307.09288v2#S2.SS2), 2023-07-18: act, norm, place, opt, betas, oeps, lr, warm, sched, fin, wd, clip, batch
- [Llama-2-70b-hf config.json (mirror of the gated Meta repo)](https://huggingface.co/NousResearch/Llama-2-70b-hf/blob/main/config.json), 2023-07-18: ffn, neps
- Not disclosed: init, istd, drop, loss, prec

## Mistral 7B (Mistral AI, 2023-10-10)
Report: [Mistral 7B](https://arxiv.org/abs/2310.06825)
- [Mistral-7B-v0.1 config.json](https://huggingface.co/mistralai/Mistral-7B-v0.1/blob/main/config.json), 2023-09-27: act, ffn, norm, place, neps
- Not disclosed: init, istd, opt, betas, oeps, lr, warm, sched, fin, wd, drop, clip, loss, batch, prec

## Llama 3.1 405B (Meta, 2024-07-23)
Report: [The Llama 3 Herd of Models](https://arxiv.org/abs/2407.21783)
- [Llama 3 paper, Table 3](https://arxiv.org/html/2407.21783v3#S3.T3), 2024-07-23: act, ffn
- [Llama 3.1 405B config.json (mirror of the gated Meta repo)](https://huggingface.co/unsloth/Meta-Llama-3.1-405B-bnb-4bit/blob/main/config.json), 2024-07-23: norm, neps
- [Llama 2 paper, section 2.2 and Table 1](https://arxiv.org/html/2307.09288v2#S2.SS2), 2023-07-18: place
- [Llama 3 paper, section 3.4.1](https://arxiv.org/html/2407.21783v3#S3.SS4.SSS1), 2024-07-23: opt, lr, warm, sched, batch
- [Llama 3 paper, section 3.4.3](https://arxiv.org/html/2407.21783v3#S3.SS4.SSS3), 2024-07-23: fin
- [Llama 3 paper, section 3.3.2](https://arxiv.org/html/2407.21783v3#S3.SS3.SSS2), 2024-07-23: prec
- Not disclosed: init, istd, betas, oeps, wd, drop, clip, loss

## OLMo 2 7B (Ai2, 2024-11-26)
Report: [2 OLMo 2 Furious](https://arxiv.org/abs/2501.00656)
- [OLMo 2 paper, Table 1](https://arxiv.org/html/2501.00656v3#S2.T1), 2024-11-26: act, norm, loss
- [OLMo 2 paper, section 2.1](https://arxiv.org/html/2501.00656v3#S2.SS1), 2024-11-26: ffn, place
- [OLMo 2 7B official training config, stage 1](https://github.com/allenai/OLMo/blob/main/configs/official-1124/OLMo2-7B-stage1.yaml), 2024-11-26: neps, opt, betas, wd, drop, prec
- [OLMo 2 paper, section 3.2](https://arxiv.org/html/2501.00656v3#S3.SS2), 2024-11-26: init, istd
- [OLMo 2 paper, section 3.4](https://arxiv.org/html/2501.00656v3#S3.SS4), 2024-11-26: oeps
- [OLMo 2 paper, Table 3](https://arxiv.org/html/2501.00656v3#S2.T3), 2024-11-26: lr, warm, sched, clip, batch
- [OLMo 2 7B official training config, stage 2](https://github.com/allenai/OLMo/blob/main/configs/official-1124/OLMo2-7B-stage2-seed42.yaml), 2024-11-26: fin
- Not disclosed: none

## DeepSeek-V3 (DeepSeek, 2024-12-26)
Report: [DeepSeek-V3 Technical Report](https://arxiv.org/abs/2412.19437)
- [DeepSeek-V3-Base config.json](https://huggingface.co/deepseek-ai/DeepSeek-V3-Base/blob/main/config.json), 2024-12-26: act, place, neps
- [DeepSeek-V3 report, section 4.2 (model hyper-parameters)](https://arxiv.org/html/2412.19437v2#S4.SS2), 2024-12-26: ffn, norm, init, istd
- [DeepSeek-V3 report, section 4.2 (training hyper-parameters)](https://arxiv.org/html/2412.19437v2#S4.SS2), 2024-12-26: opt, betas, lr, warm, sched, fin, wd, clip, loss, batch
- [DeepSeek-V3 report, section 3.3](https://arxiv.org/html/2412.19437v2#S3.SS3), 2024-12-26: prec
- Not disclosed: oeps, drop

## Gemma 3 27B (Google DeepMind, 2025-03-12)
Report: [Gemma 3 Technical Report](https://arxiv.org/abs/2503.19786)
- [gemma-3-27b-pt config.json (mirror of the gated Google repo)](https://huggingface.co/unsloth/gemma-3-27b-pt/blob/main/config.json), 2025-03-12: act, ffn, neps
- [Gemma 3 report, section 2](https://arxiv.org/html/2503.19786v1#S2), 2025-03-12: norm, place
- [Gemma 3 report, section 2 (distillation)](https://arxiv.org/html/2503.19786v1#S2), 2025-03-12: loss
- Not disclosed: init, istd, opt, betas, oeps, lr, warm, sched, fin, wd, drop, clip, batch, prec

## Qwen3-235B-A22B (Alibaba Qwen, 2025-04-29)
Report: [Qwen3 Technical Report](https://arxiv.org/abs/2505.09388)
- [Qwen3 report, section 2](https://arxiv.org/html/2505.09388v1#S2), 2025-05-14: act, norm, place, loss
- [Qwen3-235B-A22B config.json](https://huggingface.co/Qwen/Qwen3-235B-A22B/blob/main/config.json), 2025-04-29: ffn, neps
- Not disclosed: init, istd, opt, betas, oeps, lr, warm, sched, fin, wd, drop, clip, batch, prec

## Kimi K2 (Moonshot AI, 2025-07-11)
Report: [Kimi K2: Open Agentic Intelligence](https://arxiv.org/abs/2507.20534)
- [Kimi-K2-Base config.json](https://huggingface.co/moonshotai/Kimi-K2-Base/blob/main/config.json), 2025-07-11: act, ffn, norm, place, neps
- [Kimi K2 report, section 2.1 and Algorithm 1](https://arxiv.org/html/2507.20534v1#S2.SS1), 2025-07-28: opt, clip
- [Kimi K2 report, section 2.5](https://arxiv.org/html/2507.20534v1#S2.SS5), 2025-07-28: lr, warm, sched, fin, wd, batch
- [Kimi K2 report, section 2.4](https://arxiv.org/html/2507.20534v1#S2.SS4), 2025-07-28: prec
- Not disclosed: init, istd, betas, drop, loss

## SmolLM3 3B (Hugging Face, 2025-07-08)
Report: [SmolLM3: smol, multilingual, long-context reasoner](https://huggingface.co/blog/smollm3)
- [SmolLM3 official training config, stage 1](https://github.com/huggingface/smollm/blob/main/text/pretraining/smollm3/stage1_8T.yaml), 2025-07-08: act, ffn, norm, neps, init, istd, betas, oeps, fin, drop, loss, prec
- [SmolLM3 blog, Pretraining](https://huggingface.co/blog/smollm3), 2025-07-08: place, opt, lr, warm, sched, wd, clip, batch
- Not disclosed: none

## Corrections shown on the tab
- **AdamW became the default with the LLMs of 2020 to 2023**: GPT (June 2018) already used Adam with "a modified version of L2 regularization" citing Loshchilov and Hutter, and BERT's released optimiser (October 2018) decays weights outside Adam's moments, though BERT's paper calls it "L2 weight decay". ([source](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf))
- **Learning-rate warmup was introduced by the Transformer**: ResNet (December 2015) trained its 110-layer CIFAR-10 net at 0.01 until training error fell below 80% (about 400 iterations), then switched to 0.1. ([source](https://arxiv.org/html/1512.03385v1#S4.SS2))
- **z-loss started with PaLM**: Mesh TensorFlow, the code T5 trained with in 2019, defaults to z_loss = 1e-4 (unconfirmed whether T5's runs kept it; the paper is silent). OLMo 2 cites PaLM, Chameleon and Wortsman et al. for it. ([source](https://github.com/tensorflow/mesh/blob/master/mesh_tensorflow/transformer/transformer.py))
- **A model's config.json tells you how it was initialised**: DeepSeek-V3's report says every parameter was drawn with std 0.006; its config.json says initializer_range 0.02. The config describes loading the checkpoint, not the run. ([source](https://arxiv.org/html/2412.19437v2#S4.SS2))
- **The FFN is 4 x d_model**: Only for ungated FFNs, and not always then: T5-11B uses 65,536 / 1,024 = 64x; SwiGLU models use 2.7x to 5.4x; Gemma 3 runs a gated FFN at 4x, which is 1.5 times the parameters of a plain 4x block. ([source](https://huggingface.co/google-t5/t5-11b/blob/main/config.json))
- **Llama 3 decays its learning rate to 10% of the peak**: The 405B decays by cosine to 8e-7, 1% of its 8e-5 peak, then linearly to 0 over the last 40M tokens. The 10% figure belongs to the scaling-law runs. ([source](https://arxiv.org/html/2407.21783v3#S3.SS4.SSS1))
- **Llama 3 405B used batches of 8M sequences**: The report's phrase "a batch size of 8M sequences of 8,192 tokens" would be 65.5 billion tokens per step, 8,192 times too many; it means 8M tokens, the 4M batch doubled. ([source](https://arxiv.org/html/2407.21783v3#S3.SS4.SSS1))
- **T5's learning rate decays exponentially**: The paper's words say "exponentially decays"; its formula, 1/sqrt(max(n, 10^4)), is an inverse square root, which at 1M steps is still 10% of the peak. ([source](https://arxiv.org/html/1910.10683v4#S3.SS1.SSS2))
- **OLMo 2 is pre-norm like Llama**: OLMo 2 normalises the output of each attention and MLP branch before adding it to the residual stream; the stream itself is never normalised inside a block. ([source](https://arxiv.org/html/2501.00656v3#S2.SS1))
- **Gemma 3 soft-caps its logits like Gemma 2**: Gemma 3 replaced soft-capping with QK-norm; final_logit_softcapping and attn_logit_softcapping are unset in its config. ([source](https://arxiv.org/html/2503.19786v1#S2))
- **SmolLM3 trains with z-loss (reading its config)**: The config sets z_loss_coefficient 1e-5 but z_loss_enabled false. ([source](https://github.com/huggingface/smollm/blob/main/text/pretraining/smollm3/stage1_8T.yaml))
- **BERT used standard Adam**: BERT's released AdamWeightDecayOptimizer has decoupled decay, epsilon 1e-6 and no bias correction of m and v. ([source](https://github.com/google-research/bert/blob/master/optimization.py))
- **Adam's epsilon is a harmless constant**: OLMo 2 lowered it from 1e-5 (Llama 2's value) to 1e-8 and saw a lower, steadier gradient norm early in training and faster loss improvement. ([source](https://arxiv.org/html/2501.00656v3#S3.SS4))
