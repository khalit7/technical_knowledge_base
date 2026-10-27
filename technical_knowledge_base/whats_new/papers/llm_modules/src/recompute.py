"""Every derived number on the page, from the configs, the released model.py and the measured dataset statistics.

  python3 recompute.py      (build.sh runs it; writes inputs/recompute.json)

Inputs: inputs/qwen2_1.5b_config.json and inputs/gpt_neo_125m_config.json (Hugging Face), inputs/stratos_stats.json
(stratos_stats.py), inputs/repo_facts.json (numbers read from model.py and the Hugging Face repository listing).
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda f: json.load(open(os.path.join(HERE, 'inputs', f)))
QC, NC, ST, RF = J('qwen2_1.5b_config.json'), J('gpt_neo_125m_config.json'), J('stratos_stats.json'), J('repo_facts.json')
lin = lambda i, o, b=True: i * o + (o if b else 0)
R = {}

# ---- Qwen2-1.5B (frozen) ----
d, L, ff, V = QC['hidden_size'], QC['num_hidden_layers'], QC['intermediate_size'], QC['vocab_size']
hd = d // QC['num_attention_heads']; kv = QC['num_key_value_heads'] * hd
layer = lin(d, d) + 2 * lin(d, kv) + lin(d, d, False) + 3 * d * ff + 2 * d
qwen = V * d + L * layer + d                         # tied embeddings: no separate LM head
R['qwen_params'] = qwen

# ---- GPT-Neo-125M (as GPTNeoForCausalLM(config): built from the config, never loaded from the pretrained weights) ----
n, Ln, Vn, P = NC['hidden_size'], NC['num_layers'], NC['vocab_size'], NC['max_position_embeddings']
ffn = 4 * n
nlayer = 2 * n + 3 * n * n + lin(n, n) + 2 * n + lin(n, ffn) + lin(ffn, n)
neo_wte, neo_wpe = Vn * n, P * n
neo = neo_wte + neo_wpe + Ln * nlayer + 2 * n
R['neo_params'] = neo; R['neo_wte'] = neo_wte; R['neo_blocks'] = Ln * nlayer + 2 * n

# ---- the bridge (ModifiedQwenWithCrossAttention's trainable parts) ----
mid = (d + n) // 2
pre_proj, proj = lin(d, d), lin(d, n)
inter = lin(d, mid) + 2 * mid + lin(mid, n) + 2 * n
xattn = lin(n, n) + 2 * lin(d, n) + lin(n, n) + 2 * d + 2 * n
adapter = lin(n, 256) + lin(256, n) + 2 * n
gate = lin(2 * n, n)
enh = xattn + adapter + gate
bridge = pre_proj + proj + inter + 2 * enh
R['bridge'] = dict(pre_proj=pre_proj, proj=proj, intermediate=inter, per_enhanced_layer=enh, cross_attention=xattn,
                   adapter=adapter, gate=gate, total=bridge)
vocab_tok = RF['len_qwen_tokenizer']
head = n * vocab_tok
R['new_lm_head'] = head
trained = bridge + R['neo_blocks'] + neo_wpe + head        # wte is never used (inputs_embeds), so it gets no gradient
R['trained_params'] = trained
R['stored_params'] = qwen + neo + bridge + head
R['checkpoint_fp32_bytes_expected'] = 4 * R['stored_params']
R['checkpoint_bytes_actual'] = RF['checkpoint_bytes']
R['checkpoint_ratio'] = round(RF['checkpoint_bytes'] / R['checkpoint_fp32_bytes_expected'], 4)
R['inference_params'] = qwen + bridge + R['neo_blocks'] + neo_wpe + head
R['inference_vs_qwen'] = round(R['inference_params'] / qwen, 3)
R['head_share_of_trained'] = round(head / trained, 3)
R['bridge_share_of_trained'] = round(bridge / trained, 3)
R['ln_vocab'] = round(math.log(vocab_tok), 2)

# ---- the data actually trained on (stratos_stats.py) ----
R['data'] = {k: v for k, v in ST.items() if k != 'epochs'}
R['data']['epoch2'] = ST['epochs'][1]; R['data']['epoch15'] = ST['epochs'][-1]
R['data']['val_seen'] = [e['val_seen_in_earlier_train'] for e in ST['epochs']]
R['data']['train_per_epoch'] = [e['train'] for e in ST['epochs']]
R['context'] = dict(qwen_config_max_positions=QC['max_position_embeddings'], qwen_blog_context='32K', neo_positions=P,
                    paper_claim='128K tokens in Qwen2')

json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    for k in ('qwen_params', 'neo_params', 'trained_params', 'inference_params', 'inference_vs_qwen', 'checkpoint_ratio', 'head_share_of_trained', 'ln_vocab'):
        print(k, R[k])
    print('bridge', R['bridge'])
