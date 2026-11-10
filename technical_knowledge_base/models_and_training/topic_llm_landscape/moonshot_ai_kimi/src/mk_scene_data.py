# Write parts/30_js_km_data.js: the numbers the four 3D stages draw, read from the released configs in inputs/
# (DeepSeek-V3's column from the K2 report's Table 2, inputs/ax_2507.20534.txt, as the page's config table does).
# Run from src/: python3 mk_scene_data.py
import json
c3 = json.load(open('inputs/k3_config.json'))['text_config']; c2 = json.load(open('inputs/k2_config.json'))
lac = c3['linear_attn_config']
D = {
  'k3': {'layers': c3['num_hidden_layers'], 'mla': lac['full_attn_layers'], 'kda': lac['kda_layers'], 'heads': lac['num_heads'],
         'hd': lac['head_dim'], 'entry': c3['kv_lora_rank'] + c3['qk_rope_head_dim'], 'latent': c3['kv_lora_rank'], 'rope': c3['qk_rope_head_dim'],
         'conv': lac['short_conv_kernel_size'], 'd': c3['hidden_size'], 'experts': c3['num_experts'], 'active': c3['num_experts_per_token'],
         'shared': c3['num_shared_experts'], 'elat': c3['routed_expert_hidden_size'], 'fi': c3['moe_intermediate_size'],
         'attnHeads': c3['num_attention_heads'], 'block': c3['attn_res_block_size'], 'ctx': c3['max_position_embeddings']},
  'k2': {'layers': c2['num_hidden_layers'], 'heads': c2['num_attention_heads'], 'd': c2['hidden_size'], 'experts': c2['n_routed_experts'],
         'active': c2['num_experts_per_tok'], 'shared': c2['n_shared_experts'], 'fi': c2['moe_intermediate_size'], 'elat': c2['hidden_size']},
  'v3': {'layers': 61, 'heads': 128, 'd': 7168, 'experts': 256, 'active': 8, 'shared': 1, 'fi': 2048, 'elat': 7168},
}
k = D['k3']; assert len(k['mla']) + len(k['kda']) == k['layers']
s = json.dumps(D, separators=(',', ':'))
open('parts/30_js_km_data.js', 'w').write('// ---- Scene data, written by src/mk_scene_data.py from inputs/k3_config.json, inputs/k2_config.json and the K2 report Table 2 (DeepSeek-V3); do not edit ----\nwindow.KM=' + s + ';\n')
print('wrote parts/30_js_km_data.js', len(s), 'bytes')
