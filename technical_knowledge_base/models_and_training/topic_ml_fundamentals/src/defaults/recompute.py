#!/usr/bin/env python3
"""Recompute every derived cell of data/defaults.json, and check the config values the grid cites
against the config files saved in src/defaults/inputs/.

Run: python3 src/defaults/recompute.py   (exits 1 on any mismatch; writes inputs/recompute.json)
"""
import json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(HERE, 'inputs')
D = json.load(open(os.path.join(os.path.dirname(HERE), 'data', 'defaults.json'), encoding='utf-8'))
cell = lambda r, c: next(x for x in D['rows'] if x['id'] == r)['cells'][c]


def cfg(name):
    d = json.load(open(os.path.join(INP, name), encoding='utf-8'))
    return d.get('text_config', d)


def yaml_val(name, key):
    s = open(os.path.join(INP, name), encoding='utf-8').read()
    m = re.search(r'^\s*' + re.escape(key) + r':\s*(\S+)', s, re.M)
    return m.group(1) if m else None


out, bad = [], 0


def chk(what, got, want, rel=0.005):
    global bad
    ok = (got == want) if isinstance(want, str) else (abs(got - want) <= rel * max(abs(want), 1e-30) or got == want)
    out.append({'check': what, 'computed': got, 'stated': want, 'ok': ok})
    if not ok:
        bad += 1
    print(('ok   ' if ok else 'FAIL ') + what + ': computed ' + str(got) + ', stated ' + str(want))


# derived cells: recompute n from the published inputs
chk('Transformer peak LR = 512^-0.5 x 4000^-0.5', 512 ** -0.5 * 4000 ** -0.5, cell('transformer', 'lr')['n'])
chk('Transformer big peak LR (note) = 1024^-0.5 x 4000^-0.5 = 4.94e-4', 1024 ** -0.5 * 4000 ** -0.5, 4.94e-4)
chk('Transformer final %, sqrt(4000/100000)', 100 * math.sqrt(4000 / 100000), cell('transformer', 'fin')['n'])
chk('AlexNet final %, 0.01 / 10^3 over 0.01', 100 * (0.01 / 10 ** 3) / 0.01, cell('alexnet', 'fin')['n'])
chk('T5 final % at 1M steps, (1/sqrt(1e6)) / (1/sqrt(1e4))', 100 * (1 / math.sqrt(1e6)) / (1 / math.sqrt(1e4)), cell('t5', 'fin')['n'])
for rid, f in (('llama1', 'cfg_huggyllama_llama-65b.json'), ('llama2', 'cfg_NousResearch_Llama-2-70b-hf.json'),
               ('mistral7b', 'cfg_mistralai_Mistral-7B-v0.1.json'), ('llama3', 'cfg_unsloth_Meta-Llama-3.1-405B-bnb-4bit.json'),
               ('olmo2', 'cfg_allenai_OLMo-2-1124-7B.json'), ('gemma3', 'cfg_unsloth_gemma-3-27b-pt.json'),
               ('smollm3', 'cfg_HuggingFaceTB_SmolLM3-3B-Base.json')):
    c = cfg(f)
    chk(rid + ' FFN ratio = intermediate_size / hidden_size', c['intermediate_size'] / c['hidden_size'], cell(rid, 'ffn')['n'])
for rid, f in (('dsv3', 'cfg_deepseek-ai_DeepSeek-V3-Base.json'), ('kimik2', 'cfg_moonshotai_Kimi-K2-Base.json'), ('qwen3', 'cfg_Qwen_Qwen3-235B-A22B.json')):
    c = cfg(f)
    chk(rid + ' expert FFN ratio = moe_intermediate_size / hidden_size', c['moe_intermediate_size'] / c['hidden_size'], cell(rid, 'ffn')['n'])
c = cfg('cfg_deepseek-ai_DeepSeek-V3-Base.json')
chk('DeepSeek-V3 active FFN = (1 shared + 8 routed) x 2048 = dense 18,432', 9 * c['moe_intermediate_size'], c['intermediate_size'])
c = cfg('cfg_Qwen_Qwen3-235B-A22B.json')
chk('Qwen3 active FFN = 8 x 1536 / 4096 = 3 x d', 8 * c['moe_intermediate_size'] / c['hidden_size'], 3.0)
chk('DeepSeek-V3 final % = 7.3e-6 / 2.2e-4', 100 * 7.3e-6 / 2.2e-4, cell('dsv3', 'fin')['n'])
chk('Kimi K2 final % = 7e-6 / 2e-4', 100 * 7e-6 / 2e-4, cell('kimik2', 'fin')['n'])
chk('Llama 3 405B end of cosine, % = 8e-7 / 8e-5', 100 * 8e-7 / 8e-5, 1.0)

