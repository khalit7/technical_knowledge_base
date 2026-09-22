# Ai2: OLMo (fully open models)

⏱ 5 min read · +3h 25m resources

Per-model pages to follow; this page explains the family.

### Best resources

- [OLMo 2 paper](https://arxiv.org/abs/2501.00656) (1h 30m, long report) and repo summary: the fully open training-science reference.
- [Olmo 3 blog (Ai2)](https://allenai.org/blog/olmo3) (~30 min): the "model flow" release: data, code, every checkpoint, logs.
- [Interconnects: Olmo 3, America's truly open reasoning models](https://www.interconnects.ai/p/olmo-3-americas-truly-open-reasoning) (~20 min): insider context from the team.
- [Ettin paper](https://arxiv.org/abs/2507.11412) (45 min): paired encoder/decoder suite trained on the OLMo 2 recipe; the cleanest encoder-vs-decoder controlled comparison.
- [Ai2 HuggingFace org](https://huggingface.co/allenai) (weights, datasets and tooling, ~20 min for the entry pages): all weights, data (Dolma), and tooling.

### What "fully open" actually means here

"Open weights" and "open source" get used interchangeably and are not remotely the same thing. A typical open-weights release (Llama, Qwen, Mistral, DeepSeek) gives you one artefact: the final parameter tensors, plus a model card and a table of scores. Everything that produced them stays inside the lab. OLMo established the practice of releasing the production process rather than the product, and each item it adds unlocks a kind of research that is otherwise impossible. It was the only line doing so until September 2026, when the Institute of Foundation Models in Abu Dhabi published **K2 Horizon**, six Apache 2.0 models from 0.9B to 375B with weights, training code, training data and methodology. The category now has two members on two continents under different funders, which matters because a single example of a practice is a curiosity and two is a norm forming. Detail on [Other notable providers](../other-providers/overview.md).

What Ai2 ships that others withhold:

- **The pretraining corpus itself (Dolma)**, as downloadable documents rather than a description, plus the **data tooling**: the deduplication, quality-filtering, decontamination and tokenisation pipeline that turned raw crawl into it, so the corpus can be rebuilt or varied rather than merely inspected.
- **The exact data mixture and the order it was fed in**: the proportions of each source and the curriculum across stages. Two models with identical architectures and different mixtures are different models, and the mixture is the part labs guard hardest.
- **The training code and full configs**, so a run can be reproduced rather than approximated from a paper's hyperparameter table.
- **Intermediate checkpoints across the whole run**, not just the final one: the single most valuable item on the list, and the rarest.
- **Training logs**: loss curves, spikes, restarts, and what was changed when. The failures are as informative as the final number and are almost never published.
- **The post-training stack (Tulu, later Dolci)**: the actual SFT datasets, preference data, RL prompt sets and recipe code, not a paragraph describing them.
Why each matters if you do research rather than just inference:

- **Causal claims about data need the data.** "This capability comes from that data source" is untestable against a closed corpus. With Dolma you can ablate a source, retrain at small scale, and measure.
- **Checkpoints turn training into an observable process.** You can study when a capability appears, when memorisation of a specific document begins, how representations reorganise, and intervene mid-run (fork at step N, change the mixture, compare) instead of only studying the finished model.
- **Contamination becomes checkable.** If you cannot search the training corpus, every benchmark number is unfalsifiable in principle. Here you can grep for the eval set.
- **Interventions get a real control.** Claiming an RL algorithm or a data recipe helps requires holding the base model, its data and its exact checkpoint fixed. A fork of a released OLMo checkpoint with the released mixture is a controlled experiment; fine-tuning someone's closed-corpus weights is not.
- **Auditable provenance for regulated deployment.** A government or healthcare buyer who must answer "what is in this model" has an answer here and nowhere else.
The trade is a price in capability: publishing your corpus means you cannot use data you have no clear right to publish, and that constraint alone puts a ceiling on OLMo relative to labs that train on whatever they can reach. Treat the family as the reference stack for understanding how models are trained, and as the base for reproducible research (Ettin, the ladder-scaling studies), rather than as the model you would serve for raw scores.

### Lineage

- **OLMo 1 (Feb 2024)**: first genuinely fully open 7B, and the release that established **Dolma**, a 3T-token open pretraining corpus shipped with its own construction toolkit. Dolma is arguably the more important artefact: it made "here is exactly what the model read" possible at all.
- **OLMoE (2024)**: a fully open sparse mixture-of-experts model at roughly 1B active parameters, making the MoE design space (router behaviour, expert specialisation, load balancing) studiable with the data and checkpoints in hand rather than inferred from released weights.
- **OLMo 2 (Nov 2024 to Mar 2025)**: 7B, 13B and 32B on up to roughly 5-6T tokens, and the release that documented **training-stability fixes** other labs treat as tribal knowledge. Two are worth knowing. **Reordered (post) normalisation** moves the layer norm to the output of the attention and feed-forward blocks rather than their input, keeping the residual stream itself unnormalised and, in their runs, reducing loss spikes. **QK-norm** normalises query and key vectors before their dot product, bounding attention logit magnitude; unbounded logit growth is a standard cause of mid-run divergence at scale, and this removes it cheaply. The other headline is the **two-stage curriculum**: bulk pretraining on the broad web mixture, then a final annealing phase on **Dolmino**, a much smaller high-quality mix (curated web, maths, code, instruction-like text) fed while the learning rate decays. Concentrating the good data at the end, when updates are small and precise, lifts downstream scores considerably more than spreading the same tokens uniformly through the run. The 32B was claimed as the first fully open model to beat the GPT-3.5 / GPT-4o-mini class. **Tulu 3** shipped alongside as the post-training recipe: supervised fine-tuning, then **DPO (Direct Preference Optimization**, which optimises the policy directly on pairs of preferred and rejected responses using a closed-form rewriting of the RLHF objective, so no separate reward model and no rollouts are needed), then **RLVR (Reinforcement Learning with Verifiable Rewards**, where the reward is a mechanical check of the final answer, matching a maths result or running unit tests, rather than a learned preference model that can be gamed by style).
- **Molmo**: the open vision-language line. Its distinctive claim is that it was not built by distilling captions out of a proprietary VLM, which is how most "open" multimodal models are actually made; the training data was collected directly, making it an open artefact all the way down rather than a laundered closed one.
- **OLMo 3 (Nov 2025)**: the **"model flow"** release, and the name is the point. Instead of a model, Ai2 published the whole path: Base, Instruct and **Think** variants at 7B and 32B, with every checkpoint along every stage plus the data used at each stage, so a researcher can fork the flow at any point rather than only at the end. First fully open 32B reasoning model with the entire RL pipeline public, including **Dolci** (the post-training data collection) and **OlmoRL** (the RL training code and recipe). Think 32B matched Qwen3-32B on maths, code and reasoning with roughly 6x fewer training tokens, the efficiency claim the family rests on.
- **OLMo 3.1 (2026)**: extended-RL Think 32B and Instruct 32B checkpoints, Ai2's most performant models to date.
- **Ettin (Jul 2025, JHU collaboration)**: paired encoders and decoders from 17M to 1B parameters, trained identically on the OLMo 2 recipe. The value is methodological: encoders (bidirectional attention, masked language modelling, contextual embeddings for retrieval and classification) and decoders (causal attention, next-token prediction) had never been compared with data, scale, recipe and tokeniser all held fixed, so every prior comparison confounded the objective with everything else. With only the objective varying, encoders win on masked-LM and retrieval, decoders win on generation, and continued training across objectives (training a decoder with an MLM objective, or the reverse) does not close either gap. Directly useful when choosing an embedding backbone versus a generative one: the pretraining objective, not size, decides it.

### Training approach highlights

- Per-stage checkpoints make the family the standard testbed for interventions: data ablations, RL variants, interpretability work that needs a training trajectory.
- Efficiency over scale: competitive quality at roughly 6x fewer tokens, through data curation (Dolma 3, the Dolmino and Dolci mixes) and staged curricula rather than more compute.
- The **ladder-scaling** line of work fits here: fitting scaling curves on many small controlled runs to predict a large model's downstream task accuracy before paying for it. That needs dozens of runs with a fixed recipe and open data, which only this stack provides.
- US-origin fully open matters politically as well as scientifically: an answer to Chinese open weights for auditable government and regulated deployments, where provenance is a procurement requirement rather than a preference. It is no longer the only such answer, since K2 Horizon gives Gulf-funded buyers a second fully open provenance chain.

### Current models

| Model | Notes |
| --- | --- |
| OLMo 3.1 Think/Instruct 32B | Best fully open reasoning/instruct models |
| OLMo 3 7B family | Small fully open workhorses |
| Molmo | Open VLM line |

### Cross-links

- Training science details belong to [Topic: llm-training-and-post-training](../../llm-training-and-post-training/summary.md).
- [Reasoning models and test-time compute](../reasoning-models.md): OLMo 3 Think as open replication.
- Papers: [2 OLMo 2 Furious (OLMo 2)](../../../papers/2025-01_olmo-2/summary.md), [Seq vs Seq: An Open Suite of Paired Encoders and Decoders (Ettin)](../../../papers/2025-07_ettin/summary.md).
