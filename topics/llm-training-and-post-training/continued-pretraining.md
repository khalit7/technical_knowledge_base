# Continued Pretraining (CPT)

⏱ 6 min read · +3h 30m resources

### Best resources

- [Simple and Scalable Strategies to Continually Pre-train LLMs (Ibrahim et al., 2024)](https://arxiv.org/abs/2403.08763) (90 min): the reference empirical study: LR re-warming, re-decaying, and replay match full retraining.
- [CMR Scaling Law paper (Gu et al., EMNLP 2024)](https://arxiv.org/abs/2407.17467) (45 min): predicting the critical domain/general mixture ratio for CPT.
- [Continued Pre-Training overview (Emergent Mind)](https://www.emergentmind.com/topics/continued-pre-training-cpt) (~30 min): living survey of CPT findings through 2026.
- [D-CPT Law (NeurIPS 2024)](https://arxiv.org/abs/2406.01375) (45 min): scaling-law approach to choosing the domain mixture ratio.

### What and why

CPT resumes next-token training of an existing base model on new data: a domain

(finance, medicine, code, a new language), fresher data, or a longer context.

It sits between pretraining and fine-tuning: billions (not trillions) of tokens,

full-parameter training, same objective. Use CPT when the knowledge gap is large

(SFT/LoRA cannot inject bulk domain knowledge); skip it when a RAG system or

fine-tune suffices. A domain-specific financial-services LLM Khalid worked on followed this pattern: select a base

model by benchmark screening, CPT on domain + general mix, then post-train and

evaluate on domain, general, and safety axes with a private in-house benchmark.

### The central problem: catastrophic forgetting

Training on a shifted distribution degrades general capabilities. The two levers

that matter most:

1. **Data mixing (replay)**: mix general-corpus tokens back into the domain
   stream. Empirical ranges: even 1-5% replay meaningfully reduces forgetting;

   10-30% is typical when the shift is strong (new language) or general ability

   is precious; domain-heavy mixes (e.g. 50/50 domain/FineWeb-Edu as in DACP

   work) when domain depth is the goal. Choose replay data close to the original

   pretraining distribution (or the best open approximation if the original is

   unknown).

2. **Learning-rate schedule**: re-warming to a high LR causes an initial loss
   spike on old abilities and drives most forgetting; but too low an LR

   under-adapts. Findings: re-warm + re-decay to a **lower peak** than

   pretraining (a common heuristic: an order of magnitude lower); "infinite"

   schedules (constant plateau + branch anneals, i.e. WSD-style) let you resume

   CPT stages without repeated re-warming, improving retention; combine with

   replay for the best trade-off.

### CMR scaling law: choosing the mixture

The **Critical Mixture Ratio** work formalises the domain-vs-general trade-off:

under a fixed token budget, general-loss and domain-loss trade off predictably as

you vary the mixture ratio, and loss follows power laws in the ratio. There

exists a critical ratio (CMR) beyond which general capability degradation

accelerates faster than domain gains accrue; the law lets you fit small pilot

runs and **predict the optimal ratio** for the full run instead of grid-searching

at scale. D-CPT Law does the same with an explicit domain-corpus-size term.

Practical use: run a few short CPT pilots at different ratios, fit, pick the

ratio, then commit the budget.

### Other findings that transfer

- **Order and staging**: a brief "warm-up" phase on general data before the
  domain mix stabilises training; staged curricula (general-heavy -> domain-heavy)

  outperform static mixes in several studies.

- **Model scale helps**: larger models forget proportionally less during CPT.
- **Tokenizer extension**: for new languages/domains with bad fertility, extend
  the vocab and train new embeddings first (brief embedding-only phase), then

  full CPT.

- **Long-context extension is CPT**: the standard 128k recipes are continued
  pretraining on upsampled long documents with rescaled RoPE

  (see [Positional Encodings](positional-encodings.md)).

- **Mid-training annealing** (see [Pretraining](pretraining.md)) is the same
  machinery applied by the base-model builder rather than the adapter.

- Parameter-level alternatives to replay (EWC, LoRA-based CPT, model averaging /
  ties-merging of the CPT model with the base) help when you cannot afford replay

  tokens, but replay + schedule remains the default answer.

- After CPT, re-run the full post-training pipeline (or at least SFT): CPT
  typically damages instruction-following until re-aligned.

### What it costs: two documented pipelines

Practitioners almost never publish a budget next to a recipe, which is why these two are

worth more than their technical content.

**Thomson Reuters** mid-trained a 397B-parameter domain model on top of Qwen3.5 for a

reported $40M in three months: 200B curated tokens selected from a 19T pool with

DatologyAI, DPO alignment against an open-source constitution, GSPO for context

compaction and document caching, and a 35B open-weights sibling released alongside. It is

the customise-an-open-base path stated end to end with a token count, a budget and a

timeline attached, and the shape is the checklist below: select hard from a much larger

pool, then re-align. Treat the $40M as a reported figure rather than an audited one

(The Batch, September 2026).

**Periodic's Neon** is the same argument with a different corpus. Midtraining plus

reinforcement learning on real laboratory records beats GPT-6 Astra and Claude Fable 5.1

on a hard scientific-analysis evaluation at lower cost per analysis, surpasses frontier

models on FrontierXRD, and is deployed in labs analysing superconductor and magnet

experiments. The structural claim is the transferable part: domain training on proprietary

**operational** data, the records an organisation generates anyway rather than a corpus

assembled for the purpose, establishes a Pareto-optimal cost-performance frontier against

general frontier models. Most organisations sizing a domain-adaptation project already

hold that data and do not think of it as a corpus.

[Periodic](https://periodic.com/news/nature-is-our-learning-environment) (10 min)

### Checklist for a CPT run

1. Define target and guard metrics (domain evals + general evals + safety) before
   training; evaluate the base model on both.

2. Pilot runs to pick mixture ratio (CMR-style) and peak LR (start ~0.1x
   pretraining peak; WSD if multi-stage).

3. Replay source as close to original pretraining data as possible; dedup domain
   data against evals.

4. Monitor both loss families during training; forgetting shows early.
5. Post-train afterwards; compare against a no-CPT fine-tuned baseline to prove
   CPT was worth it.

See also [Topic: data-curation-and-datasets](../data-curation-and-datasets/summary.md) for mixing infrastructure and [Alignment: SFT, RLHF, DPO Family, RLVR](alignment-and-rlhf.md) for the re-alignment step.
