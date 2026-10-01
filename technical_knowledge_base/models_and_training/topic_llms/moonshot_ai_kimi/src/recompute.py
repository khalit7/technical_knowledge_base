# Recompute every default the HTML shows, from config.json files and the papers' formulas.
import json, math
S='inputs/'
c3=json.load(open(S+'k3_config.json'))['text_config']; c2=json.load(open(S+'k2_config.json'))
api=json.load(open(S+'k3_api.json'))['safetensors']; idx3=json.load(open(S+'k3_index.json'))['metadata']['total_size']
idx2=json.load(open(S+'k2_index.json'))['metadata']['total_size']
d=c3['hidden_size']; V=c3['vocab_size']; L=c3['num_hidden_layers']
lac=c3['linear_attn_config']; H=lac['num_heads']; hd=lac['head_dim']
nK=len(lac['kda_layers']); nM=len(lac['full_attn_layers']); print('layers',L,'KDA',nK,'MLA',nM)
# --- K3 per-part parameters ---
P=H*hd
kda = 3*d*P + 3*P*lac['short_conv_kernel_size'] + H + d*hd + hd*P + P + d*H + d*P + hd + P*d  # q,k,v, convs, A_log, f_a,f_b, dt_bias, b, g(full), o_norm, o
nh=c3['num_attention_heads']; qh=c3['qk_nope_head_dim']+c3['qk_rope_head_dim']; r=c3['kv_lora_rank']; ql=c3['q_lora_rank']
mla = d*ql + ql + ql*nh*qh + d*(r+c3['qk_rope_head_dim']) + r + r*nh*(c3['qk_nope_head_dim']+c3['v_head_dim']) + nh*c3['v_head_dim']*d + d*nh*c3['v_head_dim']
E=c3['num_experts']; k=c3['num_experts_per_token']; lat=c3['routed_expert_hidden_size']; fi=c3['moe_intermediate_size']
expert = 3*lat*fi; routed_layer=E*expert
shared = 3*d*fi*c3['num_shared_experts']
latproj = 2*d*lat + lat; router = E*d + E
dense = 3*d*c3['intermediate_size']
norms_layer = 4*d + 2*d  # 2 layernorms, 2 res norms, 2 res proj (d x 1)
nMoE = L - c3['first_k_dense_replace']
emb = V*d; head = V*d; final = d + d + d
tot_text = nK*kda + nM*mla + nMoE*(routed_layer+shared+latproj+router) + dense + L*norms_layer + emb + head + final
routed_all = nMoE*routed_layer
print('KDA layer %.1fM  MLA layer %.1fM  expert %.2fM  routed per layer %.3fB'%(kda/1e6,mla/1e6,expert/1e6,routed_layer/1e9))
print('routed experts total', routed_all, 'HF U8 (logical MXFP4 params)', api['parameters']['U8'], 'match', routed_all==api['parameters']['U8'])
nonexp_text = tot_text-routed_all
hf_non = api['parameters']['BF16']+api['parameters']['F32']
print('text non-expert %.3fB ; HF BF16+F32 %.3fB ; difference (vision tower + projector) %.3fB'%(nonexp_text/1e9,hf_non/1e9,(hf_non-nonexp_text)/1e9))
print('HF total', api['total'], '= %.4fT'%(api['total']/1e12))
act = nK*kda + nM*mla + nMoE*(k*expert+shared+latproj+router) + dense + L*norms_layer + emb + head + final
act_noemb = act-emb
print('active incl. embedding %.2fB ; without input embedding %.2fB ; report 104.2B'%(act/1e9,act_noemb/1e9))
# bytes
b_mx = routed_all*4.25/8; b_bf = api['parameters']['BF16']*2 + api['parameters']['F32']*4
print('MXFP4 experts %.4f TB + BF16 rest %.4f TB = %.6f TB ; index total_size %.6f TB'%(b_mx/1e12,b_bf/1e12,(b_mx+b_bf)/1e12,idx3/1e12), 'exact', abs(b_mx+b_bf-idx3)<1)
print('page estimate all 4.25 bits: %.3f TB ; BF16 all: %.2f TB'%(2.8e12*4.25/8/1e12, 2*api['total']/1e12))
print('TiB checkpoint %.3f'%(idx3/2**40))
# --- K2 ---
d2=c2['hidden_size']; L2=c2['num_hidden_layers']; nh2=c2['num_attention_heads']; qh2=c2['qk_nope_head_dim']+c2['qk_rope_head_dim']
mla2 = d2*c2['q_lora_rank'] + c2['q_lora_rank'] + c2['q_lora_rank']*nh2*qh2 + d2*(c2['kv_lora_rank']+c2['qk_rope_head_dim']) + c2['kv_lora_rank'] + c2['kv_lora_rank']*nh2*(c2['qk_nope_head_dim']+c2['v_head_dim']) + nh2*c2['v_head_dim']*d2
exp2=3*d2*c2['moe_intermediate_size']; E2=c2['n_routed_experts']; k2=c2['num_experts_per_tok']
sh2=3*d2*c2['moe_intermediate_size']*c2['n_shared_experts']; rt2=E2*d2+E2; dn2=3*d2*c2['intermediate_size']
nM2=L2-c2['first_k_dense_replace']
tot2 = L2*mla2 + nM2*(E2*exp2+sh2+rt2) + dn2 + L2*2*d2 + 2*c2['vocab_size']*d2 + d2
act2 = L2*mla2 + nM2*(k2*exp2+sh2+rt2) + dn2 + L2*2*d2 + 2*c2['vocab_size']*d2 + d2
print('K2 total %.4fT (report 1.04T) active %.2fB incl emb, %.2fB without input emb (report 32.6B)'%(tot2/1e12,act2/1e9,(act2-c2['vocab_size']*d2)/1e9))
print('K2 checkpoint (FP8 blocks) %.3f TB'%(idx2/1e12))
# --- sparsity ---
print('expert sparsity K2 %d, K3 %d ; param ratio K2 %.1f (1.04T/32.6B), K3 %.1f (2.8T/104B), K3 report %.1f (2.78T/104.2B)'%(384/8,896/16,1.04e12/32.6e9,2.8e12/104e9,2.78e12/104.2e9))
# --- KV cache ---
mla_tok = (c3['kv_lora_rank']+c3['qk_rope_head_dim'])   # numbers per token per MLA layer
kda_state = H*hd*hd     # numbers per KDA layer per sequence
conv_state = 3*P*(lac['short_conv_kernel_size']-1)
print('MLA cache per token per layer',mla_tok,'(kv_a_proj_with_mqa output, incl. 64 rope dims even with NoPE: see note)')
print('K3 hybrid per token (24 MLA layers)', nM*mla_tok, ' all-MLA 93 layers', L*mla_tok, ' K2 61 layers', 61*576)
print('KDA state per layer', kda_state, ' x69 =', nK*kda_state, ' conv state x69 =', nK*conv_state)
for T in [4096,32768,131072,1048576]:
    hyb = nM*mla_tok*T*2 + nK*(kda_state*4+conv_state*2)   # BF16 cache, FP32 KDA state (assumption)
    full = L*mla_tok*T*2
    print('T=%7d hybrid %.2f GiB  all-MLA %.2f GiB  cut %.1f%%'%(T,hyb/2**30,full/2**30,100*(1-hyb/full)))
