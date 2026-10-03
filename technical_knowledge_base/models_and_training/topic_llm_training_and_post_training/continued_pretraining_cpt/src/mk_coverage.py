"""Write coverage.json: every fact, number, step, caveat and link of live.md, where the HTML carries it
(a probe string that must occur in ../index.html), or why it was changed. Run after build.sh."""
import json, os, re, html
HERE = os.path.dirname(os.path.abspath(__file__))
page = html.unescape(re.sub(r'<[^>]+>', ' ', open(os.path.join(HERE, '..', 'index.html'), encoding='utf-8').read()))
page = re.sub(r'\s+', ' ', page)
raw = open(os.path.join(HERE, '..', 'index.html'), encoding='utf-8').read()
F = [
 # (fact from live.md, where, probe, status, note)
 ("Resource: Ibrahim et al. 2024 (90 min)", "Further reading", "arxiv.org/abs/2403.08763", "kept", ""),
 ("Resource: CMR Scaling Law, Gu et al. EMNLP 2024 (45 min)", "Further reading", "arxiv.org/abs/2407.17467", "kept", "venue is EMNLP 2024 Findings"),
 ("Resource: Emergent Mind CPT overview (~30 min)", "Further reading", "emergentmind.com/topics/continued-pre-training-cpt", "kept", "page checked: last updated October 2025"),
 ("Resource: D-CPT Law NeurIPS 2024 (45 min)", "Further reading", "arxiv.org/abs/2406.01375", "kept", ""),
 ("CPT resumes next-token training of an existing base on new data", "Reading, What and when", "resumes next-token training of an existing base model", "kept", ""),
 ("Examples: finance, medicine, code, new language, fresher data, longer context", "Reading, What and when", "a new language, fresher data, or longer documents", "kept", ""),
 ("Between pretraining and fine-tuning: billions not trillions, full-parameter, same objective", "Reading, What and when (stage cards)", "billions to hundreds of billions of new tokens, all parameters, same objective", "kept", ""),
 ("Use CPT when the knowledge gap is large; SFT/LoRA cannot inject bulk knowledge", "Reading, When it is worth it", "does not inject bulk knowledge well", "kept", "now sourced to Biderman et al. via the PEFT page"),
 ("Skip it when RAG or a fine-tune suffices", "Reading, When it is worth it", "retrieval (a RAG system) or a fine-tune is cheaper", "kept", ""),
 ("Khalid's financial-services LLM: base by benchmark screening, CPT on domain + general mix, post-train, evaluate domain/general/safety with private benchmark", "Reading, A worked pattern", "private in-house benchmark", "kept", ""),
 ("Catastrophic forgetting: shifted distribution degrades general capabilities", "Reading, Forgetting, watched", "catastrophic forgetting", "kept", "plus the toy animation and Ibrahim's 2.17 to 3.56"),
 ("Replay: even 1-5% meaningfully reduces forgetting", "Reading, The two levers", "Even 1 to 5% helps a lot", "kept", "sourced: Ibrahim Table 2, D-CPT Table 5, Meditron, Llemma, SaulLM"),
 ("10-30% typical for strong shift (new language) or precious general ability", "Reading, The two levers", "10 to 30% when the shift is strong", "kept", "sourced: Ibrahim 25%, DeepSeek-Coder-V2 30%"),
 ("Domain-heavy mixes, e.g. 50/50 domain/FineWeb-Edu as in DACP", "Reading, The two levers", "25B tokens sampled from FineWeb-Edu", "kept", "DACP identified: Dialpad, arXiv 2510.05858"),
 ("Replay data close to original pretraining distribution, or best open approximation", "Reading, The two levers", "or the best open approximation when the original is unknown", "kept", ""),
 ("Re-warming to high LR causes a loss spike on old abilities", "Reading, The two levers; toy animation step 2", "re-warming to a high peak adapts well but makes the loss on old data spike", "kept", ""),
 ("Re-warming drives most forgetting", "Reading, Corrections box", "re-warming added 0.34 of the 1.39 rise, 24%", "corrected", "Ibrahim Table 12: under a shift most forgetting is the data (76%); re-warm alone raises loss without a shift (section 7.1)"),
 ("Too low an LR under-adapts", "Reading, The two levers", "Continuing at that minimum adapts too slowly", "kept", ""),
 ("Re-warm + re-decay to a lower peak than pretraining", "Reading, The two levers", "decreasing the schedule's maximum learning rate can help reduce forgetting", "kept", "quoted from Ibrahim section 2"),
 ("Heuristic: an order of magnitude lower peak", "Reading, Corrections box", "typically around 10% of the original", "corrected", "common practice (e-Llama names it, chose it by ablation), not tested by Ibrahim or Gupta; disclosed recipes span 1x to 1/150"),
 ("Infinite (WSD-style) schedules resume without re-warming, improving retention", "Reading, Schedules that resume", "infinite", "kept", "caveat added: tested at 405M without a shift"),
 ("Combine schedule with replay for the best trade-off", "Reading, The two levers", "Combine the two levers", "kept", ""),
 ("CMR formalises domain-vs-general trade-off under fixed budget", "Reading, Choosing the mix", "Critical Mixture Ratio", "kept", ""),
 ("Loss follows power laws in the ratio", "Reading, Choosing the mix", "L(R) = α·R", "kept", ""),
 ("Critical ratio beyond which general degradation accelerates faster than domain gains", "Reading, Choosing the mix", "the largest feasible R", "corrected", "paper's definition: largest domain share whose final general loss stays within tolerance 0.05 of the base and is heading down"),
 ("Fit small pilot runs to predict the optimal ratio instead of grid search", "Reading, Choosing the mix", "fit scaling laws on small pilot runs", "kept", ""),
 ("D-CPT does the same with an explicit domain-corpus-size term", "Reading, Choosing the mix", "explicit domain-corpus-size", "kept", "with the D-CPT formula and its three uses"),
 ("Practical use: a few short pilots, fit, pick, commit", "Reading, Choosing the mix", "run a few short pilots at different ratios", "kept", ""),
 ("Order and staging: general warm-up phase first; staged curricula outperform static in several studies", "Reading, Other findings", "could not find those studies", "corrected", "marked unconfirmed; what is measured (Llama-3-SynE curriculum, Ibrahim A.1) given instead"),
 ("Larger models forget proportionally less", "Reading, Other findings", "The evidence that larger models forget less is mixed", "corrected", "Yildiz, CMR, Swallow, ChipNeMo for; Ibrahim's two sizes show similar relative rises"),
 ("Tokenizer extension: extend vocab, embedding-only phase, then full CPT", "Reading, Other findings", "brief embedding-only phase", "kept", "Chinese-LLaMA, Swallow, ChipNeMo numbers added"),
 ("Long-context extension is CPT: 128k recipes, upsampled long docs, rescaled RoPE; link Positional Encodings", "Reading, What and when", "Long-context extension is CPT too", "kept", ""),
 ("Mid-training annealing is the same machinery by the builder; link Pretraining", "Reading, What and when", "Mid-training and CPT are the same machinery", "kept", ""),
 ("Parameter-level alternatives: EWC, LoRA-based CPT, model averaging / TIES merging; replay + schedule remains default", "Reading, Other findings", "Elastic weight consolidation", "kept", "merging evidence both ways added (Ibrahim A.2, Thomson report)"),
 ("After CPT re-run post-training (at least SFT); CPT damages instruction following", "Reading, Other findings", "Re-run post-training afterwards", "kept", "sourced: Jindal et al. 2024, up to 10 points on IFEval-style set"),
 ("Practitioners rarely publish budgets next to recipes", "Reading, What it costs", "Practitioners almost never publish a budget", "kept", ""),
 ("Thomson Reuters: 397B domain model on Qwen3.5", "Reading, What it costs", "Qwen3.5-397B-A17B", "kept", ""),
 ("Thomson: reported $40M in three months", "Reading, What it costs, Corrections", "$40M covers talent and compute over about two years", "corrected", "final run $450K (LawNext); 'three months' is The Batch's outlier; parent page corrected first"),
 ("Thomson: 200B curated tokens from 19T pool with DatologyAI", "Reading, What it costs", "200B curated tokens selected from a 19T-token pool", "kept", ""),
 ("Thomson: DPO against open-source constitution, GSPO for context compaction and document caching", "Reading, What it costs", "GSPO for context compaction and document caching", "kept", ""),
 ("Thomson: 35B open-weights sibling released alongside", "Reading, What it costs, Corrections", "will be", "corrected", "on Qwen3.6-35B, will be released for academic and non-commercial use"),
 ("Thomson shape: select hard from larger pool, then re-align", "Reading, What it costs", "select hard from a much larger pool", "kept", "plus the report's one-third replay"),
 ("Treat the $40M as reported not audited (The Batch, Sept 2026)", "Reading, What it costs", "remain reported, not audited", "kept", ""),
 ("Neon: midtraining + RL on real lab records beats GPT-6 Astra and Claude Fable 5.1 at lower cost per analysis", "Reading, What it costs", "Claude Fable 5.1", "kept", ""),
 ("Neon surpasses frontier models on FrontierXRD", "Reading, What it costs", "2.7% to 55.3% on FrontierXRD", "kept", ""),
 ("Neon deployed in labs analysing superconductor and magnet experiments", "Reading, What it costs", "superconductor and magnet experiments", "kept", ""),
 ("Operational data establishes Pareto-optimal cost-performance frontier", "Reading, What it costs", "Pareto-optimal cost-performance frontier", "kept", ""),
 ("Most organisations already hold that data and do not think of it as a corpus", "Reading, What it costs", "do not think of it as a corpus", "kept", ""),
 ("Periodic link (10 min)", "Reading and Further reading", "periodic.com/news/nature-is-our-learning-environment", "kept", ""),
 ("Checklist 1: target and guard metrics; evaluate base on both", "Reading, Checklist", "Define target and guard metrics", "kept", ""),
 ("Checklist 2: pilots for ratio (CMR-style) and peak LR (~0.1x; WSD if multi-stage)", "Reading, Checklist", "Pilot runs", "corrected", "0.1x given as a starting point among pilots, not a rule"),
 ("Checklist 3: replay close to original; dedup domain against evals", "Reading, Checklist", "deduplicate the domain data against your evaluations", "kept", ""),
 ("Checklist 4: monitor both loss families; forgetting shows early", "Reading, Checklist", "Monitor both loss families", "kept", ""),
 ("Checklist 5: post-train; compare against no-CPT fine-tuned baseline", "Reading, Checklist", "no-CPT baseline", "kept", ""),
 ("See also data-curation topic and Alignment", "Reading, Checklist; Further reading", "3c65c17b0d0d811fa5ecda8d365ab00f", "kept", ""),
 ("Header: 6 min read + 3h30m resources", "Header", "min read", "corrected", "recomputed from the new Reading tab and resource list"),
]
out = []; missing = 0
for fact, where, probe, st, note in F:
    ok = probe in page or probe in raw
    missing += not ok
    out.append({'fact': fact, 'where': where, 'probe': probe, 'found': ok, 'status': st, 'note': note})
json.dump({'source': 'live.md (Notion, last edited 2026-09-24)', 'facts': len(out), 'kept': sum(o['status'] == 'kept' for o in out),
           'corrected': sum(o['status'] == 'corrected' for o in out), 'dropped': 0, 'probes_missing': missing, 'items': out},
          open(os.path.join(HERE, 'coverage.json'), 'w'), indent=1, ensure_ascii=False)
print(len(out), 'facts;', missing, 'probes missing')
for o in out:
    if not o['found']: print('MISSING', o['probe'])
