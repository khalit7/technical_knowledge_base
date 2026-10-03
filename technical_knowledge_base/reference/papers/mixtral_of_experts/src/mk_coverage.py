"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header and links (live.md lines 18 to 22)
 ('Reading time line "9 min read, +~2h 55m resources"', 'dropped: replaced by the build-computed reading time and resources total of the new page', ['min to read', 'of resources']),
 ('Authors/lab: Mistral AI (Jiang, Sablayrolles, Roux, Mensch et al.)', R + ', headline card (all 26 authors)', ['Albert Q. Jiang', 'Alexandre Sablayrolles', 'Antoine Roux', 'Arthur Mensch', 'Mistral AI']),
 ('Date: January 2024 (arXiv v1 2024-01-08; weights released via magnet link 2023-12-08)', R + ', card and Problem', ['January 2024', 'arXiv v1 8 January 2024', 'magnet link on 8 December 2023']),
 ('Link arXiv 2401.04088 (~45 min)', 'card and Further reading', ['https://arxiv.org/abs/2401.04088', '(45 min)']),
 ('Link Blog mistral.ai/news/mixtral-of-experts (~10 min)', 'Further reading, Problem, cost section', ['https://mistral.ai/news/mixtral-of-experts/', '(10 min)']),
 ('Link Code mistral-src (repo, ~20 min for README and entry path)', 'card, Further reading, Using it (now redirects to mistral-inference, archived)', ['https://github.com/mistralai/mistral-src', 'about 20 minutes for the README and entry path', 'archived']),
 ('Added to KB: 2026-08-24', 'dropped: Notion bookkeeping, kept in the database row', []),
 # best resources
 ('HF Mixture of Experts Explained (~30 min): canonical MoE explainer written for the Mixtral release; routing, load balancing, expert parallelism, MoE fine-tuning gotchas', 'Further reading', ['https://huggingface.co/blog/moe', 'the canonical MoE explainer, written for the Mixtral release', 'fine-tuning gotchas (instability, router sensitivity)']),
 ('Grootendorst Visual Guide to MoE (~30 min): best diagrams of router, top-K gating, capacity; ends with Mixtral walkthrough', 'Further reading', ['https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-mixture-of-experts', 'the best diagrams of the router, top-K gating, and capacity concepts', 'ends with a Mixtral walkthrough']),
 ('Cameron Wolfe MoE LLMs deep dive (~40 min): lineage sparsely-gated MoE, Switch, Mixtral, fine-grained designs; sparse vs active math', 'Further reading', ['https://cameronrwolfe.substack.com/p/moe-llms', 'traces the lineage from sparsely-gated MoE and Switch through Mixtral', '(40 min)']),
 ('Mistral release post (~10 min, same as Links): cost-performance claim and serving story (vLLM + Megablocks, Skypilot)', 'Further reading; cost section', ['concise statement of the cost-performance claim and the serving story (vLLM + Megablocks, Skypilot deployment)']),
 # problem
 ('Late 2023 open-weights frontier Llama 2 70B; 70B params touched per token, inference cost scaled with quality', R + ', Problem', ['By late 2023 the open-weights quality frontier was Llama 2 70B', '70B parameters touched for every token, so inference cost scaled with quality']),
 ('Sparse MoE promised to decouple parameter count from per-token compute (Shazeer 2017, GShard, Switch)', R + ', Problem', ['Shazeer et al. 2017', 'GShard', 'decouple parameter count from per-token compute']),
 ('No open-weights MoE at SOTA; MoE mostly Google-internal, reputation for training instability and routing complexity', R + ', Problem', ['no open-weights MoE had reached state-of-the-art quality', 'Google-internal technique with a reputation for training instability and routing complexity']),
 ('The question: small simple SMoE recipe (few large experts, top-2, no capacity-factor drama) for 70B quality at 13B compute, Apache 2.0', R + ', Problem ("no capacity-factor drama" kept as "nothing exotic in the paper": the paper never discusses capacity; Megablocks makes it dropless, cost section)', ['few large experts, top-2 routing', '70B-class quality at 13B-class compute, released fully open under Apache 2.0']),
 # method: architecture
 ('Mixtral 8x7B is Mistral 7B with two changes: native 32k context, every FFN replaced by an MoE layer', R + ', Architecture', ['Two changes from', 'fully dense context length of 32k tokens', 'every feed-forward (FFN) sub-block replaced by a Mixture-of-Experts layer']),
 ('Config: dim 4096, 32 layers, 32 heads with 8 KV heads (GQA), hidden_dim 14336, vocab 32000, num_experts 8, top_k 2', R + ', Architecture (Table 1); Tables tab recount', ['14336', '32000', '32768', 'grouped-query attention']),
 ('Attention, embeddings, norms shared; only FFNs replicated 8x; 47B sparse, 13B active', R + ', Architecture (recounted: 46.7B and 12.9B)', ['Only the FFNs are copied eight times; attention, embeddings and norms are shared', '46.7B', '12.9B']),
 # routing
 ('Per layer, per token, linear router W_g produces 8 logits; y = sum_i Softmax(Top2(x . W_g))_i * SwiGLU_i(x), softmax over top-2 logits only', R + ', the router', ['a linear router', 'produces 8 logits', 'Softmax(Top2(', 'softmax runs over the kept two only']),
 ('K=2 is the compute knob: growing n raises capacity at roughly constant FLOPs, growing K raises active compute', R + ', the router', ['is the compute knob', 'while keeping its computational cost effectively constant', 'growing <i>K</i> raises active compute']),
 ('Close to GShard except every FFN is MoE (GShard every other) and plain top-K for the second expert instead of GShard stochastic second choice', R + ', the router', ['GShard replaced every other one', 'more elaborate gating strategy for the second expert', 'probability proportional to its gate weight']),
 ('No discussion of auxiliary load-balancing losses or capacity factors; recipe deliberately minimal', R + ', the router (plus the HF config value 0.02)', ['Notably there is no discussion of auxiliary load-balancing losses or capacity factors; the recipe presented is deliberately minimal', 'router_aux_loss_coef']),
 # systems view
 ('Compute cost tracks active (13B), memory tracks sparse (47B, still under Llama 2 70B)', R + ', cost section; animation', ['compute follows active, memory follows total', 'which is still smaller than Llama 2 70B']),
 ('Expert FFNs as block-sparse matmuls via Megablocks, which Mistral upstreamed into vLLM', R + ', cost section (vLLM PR 2011)', ['block-sparse matrix multiplications', 'upstreamed them into vLLM', 'pull request 2011']),
 ('Shards with expert parallelism; load balancing across GPUs the operational concern', R + ', cost section', ['expert parallelism', 'balancing load across GPUs becomes the operational concern']),
 ('SMoE overhead: shines at high batch (arithmetic intensity), still low latency at small batch vs dense 70B', R + ', cost section; animation and throughput chart (quantified: the advantage over Llama 2 70B is largest at batch 1 and at compute-bound batches)', ['faster inference speed at low batch-sizes, and higher throughput at large batch-sizes', 'arithmetic intensity', 'Idealised decode throughput']),
 # long context
 ('Trained multilingually at 32k; 100% passkey retrieval at any depth and length up to 32k; proof-pile perplexity decreases monotonically; long context genuinely used', R + ', Long context (plus RULER effective length)', ['pretrained with multilingual data at a 32k context', '100% retrieval accuracy', 'decreases monotonically', 'so the long context is used, not just tolerated']),
 # routing analysis
 ('Section 5 the most interesting part: expert assignment over Pile subsets at layers 0, 15, 31', R + ', Routing analysis; tables tab decoded figures', ['the most interesting part of the paper', 'layers 0, 15 and 31']),
 ('No domain specialisation: near-identical distributions for ArXiv, PubMed, PhilPapers, Github etc.; only DM Mathematics deviates marginally (synthetic, narrow), mostly first and last layers; no math or code expert; experts specialise on syntax not topic', R + ', Routing analysis (checked by decoding Figure 7: DM Mathematics deviates most at layer 15, not at the first and last layers as the text says)', ['nearly identical for ArXiv, PubMed, PhilPapers, GitHub and the rest', 'synthetic nature', 'The folk intuition of a "math expert" or "code expert" is wrong for this model; experts specialise on syntax, not topic', 'not at the first and last as the text says']),
 ('Syntactic structure: self in Python and Question in English route to same expert; indentation tokens cluster on same experts, especially first and last layers', R + ', Routing analysis; toy tab panel 1', ["'self' in Python and 'Question' in English", 'indentation tokens in code', 'particularly at the first and last layers']),
 ('Positional locality: at layers 15 and 31 same first-choice expert repeats ~23-28% (baseline 12.5%); first-or-second ~62-67% (baseline ~46%); layer 0 near random', R + ', Routing analysis (corrected: those ranges are layer 15; layer 31 is 19.7 to 26.3% and 44.5 to 53.6%)', ['23.6 to 28.4%', '19.7 to 26.3%', '61.6 to 67.0%', '44.5 to 53.6%', 'Layer 0 is near random']),
 ('Implications: temporal locality exploitable for caching and speculative expert prefetch; causes expert over-subscription hotspots under expert parallelism', R + ', Routing analysis', ['exploited for caching', 'speculatively prefetch', 'over-subscription of certain experts under expert parallelism']),
 # instruct
 ('Mixtral Instruct: SFT on instruction data then DPO on paired feedback; no RLHF/PPO; early large-scale validation of SFT+DPO', R + ', Instruct', ['Supervised fine-tuning on an instruction dataset', 'no RLHF with PPO anywhere in the pipeline, an early large-scale validation of the SFT plus DPO recipe']),
 # results
 ('vs Llama 2 70B (13B vs 70B active): MMLU 70.6 vs 69.9, GSM8K 8-shot maj@8 74.4 vs 69.6, MATH 28.4 vs 13.8, MBPP 60.7 vs 49.8, HumanEval 40.2 vs 29.3', R + ', Results; Table 2 in tables tab', ['MMLU 70.6% against 69.9%', 'GSM8K (8-shot, maj@8) 74.4% against 69.6%', 'MATH (4-shot, maj@4) 28.4% against 13.8%', 'MBPP 60.7% against 49.8%', 'HumanEval 40.2% against 29.3%']),
 ('Only comprehension (BoolQ/QuAC) and WinoGrande/HellaSwag stay marginally with Llama', R + ', Results (corrected: TriviaQA too, and WinoGrande by 3.2 points)', ['HellaSwag (−1.0), TriviaQA (−1.5) and WinoGrande (−3.2 points)', 'reading comprehension (BoolQ and QuAC']),
 ('Math and code are the blowouts', R + ', Results', ['Math and code are the blowouts']),
 ('vs GPT-3.5: MMLU 70.6 vs 70.0, MBPP 60.7 vs 52.2, GSM8K 5-shot 58.4 vs 57.1; parity or above', R + ', Results; Table 3 with provenance', ['MMLU 70.6% against 70.0%', 'MBPP 60.7% against 52.2%', 'GSM8K (5-shot) 58.4% against 57.1%', 'Effectively at parity or above']),
 ('Multilingual: beats Llama 2 70B on French, German, Spanish, Italian (ARC-c, HellaSwag, MMLU), credited to upsampled multilingual pretraining data absorbed by spare capacity', R + ', Results; Table 4', ['French, German, Spanish, Italian', 'deliberately upsampled multilingual pretraining data']),
 ('Instruct: MT-Bench 8.30; Arena Elo 1121 (Dec 2023) above GPT-3.5-Turbo 1117, Claude-2.1 1117, Gemini Pro 1111, Llama 2 70B chat 1077; best open-weights at release by large margin', R + ', Instruct; Elo table', ['8.30 on MT-Bench', '1121', 'Claude-2.1 (1117)', 'Gemini Pro (1111)', 'Llama-2-70b-chat (1077)', 'the best open-weights model at release by a large margin']),
 ('Bias: higher BBQ accuracy (56.0 vs 51.5), more positive and lower-variance BOLD sentiment', R + ', Results (corrected: standard deviation lower in only 2 of 5 groups; mean higher in 3 of 5)', ['56.0% against 51.5%', 'the standard deviation is lower in 2 of 5']),
 ('Headline: Llama 2 70B / GPT-3.5 quality with 5x fewer active parameters, fully open under Apache 2.0', R + ', Results', ['The headline: Llama 2 70B and GPT-3.5 quality with 5x fewer active parameters, fully open under Apache 2.0']),
 # why it matters
 ('First open-weights MoE at SOTA; moved MoE from exotic Google technique to default for efficient frontier models', R + ', Why it matters', ['first open-weights MoE at state-of-the-art quality', 'moved MoE from "exotic Google technique" to the default architecture for efficient frontier models']),
 ('8x7B released as bare magnet link a week before the paper', R + ', Problem (corrected: a month, 31 days, before the paper)', ['a bare magnet link', 'the paper a month later']),
 ('Kicked off open-MoE era: DBRX, Qwen-MoE, DeepSeek-V2/V3, Llama 4, gpt-oss follow the sparse-FFN template', R + ', Why it matters (with sourced quotes from Qwen and Databricks)', ['DBRX', 'Qwen1.5-MoE', 'DeepSeek-V2', 'Llama 4', 'gpt-oss', 'all following the sparse-FFN template it popularised']),
 ('Validated three recipes: coarse top-2 SMoE, SFT+DPO without PPO, open weights plus upstreamed kernels (vLLM/Megablocks)', R + ', Why it matters', ['It validated three recipes at once', 'SFT plus DPO as a complete post-training pipeline (no PPO)', 'open weights plus upstreamed inference kernels']),
 ('Routing analysis standard citation for no domain specialisation; motivated fine-grained experts (DeepSeekMoE many small plus shared experts)', R + ', Why it matters (corrected: DeepSeekMoE was posted three days later, does not cite Mixtral, and argued its own case)', ['remains the standard citation', 'not citing Mixtral', 'knowledge hybridity']),
 ('Active-vs-sparse distinction now the vocabulary for pricing MoE inference', R + ', Why it matters', ['now the vocabulary everyone uses to price MoE inference']),
 # connections
 ('Connection: Switch Transformer, top-1 predecessor; Mixtral top-2 every-layer no-fuss variant made it land in open weights', R + ', Connections; Further reading', ['https://app.notion.com/p/3c65c17b0d0d81a8b541c9babbf40c94', "Mixtral's top-2, every-layer, no-fuss variant is what finally made the idea land in open weights"]),
 ('Connection: DeepSeek-V3, fine-grained, shared experts, aux-loss-free balancing respond to coarse-expert regime', R + ', Connections', ['https://app.notion.com/p/3c65c17b0d0d815fb8dac9ba1e35ab81', 'auxiliary-loss-free balancing']),
 ('Connection: DPO, Mixtral Instruct among first flagship SFT+DPO models', R + ', Connections', ['https://app.notion.com/p/3c65c17b0d0d818bb1d8cafd30e20f9e', 'among the first flagship models aligned with SFT plus DPO only']),
 ('Connection: vLLM PagedAttention, Megablocks MoE kernels upstreamed into vLLM', R + ', Connections', ['https://app.notion.com/p/3c65c17b0d0d81bf8b90ca93fee19f5f', 'Mistral upstreamed Megablocks-based MoE kernels into vLLM']),
 ('Connection: Attention Is All You Need, base decoder-only transformer whose FFN the MoE replaces', R + ', Connections', ['https://app.notion.com/p/3c65c17b0d0d81999af7f16f8ed8ee9e', 'whose FFN sub-block the MoE layer replaces']),
 ('Topics: llms, llm-training-and-post-training, inference-and-serving', 'Connections and Further reading', ['https://app.notion.com/p/3c65c17b0d0d812d9e00f6ec89965286', 'https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b', 'https://app.notion.com/p/3c65c17b0d0d81c08b3bc95ff45c7b13']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:38)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
