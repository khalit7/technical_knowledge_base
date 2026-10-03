"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the DiffusionGemma
Notion page before migration) with where the HTML carries it, and verify each item's check strings against the
built index.html (tags stripped, scripts kept, whitespace normalised). The list below is this paper's own,
written from src/live.md.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header
 ('Reading time line "13 min read, +~1h 30m resources"', 'dropped: replaced by the build-computed reading time and resources total of the new page', ['min to read', 'of resources']),
 ('Authors/lab: DiffusionGemma Team, Google DeepMind', R + ', headline card', ['DiffusionGemma Team', 'Google DeepMind']),
 ('Date: August 2026 (arXiv v1 31 Jul 2026; report dated 2026-08-04)', R + ', headline card (plus the weights release date, 9 June 2026, from Hugging Face)', ['31 July 2026', '4 August 2026', '9 June 2026']),
 ('Link arXiv 2608.00146 (~1h 30m, technical report)', 'card and Further reading', ['https://arxiv.org/abs/2608.00146', '(1h 30m)']),
 ('Open weights (Apache 2.0)', 'card, Further reading, What it takes to use this', ['Apache 2.0', 'https://huggingface.co/google/diffusiongemma-26B-A4B-it']),
 ('Reference implementations in Hugging Face Transformers and vLLM', R + ', Speed and Using it; Further reading', ['Reference implementations are in Hugging Face Transformers and vLLM']),
 ('Open-source LoRA finetuning toolkit built on Hackable Diffusion', R + ', Results (Finetuning it yourself); Further reading', ['Hackable Diffusion', 'https://github.com/google/hackable_diffusion']),
 # lead paragraph
 ('First open-weights text diffusion model that is simultaneously fast and genuinely capable', 'Takeaway on the headline card; Why it matters', ['First open-weights text diffusion model that is fast and genuinely capable', 'An existence proof for open, fast and smart text diffusion']),
 ('Gemma 4 26B A4B (MoE, 3.85B active) converted from AR to discrete diffusion', R + ', Idea and Table 1', ['Gemma 4 26B A4B', '3.85B']),
 ('With less than 10% of the AR model\'s training token budget', R + ', Idea', ['fewer than 10% of the AR model\'s training tokens']),
 ('~20 tokens per forward pass', 'card (19.74) and Idea', ['19.74', 'about 20 tokens per pass']),
 ('~1,500 tokens per second on a single H100', 'card (1,479) and Idea (1,456)', ['1,479', '1,456 tokens/s']),
 ('7.1x speedup over its own AR baseline; 4.8x over AR with MTP speculative decoding', R + ', Idea; checks; How much to believe (the 4.8x compares different workloads)', ['7.1x AR and 4.8x AR with multi-token prediction (303)', 'The MTP baseline ran on a different workload']),
 ('Broadly competitive in quality; retains thinking mode, multimodality, long context and AR decoding', R + ', Idea and Results (dual mode)', ['keeps Gemma 4\'s thinking mode, multimodal input and long context', 'its weights can still decode autoregressively']),
 # problem
 ('Single-request AR decoding is memory-bound: weights and KV cache streamed through HBM, compute idle, per-user speed capped', R + ', Problem', ['memory-bound', 'every new token needs all the weights and the whole KV cache streamed from GPU memory', 'caps how fast a single user']),
 ('Speculative decoding tops out around 3-6 tokens per forward pass', R + ', Problem', ['3 to 6 tokens per forward pass']),
 ('Parallel drafters suffer falling acceptance rates at later draft positions', R + ', Problem', ['parallel drafters (Medusa, DFlash) lose acceptance at later draft positions']),
 ('Text diffusion decodes whole blocks in parallel and shifts execution toward compute-bound', R + ', Problem', ['moving decoding from memory-bound towards compute-bound']),
 ('Mid-2026: Gemini Diffusion, Mercury locked behind APIs; open LLaDA, Nemotron Diffusion lacked reasoning/multimodal or failed latency', R + ', Problem', ['Gemini Diffusion, Mercury) were behind proprietary APIs', 'LLaDA, Seed Diffusion, Nemotron-Labs-Diffusion']),
 ('No public recipe for cheaply turning a frontier AR model into a competitive diffusion model', R + ', Problem', ['no public recipe for cheaply turning a frontier AR model into a competitive diffusion model']),
 # architecture
 ('Base: 25.2B total, 3.85B activated, 8 of 128 experts + 1 shared, 262k vocab, 550M vision encoder', R + ', Idea (Table 1); Tables tab', ['25.2B', '8 / 128, + 1 shared', '262k', '550M']),
 ('No diffusion pretraining; AR weights warm-started directly', R + ', Idea', ['No diffusion pretraining: the AR weights are warm-started directly']),
 ('Only 7.8M new parameters (a self-conditioning MLP)', R + ', Idea', ['7.8M-parameter self-conditioning MLP']),
 ('Discrete multinomial diffusion in the CTMC / discrete flow matching framework', R + ', Discrete diffusion', ['continuous-time Markov chain', 'discrete flow matching', 'multinomial']),
 ('Each token of a 256-token canvas independently replaced by a uniform-random vocabulary token with probability rising along the schedule', R + ', Discrete diffusion (Eq. 1 and the corruption demo)', ['canvas', 'a corrupted token becomes a random real token, not a [mask]']),
 ('The model learns the posterior over clean tokens given a noisy canvas', R + ', Discrete diffusion', ['the posterior over clean tokens given a noisy canvas']),
 ('Multinomial rather than masked: tokens accepted earlier can still be revised within the canvas (built-in self-correction)', R + ', Discrete diffusion; tested in the toy (revisions, masked twin)', ['tokens accepted earlier in the same canvas can still change', 'built-in self-correction']),
 ('Block-AR generation: causal encoder fills KV cache; bidirectional decoder denoises the 256-token canvas cross-attending to it; finished canvas re-encoded and appended', R + ', Block by block; the toy animation', ['Encode the context', 'Denoise a canvas', 'Encode and append']),
 ('Structural inversion of BART/T5 (causal encoder, bidirectional decoder); restores KV-cache reuse and open-ended length', R + ', Block by block', ['This inverts the usual encoder-decoder (BART', 'the growing context is never re-encoded']),
 ('Self-conditioning: softmaxed prediction embedded (FFW over p_hat * E) and fed into the next step', R + ', Block by block (Eq. 6)', ['FFW(', 'self-conditioning']),
 ('Entropy-bounded sampler (Algorithm 1), MaskGIT-style: accept lowest-entropy tokens until budget b = 0.1; re-noise the rest uniformly', R + ', The sampler; Run the toy', ['Entropy-bounded acceptance', 'MaskGIT', 'b</i> = 0.1', 're-noised uniformly']),
 ('Temperature annealed linearly 0.8 -> 0.4', R + ', The sampler', ['from τ = 0.8 at the start to 0.4 at the end']),
 ('Adaptive stopping: mean canvas entropy < 0.005 and argmax unchanged for two consecutive steps; cap N = 48', R + ', The sampler', ['Adaptive stopping', '0.005', 'N</i> = 48']),
 ('Averages ~12 effective steps; fewer for structured tasks (code), more for hard reasoning: adaptive test-time compute', R + ', The sampler (Figure 5) and Table 4 mean', ['about 12 effective denoising steps', 'structured tasks such as code take fewer steps']),
 # training
 ('Two-stage training under 10% of the AR token budget', R + ', Idea and Training', ['two stages', 'SD·RL']),
 ('SFT: extended finetuning to denoise 256-token canvases under a block-diagonal attention mask', R + ', Training, stage 1', ['A block-diagonal attention mask']),
 ('SFT: cross-entropy against the clean canvas at uniformly sampled noise levels, clean context via the encoder KV cache', R + ', Training, stage 1 (Eq. 11)', ['noise level <i>t</i> ~ U[0, 1]', 'cross-entropy between the prediction and the clean canvas']),
 ('Non-thinking quality appears quickly; coherent thinking needs extended SFT and improves log-linearly', R + ', Training, stage 1', ['Non-thinking quality needs only moderate SFT', 'log-linear']),
 ('SD-RL: unified online stage replacing separate RLHF and few-step distillation', R + ', Training, stage 2', ['SD·RL does both in one online stage']),
 ('Model is its own online teacher generating high-step trajectories', R + ', Training, stage 2', ['online teacher']),
 ('Joint objective maximises task reward (Gemma 4 RL mix: helpfulness, math, coding, instruction following) and distills into the few-step regime by driving down entropy', R + ', Training, stage 2', ['helpfulness, mathematical reasoning, coding and instruction following', 'reward maximisation', 'sampler distillation']),
 ('Lower entropy makes stopping earlier, shifting training to shorter trajectories: self-paced curriculum', R + ', Training, stage 2', ['The self-paced curriculum']),
 ('Continuing SD-RL past reward plateau keeps buying speed', R + ', Training, stage 2', ['continuing SD·RL after the reward plateaus still pays']),
 ('Stage results: TPF 5 -> ~20, +10 points GPQA-Diamond + LiveCodeBench-v6 average, fixes few-step repetition loops', R + ', Training, stage 2 (Figure 9, Figures 16 and 17)', ['from 5 to nearly 20', 'about <b>10 points</b>', 'repetition loops']),
 ('Emergent conciseness ~2x; <5% of the AR baseline\'s forward passes; at some cost to long-reasoning gains', R + ', Training (predict question) and Why it matters', ['Nearly 2x shorter', 'less than 5%', 'forgoes the gains of long reasoning']),
 # inference
 ('Step processes 256 tokens yet only 3.2x slower: 12.63 ms vs 4.01 ms, H100 FP8, 4096-token prompt', R + ', Speed (Figure 11 calculator)', ['3.2x', '12.63 ms against 4.01 ms', '4,096 prompt tokens']),
 ('MoE experts 4.3x: ~84 unique experts per layer per canvas vs 8 for one token; expert transfer stops amortising', R + ', Speed and predict question', ['MoE experts, 4.3x', '84', 'no longer amortises']),
 ('A dense model would lose under 2x', R + ', Speed (corrected: the paper says the feed-forward slowdown would fall below 2x, not the whole step)', ['a dense model would cut the feed-forward slowdown to under 2x']),
 ('Sampling 5.5x: full-canvas softmax over 262k vocab plus self-conditioning matmul, torch.compile not custom kernels', R + ', Speed', ['Sampling, 5.5x', 'torch.compile']),
 ('Attention 4.1x: bidirectional over the canvas, FlashAttention-4', R + ', Speed', ['Attention, 4.1x', 'FlashAttention-4']),
 ('No CPU-GPU synchronisation via asynchronous scheduling and a per-sequence causal-attention flag in vLLM', R + ', Speed', ['asynchronous scheduling', 'per-sequence causal-attention flag']),
 # results
 ('Speed ~1,479-1,512 TPS on one H100 FP8 vs 204 Gemma 4 AR and 303 with MTP', R + ', Results; Tables tab', ['1,479', '1,512', '204', '303']),
 ('~2.5x faster than Mercury 2 API (caveat added: API estimate; 1.5x against the vendor figure)', R + ', Results and How much to believe', ['about <b>2.5x</b> Mercury 2', '1.5x']),
 ('Roughly 4x LLaDA 2.1 Flash 100B (itself on 8x B200)', R + ', Results', ['3.9x</b> LLaDA 2.1 Flash', '8 B200']),
 ('Third parties report up to 2,000 TPS on RTX 6000', R + ', Results', ['2,000+', 'RTX 6000']),
 ('Quality thinking TD vs Gemma 4 AR-MTP: GPQA-D 73.2/82.3, AIME 2026 69.1/88.3, LCB-v6 69.1/77.1, GSM8K 96.3/96.7, IFEval 97.4/98.7, HumanEval 94.5/98.8', R + ', Results (quality chart); Tables tab', ['73.2 against 82.3', '69.1 against 88.3', '69.1 against 77.1', '96.3 against 96.7', '97.4 against 98.7', '94.5 against 98.8']),
 ('A real but bounded quality tax for ~5x decoding speed', 'Verdict and Results', ['the quality tax as real', '4.9x']),
 ('Far above open diffusion baselines (Nemotron Diffusion 14B, LLaDA 2.1 Flash); competitive with Mercury 2', R + ', Results', ['far ahead of the open diffusion models', 'close to Mercury 2']),
 ('Dual mode: weights load back into Gemma 4 for AR decoding, scoring between TD and the baseline; latency routing and hybrid decoding', R + ', §3.5 and Results; checked (18 of 19)', ['dual mode', 'hybrid diffusion-AR decoding', '18 of 19']),
 ('Constrained outputs (strict JSON extraction, code editing) converge in 2-3 steps; AR cannot exploit structure', R + ', Results (Section 9)', ['converges in <b>2 steps</b>', 'in <b>3</b>']),
 ('Downstream SFT: LoRA on 2x A100, Sudoku 0% to 84-85%, steps ~41 to ~11', R + ', Results (Finetuning it yourself)', ['2 × A100 80GB', '84.40%', '40.65 to 10.72', 'full finetuning passes 85%']),
 ('Limitations: quality gap (short SFT, latency-targeted SD-RL, inherited AR architecture)', R + ', Limitations', ['A quality gap to the AR parent']),
 ('Limitations: conciseness precludes long-reasoning gains', R + ', Limitations', ['multiplies speed but forgoes long-reasoning gains']),
 ('Limitations: rare token-stuttering loops', R + ', Limitations', ['occasional stuttering']),
 ('Limitations: missed closing-think-tag bug depresses MMMU-Pro thinking scores', R + ', Limitations', ['missing closing thought tag', '54.3']),
 ('Limitations: throughput advantage inverts beyond ~32 concurrent requests', R + ', Speed (Figure 12, marked as extrapolated) and Limitations', ['around 32 concurrent requests', 'is extrapolated']),
 # why it matters
 ('Existence proof: field forced a three-way trade between speed, intelligence and open access; Apache 2.0 with Transformers and vLLM makes it a practical serving option, not a demo', R + ', Why it matters', ['three-way trade between speed, intelligence and open access', 'rather than a demo']),
 ('Conversion recipe public and cheap; capabilities inherited rather than retrained', R + ', Why it matters', ['The AR-to-diffusion conversion recipe is public and cheap', 'inherited rather than retrained']),
 ('Latency economics: 20 TPF vs 3-6 TPF; trading data movement for FLOPs as compute-to-bandwidth ratios grow; dense or fewer-expert architectures suit diffusion better', R + ', Why it matters', ['Latency economics', 'dense or fewer-expert architectures suit diffusion decoding better']),
 ('Counterexample to RL-makes-outputs-longer', R + ', Why it matters; predict question', ['A counterexample to "RL makes outputs longer"']),
 # connections
 ('Connection: topics/generative-and-multimodal, text-diffusion-and-world-models: strongest open entry in the AR-initialised block-diffusion recipe (Mercury, Gemini Diffusion, LLaDA 2.x)', 'Connections; Further reading, Topics', ['3c65c17b0d0d817ab6ade318917bff55', 'AR-initialised block-diffusion recipe']),
 ('Connection: DDPM, the continuous foundation; discrete descendant; rounding breaks likelihood bounds', 'Connections; Discrete diffusion; Further reading', ['3c65c17b0d0d811481e4e36333454f7a', 'breaks likelihood bounds under rounding']),
 ('Connection: BERT masked/random replacement as the single-step ancestor', 'Connections; Discrete diffusion', ['3c65c17b0d0d81e5ad9bd09cbf18ad7c', 'single-step ancestor']),
 ('Connection: Mixtral MoE serving; expert transfer becomes the largest overhead (84 vs 8)', 'Connections; Speed', ['3c65c17b0d0d81eba72af0ac91ddc6b3', '84 against 8 unique experts']),
 ('Connection: vLLM PagedAttention, memory-bound serving; vLLM reference implementation with async scheduling', 'Connections; Speed', ['3c65c17b0d0d81bf8b90ca93fee19f5f', 'vLLM reference implementation with asynchronous scheduling']),
 ('Connection: DeepSeek-R1 RLVR baseline; SD-RL its diffusion-native counterpart', 'Connections; Training; Why it matters', ['3c65c17b0d0d813faca4f7a51eaa0c65', 'diffusion-native counterpart']),
 ('Database property Takeaway', 'stays in the database; also on the headline card', ['Gemma 4 26B A4B warm-started from AR weights with under 10% of the AR token budget']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')],
           'corrections': [
               'a dense model "would lose under 2x": the paper says the feed-forward slowdown would fall below 2x, not the whole step',
               '7.1x and 4.8x use 1,456 tokens/s (Section 6, Eq. 12); Table 3 prints 1,479 (4.9x over MTP)',
               'the 4.8x is against an MTP speed measured on SPEED-Bench, a different workload; on the same PG-19 workload Figure 12 gives 4.11x',
               '~2.5x over Mercury 2 is against an OpenRouter estimate (600 tokens/s); against the vendor-reported ~1,000 it is about 1.5x',
               'the ~32-user crossover is extrapolated: Figure 12 measures DiffusionGemma only up to 16 users',
               'Sudoku 84-85%: 84.40% is LoRA rank 8 (Table 5); above 85% is full finetuning',
               'finetuning does not always cut steps: PubMedQA steps rise from 18.09 to 31.57'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
