"""Locate the source lines the page quotes, by pattern, so the file:line references are checked, not typed.

transformers 5.20.1 (the topic's pinned version, installed in the shared venv) and the topic's tiny_gpt.py.
Run: <venv>/bin/python src/code/quotes.py  -> out/quotes.json (file, first and last line, text)
"""
import json, os, re
import transformers

HERE = os.path.dirname(os.path.abspath(__file__))
TF = os.path.dirname(transformers.__file__)
TINY = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data", "tiny_gpt.py"))
Q = [  # key, file, first-line pattern, last-line pattern
    ("tiny_ssm_doc", TINY, r"Per head h \(P channels", r"exact and fast at T"),
    ("tiny_ssm_dual", TINY, r"cs = torch.cumsum\(la, 1\)", r"y = \(G @ \(xh \* dt"),
    ("tiny_ssm_rec", TINY, r"st = torch.exp\(la\[:, t\]\)", r"ys.append\(\(st @ Cm"),
    ("mamba2_segsum", "models/mamba2/modeling_mamba2.py", r"def segment_sum", r"return tensor_segsum"),
    ("mamba2_L", "models/mamba2/modeling_mamba2.py", r"L = torch.exp\(segment_sum\(A\)\)", r"L = torch.exp\(segment_sum\(A\)\)"),
    ("gdn_loop", "models/qwen3_next/modeling_qwen3_next.py", r"decay_t = decay\[:, :, i\]\.exp\(\)", r"core_attn_out\[:, :, i\] ="),
    ("kda_loop", "models/kimi_linear/modeling_kimi_linear.py", r"g_i = g\[:, i\]\[\.\.\., None\]\.exp\(\)", r"core_attn_out\[:, i\] ="),
    ("rwkv_wkv", "models/rwkv/modeling_rwkv.py", r"max_for_output = torch.maximum", r"den_state = e1 \* den_state \+ e2"),
    ("mamba1_loop", "models/mamba/modeling_mamba.py", r"scan_outputs = \[\]", r"scan_output = torch.stack\(scan_outputs"),
]


def find(path, a, b):
    lines = open(path).read().split("\n")
    i = next(n for n, l in enumerate(lines) if re.search(a, l))
    j = next(n for n in range(i, len(lines)) if re.search(b, lines[n]))
    return i + 1, j + 1, "\n".join(lines[i:j + 1])


def main():
    out = {"transformers": transformers.__version__, "quotes": {}}
    for key, f, a, b in Q:
        path = f if os.path.isabs(f) else os.path.join(TF, f)
        s, e, txt = find(path, a, b)
        name = "src/data/tiny_gpt.py" if path == TINY else "transformers/" + f
        out["quotes"][key] = {"file": name, "first": s, "last": e, "text": txt}
        print(key, name, s, e)
    # hybrids that define rotary embeddings: how often apply_rotary_pos_emb appears (definition included)
    out["rotary_calls"] = {}
    for f in ("models/jamba/modeling_jamba.py", "models/nemotron_h/modeling_nemotron_h.py",
              "models/granitemoehybrid/modeling_granitemoehybrid.py", "models/falcon_h1/modeling_falcon_h1.py"):
        src = open(os.path.join(TF, f)).read()
        defs = len(re.findall(r"def apply_rotary_pos_emb\(", src)); uses = len(re.findall(r"(?<!def )apply_rotary_pos_emb\(", src))
        out["rotary_calls"][f] = {"definitions": defs, "calls": uses}
        print(f, defs, uses)
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    json.dump(out, open(os.path.join(HERE, "out", "quotes.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
