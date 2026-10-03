"""Sample rows of the Tulu 3 SFT mixture and count, with Tulu 3's own tokenizer and chat template,
how many tokens each conversation has and how many of them carry the SFT loss (assistant turns).
Also tokenizes the page's worked example conversation token by token.

Run (needs network; tokenizers is not a project dependency, so it is pulled in for this run only):
  uv run --with tokenizers python mk_lengths.py
Writes inputs/tulu3_lengths.json and inputs/example_tokens.json.

Sources:
  dataset   https://huggingface.co/datasets/allenai/tulu-3-sft-mixture (939,343 rows)
  tokenizer https://huggingface.co/allenai/Llama-3.1-Tulu-3-8B (tokenizer.json, tokenizer_config.json chat_template)
"""
import json, random, time, urllib.request, os, subprocess
from tokenizers import Tokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
TOKJ = os.path.join(os.environ.get("TOKDIR", HERE), "tulu_tok.json")
if not os.path.exists(TOKJ):
    urllib.request.urlretrieve("https://huggingface.co/allenai/Llama-3.1-Tulu-3-8B/resolve/main/tokenizer.json", TOKJ)
tok = Tokenizer.from_file(TOKJ)
EOS = "<|end_of_text|>"


def segments(messages):
    """Tulu 3 chat template (tokenizer_config.json), split into (text, carries_loss) pieces.
    open-instruct masks everything except assistant content and its eos (labels -100 elsewhere)."""
    out = []
    n = len(messages)
    for i, m in enumerate(messages):
        last = i == n - 1
        if m["role"] == "system":
            out.append(("<|system|>\n" + m["content"] + "\n", False, "system"))
        elif m["role"] == "user":
            out.append(("<|user|>\n" + m["content"] + "\n", False, "user"))
        elif m["role"] == "assistant":
            out.append(("<|assistant|>\n", False, "header"))
            out.append((m["content"] + EOS, True, "assistant"))
            if not last:
                out.append(("\n", False, "sep"))
    return out


def count(messages):
    """Token counts per piece, tokenizing the running prefix so merges across pieces are exact."""
    text = ""
    prev = len(tok.encode("", add_special_tokens=True).ids)  # the BOS the post-processor adds
    loss = 0
    nolos = prev
    last_asst = 0
    for t, carries, role in segments(messages):
        text += t
        cur = len(tok.encode(text, add_special_tokens=True).ids)
        d = cur - prev
        prev = cur
        if carries:
            loss += d
            last_asst = d
        else:
            nolos += d
    return {"total": prev, "loss": loss, "last": last_asst}


CACHE = os.environ.get("ROWCACHE")


def fetch(offset, length):
    cf = CACHE and os.path.join(CACHE, "rows_%d_%d.json" % (offset, length))
    if cf and os.path.exists(cf):
        return json.load(open(cf))
    url = ("https://datasets-server.huggingface.co/rows?dataset=allenai/tulu-3-sft-mixture"
           "&config=default&split=train&offset=%d&length=%d" % (offset, length))
    for k in range(8):
        try:
            # curl rather than urllib: some Python builds lack the CA bundle
            out = subprocess.run(["curl", "-s", "--max-time", "60", url], capture_output=True, check=True).stdout
            rows = json.loads(out)["rows"]
            if cf:
                json.dump(rows, open(cf, "w"))
            return rows
        except Exception as e:  # rate limits: back off
            time.sleep(5 + 10 * k)
    raise RuntimeError("fetch failed " + url)


def main():
    rnd = random.Random(20261003)
    N = 939343
    rows = []
    offsets = sorted(rnd.sample(range(N - 10), 100))
    for off in offsets:
        for r in fetch(off, 10):
            row = r["row"]
            c = count(row["messages"])
            c["source"] = row["source"]
            c["turns"] = sum(1 for m in row["messages"] if m["role"] == "assistant")
            rows.append(c)
        time.sleep(0.3)
    json.dump({"note": "1,000 rows of allenai/tulu-3-sft-mixture: 100 seeded random offsets x 10 consecutive rows; "
                       "counts with Tulu 3's tokenizer and chat template, BOS included; loss = assistant content + eos",
               "seed": 20261003, "offsets": offsets, "rows": rows},
              open(os.path.join(HERE, "inputs", "tulu3_lengths.json"), "w"), separators=(",", ":"))

    # the page's worked example, token by token
    ex = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "A shop sells 3 pens for $2. How much do 12 pens cost?"},
        {"role": "assistant", "content": "12 pens is 4 groups of 3, so 4 × $2 = $8."},
        {"role": "user", "content": "And 30 pens?"},
        {"role": "assistant", "content": "30 pens is 10 groups of 3: $20."},
    ]
    toks = []
    text = ""
    prev_ids = tok.encode("", add_special_tokens=True).ids
    for i in prev_ids:
        toks.append({"t": tok.id_to_token(i), "id": i, "role": "bos", "loss": 0})
    for t, carries, role in segments(ex):
        text += t
        ids = tok.encode(text, add_special_tokens=True).ids
        assert ids[:len(prev_ids)] == prev_ids, "prefix changed"
        for i in ids[len(prev_ids):]:
            toks.append({"t": tok.id_to_token(i), "id": i, "role": role, "loss": 1 if carries else 0})
        prev_ids = ids
    json.dump({"messages": ex, "tokens": toks}, open(os.path.join(HERE, "inputs", "example_tokens.json"), "w"),
              ensure_ascii=False, indent=0)
    print(len(rows), "rows;", len(toks), "example tokens")


if __name__ == "__main__":
    main()
