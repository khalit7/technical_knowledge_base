# LLM Modules: visualisation ideas

What the text needs to be understood: (1) what the model actually is, from the code (where the cross-attention sits, what is frozen, what is random, what runs at inference); (2) why a cross-attention without a causal mask makes the training and validation loss meaningless; (3) what the evidence consists of (two prompts, eleven transcripts); (4) what the training data really were once the code's filters, cut and reshuffle are applied; (5) whether the idea works at all when done correctly, and against what.

Scores: teaching value (T), faithfulness to sources (F), interactivity worth (I), each 1 to 5.

## Built

| id | Idea | Where | T | F | I | Data and formula |
|---|---|---|---|---|---|---|
| P-llm_modules.1 | **The leak, before and after**: one held-out trace teacher-forced through the released mask and the causal one; real cross-attention weights of the trained toy drawn as lines from each query to every frozen state, later states in red; 8 steps from an unknowable operand to the answer step, then the same step at generation time when the future does not exist; counters for weight on later states and probability of the right token | Reading, The leak (with a predict question) | 5 | 5 | 4 | `parts/26_js_leak.js` runs `LM.run` live; problem chosen at load as the first held-out sum the fixed model gets right and the released one does not (said in the caption) |
| P-llm_modules.2 | **The model as the code builds it**: a clickable data-flow diagram, each box with its model.py lines and recounted parameters; shows the cross-attention in front of GPT-Neo, both of its inputs made from Qwen2, the unused embeddings and the 116.5M output layer | Reading, Idea | 5 | 5 | 3 | configs plus `recompute.py` |
| P-llm_modules.3 | **What runs at inference** (predict question): trained 0.22B, Qwen2 alone 1.54B, the pair 1.76B | Reading, Idea | 4 | 5 | 2 | `recompute.py`; checked against the 7,207,536,191-byte checkpoint (fp32, within 0.003%) |
| P-llm_modules.4 | **Transcripts graded**: Table 1 as printed, then all eleven released responses with prompt format, excerpt and a grade (answer, reasoning, markers); exposes the one-sample evaluation, the prompt given to one model only, differing templates | Evidence tab | 4 | 5 | 3 | `inputs/compare-responses-from-models.md` (MIT) |
| P-llm_modules.5 | **Data audit**: rows dropped, rows cut at 2,048, loss-token shares (system prompt 13%) | Evidence tab; tiles in Reading | 4 | 5 | 2 | `stratos_stats.py` over the dataset with Qwen2's tokenizer, mirroring prepare_dataset |
| P-llm_modules.6 | **Validation overlap by scenario**: slider for the first epoch with validation loss below 1.8; line of the share of each epoch's validation set trained on earlier | Evidence tab | 4 | 4 | 4 | the code's reshuffle rule replayed with numpy default_rng(seed).permutation; the start epoch is unknown, hence the slider |
| P-llm_modules.7 | **Toy: ask the modules**: pick a problem; the frozen model's brief answer, both shipped bridges' free-running traces coloured against the reference | Run tab | 5 | 5 | 5 | live forward pass |
| P-llm_modules.8 | **Toy: look inside**: cross-attention heatmap with later cells in red, the selected position's teacher-forced top 3 and with the future scrambled, the gate | Run tab | 4 | 5 | 4 | live |
| P-llm_modules.9 | **Toy results, 6 variants × 3 seeds**, logged curves, in-browser test | Run tab; table in Reading | 4 | 5 | 3 | `model/results.json` |
| P-llm_modules.10 | **The context claim, side by side**: paper 128K, blog 125k, Qwen2 blog 32K, config 131,072, code 2,048 | Evidence tab | 3 | 5 | 1 | conflicting primary sources shown together |
| P-llm_modules.11 | **The family table**: Flamingo, CALM, adapters, distillation against this paper: what is frozen, what is trained, who generates, gate start, how evaluated | Reading, Why it matters | 4 | 5 | 1 | each paper's own section |

## Rejected

- **Then and now tab**: a 2025 preprint with no descendants; the family it belongs to fits in one table.
- **Running the released checkpoint**: 7.2 GB behind an access request, 1.76B parameters; would answer how much the real run used the leak, but not in a page and not in this budget. The page says it is unmeasured.
- **Rebuilding the loss curve**: the paper gives three numbers (13.8, 2.3, 1.1) and no curve; plotting three points would add nothing to the sentence.
- **A distillation simulator** (student trained on teacher logits beside the pair): the toy's fine-tuned-frozen-model variant already is the like-for-like distillation control (supervised fine-tuning on teacher traces is what DeepSeek's distilled models are).

## Inspiration

- The DeepSeek MLA explainer (this KB): one input, two methods, same scale, counters; here the two "methods" are the released mask and the fixed one.
- Constitutional AI and InstructGPT pages (this KB): when released outputs exist, grade them rather than trust the summary table.

## What the methodology lacked for this page

A rule for **reading the released code before trusting the paper's description**. Here the code changes the paper's meaning in four places (where the cross-attention sits, a randomly initialised "GPT-Neo-125M", the missing causal mask, the 2,048-token cut), and the most important finding (the leak) is visible only in the code. Proposed rule: when code is released, list every place where code and text disagree, and test the one that most affects the evidence in the toy.
