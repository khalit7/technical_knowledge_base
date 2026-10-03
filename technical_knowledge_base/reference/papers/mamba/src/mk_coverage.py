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
 ('Reading time line "10 min read, +~5h 40m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read', 'of resources']),
 ('Authors: Albert Gu (CMU) and Tri Dao (Princeton)', R + ', headline card', ['Albert Gu, Tri Dao', 'Carnegie Mellon University (Gu), Princeton University (Dao)']),
 ('Date: December 2023 (arXiv v1; v2 May 2024); COLM 2024', R + ', headline card (exact dates added)', ['December 2023', 'v2 31 May 2024', 'COLM 2024']),
 ('Link arXiv:2312.00752 (~1h)', 'card and Further reading', ['https://arxiv.org/abs/2312.00752', '(1h)']),
 ('Link code + checkpoints state-spaces/mamba (~20 min for the README and entry path)', 'card, Further reading, What it takes', ['https://github.com/state-spaces/mamba', 'about 20 minutes for the README and entry path']),
 # resources
 ('A Visual Guide to Mamba and SSMs (Grootendorst, ~35 min): intuition-first, RNN/CNN duality through selectivity', 'Further reading', ['https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-mamba-and-state', 'from RNN/CNN duality through selectivity']),
 ('The Annotated S4 (Rush, ~1h 30m): S4 lineage, discretization and convolution-mode math', 'Further reading', ['https://srush.github.io/annotated-s4/', 'discretization and convolution-mode math']),
 ('Mamba: The Hard Way (Rush, ~1h): selective scan kernel in Triton', 'Further reading', ['https://srush.github.io/annotated-mamba/hard.html', 'reimplements the selective scan kernel step by step in Triton']),
 ('SSD (Mamba-2) blog series (Dao and Gu, ~1h 15m): selective SSMs and attention as structured matrices', 'Further reading', ['https://tridao.me/blog/2024/mamba2-part1-model/', 'two views of the same family of structured matrices']),
 # problem
 ('Transformers: quadratic compute in training, KV cache grows linearly during inference', R + ', Problem; compression animation', ['quadratic compute in sequence length', 'KV cache that grows with every generated token']),
 ('Subquadratic alternatives (linear attention, Hyena, H3, RWKV, RetNet, S4) scale better but never matched attention on dense discrete modalities like language', R + ', Problem', ['linear attention, gated convolutions such as H3 and Hyena, RWKV, RetNet', 'had never matched attention on dense, discrete data like language']),
 ('Diagnosis: all prior efficient SSMs are LTI (constant dynamics), computable as a global convolution, unable to do content-based reasoning / decide per token what to store', R + ', Problem', ['linear time-invariant (LTI)', 'one global convolution', 'token by token, what to store']),
 ('LTI models solve vanilla Copying (constant spacing, time-awareness) but fail Selective Copying and Induction Heads (content-aware filtering)', R + ', Problem; Results; Run tab', ['Plain Copying has constant spacing', 'Both need content-aware filtering']),
 # method
 ('S4 background: h\'(t) = Ah + Bx, y = Ch; ZOH discretization A_bar = exp(delta A); h_t = A_bar h_{t-1} + B_bar x_t', R + ', State spaces (Eqs. 1 to 4)', ['zero-order hold', 'exp(Δ A )', 'h t = A h t −1 + B x t']),
 ('LTI: output is a convolution with precomputable kernel K_bar = (CB_bar, CA_bar B_bar, ...); FFT training, recurrent O(1) inference', R + ', State spaces', ['the output is one convolution', 'S4 trains in parallel by FFT and generates recurrently in constant time per step']),
 ('A structured (diagonal): N numbers per channel; effective state D x N, far larger than an RNN\'s, without paying', R + ', State spaces', ['A is diagonal, so each matrix is N numbers per channel', 'the state is D × N per sequence', 'over a classic RNN for free']),
 ('Selection: B_t = Linear_N(x_t), C_t = Linear_N(x_t), delta_t = softplus(parameter + Broadcast(Linear_1(x_t)))', R + ', Selection (Algorithm 2 table)', ['B t = Linear N ( x t )', 'softplus(Parameter + Broadcast D (Linear 1 ( x t )))']),
 ('Parameters gain a length dimension: time-varying, the convolution trick dies; S6 = S4 + selection + scan', R + ', Selection', ['The parameters gain a length dimension', 'the convolution is gone', 'the paper calls the result S6']),
 ('Delta generalises RNN gating; Theorem 1: N = 1 selective recurrence is a gated RNN h_t = (1 - g_t) h + g_t x', R + ', Delta as a gate (with the gate widget)', ['Theorem 1', 'h t = (1 − g t ) h t −1 + g t x t', 'classical RNN gating is a special case of selection']),
 ('Large delta resets the state and focuses on the current token; delta near 0 skips it', R + ', Selection; gate widget', ['large Δ resets the state and focuses on x t', 'Δ near 0 keeps the state and skips the token']),
 ('Selective B controls what enters the state, C what leaves; A stays input-independent since delta makes A_bar input-dependent', R + ', Selection', ['selective B controls what enters the state, selective C what leaves it', 'A stays a plain parameter, because Δ already makes']),
 ('Model can filter fillers and reset state at boundaries; performance improves monotonically with context', R + ', Selection', ['fillers such as "um" can be ignored', 'performance should improve with more context, not degrade', 'boundary resetting']),
 ('Naive time-varying recurrence materialises (B, L, D, N) in HBM: N times more memory traffic than the input', R + ', The hardware-aware scan; IO calculator', ['N times the size of input and output', 'the cost to cut is memory traffic']),
 ('Kernel fusion: load (delta, A, B, C) into SRAM, discretise and recur there, write only (B, L, D) output', R + ', The hardware-aware scan', ['Load (Δ, A , B , C ) from slow HBM into fast SRAM', 'write only the ( B , L , D ) output']),
 ('Work-efficient parallel (associative / Blelloch) scan, since the recurrence is linear and associative', R + ', The hardware-aware scan; Blelloch scan animation', ['work-efficient (Blelloch) scan', 'compose associatively']),
 ('Recomputation: intermediate states recomputed in backward; memory matches a FlashAttention Transformer', R + ', The hardware-aware scan (with the measured Table 15 caveat)', ['States needed for the backward pass are recomputed, not stored', 'two Mamba blocks match one attention plus MLP pair']),
 ('Scan beats FlashAttention-2 beyond 2K; 20-40x faster than a naive PyTorch scan', R + ', Results (speed); Tables tab checks', ['beats FlashAttention-2 beyond length 2K', 'a PyTorch scan by 20 to 40 times']),
 ('Mamba block fuses H3-style SSM block and MLP (gated attention unit spirit): expand by E = 2, conv1d + SiLU, selective SSM, SiLU gate, project down', R + ', The Mamba block (diagram)', ['merges them into one block repeated homogeneously, like the gated attention unit', 'expand D by E = 2', 'a short causal convolution, SiLU and the selective SSM']),
 ('Two Mamba blocks match the 12D^2 parameters of attention + MLP; RMSNorm and residuals; no attention, no MLP', R + ', The Mamba block (recounted: 1.05 x 12D^2)', ['one attention plus MLP pair', 'Stack with RMSNorm and residuals: no attention, no separate MLP']),
 # results
 ('Synthetics: S6 solves Selective Copying (~99.8% vs 18-57% LTI)', R + ', Results; card; Tables tab; toy', ['99.8%', 'every LTI layer 18.3% to 57.0%']),
 ('Induction heads: perfect extrapolation from 256 to 1M (4000x); every baseline including attention collapses beyond ~2x', R + ', Results (4,096 times; the 4,000 is rounded); Tables tab', ['4,096 times the training length (the text rounds to 4,000)', 'no other model goes beyond twice']),
 ('Language: first attention-free model to match Transformer++ (LLaMA recipe) on Pile scaling laws 125M to 1.3B; gap favours Mamba at 8K', R + ', Results', ['first attention-free model to match "Transformer++"', 'with the gap favouring Mamba at 8K context']),
 ('Mamba-2.8B beats Pythia-2.8B on every zero-shot task (63.3 vs 59.1), roughly matches models twice its size; Mamba-3B exceeds Pythia-7B', R + ', Results (twice-the-size check: 3 of 5 sizes); Tables tab', ['beats Pythia-2.8B on all six tasks (average 63.3 against 59.1)', 'Pythia-6.9B on the average (61.7)', 'holds for three of five sizes']),
 ('DNA: beats HyenaDNA and Transformer++ with 3-4x fewer parameters; perplexity improves to 1M context while HyenaDNA degrades', R + ', Results (DNA); evidence section caveats', ['about 3 to 4 times fewer parameters', 'out to 1M-token context while HyenaDNA\'s gets worse']),
 ('Speech SC09: a 6M-parameter Mamba beats much larger GAN and diffusion baselines', R + ', Results (audio); Tables tab', ['a 6.1M Mamba beats the larger GAN and diffusion models']),
 ('Efficiency: 4-5x higher inference throughput (no KV cache, larger batches); linear-time training', R + ', Results; memory calculator; Why it matters', ['generation throughput is 4 to 5 times', 'no KV cache, Mamba runs far larger batches', 'training in linear time']),
 ('Ablations: selective delta matters most; N from 1 to 16 costs ~1% params and buys over 1.0 ppl, only when B and C are selective', R + ', Results (predict question); Tables tab (1.2%)', ['Δ is the most important selective parameter', '367.1M → 371.5M parameters (+1.2%)']),
 ('Real-valued diagonal A fine for text; complex helps only for continuous modalities like audio', R + ', The Mamba block; Results', ['states are real, not complex, by default', 'real equals complex for text']),
 # why it matters
 ('Ended the era in which subquadratic meant worse; pure recurrent model with input-dependent dynamics matches Transformer quality; linear training, O(1) state per step', R + ', Why it matters (scoped by the evidence section)', ['Mamba ended the era in which subquadratic meant worse', 'generating with constant state']),
 ('Reframing: sequence modelling is context compression; attention the no-compression extreme (perfect recall, KV cache pain), RNNs full compression, selectivity the knob', R + ', Problem; Why it matters; compression animation', ['sequence modelling is compressing context into a state', 'attention is the no-compression extreme', 'selectivity the knob between']),
 ('IO-aware kernel work with FlashAttention: architecture and GPU memory-hierarchy design are one discipline', R + ', Why it matters', ['architecture design and GPU memory-hierarchy design are one discipline']),
 ('Mamba-2 (2024): state space duality, selective SSMs and masked attention as structured semiseparable matrices; simpler faster matmul kernels; bridge to attention theory', R + ', Why it matters; Then and now', ['state space duality', 'structured semiseparable matrices', 'a clean bridge to attention theory']),
 ('2025-26 winner is the hybrid: a minority of full-attention layers (exact recall) with SSM or linear-attention layers (cheap length)', R + ', Why it matters; Then and now', ['In production the winner is the hybrid', 'a few full-attention layers for exact recall']),
 ('Production hybrids: AI21 Jamba (Mamba + attention + MoE), NVIDIA Nemotron-H (Mamba-2 + attention, powering Nano reasoning models), IBM Granite 4 (Mamba-2 hybrid), Falcon-H1', R + ', Why it matters; Then and now (each from its config)', ['Jamba', 'Nemotron-H', 'Nemotron Nano 2', 'Granite 4.0-H', 'Falcon-H1']),
 ('Frontier labs ship linear or sliding-window hybrid layers to cut long-context prefill and KV-cache cost', R + ', Why it matters', ['linear or sliding-window hybrid layers to cut long-context prefill and KV-cache cost']),
 ('Pure SSMs rarer since exact long-range retrieval favours some attention; recurrence standard for long context, edge inference, non-text sequences (DNA, audio, time series, vision)', R + ', Why it matters; evidence section (later studies)', ['Pure SSMs stay rarer because exact long-range retrieval still favours some attention', 'DNA, audio, time series, vision backbones']),
 # connections
 ('Attention Is All You Need: architecture Mamba positions itself against; trades exact-recall KV cache for compressed recurrent state', 'Connections; Further reading', ['3c65c17b0d0d81999af7f16f8ed8ee9e', 'trades the exact-recall KV cache for a compressed recurrent state']),
 ('FlashAttention: same author (Dao), IO-aware philosophy; selective scan is the SSM analogue of its tiling and recomputation', 'Connections; Further reading', ['3c65c17b0d0d81e4a3e8e7a2c4771381', 'the SSM analogue of FlashAttention\'s tiling and recomputation']),
 ('vLLM PagedAttention: attacks at serving time the KV-cache cost Mamba removes architecturally', 'Connections; Further reading', ['3c65c17b0d0d81bf8b90ca93fee19f5f', 'that Mamba removes architecturally']),
 ('Mixtral: MoE, the other efficiency axis; hybrids like Jamba and Nemotron-H combine both', 'Connections; Further reading (Nemotron 3 Nano named as the MoE hybrid: Nemotron-H 8B has no MoE in its config)', ['3c65c17b0d0d81eba72af0ac91ddc6b3', 'the other big efficiency axis']),
 ('Topics: ml-fundamentals (sequence-model history), llms (architecture landscape, hybrids), inference-and-serving (KV cache, throughput), cuda-and-gpu-programming (kernel fusion, parallel scan, memory hierarchy)', 'Connections; Further reading, Topics', ['3c65c17b0d0d81d796ccc0a293218c57', '3c65c17b0d0d812d9e00f6ec89965286', '3c65c17b0d0d81c08b3bc95ff45c7b13', '3c65c17b0d0d81c39f34d5e070d783c1']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['Made SSM parameters (B, C, delta) input-dependent']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:38)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')],
           'corrections': ['"Mamba-3B ... matches Transformers twice its size": holds on the Table 3 average for 3 of 5 sizes, not 130M or 370M',
                           '"4000x" extrapolation is 4,096x (2^20 / 2^8), rounded in the paper',
                           '"increasing N from 1 to 16 costs ~1% parameters": 1.2% (367.1M to 371.5M)',
                           '"memory matches a FlashAttention Transformer": Table 15 shows 4% to 12% more',
                           '"Theorem 1 shows that for N=1 the selective recurrence reduces exactly to a gated RNN": also needs A = -1, B = 1; and the released code\'s first-order B_bar = delta B makes the shipped models differ from the theorem\'s gate for large delta',
                           '"5x inference throughput": against the Hugging Face transformers implementation; the body says 4 to 5x',
                           '"Nemotron-H ... hybrids combining MoE": Nemotron-H 8B has no MoE; Nemotron 3 Nano does'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
