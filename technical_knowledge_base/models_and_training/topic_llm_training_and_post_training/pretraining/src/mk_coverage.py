# Write coverage.json: every distinct fact, number, mechanism step, caveat and link of live.md, with where index.html carries it.
# Each kept item has a probe string that must occur in ../index.html; the script fails loudly if one is missing.
import json, os, re, html as H
HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, '..', 'index.html'), encoding='utf-8').read()
text = H.unescape(re.sub(r'<[^>]+>', ' ', page)); text = re.sub(r'\s+', ' ', text)
def has(p): return p in page or p in text
R, S, O, SC, D, OR, PN, FR, SP, TY = 'Reading, In one screen', 'Reading, 1 Objective', 'Reading, 2 Reading the loss', 'Reading, 3 Size against tokens', 'Reading, 4 Data in stages', 'Reading, 6 Open recipes', 'Reading, 7 Running it well', 'Further reading', 'Speedrun records tab', 'Anneal a toy tab'
items = [
 # header and resources
 ('Read time line "8 min read, +15h 35m resources"', None, 'dropped: replaced by per-item times in Further reading; the old total no longer describes the page'),
 ('Ultra-Scale Playbook, ~8h, 4000+ experiments on up to 512 GPUs, memory, parallelism, configuration; single best modern reference', 'up to 512 GPUs', FR),
 ('OLMo 2 blog ~30 min', 'allenai.org/blog/olmo2"', FR), ('OLMo 3 blog ~30 min', 'allenai.org/blog/olmo3', FR),
 ('OLMo 3 adds 9.3T-token Dolma 3 corpus and RL-Zero checkpoints', '9.3T', FR + '; ' + OR),
 ("Karpathy's nanoGPT repo ~30 min core files", 'github.com/karpathy/nanoGPT', FR), ('modded-nanogpt repo ~30 min entry path', 'about 30 min for the entry path', FR),
 ('LessWrong: how the speedrun WR dropped 20% in 3 months, ~35 min', 'j3gp8tebQiFJqzBgg', FR + '; ' + SP),
 ('Papers: Kaplan, Chinchilla, Llama 3, OLMo 2 pages', '3c65c17b0d0d81fb9857fb956165ae1c', FR),
 # objective
 ('Pretraining = self-supervised next-token prediction, maximise log-likelihood given prefix, cross-entropy over vocabulary', 'self-supervised next-token prediction', R),
 ('Causal LM, GPT lineage, universal choice for generative LLMs', 'universal choice for generative LLMs', S),
 ('Masked LM (BERT), better for encoders not generation', 'Better for encoders', S),
 ('Span corruption / UL2, T5-style denoising, mostly historical for LLMs', 'Mostly historical for LLMs now', S),
 ('Span corruption mechanism: sample 15%, contiguous runs to one sentinel unique per example, decoder emits only dropped spans each prefixed by its sentinel', 'each prefixed by its sentinel', S + ' and the five-objective animation'),
 ("Difference from BERT: predict missing text, not reconstruct; short decoder, cheaper step", 'decoder sequences stay short and a step is cheaper', S),
 ('UL2: mixture of denoisers, corruption rate and span length, mode token, short/long denoising and prefix LM', 'mixture of denoisers', S + '; animation UL2 X mode'),
 ('Still the default for encoder-decoder; T5 page (11 min read, +4h 12m resources)', '+4h 12m resources', S),
 ('FIM: rearrange prefix, middle, suffix so a causal model learns infilling; standard for code models', 'Standard for code models', S + '; animation FIM'),
 ('Loss reported as per-token cross-entropy or perplexity', 'per-token cross-entropy or perplexity', O),
 ('Downstream tracks loss smoothly, which makes scaling laws work', 'make scaling laws work', O),
 ('T5 ran the comparison holding architecture, data, compute, evaluation fixed', 'holding architecture, data, compute and evaluation fixed', S),
 ('Gap between families large; denoising beats causal LM beats deshuffling', 'denoising beats prefix language modelling beats deshuffling', S + ' (corrected: Table 4 compares a prefix LM objective)'),
 ('Plain causal LM trails on understanding, GLUE 74.70 against 83.28', '73.78', S + ' correction box: 74.70 is decoder-only with the denoising objective; plain causal 73.78'),
 ('Within denoising family close to nothing: BERT-style, MASS-style, sentinel replacement, token dropping within noise', 'MASS-style masking, sentinel replacement and outright token dropping', S + ' and the T5 chart (made precise: within about two GLUE points)'),
 ('Corruption rates 10, 15, 25% indistinguishable, only 50% hurts', 'only 50% hurts', S + ' and T5 chart'),
 ('Mean span lengths 2, 3, 5 indistinguishable, 10 slightly worse', '10 is slightly worse', S + ' and T5 chart'),
 ('Practical conclusion: pick a denoising variant on cost not quality; do not expect tuning to pay', 'pick a denoising variant on computational cost', S),
 ('Encoder-decoder beat decoder-only prefix LM at matched compute; field went decoder-only for in-context learning and serving reasons not tested', 'serving cost that the comparison did not test', S + ' (numbers 83.28 against 81.82 added)'),
 # scaling
 ('Kaplan 2020: power laws in N, D, C; scale N faster than D; link', 'scale N faster than D', SC),
 ("Chinchilla fixed Kaplan's LR-schedule artefact; N and D scale equally; D ~ 20 tokens/param", '20 tokens per parameter', SC),
 ('Chinchilla 70B 1.4T tokens beat Gopher 280B at equal compute', 'beat Gopher (280B)', SC),
 ('Post-Chinchilla over-training; Llama 3 8B ~1,875 tokens/param; inference dominates; smaller model cheaper to serve', '1,875', SC),
 ('Allocation rules treat tokens as interchangeable; data 3.24x more compute-efficiency gain than model 2019-2025, largely independent (Dwarkesh, Sept 2026)', '3.24', SC),
 ('Allocation solved, mixture not; detail in data-curation topic', 'allocation is solved, mixture is not', SC),
 ('Dwarkesh link (25 min)', 'pretraining-progress-is-mostly-data', SC + '; ' + FR),
 ('Loss curves used prescriptively: fit on small runs, predict big run, pick hyperparameters', 'fit a scaling law on small runs', SC),
 ('muP / muTransfer: LR and init transfer across widths; used by many 2024+ labs', 'μTransfer', SC + ' (count of labs marked unconfirmed)'),
 # data
 ('Modern pretraining multi-stage, not one homogeneous pass', 'not one homogeneous pass', D),
 ('Stage 1 bulk ~90% of tokens: filtered web (FineWeb/DCLM-style), code, papers', 'FineWeb- or DCLM-style', D),
 ('OLMo 2 uses OLMo-Mix ~3.9T from DCLM, Dolma, Starcoder, Proof Pile II', '3.90T tokens, 95.2% DCLM', D + ' (precise composition from Tables 4 and 10)'),
 ('Mid-training / anneal: as LR decays up-weight high-quality data (curated maths, instruction-like, synthetic)', 'up-weight high-quality data', D),
 ("OLMo 2's Dolmino mix in the anneal gives outsized gains; Llama 3 similar", 'outsized benchmark gains', D + ' and section 5 (measured)'),
 ('Long-context extension: final phase 32k-128k+, upsampled long docs, RoPE rescaling; Positional Encodings link', 'RoPE rescaling', D),
 ('Data quality work (dedup, filtering, mixing) lives in data-curation topic', 'filtering and deduplication live on', R + ' and ' + D),
 ('Data mixture is the main open lever; architecture converged (pre-norm, RMSNorm, SwiGLU, RoPE, GQA; MoE for compute-rich)', 'mixture-of-experts for the compute-rich', D),
 # open recipes
 ('OLMo 2/3: longest-running fully open recipe: data, code, intermediate checkpoints, logs', 'longest-running fully open recipe', OR),
 ('OLMo 2 32B trained to 6T tokens, post-trained with Tulu 3.1', 'Tülu 3.1', OR),
 ('OLMo 3 7B/32B explicit model flow: base to think/instruct, RL-Zero checkpoints', 'model flow', OR),
 ('K2 Horizon, IFM Abu Dhabi, second fully open lab, category', 'second lab in the fully open category', OR),
 ('Six models 0.9B to 375B (0.9, 3.7, 7, 32, 36B sparse, 375B), Apache 2.0, Sept 2026, weights, code, data, methodology', 'MoVA-36B-A4B', OR),
 ('Releasing data enables contamination audits and data ablations; separates from open-weight', 'contamination auditing', OR),
 ('One architecture across fleet: diffusion distillation, 3x speedup, mixture-of-value-attention', 'tokens per forward pass', OR + ' correction box (MoVA is one model; Uno is a LoRA adapter, 2.46 to 3.00 tokens per forward)'),
 ("IFM claims SOTA at 0.9B, 3.7B, 7B and competitiveness at 375B; lab's own numbers", "Benchmark claims are the lab's own", OR + " (specific claims not found on the cards; kept as 'lab's own', reported)"),
 ('SmolLM3 3B full blueprint: architecture ablations, 11T-token mix, post-training; Smol Training Playbook ~5h', 'Smol Training Playbook', OR + '; ' + FR + ' (11T made precise: 11.2T)'),
 ("nanoGPT lineage: nanoGPT, llm.c, modded-nanogpt", 'then llm.c', OR),
 ('Record for GPT-2 124M quality fell from 45 min (8xH100) to under 2.5 min by late 2025', '1.894 minutes', OR + ' correction box and ' + SP + ' (now 0.665 min)'),
 ('Graduated: Muon (orthogonalised momentum, Kimi K2)', 'orthogonalised momentum', OR + '; ' + SP),
 ('Graduated: untied embeddings tweaks, careful init, FlexAttention sliding windows, value-embedding skips', 'untied embeddings, careful initialisation', SP + ' (marked unconfirmed: no source names a frontier run)'),
 ('Magic: >10x compute efficiency claim, recipe and long-context work not benchmark table, Sept 2026, vendor-reported, playbook without frontier compute; link 25 min', 'pretraining without frontier compute', OR),
 ('Semi-open reports: Llama 3 (data mix, scaling, infra failures), DeepSeek-V3 (fp8, MoE), Qwen3', 'infrastructure failures', OR),
 # practical
 ('Batch size: critical batch size heuristic; ramp during training (2025+ recipes)', 'critical batch size heuristic', PN),
 ('LR schedule: warmup+cosine classic; WSD popular, branch anneals off plateau without committing to token count', 'branch anneals off the stable plateau', PN),
 ('Full family comparison on the Optimisers page (shapes, cooldown, schedule-free, WSM)', 'decay-free options like schedule-free and WSM', PN),
 ('Stability: z-loss or logit soft-capping, QK-norm (OLMo 2 QK-norm + reordered norms), bf16 with fp32 master, clip 1.0, spikes and bad shards', 'reordered norms specifically for stability', PN),
 ('Eval during training: fixed loss suite + few-shot at checkpoints; held-out high-quality loss predicts better than train loss', 'predicts downstream better than training loss', PN + ' and ' + O),
]
out = []; missing = []
for fact, probe, where in items:
    ok = None if probe is None else has(probe)
    if probe is not None and not ok: missing.append((fact, probe))
    out.append({'fact': fact, 'probe': probe, 'where': where, 'found': ok})
json.dump({'source': 'src/live.md (Notion fetch 2026-09-22)', 'items': out, 'kept': sum(1 for o in out if o['probe']), 'dropped': sum(1 for o in out if not o['probe'])},
          open(os.path.join(HERE, 'coverage.json'), 'w'), indent=1, ensure_ascii=False)
print('items', len(out), 'kept', sum(1 for o in out if o['probe']), 'dropped', sum(1 for o in out if not o['probe']), 'missing', len(missing))
for m in missing: print('MISSING', m)
