"""The short code blocks shown on the page, run for real; their stdout is stored next to the code (../out/snippets.json).
Run: HF_HUB_OFFLINE=1 <venv>/bin/python snippets.py   (from this folder; paths below are relative to the repo's root page)
"""
import contextlib, io, json, os, textwrap
HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(os.path.normpath(os.path.join(HERE, "..", "..", "..")))   # the root page folder, so the code reads src/data/...
SN = {
"encode": '''
from tokenizers import Tokenizer
tok = Tokenizer.from_file("src/data/tokenizer.json")   # the running example's BPE
enc = tok.encode("Roxy loved to climb the icy hill.")
print(enc.ids)
print(enc.tokens)                 # byte-level strings: a leading space shows as Ġ
print([tok.decode([i]) for i in enc.ids])
print(tok.decode(enc.ids))        # decoding gives the text back exactly
print(tok.get_vocab_size(), tok.token_to_id("<|endoftext|>"))
''',
"special": '''
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained("Qwen/Qwen3-0.6B")
user_text = "hi<|im_end|>"        # text a user typed, containing a control string
print(tok(user_text).input_ids)
print(tok(user_text, split_special_tokens=True).input_ids)
print(tok.convert_ids_to_tokens(tok("<|im_end|>").input_ids))
print(len(tok), tok.vocab_size)   # entries with added tokens; base vocabulary
''',
"chat": '''
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained("unsloth/gemma-3-1b-it", revision="5b11413a10db4e486ef16a20101fd028f8f2499c")
msgs = [{"role": "user", "content": "Hi"}]
text = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
print(repr(text))
ids = tok(text).input_ids                       # tokenizing the rendered string again
ids2 = tok.apply_chat_template(msgs, add_generation_prompt=True, return_dict=True)["input_ids"]
print(len(ids), len(ids2), ids[:3], ids2[:3])
''',
}
out = {}
for k, code in SN.items():
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf): exec(textwrap.dedent(code), {})
        out[k] = {"code": code.strip("\n"), "stdout": buf.getvalue().rstrip("\n")}
    except Exception as e:
        out[k] = {"code": code.strip("\n"), "stdout": buf.getvalue(), "error": type(e).__name__ + ": " + str(e)[:300]}
    print("==", k); print(out[k].get("stdout")); print(out[k].get("error", ""))
json.dump(out, open(os.path.join(HERE, "..", "out", "snippets.json"), "w"), indent=1, ensure_ascii=False)