x = nK*(kda_state*4+conv_state*2)/(nM*mla_tok*2); print('KDA state (fp32) equals MLA cache of %.0f tokens'%x)
print('cut limit 1-24/93 = %.1f%% ; Kimi Linear 1-1/4 = 75%%'%(100*(1-24/93)))
# --- Newton-Schulz worked example ---
a,b,cc=3.4445,-4.7750,2.0315; f=lambda s:a*s+b*s**3+cc*s**5
s=[3/math.sqrt(9.09),0.3/math.sqrt(9.09)]; print('X0',[round(v,4) for v in s])
for i in range(5): s=[f(v) for v in s]; print('NS step',i+1,[round(v,4) for v in s],'ratio %.3f'%(s[0]/s[1]))
print('Adam-matched scale: 1/sqrt(7168)=%.4f ; 0.2*sqrt(7168)=%.2f ; K3 expert 3584x3072: 0.2*sqrt(3584)=%.2f'%(1/math.sqrt(7168),0.2*math.sqrt(7168),0.2*math.sqrt(3584)))
# --- QK-Clip ---
g=100/150; print('gamma',round(g,3),'sqrt',round(math.sqrt(g),3),'new logit',150*g)
# --- per-channel gates ---
print('0.99^10=%.3f 0.5^10=%.4f'%(0.99**10,0.5**10)); print('K3 alpha floor e^-5=%.4f ; 16-token tile log-decay >= %d'%(math.exp(-5),-5*16))
# --- AttnRes blocks ---
print('AttnRes blocks: 93 layers / 12 =', 93/12, '-> 8 blocks (7 full of 12, one of 9) + embedding = 9 sources')
# --- MXFP4 bits ---
print('MXFP4 bits/weight', 4+8/32)
# --- AA v4.3 ---
aa=json.load(open('../../src/data/aa_snapshot.json'))['rows']
ow=sorted([r for r in aa if r['open_weights'] and r['aa_index']],key=lambda r:-r['aa_index'])[:8]
for r in ow: print('AA v4.3 open', r['model'], r['aa_index'], r['aa_cost_per_index_task'])
best={}
for r in aa:
    if r['aa_index'] and (r['lab'] not in best or r['aa_index']>best[r['lab']][0]): best[r['lab']]=(r['aa_index'],r['model'])
for i,(l,v) in enumerate(sorted(best.items(),key=lambda x:-x[1][0])[:11]): print('lab rank',i+1,l,v)
# K2 with one MTP module (DeepSeek-V3 style: MLA + MoE layer + eh_proj 2d x d + norms), shared embedding/head
mtp_tot = mla2 + E2*exp2 + sh2 + rt2 + 2*d2*d2 + 4*d2
mtp_act = mla2 + k2*exp2 + sh2 + rt2 + 2*d2*d2 + 4*d2
print('K2 + MTP total %.4fT active(no input emb) %.2fB active(incl emb) %.2fB'%((tot2+mtp_tot)/1e12,(act2-c2['vocab_size']*d2+mtp_act)/1e9,(act2+mtp_act)/1e9))
