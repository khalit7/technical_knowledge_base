# Ai2: OLMo (fully open models)

⏱ 8 min read · +3h 25m resources

Last updated: 2026-08-31 (explanation rewrite; map first written 2026-08-24). Per-model pages to follow; this page explains the family.

## Best resources

- [OLMo 2 paper](https://arxiv.org/abs/2501.00656) (1h 30m, long report) and repo summary: the fully open training-science reference.
- [Olmo 3 blog (Ai2)](https://allenai.org/blog/olmo3) (~30 min): the "model flow" release: data, code, every checkpoint, logs.
- [Interconnects: Olmo 3, America's truly open reasoning models](https://www.interconnects.ai/p/olmo-3-americas-truly-open-reasoning) (~20 min): insider context from the team.
- [Ettin paper](https://arxiv.org/abs/2507.11412) (45 min): paired encoder/decoder suite trained on the OLMo 2 recipe; the cleanest encoder-vs-decoder controlled comparison.
- [Ai2 HuggingFace org](https://huggingface.co/allenai) (weights, datasets and tooling, ~20 min for the entry pages): all weights, data (Dolma), and tooling.

## What "fully open" actually means here

"Open weights" and "open source" are used interchangeably in the industry and they are not remotely the same thing. A typical open-weights release (Llama, Qwen, Mistral, DeepSeek) gives you one artefact: the final parameter tensors, plus a model card and a table of scores. Everything that produced those tensors stays inside the lab. OLMo is the only frontier-adjacent line that releases the production process rather than the product, and it is worth being precise about which specific items that adds, because each one unlocks a different kind of research that is simply impossible otherwise.

What Ai2 ships that others withhold:

- **The pretraining corpus itself (Dolma)**, as downloadable documents, not a description of it. Along with the **data tooling**: the deduplication, quality-filtering, decontamination and tokenisation pipeline that turned raw crawl into that corpus, so the corpus can be rebuilt or varied rather than merely inspected.
- **The exact data mixture and the order it was fed in**, meaning the proportions of each source and the curriculum across stages. Two models with identical architectures and different mixtures are different models, and the mixture is the part labs guard hardest.
- **The training code and full configs**, so a run can be reproduced rather than approximated from a paper's hyperparameter table.
- **Intermediate checkpoints across the whole run**, not just the final one. This is the single most valuable item on the list and the rarest.
- **Training logs**: loss curves, spikes, restarts, and what was changed when. The failures are as informative as the final number and are almost never published.
- **The post-training stack (Tulu, later Dolci)**: the actual SFT datasets, preference data, RL prompt sets and the recipe code, not a paragraph describing them.

Why each of those matters if you do research rather than just inference:

- **Causal claims about data need the data.** Any statement of the form "this capability comes from that data source" is untestable against a closed corpus. With Dolma you can ablate a source, retrain at small scale, and measure.
- **Checkpoints turn training into an observable process.** With a series of intermediate checkpoints you can study when a capability appears, when memorisation of a specific document begins, how representations reorganise, and you can intervene mid-run (fork at step N, change the mixture, compare) instead of only studying the finished model.
- **Contamination becomes checkable.** If you cannot search the training corpus, every benchmark number is unfalsifiable in principle. Here you can grep for the eval set.
- **Interventions get a real control.** To claim an RL algorithm or a data recipe helps, you need to hold the base model, its data and its exact checkpoint fixed. A fork of a released OLMo checkpoint with the released mixture is a controlled experiment; fine-tuning someone's closed-corpus weights is not.
- **Auditable provenance for regulated deployment.** A government or healthcare buyer who must answer "what is in this model" has an answer here and nowhere else.

The trade is that this transparency has a price in capability: publishing your corpus means you cannot use data you have no clear right to publish, and that constraint alone puts a ceiling on OLMo relative to labs that train on whatever they can reach. Treat the family as the reference stack for understanding how models are trained, and as the base for reproducible research (Ettin, the ladder-scaling studies), rather than as the model you would serve for its raw scores.

## Lineage

- **OLMo 1 (Feb 2024)**: first genuinely fully open 7B, and the release that established **Dolma**, a 3T-token open pretraining corpus shipped with its own construction toolkit. Dolma is arguably the more important artefact: it made "here is exactly what the model read" a thing that could exist.
- **OLMoE (2024)**: a fully open sparse mixture-of-experts model at roughly 1B active parameters, so the MoE design space (router behaviour, expert specialisation, load balancing) became studiable with the data and checkpoints in hand rather than inferred from released weights.
- **OLMo 2 (Nov 2024 to Mar 2025)**: 7B, 13B and 32B trained on up to roughly 5-6T tokens, and the release that documented **training-stability fixes** other labs treat as tribal knowledge. Two are worth knowing. **Reordered (post) normalisation** moves the layer norm to the output of the attention and feed-forward blocks rather than their input, which keeps the residual stream itself unnormalised and, in their runs, reduced loss spikes. **QK-norm** normalises the query and key vectors before their dot product, which bounds the magnitude of attention logits; unbounded logit growth is a standard cause of mid-run divergence at scale, and this removes it cheaply. The other headline is the **two-stage curriculum**: bulk pretraining on the broad web mixture, then a final annealing phase on **Dolmino**, a much smaller high-quality mix (curated web, maths, code, instruction-like text) fed while the learning rate decays. Concentrating the good data at the end, when the model's updates are small and precise, lifts downstream scores considerably more than spreading the same tokens uniformly through the run. The 32B was claimed as the first fully open model to beat the GPT-3.5 / GPT-4o-mini class. **Tulu 3** shipped alongside as the post-training recipe: supervised fine-tuning, then **DPO (Direct Preference Optimization**, which optimises the policy directly on pairs of preferred and rejected responses using a closed-form rewriting of the RLHF objective, so no separate reward model and no rollouts are needed), then **RLVR (Reinforcement Learning with Verifiable Rewards**, where the reward is a mechanical check of the final answer, matching a maths result or running unit tests, rather than a learned preference model that can be gamed by style).
- **Molmo**: the open vision-language line. Its distinctive claim is that it was not built by distilling captions out of a proprietary VLM, which is how most "open" multimodal models are actually made; the training data was collected directly, which is what makes it an open artefact all the way down rather than a laundered closed one.
- **OLMo 3 (Nov 2025)**: the **"model flow"** release, and the name is the point. Instead of publishing a model, Ai2 published the whole path: Base, Instruct and **Think** variants at 7B and 32B, with every checkpoint along every stage plus the data used at each stage, so a researcher can fork the flow at any point rather than only at the end. It was the first fully open 32B reasoning model with the entire RL pipeline public, including **Dolci** (the post-training data collection) and **OlmoRL** (the RL training code and recipe). Think 32B matched Qwen3-32B on maths, code and reasoning with roughly 6x fewer training tokens, which is the efficiency claim the family rests on.
- **OLMo 3.1 (2026)**: extended-RL Think 32B and Instruct 32B checkpoints, Ai2's most performant models to date.
- **Ettin (Jul 2025, JHU collaboration)**: paired encoders and decoders from 17M to 1B parameters, trained identically on the OLMo 2 recipe. The value is methodological: encoder models (bidirectional attention, trained by masked language modelling, producing contextual embeddings for retrieval and classification) and decoder models (causal attention, next-token prediction) had never been compared with data, scale, recipe and tokeniser all held fixed, so every prior comparison confounded the objective with everything else. With only the objective varying, encoders win on masked-LM and retrieval, decoders win on generation, and continued training across objectives (taking a decoder and training it with an MLM objective, or the reverse) does not close either gap. Useful directly when choosing an embedding backbone versus a generative one: the answer is that the pretraining objective, not size, is what decides it.

## Training approach highlights

- Radical transparency as the product: every claim reproducible, and per-stage checkpoints make the family the standard testbed for interventions (data ablations, RL variants, interpretability work that needs a training trajectory).
- Efficiency over scale: competitive quality at roughly 6x fewer tokens, achieved through data curation (Dolma 3, the Dolmino and Dolci mixes) and staged curricula rather than more compute.
- The **ladder-scaling** line of work fits here: fitting scaling curves on many small controlled runs to predict a large model's downstream task accuracy before paying for it. That kind of study needs dozens of runs with a fixed recipe and open data, which is precisely what only this stack provides.
- US-origin fully open matters politically as well as scientifically: it is the Western answer to Chinese open weights for auditable government and regulated deployments, where provenance is a procurement requirement rather than a preference.

## Current models (Aug 2026)

| Model | Notes |
|---|---|
| OLMo 3.1 Think/Instruct 32B | Best fully open reasoning/instruct models |
| OLMo 3 7B family | Small fully open workhorses |
| Molmo | Open VLM line |

## Cross-links

- Training science details belong to topics/llm-training-and-post-training.
- [../reasoning-models.md](../reasoning-models.md): OLMo 3 Think as open replication.
- Papers: OLMo 2, Ettin.

<details>
<summary>2026-08-24: original map (superseded by this rewrite; kept for reference, not counted in the read estimate)</summary>

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

Why this family matters: OLMo is the only frontier-adjacent line where everything is released: pretraining data (Dolma), data tooling, training code, intermediate checkpoints, logs, and post-training recipes (Tulu). It is the reference stack for understanding how models are actually trained, and the base for reproducible research (e.g. Ettin, ladder-scaling studies).

Lineage: OLMo 1 (Feb 2024): first fully open 7B; established the Dolma data pipeline. OLMoE (2024): fully open small MoE (1B active). OLMo 2 (Nov 2024 - Mar 2025): 7B/13B/32B on up to ~5-6T tokens; documented training-stability fixes (post-norm variant, QK-norm), two-stage curriculum with Dolmino annealing mix; 32B claimed first fully open model to beat GPT-3.5/GPT-4o-mini class. Tulu 3 post-training (SFT, DPO, RLVR) shipped alongside. Molmo: open VLM line proving small open multimodal can match much bigger closed models. OLMo 3 (Nov 2025): the "model flow" release: Base/Instruct/Think at 7B/32B; first fully open 32B reasoning model with the entire RL pipeline (Dolci data, OlmoRL) public; Think 32B matched Qwen3-32B on math/code/reasoning with ~6x fewer training tokens. OLMo 3.1 (2026): extended-RL Think 32B and Instruct 32B checkpoints, Ai2's most performant to date. Ettin (Jul 2025, JHU collaboration): paired encoders and decoders (17M-1B) trained identically on the OLMo 2 recipe; shows encoders win MLM/retrieval, decoders win generation, and cross-objective continued training does not close the gap. Useful when choosing embedding vs generative backbones.

Training approach highlights: Radical transparency as the product; checkpoints per stage make it the standard testbed for interventions. Efficiency over scale: competitive quality at 6x fewer tokens via data curation (Dolma 3, Dolmino/Dolci mixes) and staged curricula. US-origin fully open matters politically: the Western answer to Chinese open weights for auditable government/regulated deployments.

</details>