# batch sizes and token counts stated in notes
chk('SmolLM3 batch = dp 192 x micro 3 x 4096', int(yaml_val('smollm3_stage1.yaml', 'dp')) * int(yaml_val('smollm3_stage1.yaml', 'micro_batch_size')) * int(yaml_val('smollm3_stage1.yaml', 'sequence_length')), cell('smollm3', 'batch')['n'])
chk('SmolLM3 blog "2.36M tokens"', round(cell('smollm3', 'batch')['n'] / 1e6, 2), 2.36)
chk('OLMo 2 warmup tokens = 2000 x 1024 x 4096', 2000 * 1024 * 4096, int(yaml_val('olmo2_7b_stage1.yaml', 't_warmup')))
chk('OLMo 2 batch tokens = 1024 x 4096', int(yaml_val('olmo2_7b_stage1.yaml', 'global_train_batch_size')) * 4096, cell('olmo2', 'batch')['n'])
chk('DeepSeek-V3 batch tokens = 15360 x 4096', 15360 * 4096, cell('dsv3', 'batch')['n'])
chk('BERT batch = 256 x 512', 256 * 512, cell('bert', 'batch')['n'])
chk('T5 final batch = 2^11 x 512', 2 ** 11 * 512, cell('t5', 'batch')['n'])
chk('GPT-2 batch = 512 x 1024', 512 * 1024, cell('gpt2', 'batch')['n'])
chk('GPT batch = 64 x 512', 64 * 512, cell('gpt1', 'batch')['n'])
chk('Llama 3 "8M sequences of 8,192 tokens", billions of tokens per step', 8e6 * 8192 / 1e9, 65.536)
chk('CLIP logit_scale init = ln(1/0.07), config 2.6592', math.log(1 / 0.07), json.load(open(os.path.join(INP, 'cfg_clip-vit-l14.json')))['logit_scale_init_value'], rel=1e-4)

# config values the grid cites as published
for rid, f, key, col in (('bert', 'cfg_bert-large.json', 'layer_norm_eps', 'neps'), ('t5', 'cfg_google-t5_t5-11b.json', 'layer_norm_epsilon', 'neps'),
                         ('llama2', 'cfg_NousResearch_Llama-2-70b-hf.json', 'rms_norm_eps', 'neps'), ('mistral7b', 'cfg_mistralai_Mistral-7B-v0.1.json', 'rms_norm_eps', 'neps'),
                         ('llama3', 'cfg_unsloth_Meta-Llama-3.1-405B-bnb-4bit.json', 'rms_norm_eps', 'neps'), ('dsv3', 'cfg_deepseek-ai_DeepSeek-V3-Base.json', 'rms_norm_eps', 'neps'),
                         ('gemma3', 'cfg_unsloth_gemma-3-27b-pt.json', 'rms_norm_eps', 'neps'), ('qwen3', 'cfg_Qwen_Qwen3-235B-A22B.json', 'rms_norm_eps', 'neps'),
                         ('kimik2', 'cfg_moonshotai_Kimi-K2-Base.json', 'rms_norm_eps', 'neps'), ('smollm3', 'cfg_HuggingFaceTB_SmolLM3-3B-Base.json', 'rms_norm_eps', 'neps'),
                         ('llama1', 'cfg_huggyllama_llama-65b.json', 'rms_norm_eps', 'neps'), ('clip', 'cfg_clip-vit-l14.json', None, 'neps')):
    c = json.load(open(os.path.join(INP, f), encoding='utf-8')) if key is None else cfg(f)
    v = c['vision_config']['layer_norm_eps'] if key is None else c[key]
    chk(rid + ' norm epsilon from config', v, cell(rid, col)['n'])
chk('T5-11B d_ff / d_model', cfg('cfg_google-t5_t5-11b.json')['d_ff'] / cfg('cfg_google-t5_t5-11b.json')['d_model'], cell('t5', 'ffn')['n'])
chk('DeepSeek-V3 config initializer_range (report says 0.006)', cfg('cfg_deepseek-ai_DeepSeek-V3-Base.json')['initializer_range'], 0.02)
chk('Gemma 3 config final_logit_softcapping is null', str(cfg('cfg_unsloth_gemma-3-27b-pt.json').get('final_logit_softcapping')), 'None')
chk('OLMo 2 stage-1 eps', float(yaml_val('olmo2_7b_stage1.yaml', 'eps')), cell('olmo2', 'oeps')['n'])
chk('OLMo 2 stage-1 lr', float(yaml_val('olmo2_7b_stage1.yaml', 'learning_rate')), cell('olmo2', 'lr')['n'])
chk('OLMo 2 init std', float(yaml_val('olmo2_7b_stage1.yaml', 'init_std')), cell('olmo2', 'istd')['n'])
chk('OLMo 2 z-loss multiplier', yaml_val('olmo2_7b_stage1.yaml', 'auxiliary_loss_multiplier'), '1e-5')
chk('OLMo 2 stage-2 decays to 0 (alpha_f)', float(yaml_val('olmo2_7b_stage2.yaml', 'alpha_f')), 0.0)
chk('SmolLM3 adam_eps', float(yaml_val('smollm3_stage1.yaml', 'adam_eps')), cell('smollm3', 'oeps')['n'])
chk('SmolLM3 adam_beta2', float(yaml_val('smollm3_stage1.yaml', 'adam_beta2')), cell('smollm3', 'betas')['n'])
chk('SmolLM3 z_loss_enabled', yaml_val('smollm3_stage1.yaml', 'z_loss_enabled'), 'false')
chk('SmolLM3 min_decay_lr', float(yaml_val('smollm3_stage1.yaml', 'min_decay_lr')), 0.0)
s = open(os.path.join(INP, 'bert_optimization.py'), encoding='utf-8').read()
chk('BERT code epsilon', float(re.search(r'epsilon=([0-9e.-]+)', s).group(1)), cell('bert', 'oeps')['n'])
chk('BERT code clip_norm', float(re.search(r'clip_norm=([0-9.]+)', s).group(1)), cell('bert', 'clip')['n'])
chk('BERT code has no bias correction (no beta power terms)', str('beta_1_t' in s or 'bias_correction' in s), 'False')

json.dump(out, open(os.path.join(INP, 'recompute.json'), 'w'), indent=1)
print('checks', len(out), 'failed', bad)
sys.exit(1 if bad else 0)
