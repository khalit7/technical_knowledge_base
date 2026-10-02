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
 ('Reading time line "9 min read, +3h 20m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors: Hu*, Shen*, Wallis, Allen-Zhu, Li, Wang, Wang, Chen (Microsoft)', R + ', headline card', ['Edward J. Hu*', 'Yelong Shen*', 'Phillip Wallis', 'Zeyuan Allen-Zhu', 'Yuanzhi Li', 'Shean Wang', 'Lu Wang', 'Weizhu Chen', 'Microsoft']),
 ('Date: June 2021 (v1), v2 October 2021, ICLR 2022', R + ', headline card', ['June 2021 (arXiv v1); v2 October 2021', 'ICLR 2022']),
 ('Link arXiv:2106.09685 (~45 min); code microsoft/LoRA (loralib), ~15 min README', 'card and Further reading', ['https://arxiv.org/abs/2106.09685', '(45 min)', 'https://github.com/microsoft/LoRA', 'loralib', '(15 min)']),
 ('Raschka, Practical Tips for Finetuning LLMs Using LoRA (~30 min)', 'Further reading', ['https://magazine.sebastianraschka.com/p/practical-tips-for-finetuning-llms', 'the best empirical guide to r, alpha, which layers, and QLoRA trade-offs']),
 ('Raschka, Code LoRA from Scratch (~45 min)', 'Further reading', ['https://lightning.ai/lightning-ai/studios/code-lora-from-scratch', 'roughly 20 lines that LoRA actually is']),
 ('LoRA Without Regret (Thinking Machines, Sept 2025, ~35 min)', 'Further reading; Why it matters; Then and now', ['https://thinkingmachines.ai/blog/lora/', 'partially overturns the original paper']),
 ('Hugging Face PEFT docs (~30 min)', 'Further reading; Use it', ['https://huggingface.co/docs/peft', 'the library everyone actually uses to apply LoRA']),
 ('Problem: full FT = full copy per task; GPT-3 175B ~350GB FP16', R + ', Problem', ['complete copy of the model', 'about 350 GB in FP16']),
 ('Adapters add sequential depth; 20-30% latency on GPT-2 at batch 1', R + ', Problem; animation; Tables tab Table 1', ['(+20.7%)', '(+30.3%)', 'must run in sequence']),
 ('Worse under model parallelism: extra AllReduce/Broadcast', R + ', Problem', ['AllReduce and Broadcast']),
 ('Prefix/prompt tuning hard to optimise, non-monotonic, eats sequence length', R + ', Problem', ['hard to optimise', 'non-monotonically', 'sequence length available for the task']),
 ('The gap: parameter-efficient, stable, zero inference latency', R + ', Problem', ['add exactly zero inference latency?']),
 ('Low intrinsic dimension (Aghajanyan et al. 2020); hypothesis: update has low intrinsic rank', R + ', Idea', ['Aghajanyan et al. (2020)', 'low "intrinsic rank"']),
 ('h = W0 x + dW x = W0 x + B A x, B d x r, A r x k, r << min(d,k)', R + ', Idea, Equation 3', ['<i>h</i> = <i>W</i><sub>0</sub><i>x</i> + Δ<i>W x</i>', 'r</i> ≪ min(<i>d</i>, <i>k</i>)']),
 ('Only A and B receive gradients', R + ', Idea', ['Only <i>A</i> and <i>B</i> receive gradients']),
 ('GPT-3 d = 12,288; r = 1 or 2 can suffice', R + ', Idea', ['where <i>d</i> is 12,288, <i>r</i> = 1 or 2 already suffices']),
 ('Init: A Gaussian, B zero, so dW = 0 at start', R + ', Idea; animation step 4; Train a LoRA', ['<i>A</i> is random Gaussian and <i>B</i> is zero', 'training begins exactly at the pretrained model']),
 ('Scaling alpha/r; tuning alpha ~ tuning LR with Adam; alpha = first r, not tuned', R + ', Idea', ['tuning α is roughly the same as tuning the learning rate', 'set α to the first <i>r</i> they try']),
 ('Adapt only attention (Wq, Wk, Wv, Wo), MLP frozen', R + ', Method', ['<b>only attention weights</b>', 'freezes the MLPs']),
 ('18M budget: Wq+Wv r=4 (or all four r=2) beats single matrix at r=8', R + ', Inside dW (corrected: beats Wq or Wk alone; Wo and Wv alone within noise)', ['adapting more matrices beats a higher rank on one', 'close to the best']),
 ('Generalisation of full FT: r -> rank recovers FT; adapters -> MLP; prefix -> truncated context', R + ', Method', ['roughly recovers full fine-tuning', 'adapters converge to an MLP']),
 ('No latency: merge W = W0 + BA; switch by subtract BA, add B\'A\'', R + ', Merging (checked live)', ['subtract <i>BA</i> and add another', 'Checked live']),
 ('Alternative: keep unmerged and serve many tasks; batching awkward if merged', R + ', Method (stated limitation); Then and now', ['one forward pass cannot easily serve a batch']),
 ('VRAM 1.2TB -> 350GB; up to 2/3 VRAM reduction', R + ', Method; Tables tab check', ['1.2 TB to 350 GB', 'up to 2/3']),
 ('Checkpoint ~10,000x, 350GB -> 35MB at r = 4', R + ', Method; calculator', ['roughly 10,000× (350 GB to 35 MB)']),
 ('~25% training throughput speedup', R + ', Method (with footnote numbers: 24.6% less time, 32.6% more tokens/s)', ['25% faster', '32.5 tokens per second', '43.1']),
 ('100 task models ~354GB instead of ~35TB', R + ', Method; calculator', ['≈ 354 GB instead of 100 × 350 GB ≈ 35 TB']),
 ('GLUE: RoBERTa-base 87.2 vs 86.4, 0.3M vs 125M', R + ', Results; Tables tab Table 2', ['LoRA 87.2 average against 86.4', '0.3M against 125M']),
 ('RoBERTa-large 89.0 vs 88.9', R + ', Results', ['RoBERTa large 89.0 against 88.9']),
 ('DeBERTa-XXL 91.3 vs 91.1, 4.7M vs 1,500M', R + ', Results', ['DeBERTa XXL 91.3 against 91.1 (4.7M against 1,500M)']),
 ('LoRA trains ~0.1-0.3% of parameters', R + ', Results (recomputed: 0.2% to 0.3%)', ['about 0.2% to 0.3% of the parameters']),
 ('GPT-2 medium E2E: 70.4 vs 68.2 BLEU, 0.35M vs 354.92M; beats adapters, prefix, FT-top2 on all five metrics', R + ', Results; Tables tab Table 3', ['70.4 BLEU against 68.2', '0.35M against 354.92M', 'BLEU, NIST, METEOR, ROUGE-L and CIDEr']),
 ('GPT-3: 4.7M params (37,000x fewer); WikiSQL 73.4 (73.8), MNLI-m 91.7 (89.5), SAMSum 53.8/29.8/45.9 (52.0/28.0/44.5)', R + ', Results and card; calculator', ['WikiSQL 73.4% (full fine-tuning 73.8)', 'MNLI-matched 91.7 (89.5)', '53.8/29.8/45.9 (52.0/28.0/44.5)', '37,000 times fewer']),
 ('Prefix methods degrade past ~256 special tokens; LoRA monotonic', R + ', Results (corrected: prefix-embedding past 256, prefix-layer past 32); Figure 2 rebuilt', ['past 256 special tokens', 'prefix-layer tuning past 32']),
 ('Intrinsic rank: r = 1 competitive on WikiSQL/MNLI for {Wq, Wv}; r 4 to 8 saturates', R + ', Inside dW (corrected: r = 1 already matches r = 64; Wq alone needs larger r)', ['<i>r</i> = 1 already does as well as <i>r</i> = 64']),
 ('Grassmann subspace: top directions of r=8 and r=64 overlap; rest noise; seeds agree', R + ', Inside dW; Train a LoRA heatmaps', ['overlap with <i>φ</i> &gt; 0.5', 'Two seeds at <i>r</i> = 64 share their top directions']),
 ('dW amplifies directions present but not emphasised in W, ~21.5 at r = 4', R + ', Inside dW predict reveal; Table 7 bars', ['6.91 / 0.32 ≈ 21.5', 'present and not emphasised']),
 ('Adaptation is feature amplification, not feature learning from scratch', R + ', Inside dW', ['amplifies task-specific features that pretraining learned but did not emphasise']),
 ('Why it matters: default way to fine-tune; PEFT LoraConfig standard', R + ', Why it matters', ['became the default way to fine-tune large models', 'LoraConfig']),
 ('QLoRA (May 2023): 4-bit NF4 base + paged optimisers, 65B on one 48GB GPU', R + ', Why it matters; Then and now', ['NormalFloat (NF4)', 'paged optimisers', 'single 48 GB GPU']),
 ('Multi-tenant serving: vLLM, SGLang, S-LoRA; Apple per-feature adapters; Tinker LoRA underneath', R + ', Why it matters; Then and now', ['vLLM and SGLang', 'S-LoRA', 'Apple ships per-feature adapters', 'Tinker']),
 ('rsLoRA (2023): alpha/sqrt(r), use_rslora', R + ', Why it matters; Train a LoRA scaling chart', ['rsLoRA', 'use_rslora', 'lora_alpha/√r']),
 ('DoRA (NVIDIA, ICML 2024): magnitude/direction, use_dora', R + ', Why it matters', ['DoRA', 'magnitude and direction', 'use_dora']),
 ('LoRA Without Regret: all layers esp. MLP; capacity; RL low rank; LR ~10x; large batches less graceful', R + ', Why it matters; Use it; Then and now', ['especially the MLP and MoE layers', 'even rank 1 matches', 'about 10× full fine-tuning', 'tolerates large batches less well']),
 ('The intrinsic-rank analysis remains a standard lens', R + ', Why it matters', ['remains a standard lens on what fine-tuning does']),
 ('Connections: QLoRA, GPT-3, BERT (RoBERTa/DeBERTa), DPO and DeepSeekMath-GRPO, vLLM-PagedAttention', R + ', Connections; Further reading', ['3c65c17b0d0d815a8f4edc33f9583671', '3c65c17b0d0d8193ac92c7648cfaca12', '3c65c17b0d0d81e5ad9bd09cbf18ad7c', '3c65c17b0d0d818bb1d8cafd30e20f9e', '3c65c17b0d0d817f9fc5cb9a9fbcbee5', '3c65c17b0d0d81bf8b90ca93fee19f5f']),
 ('Topics: llm-training-and-post-training, inference-and-serving', R + ', Connections; Further reading', ['3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d81c08b3bc95ff45c7b13']),
 ('Database property Takeaway', 'stays in the database; also on the headline card', ['Freeze W0 and train a zero-initialized low-rank update']),
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
