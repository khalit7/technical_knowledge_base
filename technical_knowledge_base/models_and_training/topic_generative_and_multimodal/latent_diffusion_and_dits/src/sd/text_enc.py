"""What SD 1.5's text encoder hands the U-Net (CPU, float32, no GPU; the pinned CLIP ViT-L/14 text tower).

1. The tokens of a prompt: start token, words, end token, then padding to 77 (SD 1.5's tokenizer pads with the end
   token's id). 2. A long prompt: the warning diffusers prints when it truncates at 77 tokens (captured from its logger).
3. The start-of-text position: CLIP's text encoder is causal, so position 0 sees only itself and its output is the
   same vector for every prompt (checked on three prompts). 4. Pooled vs sequence: the pooled vector (the end token's
   output, after the final LayerNorm) and the 77 x 768 sequence the U-Net's cross-attention reads; SD 1.5 uses the
   sequence (last layer); "clip skip" means taking an earlier layer instead (cosine of the last vs penultimate layer).
Writes ../out/text_enc.json.
"""
import io, json, logging, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "src", "data"))
import torch
torch.set_num_threads(4)
from transformers import CLIPTokenizer, CLIPTextModel
import pretrained

repo, rev = pretrained.SD
tok = CLIPTokenizer.from_pretrained(repo, revision=rev, subfolder="tokenizer")
te = CLIPTextModel.from_pretrained(repo, revision=rev, subfolder="text_encoder", variant="fp16", dtype=torch.float32).eval()
out = {"model": [repo, rev], "date": time.strftime("%Y-%m-%d"), "device": "cpu", "dtype": "float32"}
P = pretrained.PROMPTS
ids = tok(P["g01"], padding="max_length", max_length=tok.model_max_length, truncation=True).input_ids
out["model_max_length"] = tok.model_max_length
out["g01_ids"] = ids
out["g01_tokens"] = tok.convert_ids_to_tokens(ids)
out["bos_eos_pad"] = [tok.bos_token_id, tok.eos_token_id, tok.pad_token_id]

# 2. truncation warning, exactly as the pipeline prints it
long_prompt = ("a photograph of a red bicycle leaning against a brick wall, with ivy growing over the bricks, a wicker basket "
               "of flowers on the handlebars, warm afternoon light, long shadows on the cobblestones, a cafe table with two cups "
               "of coffee beside it, a sleeping cat on the chair, and a blue door with a brass knocker in the background, "
               "a green street lamp, a red post box, pigeons on the roof, and a small yellow umbrella leaning on the wall")
from diffusers import StableDiffusionPipeline
buf = io.StringIO(); h = logging.StreamHandler(buf)
lg = logging.getLogger("diffusers.pipelines.stable_diffusion.pipeline_stable_diffusion"); lg.addHandler(h)
lg.setLevel(logging.WARNING)
pipe = StableDiffusionPipeline.__new__(StableDiffusionPipeline)          # only encode_prompt is used: give it the pieces it needs
object.__setattr__(pipe, "_internal_dict", {})
pipe.tokenizer, pipe.text_encoder = tok, te
try:
    StableDiffusionPipeline.encode_prompt(pipe, long_prompt, "cpu", 1, False)
except Exception as e:                                                   # fall back to the tokenizer count if the shell pipeline is not enough
    out["encode_prompt_error"] = repr(e)[:200]
out["long_prompt"] = long_prompt
out["long_prompt_tokens"] = len(tok(long_prompt).input_ids)
out["truncation_warning"] = buf.getvalue().strip()

# 3 and 4
with torch.no_grad():
    embs = {}
    for k in ["g01", "g06", "x08"]:
        t = tok(P[k], padding="max_length", max_length=77, truncation=True, return_tensors="pt")
        o = te(t.input_ids, output_hidden_states=True)
        embs[k] = (o.last_hidden_state[0], o.pooler_output[0], o.hidden_states[-2][0], t.input_ids[0])
    a, b, c = embs["g01"][0][0], embs["g06"][0][0], embs["x08"][0][0]
    cos = torch.nn.functional.cosine_similarity
    out["sot_cos_g01_g06"] = round(float(cos(a, b, dim=0)), 6)
    out["sot_cos_g01_x08"] = round(float(cos(a, c, dim=0)), 6)
    out["sot_max_abs_diff"] = float((a - b).abs().max())
    last, pooled, penult, ids0 = embs["g01"]
    eos = int((ids0 == tok.eos_token_id).nonzero()[0])
    out["g01_eos_index"] = eos
    out["norms_last_layer"] = [round(float(v), 2) for v in last.norm(dim=1)]
    out["pooled_equals_eos_output"] = bool(torch.allclose(pooled, last[eos], atol=1e-5))
    out["shapes"] = {"sequence": list(last.shape), "pooled": list(pooled.shape)}
    out["cos_last_vs_penultimate_by_pos"] = [round(float(v), 4) for v in cos(last, penult, dim=1)]
    # padding positions after the end token: how similar to the end token's output (they have seen the whole prompt)
    out["cos_pad_to_eos"] = [round(float(cos(last[i], last[eos], dim=0)), 4) for i in range(eos, 77, 8)]
json.dump(out, open(os.path.join(HERE, "..", "out", "text_enc.json"), "w"), indent=1)
print({k: v for k, v in out.items() if k not in ("g01_ids", "norms_last_layer", "cos_last_vs_penultimate_by_pos")})
