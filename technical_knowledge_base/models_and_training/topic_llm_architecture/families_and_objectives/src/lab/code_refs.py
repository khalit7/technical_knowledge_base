"""code_refs.py: locate every transformers 5.20.1 line the page quotes, by pattern, so line numbers are checked.
Run with the topic venv's python (transformers 5.20.1 installed). Writes out/code_refs.json (paths package-relative)."""
import json, os, re
import transformers

T = os.path.dirname(transformers.__file__)
REFS = {
    "causal_mask_function": ("masking_utils.py", r"^def causal_mask_function", r"return kv_idx <= q_idx"),
    "bidirectional_mask_function": ("masking_utils.py", r"^def bidirectional_mask_function", r"return q_idx >= 0"),
    "modernbert_is_causal": ("models/modernbert/modeling_modernbert.py", None, r"self\.is_causal = False"),
    "modernbert_pattern": ("models/modernbert/configuration_modernbert.py", None, r"global_attn_every_n_layers = kwargs\.get"),
    "t5gemma2_fused": ("models/t5gemma2/modeling_t5gemma2.py", None, r"Fused causal and encoder mask"),
    "collator_defaults": ("data/data_collator.py", None, r"^\s+mlm_probability: float \| None = 0\.15"),
    "dsv3_ignore": ("models/deepseek_v3/modeling_deepseek_v3.py", None, r"_keys_to_ignore_on_load_unexpected.*layers.*61"),
    "dsv3_num_mtp": ("models/deepseek_v3/configuration_deepseek_v3.py", None, r"\"num_mtp_layers\": \"num_nextn_predict_layers\""),
    "modernbert_halfwin": ("models/modernbert/configuration_modernbert.py", None, r"return self\.local_attention // 2"),
    "generate_use_mtp": ("generation/utils.py", None, r"elif generation_config\.use_mtp:"),
}


def main():
    out = {"transformers": transformers.__version__}
    for k, (f, start, pat) in REFS.items():
        lines = open(os.path.join(T, f)).read().split("\n")
        i0 = 0
        if start:
            i0 = next(i for i, l in enumerate(lines) if re.search(start, l))
        i = next(i for i in range(i0, len(lines)) if re.search(pat, lines[i]))
        line = str(i + 1)
        if k == "collator_defaults":       # three consecutive defaults
            line = f"{i + 1}-{i + 3}"
        if k == "modernbert_pattern":
            line = f"{i + 1}-{i + 4}"
        out[k] = {"file": f, "line": line, "text": lines[i].strip()}
        print(k, f, line, lines[i].strip()[:90])
    json.dump(out, open(os.path.join(os.path.dirname(__file__), "out", "code_refs.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
