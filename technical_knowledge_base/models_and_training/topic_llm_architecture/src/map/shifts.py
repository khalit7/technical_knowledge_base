#!/usr/bin/env python3
"""'Same model, two eras': the block of five real models rebuilt step by step from the 2018 block.

For each target (Llama 3 8B, Gemma 3 27B, DeepSeek-V3, gpt-oss-120b, Qwen3-Next 80B-A3B) the model's own width,
depth and head count are kept, and the shifts that model adopted are applied in order, starting from the 2018 block
(GPT-1: post-norm LayerNorm, learned positions, multi-head attention, 4d GELU FFN). Every counter is a calculation
from config.json (derived, not measured). Writes src/map/out/shifts.json and parts/35_js_am_0shift.js.

Counters per state:
  kvTok  KV cache bytes per token over all layers, bf16, every cache-growing layer at full cost
  kvSeq  bytes for one 131,072-token sequence, sliding windows credited (a windowed layer keeps min(T, W) entries)
  stB    fixed recurrent state bytes over all linear-attention layers, bf16 (does not grow with T)
  attnP  parameters of one attention layer (projections, plus norms inside attention)
  ffnP   parameters of one FFN layer, total; ffnA active per token (MoE: routed top-k plus shared, plus router)
  normP  norm parameters per layer (the two block norms, plus QK-norm); posP learned position table at 131,072
Dense FFN before the MoE step, for MoE targets: a SwiGLU FFN with the same active width as the final MoE layer
((top-k + shared) x expert width), so the MoE step shows parameters multiplying at constant active compute.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
CFG = os.path.join(HERE, 'inputs', 'configs')
T = 131072
B = 2  # bf16 bytes


def cfg(stem):
    j = json.load(open(os.path.join(CFG, stem + '.json')))
    return j.get('text_config') or j


TARGETS = [
    dict(id='llama3', n='Llama 3 8B', cfg='unsloth__llama-3-8b', steps=['base', 'prenorm', 'rmsnorm', 'rope', 'glu', 'gqa'], glu='SwiGLU'),
    dict(id='gemma3', n='Gemma 3 27B', cfg='unsloth__gemma-3-27b-it', steps=['base', 'prenorm', 'rmsnorm', 'rope', 'glu', 'gqa', 'swa', 'qknorm'], glu='GeGLU'),
    dict(id='dsv3', n='DeepSeek-V3', cfg='deepseek-ai__DeepSeek-V3', steps=['base', 'prenorm', 'rmsnorm', 'rope', 'glu', 'mla', 'moe'], glu='SwiGLU'),
    dict(id='gptoss', n='gpt-oss-120b', cfg='openai__gpt-oss-120b', steps=['base', 'prenorm', 'rmsnorm', 'rope', 'glu', 'gqa', 'swa', 'moe'], glu='SwiGLU'),
    dict(id='qwen3next', n='Qwen3-Next 80B-A3B', cfg='Qwen__Qwen3-Next-80B-A3B-Instruct', steps=['base', 'prenorm', 'rmsnorm', 'rope', 'glu', 'gqa', 'qknorm', 'moe', 'hybrid'], glu='SwiGLU'),
]


def shape(t, tid):
    L, D, H = t['num_hidden_layers'], t['hidden_size'], t['num_attention_heads']
    dh = t.get('head_dim') or D // H
    if tid == 'dsv3':
        dh = t['v_head_dim']  # MHA baseline with 128-dim heads, as the DeepSeek page draws it
    s = dict(L=L, D=D, H=H, dh=dh, Hkv=t.get('num_key_value_heads', H), V=t['vocab_size'])
    if tid == 'gemma3':
        s.update(W=t.get('sliding_window', 1024), nG=sum(1 for x in t['layer_types'] if x == 'full_attention') if t.get('layer_types') else L // 6)
    if tid == 'gptoss':
        s.update(W=t['sliding_window'], nG=sum(1 for x in t['layer_types'] if x == 'full_attention'))
    if tid == 'qwen3next':
        s.update(nG=L // t['full_attention_interval'], st=t['linear_num_value_heads'] * t['linear_key_head_dim'] * t['linear_value_head_dim'])
    return s


def counters(st, s, t, tid):
    L, D, H, dh = s['L'], s['D'], s['H'], s['dh']
    # attention
    if st['att'] == 'mla':
        qr, kr, rr, nope, vd = t['q_lora_rank'], t['kv_lora_rank'], t['qk_rope_head_dim'], t['qk_nope_head_dim'], t['v_head_dim']
        attnP = D * qr + qr + qr * H * (nope + rr) + D * (kr + rr) + kr + kr * H * (nope + vd) + H * vd * D
        kvl = (kr + rr) * B
    else:
        hkv = st['kvh']
        qout = H * dh * (2 if st.get('gate') else 1)  # Qwen3-Next gated attention: q_proj also emits the output gate
        attnP = D * qout + 2 * D * hkv * dh + H * dh * D
        if st.get('sink'):
            attnP += H
        kvl = 2 * hkv * dh * B
    if st['qk']:
        attnP += 2 * dh
    # layers that grow a cache
    nAtt = L
    if st.get('hyb'):
        nAtt = s['nG']
    if st.get('win'):
        nG = s['nG']; nS = L - nG
        kvTok = kvl * L
        kvSeq = kvl * (nG * T + nS * min(T, s['W']))
    else:
        kvTok = kvl * nAtt
        kvSeq = kvl * nAtt * T
    stB = (L - nAtt) * s['st'] * B if st.get('hyb') else 0
    # FFN
    if st['ffn'] == 'gelu':
        ffnP = ffnA = 2 * D * 4 * D
    elif st['ffn'] == 'glu':
        dff = st['dff']
        ffnP = ffnA = 3 * D * dff
    else:  # moe
        E, k, sh, de, dsh = st['E'], st['k'], st['sh'], st['de'], st['dsh']
        ffnP = E * 3 * D * de + sh * 3 * D * dsh + D * E
        ffnA = k * 3 * D * de + sh * 3 * D * dsh + D * E
    # norms
    one = 2 * D if st['nt'] == 'LayerNorm' else D
    normP = (4 if st['norm'] == 'sandwich' else 2) * one + (2 * dh if st['qk'] else 0)
    posP = T * D if st['pos'] == 'learned' else 0
    return dict(kvTok=kvTok, kvSeq=kvSeq, stB=stB, attnP=attnP, ffnP=ffnP, ffnA=ffnA, normP=normP, posP=posP, nAtt=nAtt)


def build(tg):
    t = cfg(tg['cfg'])
    s = shape(t, tg['id'])
    tid = tg['id']
    # dense GLU width before any MoE step
    if tid == 'dsv3':
        de, E, k, sh, dsh = t['moe_intermediate_size'], t['n_routed_experts'], t['num_experts_per_tok'], t['n_shared_experts'], t['moe_intermediate_size']
    elif tid == 'gptoss':
        de, E, k, sh, dsh = t['intermediate_size'], t['num_local_experts'], t['num_experts_per_tok'], 0, 0
    elif tid == 'qwen3next':
        de, E, k, sh, dsh = t['moe_intermediate_size'], t['num_experts'], t['num_experts_per_tok'], 1, t['shared_expert_intermediate_size']
    else:
        de = E = k = sh = dsh = None
    dff = (k * de + sh * dsh) if E else t['intermediate_size']
    st = dict(norm='post', nt='LayerNorm', pos='learned', ffn='gelu', att='mha', kvh=s['H'], qk=False, win=False, hyb=False, gate=False, sink=False)
    states = []
    for step in tg['steps']:
        if step == 'prenorm':
            st['norm'] = 'pre'
        elif step == 'rmsnorm':
            st['nt'] = 'RMSNorm'
        elif step == 'rope':
            st['pos'] = 'rope'
        elif step == 'glu':
            st.update(ffn='glu', dff=dff, glu=tg['glu'])
        elif step == 'gqa':
            st['kvh'] = s['Hkv']
            st['att'] = 'mqa' if s['Hkv'] == 1 else 'gqa'
            if tid == 'qwen3next':
                st['gate'] = True
        elif step == 'mla':
            st['att'] = 'mla'
        elif step == 'swa':
            st['win'] = True
            if tid == 'gptoss':
                st['sink'] = True
            if tid == 'gemma3':
                st['norm'] = 'sandwich'
        elif step == 'qknorm':
            st['qk'] = True
        elif step == 'moe':
            st.update(ffn='moe', E=E, k=k, sh=sh, de=de, dsh=dsh)
        elif step == 'hybrid':
            st['hyb'] = True
        c = counters(st, s, t, tid)
        states.append(dict(step=step, st=dict(st), c=c))
    return dict(id=tid, n=tg['n'], shape=s, states=states)


SHIFTS = {
 'base': dict(t='The 2018 block', when='GPT-1, 2018 (the original Transformer decoder layer)',
   src=[['GPT-1 paper', 'https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf'], ['Attention Is All You Need', 'n:3c65c17b0d0d81999af7f16f8ed8ee9e']],
   what='Post-norm LayerNorm after each residual add, a learned position table added to the embeddings, multi-head attention with one K and V head per query head, and a two-matrix FFN of width 4d with GELU. This is the starting point the target model would have had in 2018 at its own width and depth.'),
 'prenorm': dict(t='Pre-norm', when='GPT-2, 2019',
   src=[['GPT-2 paper, section 2.3', 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf'], ['Xiong et al. 2020, arXiv 2002.04745', 'https://arxiv.org/abs/2002.04745']],
   problem='In post-norm the sum x + F(x) is normalised after every sub-layer, so the gradient reaching early layers passes through every norm; deep post-norm stacks need a learning-rate warm-up and still diverge.',
   how='Normalise the input of each sub-layer instead, h = x + F(norm(x)), and add one final norm before the unembedding. The residual path is now a plain sum from the embedding to the last layer.',
   cost='No parameters. The residual stream grows in norm with depth, which the final norm absorbs (the Block lab measures it).',
   check='In the modelling code the norm call sits inside the branch: hidden = residual + self_attn(input_layernorm(residual)).'),
 'rmsnorm': dict(t='RMSNorm', when='Zhang and Sennrich 2019; adopted by LLaMA, 2023',
   src=[['RMSNorm, arXiv 1910.07467', 'https://arxiv.org/abs/1910.07467'], ['LLaMA, section 2.2', 'https://arxiv.org/abs/2302.13971']],
   problem='LayerNorm subtracts the mean and adds a bias: an extra reduction and extra parameters per norm, with no measured gain in quality.',
   how='Divide by the root mean square only and keep one gain vector: y = g * x / sqrt(mean(x^2) + eps).',
   cost='Half the norm parameters (d instead of 2d per norm) and one reduction instead of two.',
   check='config.json has rms_norm_eps rather than layer_norm_epsilon; the checkpoint has no norm bias.'),
 'rope': dict(t='Rotary position embeddings', when='RoFormer 2021; GPT-NeoX and PaLM 2022, LLaMA 2023',
   src=[['RoFormer, arXiv 2104.09864', 'n:3c65c17b0d0d81cfa5e9f54459720098'], ['PaLM, section 2', 'https://arxiv.org/abs/2204.02311']],
   problem='A learned position table covers only the positions it was trained on and costs context x d parameters (at 131,072 positions it would be the size shown in the counter); absolute positions do not tell attention how far apart two tokens are.',
   how='Rotate each pair of query and key dimensions by an angle proportional to the position, at frequencies set by rope_theta. The dot product q.k then depends only on the offset between the two tokens.',
   cost='No parameters; an elementwise rotation of q and k. Going past the trained length needs scaling (position interpolation, NTK, YaRN, llama3); the Positional Encodings page owns that.',
   check='config.json has rope_theta (and rope_scaling for long context); the checkpoint has no position embedding table.'),
 'glu': dict(t='Gated FFN (SwiGLU, GeGLU)', when='Shazeer 2020; PaLM 2022, LLaMA 2023, Gemma 2024',
   src=[['GLU Variants Improve Transformer, arXiv 2002.05202', 'https://arxiv.org/abs/2002.05202'], ['LLaMA, section 2.2', 'https://arxiv.org/abs/2302.13971']],
   problem='The two-matrix FFN applies one fixed nonlinearity per hidden unit; in Shazeer\'s comparisons gated variants reached lower perplexity at the same parameter count.',
   how='Three matrices: down(act(gate(x)) * up(x)), with act = SiLU (SwiGLU) or GELU (GeGLU). LLaMA keeps parameters equal by shrinking the hidden width from 4d to about 8/3 d; later models choose their own width.',
   cost='One more matrix. At 8/3 d the parameters and FLOPs equal the 4d GELU FFN; each model\'s own width sets the counter here.',
   check='Weights named gate_proj, up_proj and down_proj; hidden_act silu or gelu_pytorch_tanh in config.json.'),
 'gqa': dict(t='Grouped-query attention', when='Ainslie et al. 2023; Llama 2 70B and Mistral 7B, 2023',
   src=[['GQA, arXiv 2305.13245', 'https://arxiv.org/abs/2305.13245'], ['MQA, arXiv 1911.02150', 'https://arxiv.org/abs/1911.02150']],
   problem='Every decode step reads the whole KV cache. With one K and V head per query head the cache dominates memory traffic and caps the batch size.',
   how='Query heads share K and V heads in groups (for example 32 query heads over 8 KV heads, groups of 4). Multi-query attention is the extreme case of one KV head.',
   cost='The cache and its bandwidth shrink by H / Hkv. The GQA paper reports quality close to multi-head attention when an existing checkpoint is uptrained with 5% of its pretraining compute.',
   check='num_key_value_heads in config.json is smaller than num_attention_heads.'),
 'mla': dict(t='Multi-head latent attention', when='DeepSeek-V2, 2024',
   src=[['DeepSeek-V2, arXiv 2405.04434', 'https://arxiv.org/abs/2405.04434'], ['DeepSeek page (MLA explainer)', 'n:3c65c17b0d0d81a2ae7ec6796947a235']],
   problem='Even GQA keeps 2 x Hkv x head_dim numbers per token per layer. DeepSeek wanted a cache smaller than MQA\'s without MQA\'s quality loss.',
   how='Cache one compressed latent per token (512 numbers) plus one shared RoPE key (64 numbers); each head\'s K and V are rebuilt from the latent by up-projections, which can be folded into the query and output projections at decode time.',
   cost='Extra projection parameters and a decoupled RoPE path; more arithmetic per cached number, which suits bandwidth-bound decoding.',
   check='config.json has kv_lora_rank and qk_rope_head_dim.'),
 'swa': dict(t='Sliding-window and global layers', when='Mistral 7B 2023; Gemma 2 2024; Gemma 3 and gpt-oss 2025',
   src=[['Mistral 7B, arXiv 2310.06825', 'https://arxiv.org/abs/2310.06825'], ['Gemma 3 report, arXiv 2503.19786', 'https://arxiv.org/abs/2503.19786'], ['gpt-oss model card, arXiv 2508.10925', 'https://arxiv.org/abs/2508.10925']],
   problem='With full attention the cache grows by one entry per token in every layer.',
   how='Most layers attend only to the last W tokens and keep a rolling cache of W entries; a few global layers keep the whole history. Gemma 3: 5 local layers (W = 1,024) per global layer, with norms before and after each sub-layer. gpt-oss: local (W = 128) and global layers alternate, and each head has a learned sink logit so it can send attention mass nowhere.',
   cost='Anything older than W tokens reaches a local layer only through the global layers.',
   check='layer_types (or sliding_window_pattern) and sliding_window in config.json.'),
 'qknorm': dict(t='QK-norm', when='Dehghani et al. 2023 (ViT-22B); OLMo 2 2024, Gemma 3 and Qwen3 2025',
   src=[['ViT-22B, arXiv 2302.05442', 'https://arxiv.org/abs/2302.05442'], ['OLMo 2, arXiv 2501.00656', 'https://arxiv.org/abs/2501.00656']],
   problem='Attention logits can grow without bound during training, collapse the softmax onto one token and cause loss spikes.',
   how='Apply RMSNorm to each head\'s queries and keys before the dot product, so the logits stay bounded by learned gains. Gemma 3 uses it in place of Gemma 2\'s logit soft-capping.',
   cost='2 x head_dim parameters per layer and two small normalisations.',
   check='q_norm and k_norm weights in the checkpoint (use_qk_norm in some configs).'),
 'moe': dict(t='Mixture of experts', when='Switch Transformer 2021; Mixtral 2023; DeepSeekMoE 2024',
   src=[['Switch Transformers, arXiv 2101.03961', 'n:3c65c17b0d0d81a8b541c9babbf40c94'], ['Mixtral', 'n:3c65c17b0d0d81eba72af0ac91ddc6b3'], ['DeepSeekMoE, arXiv 2401.06066', 'https://arxiv.org/abs/2401.06066']],
   problem='Quality grows with parameters, but in a dense model every parameter costs FLOPs on every token.',
   how='Replace the FFN with E experts and a router that sends each token to its top k experts (plus shared experts that always run). Parameters grow many times over while the compute per token stays at the active experts.',
   cost='Every expert must sit in memory; routing needs load balancing (an auxiliary loss, or DeepSeek-V3\'s per-expert router bias) and all-to-all communication across devices.',
   check='n_routed_experts or num_experts, num_experts_per_tok and n_shared_experts in config.json.'),
 'hybrid': dict(t='Linear-attention hybrid', when='Mamba 2023, Jamba 2024, Gated DeltaNet 2024; Qwen3-Next 2025',
   src=[['Mamba', 'n:3c65c17b0d0d8179984fc3a1fee4c36a'], ['Gated DeltaNet, arXiv 2412.06464', 'https://arxiv.org/abs/2412.06464'], ['Jamba, arXiv 2403.19887', 'https://arxiv.org/abs/2403.19887']],
   problem='Softmax attention\'s cache and per-token cost still grow with context in every attention layer.',
   how='Three layers in four become Gated DeltaNet: a fixed-size matrix state per head, updated per token by a gated delta rule. One layer in four keeps (gated) full attention for exact recall.',
   cost='A fixed state forgets; exact retrieval rests on the remaining attention layers, and the kernels are newer and less tuned.',
   check='layer_types or full_attention_interval in config.json; linear_* head sizes give the state size.'),
}

out = dict(T=T, shifts=SHIFTS, targets=[build(tg) for tg in TARGETS])
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
json.dump(out, open(os.path.join(HERE, 'out', 'shifts.json'), 'w'), indent=1)
js = ('// written by src/map/shifts.py from config.json files; do not edit by hand.\n'
      'window.AMS=' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n')
open(os.path.join(SRC, 'parts', '35_js_am_0shift.js'), 'w').write(js)


def gib(x):
    return '%.2f GiB' % (x / 2 ** 30)


for tg in out['targets']:
    print('##', tg['n'], tg['shape'])
    for s in tg['states']:
        c = s['c']
        print('  %-8s kv/tok %8.1f KiB  seq %-11s state %-10s attn %6.1fM ffn %8.1fM act %7.1fM norm %6d pos %6.1fM' % (
            s['step'], c['kvTok'] / 1024, gib(c['kvSeq']), gib(c['stB']), c['attnP'] / 1e6, c['ffnP'] / 1e6, c['ffnA'] / 1e6, c['normP'], c['posP'] / 1e6))
print('bytes', len(js.encode()))
