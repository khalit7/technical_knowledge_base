# Research notes: SFT section (verified 2026-10-03)

Every item below was read from the source at the URL given (arXiv HTML, GitHub raw source, HF docs source). Quotes are verbatim. "Unconfirmed" means I looked and did not find it stated.

## 1. Tulu 3 (Lambert et al., arXiv 2411.15124), https://arxiv.org/html/2411.15124

### SFT data
- Final SFT mix size: **939,344 prompts** used in SFT (Table 7, column "# Prompts used in SFT", Total row: "Total | 23,327,961 | 939,344 | 425,145γ"; the three numbers are Count, # Prompts used in SFT, # Prompts used in DPO). Table 7 note: "all datasets were filtered to remove specific keywords (e.g., OpenAI) and empty messages, resulting in slightly lower than reported counts."
  - Cross-check: the released dataset `allenai/tulu-3-sft-mixture` has `num_examples: 939343` in its train split (HF datasets-server, https://datasets-server.huggingface.co/info?dataset=allenai/tulu-3-sft-mixture).
- Scaling the SFT data (Section 4.2, Figure 4): "We find that our models continue to improve on average as more SFT data is included ... Interestingly, TruthfulQA performance actually drops as the amount of data in the mix increases."

### SFT hyperparameters (Section 4.3, Table 11 "SFT Training Hyperparameters")
- Table 11: Learning Rate 5 x 10^-6 (8B), 2 x 10^-6 (70B); Schedule Linear; Batch Size (effective) 128; Max Token Length 4,096; Warm up ratio 0.03; Number of Epochs 2.
- Quote (4.3): "We used an effective batch size of 128 and a maximum sequence length of 4,096 tokens. We trained for two epochs using a learning rate of 5e-6 for our 8B models, and 2e-6 for our 70B models, which we found after a hyperparameter search."
- Quote (4.3): "The final 8B model is trained on 32 GPUs for 6 hours and the 70B model was trained on 64 GPUs for 50 hours."
- Epochs finding (4.3.2): "Surprisingly, we additionally found that training for longer did not yield further improvements, and so used 2 epochs for training." Figure 6 caption: "We find using 2 epochs works best."

### Loss only on assistant tokens
- The paper text does not state it (no "mask" in the SFT sections): **unconfirmed from the paper**. Confirmed from the code used for Tulu 3 (see item 2).

### Packing
- The paper does not mention packing for SFT: **unconfirmed from the paper**. The official Tulu 3 reproduction command (open-instruct `docs/tulu3.md` at commit ba11286, https://github.com/allenai/open-instruct/blob/ba11286e5b9eb00d4ce5b40ef4cac1389888416a/docs/tulu3.md) has no packing flag; it uses `PER_DEVICE_TRAIN_BATCH_SIZE=1`, `GRADIENT_ACCUMULATION_STEPS=2`, 64 processes, `--max_seq_length 4096`, `--learning_rate 5e-06`, `--num_train_epochs 2`, `--reduce_loss sum`, `--dataset_mixer_list allenai/tulu-3-sft-mixture 1.0`. The finetune.py at that commit collates with `DataCollatorForSeq2Seq(tokenizer=tokenizer, model=model, padding="longest")` (padding, not packing). Inference: Tulu 3 SFT did not pack. (Current open-instruct has a `packing` flag, see item 2.)

### Sum loss vs mean loss (Section 4.3.2 "Batch Aggregation")
- "Early during training Tülu 3, we noticed a gap in performance between SFT models trained on our Open-Instruct framework and models trained in other settings such as on TPUs."
- "We found this issue was largely due to a (recently widely-reported) issue with loss aggregation inside Transformers (Wolf et al., 2020): Averaging the loss across padding tokens without taking into account gradient accumulation or distributed training setups."
- "Assume we have two samples in a batch, with n1, n2 non-padding tokens and m1, m2 padding tokens. If we pass both samples into the default Transformers forward pass at the same time, we get: L = (l_n1 + l_n2) / (n1 + n2)" (Eq. 1)
- "However, if we apply gradient accumulation, feeding in the two samples separately, computing loss, and then dividing, our loss is instead computed like: L = (l_n1/n1 + l_n2/n2) / 2" (Eq. 2)
- "That is, in the second case we weight each example equally, while in the first we weight each token equally. As such, changing gradient accumulation can have large effects on performance due to effectively changing sample weightings, as reported by Muennighoff et al. (2024). A similar issue occurs in distributed training due to cross-device averaging."
- "To fix this issue, we opted generally to use a sum loss instead of averaging ('mean loss') when training. This removes the issue by simply removing the denominator from the above equations and requires an adjustment to learning rates. This effectively weights all tokens equally (which we found led to generally better performance for initial mixtures)."
- "Ultimately, we found that using a sum loss with a learning rate of 5.00E-06 worked best." Figure 5 caption: "We find that a LR of 5e-6 with a sum loss works best." (experiments: Llama 3.0 on the Tulu 2 SFT mixture).
- Footnoted references in the paper: https://unsloth.ai/blog/gradient and https://muellerzr.github.io/blog/gradient_accumulation_part2.html

### Chat template
- Paper, Section 4.3.1 "Chat Template Variation": "We made a small change to the chat template used in previous Tülu versions, specifically removing the new line at the end of the template (before the model response)." and "We found that replacing the newlines at the end of assistant messages with an eos token resulted in the best performance, but we opted not to use this to avoid generation inconsistency with later steps in our post-training pipeline."
- Table 13 (Avg.): Tülu (replace \n w/ eos) 53.0; Zephyr 52.9; Tülu 3 (no \n) 52.8; Tülu 2 template 52.6; Llama 3 template 51.6.
- Exact template: the arXiv HTML rendering of Appendix B.3 (Figure 27) is garbled (Jinja `{% %}` lines are cut). The exact template, taken from the released model's tokenizer config (https://huggingface.co/allenai/Llama-3.1-Tulu-3-8B/raw/main/tokenizer_config.json, `chat_template`, eos_token `<|end_of_text|>`):
  ```
  {% for message in messages %}{% if message['role'] == 'system' %}{{ '<|system|>\n' + message['content'] + '\n' }}{% elif message['role'] == 'user' %}{{ '<|user|>\n' + message['content'] + '\n' }}{% elif message['role'] == 'assistant' %}{% if not loop.last %}{{ '<|assistant|>\n'  + message['content'] + eos_token + '\n' }}{% else %}{{ '<|assistant|>\n'  + message['content'] + eos_token }}{% endif %}{% endif %}{% if loop.last and add_generation_prompt %}{{ '<|assistant|>\n' }}{% endif %}{% endfor %}
  ```
  Rendered example (one turn): `<|user|>\nWhat is 2+2?\n<|assistant|>\n4<|end_of_text|>`; a non-final assistant turn gets `<|end_of_text|>\n`. The visible fragments in Figure 27 of the paper match this (e.g. "{{ '<|assistant|>\n' + message['content'] + eos_token + '\n' }}").

### DPO variant (Section 5, Table 20)
- Standard DPO (Eq. in 5.1): max E[ log sigma( beta log(pi_theta(y_c|x)/pi_ref(y_c|x)) - beta log(pi_theta(y_r|x)/pi_ref(y_r|x)) ) ].
- "We find (in Section 5.4) that length-normalized DPO works best, which uses the following objective:" max E[ log sigma( (beta/|y_c|) log(pi_theta(y_c|x)/pi_ref(y_c|x)) - (beta/|y_r|) log(pi_theta(y_r|x)/pi_ref(y_r|x)) ) ].
- Table 20 "Final DPO Training Hyperparameters. We use the length-normalized variant of DPO proposed in Meng et al. (2024).": LR 5 x 10^-7 (8B), 2 x 10^-7 (70B); Linear; batch 128; Max Token Length 2,048; **KL penalty coefficient beta = 5** (both); warmup 0.1; 1 epoch. Reproduction command confirms `--dpo_loss_type dpo_norm --dpo_beta 5` (docs/tulu3.md at ba11286).
- "We explored using DPO, SimPO (Meng et al., 2024), and length-normalized DPO. ... We found that only length-normalized DPO outperformed our base checkpoint overall".
- "The 8B DPO model is trained for 10 hours on 8 Nvidia H100 GPUs and the 70B DPO model is trained for 19 hours on 64 interconnected H100s."
- Preference pairs: "Careful multi-skill selection of preference data yields 354,192 instances for preference tuning" (Section 1 summary). Table 15 Total row: "354,192 | 271,409 | 334,302" with columns Dataset | Count | 8B | 70B, i.e. 271,409 pairs in the 8B mix and 334,302 in the 70B mix (my reading of the column order; the paper text itself only gives 354,192).
- Binarization (5.2.1): GPT-4o-2024-0806 rates 4 responses on helpfulness, instruction-following, honesty, truthfulness; "take the highest-rated response as the chosen response and randomly sample from the responses with the lower mean as the rejected response."

### RLVR definition
- Section 1: "We refer to this algorithm as Reinforcement Learning with Verifiable Rewards (RLVR); it obtains a constant reward value if a completion is successful."
- Section 6: "In Tülu 3, we introduce Reinforcement Learning with Verifiable Rewards (RLVR), a novel method for training language models on tasks with verifiable outcomes such as mathematical problem-solving and instruction following. RLVR leverages the existing RLHF objective but replaces the reward model with a verification function".
- Objective: max E[R_RLVR(x,y)] = [ v(x,y) - beta KL[pi_theta(y|x) || pi_ref(y|x)] ]. "We set alpha=10 based on pilot experiments" (reward alpha if verifiably correct, else 0; Figure 18). Optimised with PPO.
- Paper itself notes precedents: "RLVR can be seen as a simplified form of existing approaches for bootstrapping LM reasoning (Zelikman et al., 2022; ...) or a simpler form of RL with execution feedback (Gehring et al., 2024)". So: Tulu 3 named it, not the first to do verifiable-reward RL.
- Final RLVR beta (Table 21 caption): "The final 8B RLVR model used beta=0.05 ... the final 70B RLVR model used beta=0.07".

### PPO vs DPO compute (Section 5.4)
- "PPO is More Computationally Expensive The PPO runtime is roughly 28 hours using two nodes, whereas the DPO runtime is about 4 hours using a single node."
- "PPO Gets Similar Average Scores with DPO in this Non-Tuned Setup ... PPO could reach a comparable level of performance to DPO (albeit slightly lower) in this controlled setup."
- "We decide to use PPO primarily for RLVR".

## 2. open-instruct SFT masking code (allenai/open-instruct)

### Code used for Tulu 3 (commit ba11286e5b9eb00d4ce5b40ef4cac1389888416a, the commit the current code cites as the origin)
- File: https://github.com/allenai/open-instruct/blob/ba11286e5b9eb00d4ce5b40ef4cac1389888416a/open_instruct/finetune.py , function `encode_sft_example` (line 385):
  ```python
  labels = input_ids.clone()
  # mask the non-assistant part for avoiding loss
  for message_idx, message in enumerate(messages):
      if message["role"] != "assistant":
          ...
              # for intermediate messages that follow with an assistant message, we need to
              # set `add_generation_prompt=True` to avoid the assistant generation prefix being included in the loss
              # (e.g., `<|assistant|>`)
          ...
          # set the label to -100 for the non-assistant part
          labels[:, message_start_idx:message_end_idx] = -100
  ```
  (line 404 comment, line 447 assignment). Note: system, user and the `<|assistant|>\n` header are masked; assistant content plus its eos are trained.
- Same file, sum loss (lines 268-272 and 913-929):
  ```python
  reduce_loss: str = field(default="mean", metadata={"help": "How to reduce loss over tokens. Options are 'mean' or 'sum'." "Using 'sum' can improve chat model performance."})
  ...
  # reduce loss is sum
  # this ensures that we weight all tokens in the dataset equally,
  # rather than weighting each overall example equally when
  # using high amounts of gradient accumulation.
  # this can result in > 5 point improvements in AlpacaEval
  # see https://github.com/huggingface/transformers/issues/24725 for
  # more discussion and details.
  ...
  loss_fct = torch.nn.CrossEntropyLoss(reduction="sum")
  ```
### Current main (commit 11826255077617a46919ce75cadf1f3d53f30dac)
- File: https://github.com/allenai/open-instruct/blob/main/open_instruct/dataset_transformation.py : `MASKED_TOKEN_VALUE = -100` (line 1085); function `mask_labels` docstring: "Mask spans in ``labels`` by setting them to -100. ``should_mask(message_idx, message, messages)`` is called for each message and should return True if that message's tokens should be masked (i.e. excluded from the loss)." and `labels[:, message_start_idx:message_end_idx] = MASKED_TOKEN_VALUE` (line 1366). `_sft_tulu_tokenize` docstring: "taken directly from https://github.com/allenai/open-instruct/blob/ba11286e.../open_instruct/finetune.py#L385". There is also `last_turn_tulu_tokenize_and_truncate_v1`: "Tokenize a conversation, training only on the final assistant turn." `sft_tulu_filter_v1` drops rows where every label is -100.
- Current finetune.py has a packing option: `packing` "Whether to use packing/padding-free collation via TensorDataCollatorWithFlattening" (line 324-326), else `DataCollatorForSeq2Seq(... padding="longest")`.

## 3. Hugging Face TRL SFTTrainer (v1.14.1, latest release; docs source identical on main)
Sources: https://huggingface.co/docs/trl/sft_trainer (source https://github.com/huggingface/trl/blob/main/docs/source/sft_trainer.md), SFTConfig https://github.com/huggingface/trl/blob/v1.14.1/trl/trainer/sft_config.py, packing docs https://huggingface.co/docs/trl/reducing_memory_usage#packing

- `completion_only_loss` (bool, optional, default None): "Whether to compute loss only on the completion part of the sequence. If set to `True`, loss is computed only on the completion, which is supported only for prompt-completion datasets. If `False`, loss is computed on the entire sequence. If `None` (default), the behavior depends on the dataset: loss is computed on the completion for prompt-completion datasets, and on the full sequence for language modeling datasets."
- `assistant_only_loss` (bool, default False): "Whether to compute loss only on the assistant part of the sequence. If set to `True`, loss is computed only on the assistant responses, which is supported only for conversational datasets. If `False`, loss is computed on the entire sequence."
  - Docs: "This functionality requires the chat template to include `{% generation %}` and `{% endgeneration %}` keywords. For known model families (e.g. Qwen3), TRL automatically patches the template when `assistant_only_loss=True`."
  - Docs: "Training on completion only is compatible with training on assistant messages only."
  - Implication: for a conversational (messages) dataset, the TRL default trains on the full sequence including user turns, unless `assistant_only_loss=True`.
- `packing` (bool, default False): "Whether to group multiple sequences into fixed-length blocks to improve computational efficiency and reduce padding. Uses `max_length` to define sequence length."
- `packing_strategy` (str, default "bfd"): "Strategy for packing sequences. Can be `"bfd"` (best-fit decreasing, truncates overflow), `"bfd_split"` (best-fit decreasing, splits overflow sequences), or `"wrapped"` (aggressive, cuts mid-sequence)." (`"bfd-requeue"` renamed to `"bfd_split"`, deprecated.)
  - Packing docs: "`"bfd"` (default): Uses Best-Fit Decreasing packing. If a sequence exceeds `max_length`, the overflow tokens are discarded." "`"bfd_split"`: ... long sequences are split into chunks <= `max_length` before packing. This preserves all tokens and follows the approach proposed in Fewer Truncations Improve Language Modeling." "`"wrapped"`: All tokens are concatenated into a stream and split into fixed-length blocks. This minimizes padding but may mix unrelated examples. ... It has the downside of breaking sequence continuity for a large fraction of the dataset, which hurts performance".
  - Packing docs tip: "This technique is available only for SFT training and setups that use FlashAttention (or its variants)."
- `padding_free` (bool, default False): "Whether to perform forward passes without padding by flattening all sequences in the batch into a single continuous sequence. This reduces memory usage by eliminating padding overhead. Currently, this is only supported with the FlashAttention 2 or 3, which can efficiently handle the flattened batch structure. When packing is enabled with strategy `"bfd"`, padding-free is enabled, regardless of the value of this parameter."
  - Code (trl/trainer/sft_trainer.py v1.14.1, line 1180): `self.padding_free = args.padding_free or (args.packing and args.packing_strategy in {"bfd", "bfd_split"})`. The collator builds `position_ids` that restart at 0 per packed sequence (`get_position_ids_from_packed_seq_lengths`, docstring example `'position_ids': tensor([[0, 1, 2, 0, 1]])`) and sets `output["labels"][output["position_ids"] == 0] = -100` (line 516), so the first token of each packed example is not predicted from the previous example.
- `max_length` default 1024 ("When packing is enabled, this value sets the sequence length."). `loss_type` default `"chunked_nll"` (same math as nll, lm_head computed only on non-ignored tokens).
- Docs, loss: "Padding tokens (if present) are ignored in the loss computation by applying an ignore index (default: `-100`) to the corresponding positions."

## 4. HF blog "Improving Hugging Face Training Efficiency Through Packing with Flash Attention 2" (Aug 21, 2024; IBM + HF authors)
URL: https://huggingface.co/blog/packing-with-FA2 (source https://github.com/huggingface/blog/blob/main/packing-with-FA2.md); paper: https://huggingface.co/papers/2407.09105
- TL;DR: "It can provide up to 2x improvement in training throughput while maintaining convergence quality."
- Problem: "previous implementations of packing did not consider example boundaries when using Flash Attention 2, resulting in undesired cross-example attention that reduce quality and convergence."
- Mechanism: "By selecting `DataCollatorWithFlattening`, Hugging Face `Trainer` users can now seamlessly concatenate sequences into a single tensor while accounting for sequence boundaries during Flash Attention 2 computations. This is achieved through the `flash_attn_varlen_func`, which calculates the cumulative sequence lengths in each mini-batch (`cu_seqlens`)." "the padding-free collator returns the `input_ids`, `labels`, and `position_ids` of each example." "The modifications required are lightweight and are limited to providing the `position_ids` to Flash Attention 2."
- Transformers docstring (https://github.com/huggingface/transformers/blob/main/src/transformers/data/data_collator.py, `DataCollatorWithFlattening`): "concatenates the entire mini batch into single long sequence of shape [1, total_tokens]"; "uses `separator_id` to separate sequences within the concatenated `labels`, default value is -100"; "no padding will be added"; `return_position_ids` "Whether to return `position_ids`, which restart at `position_ids_start` for every flattened sequence."
- Setup: "per-GPU average over 8 A100-80 GPU over one epoch of a 20K randomly selected sample from two different instruct tuning datasets, FLAN and OrcaMath."
- Throughput: FLAN "We see a 2x throughput increase on the models shown here: llama2-7B, mistral-7B, and granite-8B-code." OrcaMath: "a 1.4x increase in throughput when training using this form of packing on the OrcaMath dataset across these three models."
- Memory: "Peak memory is reduced by 20% on the FLAN dataset" and "Peak memory reduction is 6% on the OrcaMath dataset with its more homogeneous example lengths."
- Convergence: "the new feature, however, retains the minibatches and, hence, the same number of optimization steps as would be used with padded examples. Thus, there is no impact on train convergence".

## 5. Krell et al. 2021, "Efficient Sequence Packing without Cross-contamination" (arXiv 2107.02027), https://arxiv.org/html/2107.02027
- Abstract: "We show in this paper that the variation in sequence lengths in common NLP datasets is such that up to 50% of all tokens can be padding." "... confer a 2x speedup for phase 2 pre-training in BERT."
- Section 1: "We show that, even after this pre-processing, padding tokens represent 50% of all tokens of the Wikipedia pre-training dataset at sequence length 512. Thus, by avoiding processing the padding tokens one can get a 2x speed-up for phase 2."
- Section 2: "the sequence length 512 dataset contains 8.33 billion tokens, of which 4.17 billion are padding tokens." Theoretical speed-up: "At sequence length 128 ... around 1.2, at sequence length 384 this increases to 1.7, and finally at sequence length 512 ... it is 2.0." "Samples of length 512 represent only 23.5% of the dataset".
- Section 1: convergence of BERT large on the packed dataset "is equivalent to that on the un-packed dataset with 2x throughput increase on the Wikipedia sequence length 512 pre-training dataset."
- Cross-contamination: "we describe 'cross-contamination' (the cause of the accuracy reduction which separator tokens do not mitigate)" [original uses dashes around the parenthetical]; fixes: Section 3.2.1 "Adjust positional embeddings", 3.2.2 "Adjust attention masking".

## 6. Zhao et al. 2024, "Analysing The Impact of Sequence Composition on Language Model Pre-Training" (arXiv 2402.13991), https://arxiv.org/html/2402.13991
- Abstract: "we find that applying causal masking can lead to the inclusion of distracting information from previous documents during pre-training, which negatively impacts the performance of the models on language modelling and downstream tasks. In intra-document causal masking, the likelihood of each token is only conditioned on the previous tokens in the same document, eliminating potential distracting information from previous documents and significantly improving performance."
- Cost: "can significantly improve the performance of the model while increasing its runtime (+4% in our implementation, see Appendix A)." and "we observe a 4.0% efficiency degradation on intra-document causal masking in our implementation".
- Results: "IntraDoc achieves the lowest PPL compared to all models trained via causal masking." "IntraDoc obtains the best average accuracy in the 2K models and obtains the best scores in 5 of 6 tasks in the 8K models" (context utilisation).
- Packing by relatedness also helps causal masking: Bm25Chunk "can improve a model's language modelling (+6.8%), in-context learning (+11.6%), knowledge memorisation (+9.8%), and context utilisation (+7.2%) abilities using causal masking".
- Scale: "We pre-train 1.3B parameters models using context windows of 2,048 (referred to as 2K) and 8,192 (8K) tokens." on 150B SlimPajama tokens.
- Related (Llama 3, arXiv 2407.21783, Section 3.2): "We use an attention mask that prevents self-attention between different documents within the same sequence. We find that this change had limited impact during in standard pre-training, but find it to be important in continued pre-training on very long sequences."

## 7. Loss on prompt tokens
### Shi et al. 2024, "Instruction Tuning With Loss Over Instructions" (arXiv 2405.14394, NeurIPS 2024), https://arxiv.org/html/2405.14394
- Abstract: "we propose a simple yet effective method, Instruction Modelling (IM), which trains LMs by applying a loss function to the instruction and prompt part rather than solely to the output part. Through experiments across 21 diverse benchmarks, we show that, in many scenarios, IM can effectively improve the LM performance on both NLP tasks (e.g., MMLU, TruthfulQA, and HumanEval) and open-ended generation benchmarks (e.g., MT-Bench and AlpacaEval). Remarkably, in the most advantageous case, IM boosts model performance on AlpacaEval 1.0 by over 100%."
- Conditions: "We identify two key factors influencing the effectiveness of IM: (1) The ratio between instruction length and output length in the training data; and (2) The number of training examples. We observe that IM is especially beneficial when trained on datasets with lengthy instructions paired with brief outputs, or under the Superficial Alignment Hypothesis (SAH) where a small amount of training examples are used for instruction tuning."
- Mechanism: "our improvement can be attributed to reduced overfitting to instruction tuning datasets." Caveat: "we are not proposing IM as a replacement for current fine-tuning processes."
- IM loss excludes template tokens: "calculates the negative log-likelihood for both instruction and completion tokens, excluding any prompt template tokens."
- Models: "Llama-2-7B-Base and Llama-2-13B-Base, and the Opt-6.7B models."

### Huerta-Enochian and Ko 2024, "Instruction Fine-Tuning: Does Prompt Loss Matter?" (arXiv 2401.13586v4), https://arxiv.org/html/2401.13586
- Abstract: "We present a novel study analyzing the effects of various prompt loss token weights (PLW) for supervised instruction fine-tuning (SIFT). While prompt-masking (PLW = 0) is common for SIFT, some fine-tuning APIs support fractional PLWs and suggest that using a small non-zero PLW can help stabilize learning when fine-tuning on short-completion data. However, there has never been a study confirming this claim, and OpenAI, a major cloud-based SIFT provider, recently removed this parameter from their fine-tuning API. We found that performance of models fine-tuned on short-completion data had a statistically-significant negative quadratic relationship with PLW. Using small values (0.01-0.5) of PLW produced better results on multiple-choice and short-generation benchmarks (outperforming models fine-tuned on long-completion data) while large values (approx. 1.0) of PLW produced better results on long-generation benchmarks."
- Setup: "We fine-tune both LLaMA 1 7B ... to recreate the original Alpaca experiment and LLaMA 2 7B"; datasets AlpacaData, AlpacaDataCleaned, AlpacaDataShort. "PLW = 0.0 is identical to the masking used in the original Alpaca project, and PLW = 1.0 is equivalent to unmasked training."

## 8. LIMA (Zhou et al. 2023, arXiv 2305.11206), https://arxiv.org/html/2305.11206
- Abstract: "training LIMA, a 65B parameter LLaMa language model fine-tuned with the standard supervised loss on only 1,000 carefully curated prompts and responses, without any reinforcement learning or human preference modeling."
- Headline: "In a controlled human study, responses from LIMA are either equivalent or strictly preferred to GPT-4 in 43% of cases; this statistic is as high as 58% when compared to Bard and 65% versus DaVinci003, which was trained with human feedback."
- Superficial Alignment Hypothesis (Section 2): "A model's knowledge and capabilities are learnt almost entirely during pretraining, while alignment teaches it which subdistribution of formats should be used when interacting with users."
- Training (Section 3): special EOT token at end of each utterance; "we fine-tune for 15 epochs using AdamW"; "initial learning rate to 1e-5 and linearly decaying to 1e-6"; "We find that perplexity does not correlate with generation quality, and thus manually select checkpoints between the 5th and the 10th epochs using the held-out 50-example development set."

## 9. Llama 3 (arXiv 2407.21783), https://arxiv.org/html/2407.21783, Section 4.1
- Overall (Section 1): "we adopt a relatively simple post-training procedure based on supervised finetuning (SFT), rejection sampling (RS), and direct preference optimization (DPO ...) as opposed to more complex reinforcement learning algorithms ... that tend to be less stable and harder to scale."
- SFT loss masking (4.1.3): "we finetune the pre-trained language model using a standard cross entropy loss on the target tokens (while masking loss on prompt tokens)." "We refer to this stage as supervised finetuning ..., even though many of the training targets are model-generated." "Our largest models are finetuned with a learning rate of 10^-5 over the course of 8.5K to 9K steps."
- Rejection sampling (4.2.2): "for each prompt collected during human annotation (Section 4.2.1) we sample K (typically between 10 and 30) outputs from the latest chat model policy ... and use our reward model to select the best candidate". PagedAttention gives "a throughput improvement of over 2x during rejection sampling."
- DPO (4.1.4): "For Llama 3, we use a learning rate of 10^-5 and set the beta hyper-parameter to be 0.1." PPO was explored "but found that DPO required less compute for large-scale models and performed better, especially on instruction following benchmarks like IFEval".
  - "Masking out formatting tokens in DPO loss: We mask out special formatting tokens including header and termination tokens (described in Section 4.1.1) from both chosen and rejected responses in the loss to stabilize DPO training. ... may lead to undesired model behaviors such as tail repetition or abruptly generating termination tokens. We hypothesize that this is due to the contrastive nature of the DPO loss (the presence of common tokens in both chosen and rejected responses leads to a conflicting learning objective ...)" [original uses a dash before "the presence"].
  - "Regularization with NLL loss: We add an additional negative log-likelihood (NLL) loss term with a scaling coefficient of 0.2 on the chosen sequences, similar to Pang et al. (2024)."
- Rounds (4.1.6): "Following Llama 2, we apply the above methods in six rounds. In each cycle, we collect new preference annotations and SFT data, sampling synthetic data from the latest models."
- Model averaging (4.1.5): "we average models obtained from experiments using various versions of data or hyperparameters at each RM, SFT, or DPO stage".

## 10. InstructGPT (Ouyang et al. 2022, arXiv 2203.02155), https://arxiv.org/html/2203.02155
- Section 3.2/3.3: "The SFT dataset contains about 13k training prompts (from the API and labeler-written), the RM dataset has 33k training prompts (from the API and labeler-written), and the PPO dataset has 31k training prompts (only from the API)."
- Table 6 (Appendix A.3), SFT train: labeler 11,295 + customer 1,430 (= 12,725); SFT valid: labeler 1,550 + customer 103.
- Section 3.5 "Supervised fine-tuning (SFT)": "We trained for 16 epochs, using a cosine learning rate decay, and residual dropout of 0.2. We do our final SFT model selection based on the RM score on the validation set. Similarly to Wu et al., (2021), we find that our SFT models overfit on validation loss after 1 epoch; however, we find that training for more epochs helps both the RM score and human preference ratings, despite this overfitting."
- Appendix C.1: "For our 1.3B and 6B models, we use an LR of 9.65e-6 and a batch size of 32. For 175B, we use a LR of 5.03e-6 and a batch size of 8."
- Note: the PPO init models are a different SFT: "apply supervised fine-tuning for 2 epochs on the demonstration dataset. We also mix in 10% pretraining data" (Appendix C).

## Unconfirmed / caveats
- Tulu 3 paper does not itself state assistant-only loss or no-packing; both rest on the open-instruct code and reproduction command at commit ba11286 (item 2).
- Table 15 per-model preference counts (271,409 for 8B, 334,302 for 70B) rely on my reading of the flattened table's column order.
