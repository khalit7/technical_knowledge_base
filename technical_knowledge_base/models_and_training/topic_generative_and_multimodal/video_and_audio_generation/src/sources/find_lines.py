# Locate every quoted source line by pattern (each pattern must match exactly once) -> ../inputs/source_lines.json
# usage: python3 -I find_lines.py <GM_SCRATCH/src>
import sys, json, os
SRC = sys.argv[1]
Q = [  # key, repo, tag, path, pattern
 ('enc_rvq_loop', 'transformers', 'v5.20.1', 'src/transformers/models/encodec/modeling_encodec.py', 'for layer in self.layers[:num_quantizers]:'),
 ('enc_rvq_resid', 'transformers', 'v5.20.1', 'src/transformers/models/encodec/modeling_encodec.py', 'residual = residual - quantized'),
 ('enc_bw_per_q', 'transformers', 'v5.20.1', 'src/transformers/models/encodec/modeling_encodec.py', 'bw_per_q = math.log2(self.codebook_size) * self.frame_rate'),
 ('enc_dist', 'transformers', 'v5.20.1', 'src/transformers/models/encodec/modeling_encodec.py', 'dist = -(scaled_states - 2 * hidden_states @ embed + embed.pow(2).sum(0, keepdim=True))'),
 ('mimi_semantic_decode', 'transformers', 'v5.20.1', 'src/transformers/models/mimi/modeling_mimi.py', 'quantized_out = self.semantic_residual_vector_quantizer.decode(codes[:, : self.num_semantic_quantizers])'),
 ('dac_from_codes', 'transformers', 'v5.20.1', 'src/transformers/models/dac/modeling_dac.py', 'quantized_representation += self.quantizers[i].out_proj(projected_latents_i)'),
 ('wan_vae_iter', 'diffusers', 'v0.41.0', 'src/diffusers/models/autoencoders/autoencoder_kl_wan.py', 'iter_ = 1 + (num_frame - 1) // 4'),
 ('wan_vae_first', 'diffusers', 'v0.41.0', 'src/diffusers/models/autoencoders/autoencoder_kl_wan.py', 'out = self.encoder(x[:, :, :1, :, :], feat_cache=self._enc_feat_map, feat_idx=self._enc_conv_idx)'),
 ('wan_frames_warn', 'diffusers', 'v0.41.0', 'src/diffusers/pipelines/wan/pipeline_wan.py', 'f"`num_frames - 1` has to be divisible by {self.vae_scale_factor_temporal}. Rounding to the nearest number."'),
 ('wan_hw_err', 'diffusers', 'v0.41.0', 'src/diffusers/pipelines/wan/pipeline_wan.py', 'raise ValueError(f"`height` and `width` have to be divisible by 16 but are {height} and {width}.")'),
 ('wan_latent_frames', 'diffusers', 'v0.41.0', 'src/diffusers/pipelines/wan/pipeline_wan.py', 'num_latent_frames = (num_frames - 1) // self.vae_scale_factor_temporal + 1'),
 ('wan_rope_hw', 'diffusers', 'v0.41.0', 'src/diffusers/models/transformers/transformer_wan.py', 'h_dim = w_dim = 2 * (attention_head_dim // 6)'),
 ('wan_rope_t', 'diffusers', 'v0.41.0', 'src/diffusers/models/transformers/transformer_wan.py', 't_dim = attention_head_dim - h_dim - w_dim'),
 ('ltx_hw_err', 'diffusers', 'v0.41.0', 'src/diffusers/pipelines/ltx/pipeline_ltx.py', 'raise ValueError(f"`height` and `width` have to be divisible by 32 but are {height} and {width}.")'),
 ('mochi_t6', 'diffusers', 'v0.41.0', 'src/diffusers/pipelines/mochi/pipeline_mochi.py', 'self.vae_temporal_scale_factor = 6'),
]
out = {}
for key, repo, tag, path, pat in Q:
    lines = open(os.path.join(SRC, repo, path)).read().split('\n')
    hits = [i + 1 for i, l in enumerate(lines) if pat in l]
    assert len(hits) == 1, (key, hits)
    out[key] = {'repo': repo, 'tag': tag, 'path': path, 'line': hits[0], 'text': lines[hits[0] - 1].strip(),
                'url': f'https://github.com/huggingface/{repo}/blob/{tag}/{path}#L{hits[0]}'}
SNIP = [  # key, repo, tag, path, first-line pattern, number of lines
 ('wan_vae_loop', 'diffusers', 'v0.41.0', 'src/diffusers/models/autoencoders/autoencoder_kl_wan.py', 'iter_ = 1 + (num_frame - 1) // 4', 12),
 ('enc_rvq_encode', 'transformers', 'v5.20.1', 'src/transformers/models/encodec/modeling_encodec.py', 'def encode(self, embeddings: torch.Tensor, bandwidth: float | None = None) -> torch.Tensor:', 14),
]
for key, repo, tag, path, pat, n in SNIP:
    lines = open(os.path.join(SRC, repo, path)).read().split('\n')
    hits = [i + 1 for i, l in enumerate(lines) if pat in l]
    assert len(hits) == 1, (key, hits)
    a0 = hits[0]; body = lines[a0 - 1:a0 - 1 + n]; ind = min(len(l) - len(l.lstrip()) for l in body if l.strip())
    out[key] = {'repo': repo, 'tag': tag, 'path': path, 'line': a0, 'last': a0 + n - 1, 'text': '\n'.join(l[ind:] for l in body),
                'url': f'https://github.com/huggingface/{repo}/blob/{tag}/{path}#L{a0}-L{a0 + n - 1}'}
json.dump(out, open(os.path.join(os.path.dirname(__file__), '..', 'inputs', 'source_lines.json'), 'w'), indent=1)
for k, v in out.items(): print(k, v['line'])
