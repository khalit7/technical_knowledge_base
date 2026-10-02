"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised). Corrections of the old page are listed
with the corrected text as the check.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, K, T, N, F = 'The paper tab', 'Run the kernel tab', "The paper's tables tab", 'Then and now tab', 'Further reading'
C = [
 # header
 ('Reading time line "12 min read, +~4h resources"', 'dropped: replaced by the build-computed reading time and resources total (4h 00m, the same)', ['min to read', '4h 00m of resources']),
 ('Authors: Dao, Fu, Ermon, Rudra, Re (Stanford Hazy Research / U. Buffalo)', R + ', headline card', ['Tri Dao', 'Daniel Y. Fu', 'Stefano Ermon', 'Atri Rudra', 'Christopher Ré', 'Hazy Research', 'University at Buffalo']),
 ('Date: May 2022 (NeurIPS 2022)', R + ', headline card', ['May 2022 (arXiv v1)', 'NeurIPS 2022']),
 ('Link arXiv 2205.14135 (~1h)', 'card and ' + F, ['https://arxiv.org/abs/2205.14135', '(1h)']),
 ('Link code Dao-AILab/flash-attention (repo, ~25 min for README and entry path)', 'card and ' + F, ['https://github.com/Dao-AILab/flash-attention', 'about 25 minutes for the README and entry path']),
 ("Link Tri Dao's site (~5 min)", F, ['https://tridao.me/', '(5 min)']),
 # resources
 ('ELI5: FlashAttention (Gordic, ~25 min): gentle walkthrough of tiling and rescaling math, diagrams of block loops', F, ['https://gordicaleksa.medium.com/eli5-flash-attention-5c44017022ad', 'gentle walkthrough of the tiling and rescaling math']),
 ('From Online Softmax to FlashAttention (Zihao Ye, UW CSE 599M, ~40 min): 3-pass safe softmax, online softmax, fused one-pass attention', F, ['https://courses.cs.washington.edu/courses/cse599m/23sp/notes/flashattn.pdf', 'starting from 3-pass safe softmax, then online softmax', '(40 min)']),
 ('FlashAttention talk, Stanford MLSys #67 (Tri Dao, ~1h)', F, ['https://www.youtube.com/watch?v=gMOAud7hZg4', "the author's own explanation of the memory hierarchy argument"]),
 ('Making Deep Learning Go Brrrr (Horace He, 25 min): compute-bound vs memory-bound framing', F, ['https://horace.io/brrr_intro.html', 'compute-bound against memory-bound framing']),
 # problem
 ('Self-attention quadratic in N in time and memory; binding constraint on context length', R + ', Problem', ['quadratic in the sequence length N', 'binding constraint on how much context']),
 ('Approximate methods (Linformer, Performer, Reformer, sparse) cut FLOPs to linear or near-linear but mostly failed to deliver wall-clock speedup, never displaced exact attention', R + ', Problem', ['Reformer, sparse attention', 'Linformer, Performer', 'linear or near-linear', 'do not display wall-clock speedup']),
 ('Diagnosis: FLOP count is the wrong cost model; attention is memory-bound', R + ', Problem', ['FLOPs are the wrong cost model', 'memory-bound']),
 ('A100 HBM 40-80 GB at 1.5-2.0 TB/s; SRAM 192 KB per SM at ~19 TB/s', R + ', GPU memory section and chart', ['40 to 80 GB of HBM at 1.5 to 2.0 TB/s', '192 KB of on-chip SRAM', '19 TB/s']),
 ('Standard implementation writes S, reads it for softmax, writes P, reads P for PV; repeats round trips for masking and dropout', R + ' (Algorithm 0) and ' + K + ' standard mode', ['writes both N × N matrices, S and P, to HBM', 'masking applied to S or dropout applied to P add more round trips', 'Masking: read S, write S again']),
 ('IO-aware = designed to minimise reads/writes across the memory hierarchy; nobody had done it because PyTorch does not expose memory control; needs a hand-written CUDA kernel', R + ', Problem', ['IO-aware', 'accounts for reads and writes between levels of memory', 'do not allow fine-grained control of memory access', 'hand-written CUDA kernel']),
 # method
 ('Exact (not approximate) attention in a single fused CUDA kernel that never materialises N x N in HBM', R + ', Idea', ['never read or write the N × N matrix in HBM', 'one kernel']),
 ('Two techniques: tiling with online softmax (forward), recomputation (backward)', R + ', Idea', ['tiling', 'recomputation for the second']),
 ('Softmax couples a whole row: needs row max m and row sum l before any output is final', R + ', Idea', ['softmax couples a whole row', 'no output can be final until the whole row has been seen']),
 ('Online softmax decomposition: m = max(m1, m2); l = e^(m1-m) l1 + e^(m2-m) l2', R + ', formula block; live demo', ['m(x) = max( m(x (1) ), m(x (2) ) )', 'ℓ(x) = e m(x (1) ) − m(x) ℓ(x (1) ) + e m(x (2) ) − m(x) ℓ(x (2) )']),
 ('Running (m, l) per row; rescale accumulated by e^(m_old - m_new) when a new block raises the max', R + ' predict question and demo; ' + K + ' row tracker', ['rescaled by e m old − m new', 'everything accumulated so far is multiplied by e^(m_old − m_new)']),
 ('Split K, V into blocks of B_c rows and Q into blocks of B_r rows; sized so K, V, Q and output blocks fit SRAM; B_c = ceil(M/4d)', R + ', Algorithm 1 paragraph', ['B c = ⌈M / 4d⌉', 'B r = min(⌈M / 4d⌉, d)', 'so that a K block, a V block, a Q block and an output block fit on chip']),
 ('Outer loop streams K_j, V_j; inner loop streams Q_i; on chip S_ij = Q_i K_j^T, block max and exponentials, update (m_i, l_i), rescale O_i before adding P_ij V_j', R + ' Algorithm 1 walk-through; ' + K, ['The outer loop loads K j and V j into SRAM', 'the inner loop loads Q i , O i', 'S ij = Q i K j T on chip', 'rescales the output accumulator and adds P̃ ij V j']),
 ('Only Q, K, V, O and the O(N) statistics touch HBM', R, ['Only Q, K, V, O and the O(N) statistics ever touch HBM']),
 ('FlashAttention-2 swapped the loop order so Q is outer, what to picture today', R + ' note; ' + K + ' FA-2 order mode; ' + N, ['swapped the loops so Q is outer', 'which is the picture to have today', 'FlashAttention-2 order']),
 ('Masking and dropout fuse in for free inside one kernel instead of extra N x N round trips', R + ' and ' + K, ['the steps between the matrix multiplies cost nothing extra', 'fuses masking and dropout into its single kernel at no extra HBM cost']),
 ('Recomputation: training normally stores S, P (O(N^2) memory); FA stores O and (m, l); later versions one logsumexp L per row', R + ' Recomputation; ' + K + ' FA-2 final step; ' + N, ['stores only the output O and the softmax statistics (m, ℓ)', 'a single number per row, L = m + log ℓ']),
 ('Backward recomputes S_ij, P_ij block by block in SRAM from Q, K, V and saved stats', R, ['recomputes S ij and P ij tile by tile in SRAM']),
 ('Selective gradient checkpointing, but not a speed-for-memory trade: backward gets faster despite extra FLOPs', R, ['selective gradient checkpointing', 'speeds up the backward pass']),
 ('Correction: "it stops reading a 40 GB attention matrix out of HBM" -- 40.3 GB is total HBM traffic of standard attention forward + backward; the matrix is 2.15 GB per copy', R + ' and ' + T + ' Figure 2 note (corrected)', ['is total traffic, many passes over such matrices, not one matrix', '2.15 GB per copy']),
 ('IO-complexity argument is the real thesis: FA does strictly more arithmetic and wins anyway', R + ', section title and predict', ['The IO complexity argument (the paper\'s real thesis)', 'with 13% more FLOPs']),
 ('GPT-2 medium (N=1024, d=64, 16 heads, batch 64, A100, fwd+bwd): 75.2 vs 66.6 GFLOPs, 4.4 vs 40.3 GB HBM, 7.3 vs 41.7 ms', R + ' predict reveal; ' + K + ' scale panel; ' + T + ' Figure 2', ['66.6', '75.2', '40.3 GB', '4.4 GB', '41.7 ms', '7.3 ms', '16 heads × batch 64']),
 ('Theorem 2: standard Theta(Nd + N^2), FA Theta(N^2 d^2 / M)', R + ' Theorem 2 and chart', ['Θ(Nd + N 2 )', 'Θ(N 2 d 2 M −1 )']),
 ('d^2 (4K-16K) far smaller than M (order 100 KB) -> many times fewer accesses; "up to about 9x" (corrected: the 9x is the measured Figure 2 ratio)', R + ' and ' + T + ' checks', ['d 2 is many times smaller than M', '9.2× (40.3 / 4.4)']),
 ('Block-size sweep: bigger blocks fewer passes, lower runtime until arithmetic is the bottleneck around 256', R + ' and ' + K + ' bound chart', ['beyond about 256', 'Why bigger blocks stop helping']),
 ('Proposition 3 lower bound: no exact algorithm o(N^2 d^2 / M) for all M in [d, Nd]; FA asymptotically optimal in this cost model', R + ' (with the weakness noted)', ['o(N 2 d 2 M −1 ) HBM accesses for all M in [d, Nd]', 'within this cost model FlashAttention is optimal']),
 ('Block-sparse: skip zero blocks; IO Theta(Nd + N^2 d^2 s / M); fastest approximate attention known; reached 64K', R + ' Block-sparse; ' + K + ' density slider', ['skip the zero tiles', 'Θ(Nd + N 2 d 2 M −1 s)', 'faster than every exact, sparse and approximate implementation', 'It is the version that reached 64K tokens']),
 # results
 ('BERT-large 15% faster than NVIDIA MLPerf 1.1 record (17.4 vs 20.0 min on 8xA100)', R + ', Results; ' + T + ' Table 1', ['17.4 ± 1.4 minutes against 20.0 ± 1.5', '15% faster']),
 ('GPT-2 up to 3x faster than HuggingFace, 1.7-1.8x than Megatron-LM at identical perplexity (corrected: 1.7x; 1.8x not in the table; medium perplexity 14.2 vs 14.3)', R + ' Results and evidence; ' + T + ' Tables 2 and 4', ['up to 3× faster end to end than HuggingFace and 1.7× faster than Megatron-LM', 'which no row gives', '14.2 for HuggingFace and 14.3']),
 ('Long-range arena 2.4x faster', R + ', Results; ' + T, ['2.4× faster than standard attention']),
 ('Attention op up to 3x faster than PyTorch for N = 128-2K (7.6x on GPT-2 attention module); memory linear, up to 20x smaller', R + ', Results; card; ' + T, ['up to 3× faster than PyTorch\'s attention for N from 128 to 2K', 'up to 20× smaller than exact baselines', '7.6×']),
 ('Approximate methods start winning past N 512-1024; block-sparse FA beats them at all lengths', R + ', Results; ' + T + ' Figure 3 rebuilt', ['overtake it between 512 and 1,024', 'at every length']),
 ('GPT-2 small 4K context trains faster than Megatron 1K and gains 0.7 perplexity', R + ', Results; ' + T, ['GPT-2 small with a 4K context trains 30% faster than Megatron\'s GPT-2 at 1K', '0.7 better perplexity']),
 ('+6.4 points long-document classification (MIMIC-III, ECtHR)', R + ' Results and evidence; ' + T, ['"6.4 points of lift"', 'MIMIC-III', 'ECtHR']),
 ('Path-X N=16K 61.4% first Transformer above chance; Path-256 N=64K 63.1% with block-sparse', R + ' Results; card; ' + T, ['61.4% on Path-X', '63.1% on Path-256', 'the first Transformer above chance']),
 ('Long-context capability that did not exist before', R + ', Results (every earlier Transformer ran out of memory or scored at chance)', ['Every earlier Transformer either ran out of memory or scored at chance']),
 # why it matters
 ('Canonical fused kernel; made IO-awareness the default lens for GPU kernel work', R + ', Why it matters', ['This is the canonical fused kernel', 'IO-awareness the default lens for GPU kernel work']),
 ('Ended the approximate-attention research wave almost single-handedly', R + ', Why it matters (softened: lost its reason to exist)', ['the approximate-attention wave lost its reason to exist']),
 ('Inside every serious stack: PyTorch SDPA, vLLM, TensorRT-LLM, cuDNN, frontier labs (TensorRT-LLM corrected: documents its own FMHA kernels, not counted; frontier labs internal stacks unverifiable, dropped)', R + ' Why it matters; ' + N + ' Where it runs now', ['scaled_dot_product_attention', 'using the FlashAttention-2 algorithm', 'FLASH_ATTN backend', 'TensorRT-LLM documents its own fused attention (FMHA) kernels']),
 ('Long context went from research problem to product knob', R, ['Long context went from a research problem to a product setting']),
 ('For a CUDA learner: memory hierarchy, tiling, kernel fusion, occupancy, cost model (count HBM bytes, not FLOPs)', R, ['memory hierarchy, tiling, kernel fusion, occupancy and a cost model that counts HBM bytes, not FLOPs']),
 ('Lineage "all led by Tri Dao" (corrected: FA-2 solo Tri Dao; FA-3 first author Jay Shah; FA-4 first author Ted Zadouri; Tri Dao last author)', R + ' and ' + N, ['Jay Shah and others with Tri Dao', 'Ted Zadouri and others with Tri Dao']),
 ('FA-2 (July 2023, arXiv:2307.08691): same math; fewer non-matmul FLOPs (rescale once at end); Q outer; parallelise over sequence length (long context); warp partitioning without split-K; ~2x over FA-1, 50-73% of A100 peak', N + ' FA-2 card', ['2307.08691', 'rescale the output once at the end', 'Parallelise over the sequence length', '"split-K"', '50 to 73%']),
 ('FA-3 (July 2024, arXiv:2407.08608): Hopper; TMA and WGMMA asynchrony via warp specialisation; pingpong softmax under GEMMs; FP8 with incoherent processing (Hadamard); 1.5-2x over FA-2, ~740 TFLOPs BF16 (75%), ~1.2 PFLOPs FP8', N + ' FA-3 card (BF16 corrected to FP16 per the abstract)', ['2407.08608', 'Warp specialisation', 'so the exponentials hide under the GEMMs', 'Hadamard matrix', '1.5 to 2.0×', '740 TFLOPs/s in FP16 (75% utilisation)', '1.2 PFLOPs/s']),
 ('FA-4 (Hot Chips Aug 2025; pip flash-attn-4 as of Aug 2026): CuTe DSL in Python; Blackwell and Hopper; ~20% faster than cuDNN; software-pipelined exponential, selective rescaling (corrected: paper arXiv 2603.05451, March 2026; up to 1.3x over cuDNN 9.13; still beta on PyPI, 4.0.0b33)', N + ' FA-4 card and Using it today', ['2603.05451', 'CuTe-DSL embedded in Python', 'up to 1.3× over cuDNN 9.13', 'Software-emulated exponential and conditional softmax rescaling', 'still a beta: 4.0.0b3 in March 2026 to 4.0.0b33']),
 ('CUDA (FA-1/2) to templates (FA-3) to Python DSL (FA-4) as snapshot of kernel engineering', R, ['hand-written CUDA to C++ templates to a Python DSL']),
 ('Stated limitation (hand-written kernel per variant) seeded Triton, torch.compile templates, FlexAttention, CuTe DSL: compile IO-aware attention from a high-level description', R + ' and ' + N, ['Triton and torch.compile attention templates', 'FlexAttention', 'compile IO-aware attention from a high-level description']),
 # connections
 ('Attention Is All You Need (2017): the O(N^2) attention made fast without changing output', R + ' Connections; ' + F, ['the O(N 2 ) attention this paper makes fast without changing its output']),
 ('vLLM / PagedAttention (2023): complementary inference-side memory; HBM-SRAM inside kernel vs KV-cache allocation across requests; serving uses both', R + ' Connections; ' + F, ['PagedAttention optimises KV-cache allocation across requests', 'Serving stacks use both']),
 ('Megatron-LM (2019): baseline FA beats and was merged into', R + ' Connections (sourced: Megatron-LM PR 267)', ['the training-systems baseline FlashAttention beats here', 'Megatron-LM pull request 267']),
 ('Mamba (2023): Tri Dao\'s other line; selective scan reuses the IO-aware recipe', R + ' Connections (quoted from Mamba)', ["Tri Dao's other line of attack on sequence length", 'kernel fusion, parallel scan, and recomputation']),
 ('DeepSeek-V3 (2024) and every modern LLM report: FA-class kernels assumed infrastructure', R + ' Connections', ['FlashAttention-class kernels are assumed infrastructure']),
 ('Topics: cuda-and-gpu-programming (primary), inference-and-serving, hardware, llm-training-and-post-training, with their roles', R + ' Connections; ' + F, ['cuda-and-gpu-programming', 'inference-and-serving', 'memory hierarchy and bandwidth math', 'training speed and long-context training']),
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
