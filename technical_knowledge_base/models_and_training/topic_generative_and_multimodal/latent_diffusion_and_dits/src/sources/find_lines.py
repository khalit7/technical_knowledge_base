"""Locate every source line the page quotes, by pattern, in the pinned clones (diffusers v0.41.0 @086bf9578c0f,
facebookresearch/DiT @ed81ce222909, CompVis/latent-diffusion @a506df575647) and black-forest-labs/flux @802fb4713906
(model.py and modules/layers.py fetched from GitHub raw). Writes ../inputs/source_lines.json: for each key the
repo-relative file, line number and the stripped line. A pattern must match exactly once in its file, or once after its anchor line (asserted), so a
moved line fails loudly instead of quoting the wrong thing.
    python3 -I find_lines.py <GM_SCRATCH>/src <dir with flux_model.py and flux_layers.py>
"""
import json, os, re, sys
SRC, FLUX = sys.argv[1], sys.argv[2]
DF = "diffusers/src/diffusers/"
Q = [
    # key, repo-relative path (under SRC) or flux:<file>, regex
    ("unet_time_proj", DF + "models/unets/unet_2d_condition.py", r"self\.time_proj = Timesteps\(block_out_channels\[0\]"),
    ("unet_heads_quirk", DF + "models/unets/unet_2d_condition.py", r"^\s+num_attention_heads = num_attention_heads or attention_head_dim$"),
    ("unet_heads_comment", DF + "models/unets/unet_2d_condition.py", r"This looks weird upon first reading it and it is\."),
    ("unet_skip_cat", DF + "models/unets/unet_2d_blocks.py", r"hidden_states = torch\.cat\(\[hidden_states, res_hidden_states\], dim=1\)$", r"^class CrossAttnUpBlock2D\("),
    ("btb_attn2", DF + "models/attention.py", r"^\s+attn_output = self\.attn2\($", r"^class BasicTransformerBlock\("),
    ("adaln_zero_chunk", DF + "models/normalization.py", r"shift_msa, scale_msa, gate_msa, shift_mlp, scale_mlp, gate_mlp = emb\.chunk\(6, dim=1\)$"),
    ("adaln_zero_modulate", DF + "models/normalization.py", r"x = self\.norm\(x\) \* \(1 \+ scale_msa\[:, None\]\) \+ shift_msa\[:, None\]$", r"^class AdaLayerNormZero\("),
    ("patch_pos_persistent", DF + "models/embeddings.py", r"persistent = True if pos_embed_max_size else False"),
    ("patch_cropped", DF + "models/embeddings.py", r"def cropped_pos_embed\(self, height, width\):"),
    ("sd3_joint_cat", DF + "models/attention_processor.py", r"^\s+query = torch\.cat\(\[query, encoder_hidden_states_query_proj\], dim=2\)$", r"^class JointAttnProcessor2_0:"),
    ("flux_single_cat", DF + "models/transformers/transformer_flux.py", r"hidden_states = torch\.cat\(\[attn_output, mlp_hidden_states\], dim=2\)", r"^class FluxSingleTransformerBlock\("),
    ("flux_single_block", DF + "models/transformers/transformer_flux.py", r"^class FluxSingleTransformerBlock\(nn\.Module\):"),
    ("flux_double_block", DF + "models/transformers/transformer_flux.py", r"^class FluxTransformerBlock\(nn\.Module\):"),
    ("flux_posembed", DF + "models/transformers/transformer_flux.py", r"^class FluxPosEmbed\(nn\.Module\):"),
    ("flux_ids_cat", DF + "models/transformers/transformer_flux.py", r"ids = torch\.cat\(\(txt_ids, img_ids\), dim=0\)"),
    ("flux_pipe_shift", DF + "pipelines/flux/pipeline_flux.py", r"^def calculate_shift\($"),
    ("flux_pipe_ids", DF + "pipelines/flux/pipeline_flux.py", r"def _prepare_latent_image_ids\(batch_size, height, width, device, dtype\):"),
    ("flux_pack", DF + "pipelines/flux/pipeline_flux.py", r"def _pack_latents\(latents, batch_size, num_channels_latents, height, width\):"),
    ("sd_truncation_warning", DF + "pipelines/stable_diffusion/pipeline_stable_diffusion.py", r"The following part of your input was truncated because CLIP can only handle sequences up to"),
    ("sdxl_add_time_ids", DF + "pipelines/stable_diffusion_xl/pipeline_stable_diffusion_xl.py", r"add_time_ids = list\(original_size \+ crops_coords_top_left \+ target_size\)"),
    ("sdxl_penultimate", DF + "pipelines/stable_diffusion_xl/pipeline_stable_diffusion_xl.py", r"prompt_embeds = prompt_embeds\.hidden_states\[-2\]$", r"def encode_prompt\("),
    ("sd3_t5_len", DF + "pipelines/stable_diffusion_3/pipeline_stable_diffusion_3.py", r"max_sequence_length: int = 256,$", r"def _get_t5_prompt_embeds\("),
    ("pixart_adaln_single", DF + "models/transformers/pixart_transformer_2d.py", r"self\.adaln_single = AdaLayerNormSingle\("),
    ("sana_linear_attn", DF + "models/attention_processor.py", r"^\s+query = F\.relu\(query\)$", r"^class SanaLinearAttnProcessor2_0:"),
    ("dit_convert_copy", "diffusers/scripts/convert_dit_to_diffusers.py", r"^\s+for depth in range\(28\):$"),
    ("flux_txt_ids", DF + "pipelines/flux/pipeline_flux.py", r"text_ids = torch\.zeros\(prompt_embeds\.shape\[1\], 3\)"),
    ("dit_modulate", "DiT/models.py", r"^def modulate\(x, shift, scale\):"),
    ("dit_block_fwd", "DiT/models.py", r"shift_msa, scale_msa, gate_msa, shift_mlp, scale_mlp, gate_mlp = self\.adaLN_modulation\(c\)\.chunk\(6, dim=1\)"),
    ("dit_zero_init", "DiT/models.py", r"# Zero-out adaLN modulation layers in DiT blocks:"),
    ("dit_unpatchify", "DiT/models.py", r"def unpatchify\(self, x\):"),
    ("ldm_crossattn", "latent-diffusion/ldm/modules/attention.py", r"^class CrossAttention\(nn\.Module\):"),
    ("bfl_single", "flux:flux_layers.py", r"^class SingleStreamBlock\(nn\.Module\):"),
    ("bfl_double", "flux:flux_layers.py", r"^class DoubleStreamBlock\(nn\.Module\):"),
    ("bfl_txt_img_cat", "flux:flux_model.py", r"img = torch\.cat\(\(txt, img\), 1\)"),
]
out = {}
for key, path, pat, *anchor in Q:
    fp = os.path.join(FLUX, path[5:]) if path.startswith("flux:") else os.path.join(SRC, path)
    lines = open(fp, encoding="utf-8").read().split("\n")
    hits = [i for i, l in enumerate(lines) if re.search(pat, l)]
    if anchor:   # several identical lines in the file: take the first one after the anchor (a class definition)
        a = [i for i, l in enumerate(lines) if re.search(anchor[0], l)]
        assert len(a) == 1, (key, "anchor", len(a))
        hits = [min(h for h in hits if h > a[0])]
    assert len(hits) == 1, (key, path, len(hits), [lines[i].strip() for i in hits[:3]])
    i = hits[0]
    rel = ("black-forest-labs/flux src/flux/" + ("modules/layers.py" if "layers" in path else "model.py")) if path.startswith("flux:") else path
    out[key] = {"file": rel, "line": i + 1, "text": lines[i].strip()}
    print(key, rel, i + 1, lines[i].strip()[:100])
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "inputs", "source_lines.json"), "w"), indent=1)
