"""Model and hardware presets for the simulator, computed from config.json files
(inputs/) and the shared chip facts. Run: python3 presets.py > out/presets.json"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))


def model(cfgfile, name, wb, kvb):
    c = json.load(open(os.path.join(HERE, 'inputs', cfgfile)))
    h, ff, L = c['hidden_size'], c['intermediate_size'], c['num_hidden_layers']
    nq, nkv = c['num_attention_heads'], c['num_key_value_heads']
    hd = c.get('head_dim') or h // nq
    V = c['vocab_size']
    tied = c.get('tie_word_embeddings', False)
    layer = h * nq * hd + 2 * h * nkv * hd + nq * hd * h + 3 * h * ff
    norms = L * 2 * h + h + (L * 2 * hd if 'qwen3' in c.get('model_type', '') else 0)
    P = L * layer + V * h * (1 if tied else 2) + norms
    Pact = L * layer + V * h  # matmul parameters per token: layers plus the output projection
    return {'name': name, 'L': L, 'nq': nq, 'nkv': nkv, 'hd': hd, 'P': P, 'Pact': Pact,
            'Plm': V * h, 'wbytes': P * wb, 'kvtok': 2 * L * nkv * hd * kvb, 'wb': wb, 'kvb': kvb}


MODELS = {
    'l8_fp8': model('cfg_unsloth_Meta-Llama-3.1-8B.json', 'Llama 3.1 8B, FP8 weights, FP8 KV', 1, 1),
    'l8_bf16': model('cfg_unsloth_Meta-Llama-3.1-8B.json', 'Llama 3.1 8B, BF16', 2, 2),
    'q06_f16': model('cfg_Qwen_Qwen3-0.6B.json', 'Qwen3-0.6B, F16', 2, 2),
}

if __name__ == '__main__':
    print(json.dumps(MODELS, indent=1))
