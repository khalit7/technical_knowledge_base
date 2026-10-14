# Data mixing: domain weights, curricula, and continued-pretraining ratios

Notion id 3c65c17b0d0d819ea5d6c59471e66875; fetched read-only 2026-10-14; page_last_edited_at 2026-09-24T15:45:34.064Z. Verbatim fetch text below.

Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d819ea5d6c59471e66875 as of 2026-09-24T15:45:34.064Z:
<page url="https://app.notion.com/p/3c65c17b0d0d819ea5d6c59471e66875">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d811fa5ecda8d365ab00f" title="Topic: data-curation-and-datasets"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Data mixing: domain weights, curricula, and continued-pretraining ratios"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 7 min read · +8h resources
## Best resources
- [DoReMi (Xie et al. 2023)](https://arxiv.org/abs/2305.10429) (45 min): proxy-model domain reweighting via Group DRO
- [Data Mixing Laws (Ye et al. 2024)](https://arxiv.org/abs/2403.16952) (45 min): fit functional forms, predict performance of unseen mixtures
- [RegMix (Liu et al. 2024)](https://arxiv.org/abs/2407.01492) (45 min): mixture search as regression over tiny proxy runs; matches DoReMi at \~10% of its compute
- [CMR Scaling Law (Gu et al., EMNLP 2024)](https://arxiv.org/abs/2407.17467) (45 min): predicting the critical general/domain mixture ratio for continued pretraining
- [Scaling Data-Constrained Language Models (Muennighoff et al. 2023)](https://arxiv.org/abs/2305.16264) (90 min): how many epochs you can repeat data before it stops helping
- [OLMo 2/3 reports](https://allenai.org/olmo) (\~2h across the reports) and [SmolLM2 paper](https://arxiv.org/abs/2502.02737) (90 min): the best fully documented staged-mixture recipes
## The problem
A pretraining corpus is a mixture over domains (web, code, math, papers, books, synthetic).
The proportions measurably change downstream ability at fixed compute, and the naive options
(natural proportions, uniform, "what The Pile did") are all suboptimal. Three families of
solutions: offline optimization with proxy models, predictive scaling laws, and online/staged
schedules.
Mixture is also the cheapest large lever available, which is the practical end of the
3.24x data-versus-model decomposition on <mention-page url="https://app.notion.com/p/3c65c17b0d0d811fa5ecda8d365ab00f">Topic: data-curation-and-datasets</mention-page>: reweighting domains costs a few proxy runs and moves
downstream ability by as much as an architecture change would at the same compute.
## Domain weighting methods
<table header-row="true">
<tr>
<td>Method</td>
<td>Idea</td>
<td>Cost</td>
<td>Verdict</td>
</tr>
<tr>
<td>Manual (Pile, Llama 1)</td>
<td>Hand-picked upsampling of "good" sources</td>
<td>free</td>
<td>Baseline; surprisingly hard to beat by a lot</td>
</tr>
<tr>
<td>DoReMi (2023)</td>
<td>Small proxy trained with Group DRO produces excess-loss-driven weights, transferred to the big run</td>
<td>1 proxy + 1 reference model</td>
<td>+6.5 pts avg few-shot over Pile weights at 8B; weights are task-agnostic</td>
</tr>
<tr>
<td>Data Mixing Laws (2024)</td>
<td>Loss is an exponential function of mixture proportions; fit on sample mixtures, nested with size/token scaling laws to extrapolate</td>
<td>tens of small runs</td>
<td>Predictive, interpretable; the "laws" framing carried into later work</td>
</tr>
<tr>
<td>RegMix (2024)</td>
<td>Train \~512 tiny (1M-param) models on random mixtures, fit a regressor (linear + LightGBM), pick the argmax mixture</td>
<td>very cheap</td>
<td>Matches/exceeds DoReMi with \~10% of its compute; found web (CC) mattered more than Wikipedia for downstream, contradicting conventional wisdom</td>
</tr>
<tr>
<td>AutoScale / Aioli / MDE</td>
<td>Corrections for the fact that optimal weights shift with scale; unified online framework</td>
<td>varies</td>
<td>Aioli's meta-finding: many published methods do not beat well-tuned stratified sampling on average; skepticism warranted</td>
</tr>
<tr>
<td>UtiliMax / MEDU (2025)</td>
<td>LLM-estimated document/domain utility replaces proxy training</td>
<td>cheap</td>
<td>Practical for CPT-style decisions</td>
</tr>
<tr>
<td>RegMix-D, Data Mixing Agent (2025-26)</td>
<td>Time-varying mixture schedules instead of one static mixture</td>
<td>moderate</td>
<td>Reflects the field's move to dynamic mixtures/curricula</td>
</tr>
</table>
**Practical takeaways**: (1) optimal weights depend on model scale and token budget, so re-fit
rather than copy published weights; (2) small high-quality sources can be repeated: up to \~4
epochs is roughly as good as fresh data (Muennighoff), beyond that returns decay fast; (3) at
small scale the honest move is RegMix-style tiny-proxy search over your handful of candidate
mixtures, evaluated on your target benchmarks.
## Staged pretraining: curriculum, mid-training, annealing
The single-static-mixture era is over. The standard 2025-26 recipe is 2-4 stages with quality
increasing and diversity narrowing toward the end:
1. **Bulk phase** (most tokens): broad filtered web (FineWeb/DCLM tier), modest code fraction.
2. **Mid-training** (aka annealing phase, final 10-30%): upweight math, code, instruction-like
	and reasoning data; often coincides with the learning-rate decay of a WSD/trapezoid
	schedule. Evidence: MiniCPM's WSD + high-quality-decay phase; Llama 3's annealing; OLMo 2/3
	("Dolmino": 100B-token mid-training mix of math/code/QA/instruction/thinking data);
	SmolLM2/3's 3-stage mixes where FineMath and Stack-Edu enter late. Annealing experiments
	are also the cheap way to *evaluate* a candidate dataset: anneal an existing checkpoint on
	it and compare (Llama 3 and OLMo both do this).
3. **Long-context extension**: a short final stage on long documents (books, PDFs, repo-level
	code); Dolma 3 "Longmino" (50-100B tokens) is the open template.
Why it works: high-quality data has outsized effect when the LR is low and the model is close
to its final state (gradient noise is smaller, memorization of good patterns sticks); and
scarce high-quality tokens are not diluted across a 10T-token stream.
**For a 150-350M FineWeb-Edu run**: bulk on FineWeb-Edu with \~5-10% code; final 10-20% of the
schedule (during LR decay) shift to FineWeb-Edu top-scored slice + FineMath 4+ + python-edu +
a small SFT-formatted set if you want it to anneal into instructability. Keep an untouched
held-out slice for loss monitoring across stages.
## Continued pretraining and the CMR scaling law
Continued pretraining (CPT) on domain data (finance, legal, medical, a new language) degrades
general ability unless you replay general-corpus data. The replay ratio has usually been picked
heuristically (common folklore: 10-50% general data). The **CMR Scaling Law** paper (Gu et al. 2024,
EMNLP; the reference Khalid has used professionally for balancing domain against general data in
CPT) makes it predictive:
- Observation: during CPT, general-domain loss and domain loss each follow a power law in
	mixture ratio and training tokens.
- Define the **Critical Mixture Ratio (CMR)**: the largest domain-data proportion such that
	general capability is not sacrificed (the optimal efficiency/capability trade-off point).
	Fit the power laws on short runs at a few ratios, then solve for CMR instead of grid search.
- Empirical findings (up to 20B CPT tokens): predicted CMR (expressed as the general-data
	share) was 29.8%, 34.9%, 41.4%, 47.8% for models from 460M to 3.1B; note the paper's
	headline reading: **larger models tolerate a higher domain-data proportion**, and the
	**closer the domain is to the general distribution, the higher the CMR** (more domain data
	is safe when the shift is small).
- Practical use (matches how we did it professionally): pick 3-4 candidate ratios, run short
	CPT probes, fit the curves, commit the full budget to the predicted CMR; re-check when the
	token budget or base model changes since CMR moves with both.
Related dynamic approaches: Data Mixing Agent (2025) learns to re-weight domains online during
CPT; D-CPT-Law is the other named scaling-law treatment of the same problem. Mechanics of CPT
itself (LR re-warming, forgetting, infinite-LR schedules) live in
<mention-page url="https://app.notion.com/p/3c65c17b0d0d8119b8f0e801caa09474"/>.
## Cross-links
- Corpus choices being mixed: <mention-page url="https://app.notion.com/p/3c65c17b0d0d81f382b6e75707d00663"/>
- Synthetic slices that enter at mid-training: <mention-page url="https://app.notion.com/p/3c65c17b0d0d8171b5d9e36e05b7a5d0"/>
- Training-side schedule interaction (WSD, annealing): <mention-page url="https://app.notion.com/p/3c65c17b0d0d814f82cffd0d5c0dd5ba"/>
- The "annealing vs LR decay" terminology split (data switch versus schedule, and why papers conflate them): <mention-page url="https://app.notion.com/p/3c65c17b0d0d817080bbc90954681d09"/>
</content>
</page>
