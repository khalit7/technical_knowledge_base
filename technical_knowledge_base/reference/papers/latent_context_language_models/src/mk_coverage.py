"""Write coverage.json: every fact, number, caveat and link of live.md (the Notion page before migration,
this paper: End-to-End Context Compression at Scale, arXiv 2606.09659) with where the HTML carries it, and verify
each item's check strings against the built index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header
 ('Authors: Ang Li, Sean McLeish, Haozhe Chen (equal), with Nimit Kalra, Micah Goldblum, Pavel Izmailov, Tom Goldstein and others', R + ', headline card', ['Ang Li, Sean McLeish, Haozhe Chen (equal contribution)', 'Nimit Kalra', 'Micah Goldblum', 'Pavel Izmailov', 'Tom Goldstein']),
 ('Institutions: NYU, Maryland, Princeton, Columbia, Harvard, LLNL, Modal', R + ', headline card', ['NYU', 'Modal Labs', 'University of Maryland', 'Princeton', 'Columbia', 'Harvard', 'Lawrence Livermore National Laboratory']),
 ('Date: June 2026, arXiv v1 8 June 2026', R + ', headline card', ['8 June 2026 (arXiv v1']),
 ('Links: arXiv 2606.09659 (1h 30m), code LeonLixyz/LCLM (20 min), weights huggingface.co/latent-context (10 min)', 'headline card; Further reading', ['https://arxiv.org/abs/2606.09659', 'https://github.com/LeonLixyz/LCLM', 'https://huggingface.co/latent-context', '1h 30m', '20 min for the entry path']),
 ('Best resources: the paper itself; Sections 5 and 6 are the value; Section 5 answers design questions builders would guess at', R + ', Architecture search intro; Further reading', ['This is the part anyone building a compressor would otherwise have to guess']),
 ('REFRAG (Meta, 2025, 45 min): RAG-specific version, precomputable chunk embeddings, RL policy choosing what to expand; narrower, more deployable sibling', 'Further reading', ['https://arxiv.org/abs/2509.01092', 'precomputable chunk embeddings and an RL policy choosing what to expand', 'narrower, more deployable sibling']),
 ('Prompt Compression survey (NAACL 2025, ~1h): map of the field, gist / ICAE / AutoCompressor / 500xCompressor / xRAG', 'Further reading; Why it matters', ['https://arxiv.org/abs/2410.12388', 'gist, ICAE, AutoCompressor, 500xCompressor and xRAG']),
 # problem
 ('Long-context inference bottlenecked by memory because the KV cache grows with context length', R + ', Problem', ['bottlenecked by memory', 'KV cache grows with context length']),
 ('Established fix: KV cache compression, prefill normally then evict by heuristic', R + ', Problem', ['prefill normally, then evict entries by some heuristic']),
 ('Problem 1: requires the full context to fit and be prefilled first; the expensive part still happens', R + ', Problem', ['The expensive part still happens', 'need the full context to fit in the window and to be prefilled first']),
 ('Problem 2: query-dependent variants (SnapKV) tuned to one question, do not survive a second turn', R + ', Problem', ['Query-dependent caches do not survive a second turn']),
 ('Problem 3: non-uniform eviction across heads/layers cannot shrink sequence dimension; mask instead; forfeit benefit in paged-attention engine', R + ', Problem; animation', ['cannot cut the sequence-length dimension', 'forfeit the memory and throughput benefit in a paged-attention engine']),
 ('Problem 4: largely unsupported in vLLM and SGLang', R + ', Problem', ['largely unsupported in vLLM and SGLang']),
 ('Soft-token compression: encode raw tokens into a much shorter sequence of continuous embeddings in place of the context', R + ', Problem', ['much shorter sequence of continuous embeddings']),
 ('In principle better shaped: parallelisable, works in standard engines, extends decoder past native context', R + ', Problem', ['compression is parallelisable', 'extend the decoder past its native context length']),
 ('In practice existing methods degraded the base model or needed task-specific finetuning, so lost to KV compression on the frontier', R + ', Problem', ['degraded the base model noticeably or only worked after task-specific finetuning']),
 ('The question: intrinsic or nobody trained one properly', R + ', Problem', ['did nobody train one properly']),
 # method
 ('Architecture: encoder maps each block of N tokens to one latent; pooling; adapter from encoder to decoder width; decoder consumes latents', R + ', Architecture', ['into one <b>latent token</b>', 'An <b>adapter</b> projects each latent']),
 ('Encoder window W is a separate knob from N', R + ', Architecture; N/W explorer', ['The encoder window <i>W</i> is a separate knob from the ratio <i>N</i>']),
 ('Architecture search is the most reusable part: pretrain from scratch at 38B tokens each, cleanroom so pretrained conventions do not bias', R + ', Architecture search', ['38B tokens per variant', 'cleanroom']),
 ('Mean pooling beats token-based pooling (CLS/EOS per latent)', R + ', Architecture search, finding 1; claim table', ['Mean pooling beats token pooling']),
 ('Concatenation indistinguishable from mean at small scale; at scale they swap: concat wins at 4x, mean at 16x', R + ', finding 1; claim table (judged)', ['Concatenation is indistinguishable from mean at this scale', 'concatenation is slightly better at 4x, mean at 16x']),
 ('Encoder window matters: W = N to 256 large gain, 1024 adds more; letting encoder contextualise is most of what makes latents good', R + ', finding 2; claim table', ['The encoder window matters more than expected', 'called a large gain']),
 ('Overlapping windows sounds necessary and is not: no better loss, costs compute', R + ', finding 2', ['sounds necessary and is not']),
 ('Causal encoder attention beats bidirectional, consistently; surprising; cuts against T5Gemma', R + ', finding 3; Why it matters', ['Causal encoder attention beats bidirectional', 'cuts against the T5Gemma result']),
 ('Plain two-layer MLP adapter beats attention adapter at less compute, contrary to prior work', R + ', finding 4 (and judged at scale)', ['A plain two-layer MLP adapter beats an attention-based adapter']),
 ('Training data: continual pretraining alternating compressed and uncompressed segments with memory tags, loss only on uncompressed tokens', R + ', Training', ['loss is taken <b>only on the uncompressed tokens</b>', 'memory_start']),
 ('...so the model learns to condition on latents at many positions rather than only the start', R + ', Training', ['condition on latents at many positions']),
 ('SFT covering reasoning, long-context instruction following, multi-turn chat', R + ', Training', ['reasoning, long-context instruction following and multi-turn chat']),
 ('Auxiliary reconstruction: decoder reproduces compressed text verbatim', R + ', Training', ['Auxiliary reconstruction']),
 ('Reconstruction alone: reconstructs perfectly and can do nothing else; NTP alone: latents support generation but lose exact strings', R + ', Training, why mix', ['cannot perform any other tasks', 'lose exact strings']),
 ('Staged training: adapter only, unfreeze encoder, unfreeze decoder at small LR, then SFT', R + ', Training; Table 1 in Tables tab', ['Stage 0 trains the adapter only', 'Stage 3 is SFT']),
 ('End to end from the start underperforms: decoder unaccustomed, large destabilising gradients', R + ', Training', ['the decoder is not used to the encoder', 'both sides take large gradients']),
 ('Same alignment-then-finetune shape as VLM training', R + ', Training', ['align-then-finetune shape as vision-language model training']),
 ('PEFT variants (frozen decoder, LoRA), what most prior work does, substantially underperform full training', R + ', Training; How much to believe', ['"substantially underperform"', 'LoRA']),
 ('Models: Qwen3-Embedding-0.6B encoder + Qwen3-4B-Instruct decoder, over 350B tokens each, at 4x, 8x, 16x', R + ', Training (models); token accounting', ['Qwen3-Embedding-0.6B encoder and a Qwen3-4B-Instruct-2507 decoder', 'Over 350B tokens each']),
 # results
 ('New Pareto frontier on TTFT against accuracy', R + ', Results', ['A new frontier on time to first token against accuracy']),
 ('8.8x faster than KV baselines at equal accuracy on RULER 4K (corrected: against FastKVzip, 2.4 points less accurate)', R + ', Results speed-up table; How much to believe 1', ['8.8x', 'is 2.4 points below the FastKVzip point']),
 ('5.2x on LongBench at 64K and LongHealth at 64K', R + ', Results speed-up table', ['LongBench 64K (Fig. 1)', 'LongHealth 64K (Fig. 5)', '5.2x']),
 ('KV methods appear as vertical lines because they prefill the full context regardless of ratio; higher LCLM ratio reduces decoder work', R + ', Results; Tables tab Pareto', ['KV methods appear as vertical lines', 'a higher LCLM ratio removes decoder work directly']),
 ('Memory from 4K to 1M: 16x peak memory flattens between 128K and 512K because encoder activations dominate and encoder processes fixed windows in batches', R + ', Results (memory); Figure 4 chart', ['stays flat at about 26 GB from 128K to 512K', 'encoder\'s batched activations']),
 ('Every KV baseline runs out of memory at 512K or 1M on a 141GB H200', R + ', Results (memory)', ['Every KV baseline runs out of memory at 512K and 1M', '141 GB H200']),
 ('4x: RULER 4K 91.76 vs 94.41; LongBench 46.04 vs 45.21; GSM8K 91.05 vs 93.25', R + ', Results quality table', ['91.76', '94.41', '46.04 against 45.21', '91.05', '93.25']),
 ('16x: RULER 4K 75.06, GSM8K 81.05; 16x discards 93.75% of a short dense maths prompt', R + ', Results', ['RULER 4K falls to 75.06 while GSM8K holds at 81.05', '93.75%']),
 ('Most baselines score approximately zero on GSM8K at any ratio (corrected: at 16x none above 31.39; at 4x KVzip 89.08)', R + ', Results; How much to believe 7', ['none above 31.39', 'KVzip reaches 89.08']),
 ('Scaling decoder 4B to 8B lowered pretraining loss much more than encoder 0.6B to 4B', R + ', Results (scaling)', ['0.6884 to 0.6591', 'only to 0.6860']),
 ('Downstream mixed: 4B encoder wins LongBench, LongHealth, GSM8K; 0.6B encoder wins every RULER length', R + ', Results (scaling)', ['the 4B encoder wins LongBench, LongHealth and GSM8K, the 0.6B encoder wins every RULER length']),
 ('Read as bigger encoder: better semantic aggregation, worse exact retrieval', R + ', Results (scaling)', ['better semantic aggregation and worse exact retrieval']),
 ('Agent: 512-token chunks, compress each, integer ids, EXPAND(i) returns original text', R + ', Agent; toy tab', ['512-token chunks', 'EXPAND(i)']),
 ('Agent skims an entire codebase at 16x and expands what it needs; improves exact-string retrieval; in some settings matches uncompressed (corrected: tested on RULER needles only)', R + ', Agent', ['The codebase in Figure 6 is the motivating illustration; no code task is evaluated']),
 ('Motivating example: bug in dashboard login flow lives in entitlement module that never contains either word; lexical and semantic search fail', R + ', Agent', ['dashboard login flow', 'entitlement module']),
 # why it matters
 ('Closes a gap that made the soft-token line look like a dead end; training-scale artefact not architectural limit', R + ', Why it matters', ['look like a dead end', 'training-scale artefact rather than an architectural limit']),
 ('Strongest published argument for a small encoder feeding a large decoder; others freeze decoder or train adapter only; recipe with the most evidence', R + ', Why it matters', ['strongest published argument for a small encoder feeding a large decoder', 'the recipe with the most evidence behind it']),
 ('Systems argument underrated: standard KV layout composes with vLLM, SGLang, paged attention; KV literature reports theoretical reduction no released kernel realises', R + ', Why it matters; Problem', ['The systems argument is the underrated one', 'no released kernel realises']),
 ('Algorithmic vs systems-realisable compression distinction worth carrying into any evaluation', R + ', Why it matters; Problem', ['algorithmic against systems-realisable compression']),
 ('Causal-encoder result is a live disagreement with T5Gemma; different jobs; unresolved; be suspicious', R + ', Why it matters', ['The causal-encoder result is a live disagreement', 'a good thing to be suspicious about']),
 ('Open directions: multiple granularities, allocate by information density, no expand tool; compress the model\'s own generated state (CoT, tool observations, history)', R + ', Why it matters', ['allocate capacity by information density', 'compress the model\'s own generated state']),
 # connections
 ('Connection: T5Gemma, the other route to spending more on reading than writing; disagree on causal encoder', R + ', Connections; Further reading', ['3d45c17b0d0d81a9a22ffaada508db5c', 'spending more parameters on reading than writing']),
 ('Connection: Trained Persistent Memory, same instinct applied to memory', R + ', Connections', ['3ce5c17b0d0d81978137dd8f8cab1c74', 'the same instinct applied to memory rather than input context']),
 ('Connection: vLLM PagedAttention, the KV layout baselines are constrained by', R + ', Connections', ['3c65c17b0d0d81bf8b90ca93fee19f5f', 'the reason systems-realisability is a real distinction']),
 ('Connection: DeepSeek-V3, MLA compresses KV inside attention; composes', R + ', Connections', ['3c65c17b0d0d815fb8dac9ba1e35ab81', 'the same goal one layer down']),
 ('Connection: Prime Agent, recursive-language-model direction', R + ', Connections', ['3cd5c17b0d0d81579a02f0431f24c6cb', 'recursive-language-model direction']),
 ('Connection: Mamba, fixed-size recurrent state with the same exact-recall cost', R + ', Connections', ['3c65c17b0d0d8179984fc3a1fee4c36a', 'fixed-size recurrent state']),
 ('Topics: inference-and-serving (KV cache, TTFT, memory), rag-and-retrieval (context compression for RAG, REFRAG), agentic-harnesses (skim-then-expand)', R + ', Connections; Further reading', ['3c65c17b0d0d81c08b3bc95ff45c7b13', '3c65c17b0d0d81b89145c37dfe8a3b0b', '3c65c17b0d0d81d881a8fe98b4cff7bb', 'skim-then-expand as a harness pattern']),
 ('Reading time 9 min, resources +3h 45m (recomputed for the new page)', 'header line', ['min to read The paper tab']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(html.unescape(re.sub(r'<[^>]+>', ' ', c))).strip() in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
