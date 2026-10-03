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
 # header
 ('Reading time line "11 min read, +~2h 40m resources"', 'dropped: replaced by the build-computed reading time and resources total of the new page', ['min to read', 'of resources']),
 ('Authors: Kwon, Li, Zhuang, Sheng, Zheng, Yu, Gonzalez, Zhang, Stoica', R + ', headline card', ['Woosuk Kwon', 'Zhuohan Li', 'Siyuan Zhuang', 'Ying Sheng', 'Lianmin Zheng', 'Cody Hao Yu', 'Joseph E. Gonzalez', 'Hao Zhang', 'Ion Stoica']),
 ('Lab: UC Berkeley, with Stanford and UCSD; SOSP 2023', R + ', headline card (independent researcher added from the paper)', ['UC Berkeley, with Stanford, UC San Diego', 'SOSP 2023']),
 ('Date: September 2023 (arXiv 2023-09-12; SOSP 23, October 2023)', R + ', headline card', ['arXiv 2023-09-12', "SOSP '23"]),
 ('Link arXiv 2309.06180 (~45 min)', 'card and Further reading', ['https://arxiv.org/abs/2309.06180', '(45 min)']),
 ('Link GitHub vllm-project/vllm (repo, ~25 min for the README and entry path)', 'card and Further reading', ['https://github.com/vllm-project/vllm', 'about 25 minutes for the README and entry path']),
 ('Added to KB: 2026-08-24', 'breadcrumb line', ['added to the knowledge base 2026-08-24']),
 # resources
 ('vLLM announcement blog (June 2023, ~10 min): authors own short version, block tables, copy-on-write, 24x over HF', 'Further reading, Best resources; Then and now', ['https://blog.vllm.ai/2023/06/20/vllm.html', 'up-to-24x-over-Hugging-Face headline', '(10 min)']),
 ('Anyscale: How continuous batching enables 23x throughput (~20 min)', 'Further reading, Best resources', ['https://www.anyscale.com/blog/continuous-batching-llm-inference', 'the Orca idea that PagedAttention composes with', '(20 min)']),
 ('Aleksa Gordic: Inside vLLM (~45 min): code-level walkthrough of the modern engine', 'Further reading, Best resources', ['https://www.aleksagordic.com/blog/vllm', 'the bridge from this paper to today', '(45 min)']),
 ('vLLM V1 alpha release blog (January 2025, ~15 min)', 'Further reading, Best resources; Then and now', ['https://blog.vllm.ai/2025/01/27/v1-alpha-release.html', 'a year and a half of production', '(15 min)']),
 # problem
 ('Serving throughput is memory-bound; decode underutilises the GPU; fix is batching; batch capped by KV cache', R + ', Problem', ['memory-bound', 'underutilizes the computation power of GPUs', 'batch many requests']),
 ('A100-40GB, 13B model: weights ~65%, KV cache over 30%', R + ', Problem, Figure 1', ['about 65% of memory holds the weights', '">30%" in Figure 1']),
 ('800 KB per OPT-13B token = 2 x 5120 x 40 x 2 bytes; 2048-token request needs 1.6 GB', R + ', Problem; Tables tab', ['800 KB', '5,120 (hidden size)', '40 (layers)', '2,048 tokens', '1.6 GB']),
 ('FasterTransformer and Orca pre-allocate one contiguous chunk per request at the maximum length (e.g. 2048)', R + ', Problem', ['one contiguous chunk', 'maximum possible length']),
 ('Three wastes: reserved slots, internal fragmentation, external fragmentation from the buddy allocator', R + ', Problem; Simulate tab', ['Reserved slots', 'Internal fragmentation', 'External fragmentation', 'buddy allocator']),
 ('Only 20.4% to 38.2% of KV memory holds token states (Orca variants, Fig. 2)', R + ', Problem, card', ['only 20.4% to 38.2% of the KV cache memory']),
 ('Contiguous layouts make sharing (parallel sampling, beam search) impossible', R + ', Problem', ['memory sharing is not possible']),
 ('Compaction impractical and would not enable sharing', R + ', Problem', ['Compaction', 'impractical']),
 # method
 ('Core move: OS virtual memory with paging; blocks are pages, tokens bytes, requests processes', R + ', The idea', ['virtual memory with paging', 'one can think of blocks as pages, tokens as bytes, and requests as processes']),
 ('Fixed-size KV blocks of B tokens, default 16', R + ', The idea; Ablations', ['KV blocks', 'vLLM\'s default is 16']),
 ('Blockwise attention: fetch K_j wherever it lives, score row A_ij, accumulate against V_j', R + ', The idea, Eq. 4', ['the kernel fetches each block wherever it lives', 'the row of attention scores of query i on block j']),
 ('Blocks need not be contiguous in physical memory', R + ', The idea', ['which need not sit next to each other in memory']),
 ('Fused kernels: reshape + block write; block read + attention (from FasterTransformer, one warp per block, variable lengths); batched block copy', R + ', Implementation', ['Fused reshape and block write', 'Fused block read and attention', 'one GPU warp per block', 'Fused block copy']),
 ('Paged kernel 20-26% slower than FasterTransformer in isolation; memory win dominates end to end', R + ', Ablations (corrected: 19 to 26% only at batch 32, 25 to 44% at batch 8); Tables tab', ['"20 to 26%"', '25% to 44% at batch size 8']),
 ('Logical KV blocks filled left to right; per-sequence block table maps logical to physical plus fill count, like a page table', R + ', Block tables; animation', ['logical KV blocks', 'block table', 'exactly like a page table']),
 ('Physical blocks on GPU and CPU (swap); allocated on demand, never reserved for max length', R + ', Block tables; Preemption', ['physical KV blocks', 'the same on CPU memory, for swapping', 'on demand']),
 ('Waste bounded to one partially filled block per sequence; 96.3% holds token states', R + ', Block tables; card; Simulate tab', ['at most one partly filled block', '96.3%']),
 ('Three primitives: fork, append, free', R + ', Sharing', ['fork', 'append', 'free (a finished sequence)']),
 ('Parallel sampling: shared prompt blocks, reference counts, block-granularity copy-on-write of only the last prompt block', R + ', Sharing; animation Fig. 8', ['reference count', 'copy-on-write at block granularity', 'only the prompt\'s last, partly filled block is ever copied']),
 ('Beam search shares diverging chains like a fork tree; blocks freed when refcount hits zero', R + ', Sharing; animation Fig. 9', ['process tree of repeated forks', 'blocks 2, 4, 5 and 8 are freed']),
 ('Shared system prompts like OS shared libraries', R + ', Sharing', ['as how OS handles shared library across processes']),
 ('Mixed decoding modes batch together freely, which contiguous systems cannot do', R + ', Sharing', ['which existing systems cannot efficiently do']),
 ('FCFS with Orca-style iteration-level batching; prompt and decode tokens concatenated in one invocation', R + ', Background, Block tables; How much to believe (released code differed)', ['first come, first served', 'iteration-level scheduling', 'concatenates all the iteration\'s input tokens']),
 ('Preempt latest arrivals; all-or-nothing eviction; gang-schedule sequence groups', R + ', Preemption', ['the latest arrivals go first', 'all-or-nothing', 'gang-scheduled']),
 ('Recovery: swap to CPU, or recompute prompt + generated tokens in one prefill pass', R + ', Preemption', ['Swapping', 'Recomputation', 'one prompt-phase iteration']),
 ('Ablation: recompute wins at small blocks (PCIe), swap at large; comparable at 16-64; recompute overhead never above 20% of swap latency', R + ', Ablations (corrected: the 20% sentence fails as written, 117% at 256; holds as "never more than 20% slower"); Tables tab', ['from 16 to 64 the two perform alike', 'cannot mean what it says', '117%']),
 ('Distributed: Megatron tensor parallelism, centralised KV manager, workers share mapping, store own heads slice, no coordination', R + ', Distributed', ['Megatron-LM-style tensor parallelism', 'one KV cache manager in the centralised scheduler', 'Workers never coordinate on memory management']),
 ('~8.5K lines Python + ~2K lines C++/CUDA; FastAPI frontend with OpenAI API', R + ', Implementation', ['8.5K lines of Python and 2K lines of C++/CUDA', 'FastAPI frontend that extends the OpenAI API']),
 # results
 ('Throughput 2-4x over Orca (Oracle) at same latency, OPT-13B/66B/175B and LLaMA-13B, ShareGPT and Alpaca', R + ', card and Results (corrected: the abstract says over FasterTransformer and Orca; read off Figure 12 it is 1.5 to 2.3x over Oracle on ShareGPT)', ['2 to 4×', 'over FasterTransformer and Orca (abstract)', 'OPT-13B, 66B and 175B and LLaMA-13B']),
 ('2.7-8x over Orca (Max), up to 22x over FasterTransformer', R + ', Results', ['"2.7× to 8×"', 'up to 22× FasterTransformer']),
 ('Gains grow with longer sequences, larger models, more complex decoding', R + ', Results (checked: not monotone in model size)', ['is more pronounced with longer sequences, larger models, and more complex decoding algorithms', 'not monotone in model size']),
 ('Batch size: 30.4 vs 7.0 (Orca Max) to 13.6 (Orca Oracle), OPT-13B ShareGPT', R + ', card, Results, Tables tab', ['30.42', '13.62', '7.00']),
 ('Beam search width 6 saves up to 55.2% (Alpaca) and 66.3% (ShareGPT); parallel sampling 6.1-9.8% and 16.2-30.5%', R + ', Sharing, Results', ['37.6% to 55.2%', '44.3% to 66.3%', '6.1% to 9.8%', '16.2% to 30.5%']),
 ('Shared-prefix translation 1.67x (1-shot) to 3.58x (5-shot) over Orca Oracle', R + ', Results', ['1.67×', '3.58×']),
 ('Block size 16 balances parallelism against fragmentation, became default', R + ', Ablations; Then and now', ['large enough to efficiently utilize the GPU and small enough to avoid significant internal fragmentation', 'DEFAULT_BLOCK_SIZE = 16']),
 # why it matters
 ('Made high-throughput serving an open-source commodity by importing 50-year-old OS ideas', R + ', Why it matters (now "from the 1960s", Kilburn et al. 1962)', ['open-source commodity', 'operating-system ideas from the 1960s']),
 ('Adopted by TensorRT-LLM, TGI, SGLang (RadixAttention on paged KV), DeepSpeed; continuous batching + paged KV is the baseline', R + ', Why it matters; Then and now (each with a quote)', ['TensorRT-LLM', 'TGI', 'RadixAttention', 'DeepSpeed-FastGen', 'as compared to vLLM']),
 ('vAttention: CUDA virtual memory APIs; chunked prefill (Sarathi) and disaggregated prefill/decode; MLA from the model side', R + ', Why it matters; Then and now', ['vAttention', 'chunked prefill', 'DistServe', 'Multi-head latent attention']),
 ('vLLM grew: prefix caching, chunked prefill, speculative decoding, FP8/quantized KV, guided decoding, NVIDIA/AMD/TPU/Neuron/Intel', R + ', Why it matters, Using it (hardware list updated from the current README)', ['automatic prefix caching', 'speculative decoding', 'quantised KV cache', 'structured (guided) outputs', 'NVIDIA, AMD and Intel GPUs']),
 ('V1: alpha Jan 2025, default in 2025, V0 removed; token budget; zero-overhead prefix cache; EngineCore; ~1.7x', R + ', Why it matters; Then and now (dates sourced: v0.8.0 default, v0.11.0 only engine)', ['alpha January 2025', 'v0.8.0', 'v0.11.0', 'EngineCore', '1.7×']),
 ('vLLM joined PyTorch Foundation May 2025; llm-d (Red Hat, Google, IBM)', R + ', Why it matters; Then and now (llm-d contributors completed: CoreWeave, NVIDIA)', ['PyTorch Foundation-hosted project on 7 May 2025', 'llm-d', 'IBM Research']),
 ('Rollout engine inside RL post-training (verl, TRL, OpenRLHF)', R + ', Why it matters', ['verl', 'TRL', 'OpenRLHF']),
 ('Block manager, scheduler, paged kernels descend from Sections 4.2-4.5: still the mental model', R + ', Why it matters', ['descend directly from §4.2 to §4.5']),
 # connections
 ('Attention Is All You Need: KV cache is per-token key/value state', 'Connections; Further reading', ['3c65c17b0d0d81999af7f16f8ed8ee9e', 'per-token key and value state']),
 ('FlashAttention: complementary; compute/IO in kernel vs where KV lives; V1 builds on FlashAttention', 'Connections; Further reading', ['3c65c17b0d0d81e4a3e8e7a2c4771381', 'vLLM V1 integrated FlashAttention 3']),
 ('Megatron-LM: tensor parallelism with KV manager centralised above', 'Connections; Further reading', ['3c65c17b0d0d8133ae92fbe90a1f308e']),
 ('DeepSeek-V3: MLA shrinks KV; serving needed new paged kernels', 'Connections; Further reading', ['3c65c17b0d0d815fb8dac9ba1e35ab81', 'FlashMLA']),
 ('DeepSeek-R1: RL post-training depends on vLLM-class engines', 'Connections; Further reading', ['3c65c17b0d0d813faca4f7a51eaa0c65', 'rollout generation']),
 ('Topics: inference-and-serving, cuda-and-gpu-programming, swe-and-system-design', 'Connections; Further reading, Topics', ['3c65c17b0d0d81c08b3bc95ff45c7b13', '3c65c17b0d0d81c39f34d5e070d783c1', '3c65c17b0d0d81048ae0dd14ac399b4d']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['PagedAttention pages the KV cache into fixed 16-token blocks']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
