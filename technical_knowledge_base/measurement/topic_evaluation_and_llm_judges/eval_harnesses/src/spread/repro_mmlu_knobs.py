# Same model, same MMLU items, ten harness settings.
# Model: Qwen/Qwen2.5-0.5B-Instruct. Items: the first 8 test items of each of the 57 MMLU subjects (456 items), cais/mmlu.
# Each condition changes one knob against a neighbour, so every gap is attributable:
#   C1  original prompt (hendrycks/test; lm-eval mmlu since mid-2023), 5-shot, loglikelihood of " A".." D"
#   C2  as C1, 0-shot                                      (few-shot knob)
#   C10 HELM-style prompt ("Question:" prefix), 5-shot, letter loglikelihood   (prompt-template knob vs C1)
#   C5  HELM-style prompt, 5-shot, greedy generation, strict: first character must be the letter (scoring knob vs C10)
#   C3  lm-eval Jan 2023 (commit e47e01b) prompt, 5 random dev shots, loglikelihood of " <answer text>", acc
#   C4  as C3, divided by character length, acc_norm         (normalisation knob)
#   C6  original prompt, 0-shot, greedy generation, strict, no chat template
#   C7  the same 0-shot prompt inside the model's chat template, greedy, strict   (chat-template knob vs C6)
#   C8  as C7, lenient extraction (first standalone A-D, or "answer is X")      (extraction knob vs C7)
#   C9  chat template plus "Answer with only the letter." , greedy, strict      (instruction knob vs C7)
# Run: uv run --with torch --with transformers --with pandas --with pyarrow python repro_mmlu_knobs.py <mmlu_dir> <out.json>
import sys, json, re, random, time, os
import torch, pandas as pd
from transformers import AutoTokenizer, AutoModelForCausalLM
torch.set_num_threads(2)
MD = "Qwen/Qwen2.5-0.5B-Instruct"
mdir, out = sys.argv[1], sys.argv[2]
PER = int(os.environ.get("PER", "8"))
test = pd.read_parquet(f"{mdir}/mmlu_test.parquet"); dev = pd.read_parquet(f"{mdir}/mmlu_dev.parquet")
SRC = os.environ.get("MODEL_DIR", MD)  # a local snapshot of the same repo works offline
tok = AutoTokenizer.from_pretrained(SRC)
model = AutoModelForCausalLM.from_pretrained(SRC, dtype=torch.float32); model.eval()
L = "ABCD"
def subj_name(s): return " ".join(s.split("_"))
def fmt_orig(q, ch): return q.strip() + "\n" + "".join(f"{k}. {c}\n" for k, c in zip(L, ch)) + "Answer:"
def fmt_helm(q, ch): return "Question: " + q.strip() + "\n" + "".join(f"{k}. {c}\n" for k, c in zip(L, ch)) + "Answer:"
def fmt_jan(q, ch): return "Question: " + q + "\nChoices:\n" + "".join(f"{k}. {c}\n" for k, c in zip(L, ch)) + "Answer:"
def p_orig(s, q, ch, k):
    d = dev[dev.subject == s].head(k)
    head = f"The following are multiple choice questions (with answers) about {subj_name(s)}.\n\n"
    return head + "".join(fmt_orig(r.question, list(r.choices)) + " " + L[r.answer] + "\n\n" for r in d.itertuples()) + fmt_orig(q, ch)
def p_helm(s, q, ch, k):
    d = dev[dev.subject == s].head(k)
    head = f"The following are multiple choice questions (with answers) about {subj_name(s)}.\n\n"
    return head + "".join(fmt_helm(r.question, list(r.choices)) + " " + L[r.answer] + "\n\n" for r in d.itertuples()) + fmt_helm(q, ch)
def p_jan(s, q, ch, k, rnd):
    d = list(dev[dev.subject == s].itertuples()); sh = rnd.sample(d, k)
    return "".join(fmt_jan(r.question, list(r.choices)) + " " + list(r.choices)[r.answer] + "\n\n" for r in sh) + fmt_jan(q, ch)
LT = [tok.encode(" " + x)[0] for x in L]
assert all(len(tok.encode(" " + x)) == 1 for x in L)
@torch.no_grad()
def next_logprobs(prompt):
    ids = tok(prompt, return_tensors="pt").input_ids
    lp = torch.log_softmax(model(ids).logits[0, -1].float(), -1)
    return lp, ids.shape[1]
def top5(lp):
    v, i = lp.topk(5); return [[tok.decode([int(j)]), round(float(x), 3)] for x, j in zip(v, i)]
@torch.no_grad()
def cont_ll(prompt, conts):
    res = []
    pids = tok(prompt).input_ids
    for c in conts:
        cids = tok(prompt + c).input_ids
        # tokens of the continuation = tail beyond the prompt's tokens (Qwen BPE: prompt ends with ':' so the split is clean)
        assert cids[:len(pids)] == pids, "tokenisation of prompt changed"
        t = torch.tensor([cids])
        lp = torch.log_softmax(model(t).logits[0].float(), -1)
        s = sum(float(lp[j - 1, cids[j]]) for j in range(len(pids), len(cids)))
        res.append([round(s, 4), len(cids) - len(pids), len(c) - 1])
    return res
@torch.no_grad()
def greedy(ids, n):
    o = model.generate(ids, max_new_tokens=n, do_sample=False, pad_token_id=tok.eos_token_id)
    return tok.decode(o[0, ids.shape[1]:], skip_special_tokens=True)
def strict(txt):
    t = txt.strip(); return t[0] if t and t[0] in L and (len(t) == 1 or not t[1].isalnum()) else None
def lenient(txt):
    m = re.search(r"answer is[:\s]*\(?([ABCD])\b", txt, re.I) or re.search(r"\b([ABCD])\b", txt)
    return m.group(1) if m else None
def chat(user):
    return tok.apply_chat_template([{"role": "user", "content": user}], tokenize=False, add_generation_prompt=True)
items = []
for s in sorted(test.subject.unique()):
    for r in test[test.subject == s].head(PER).itertuples(): items.append(r)
rnd = random.Random(1234)
rows = []; t0 = time.time()
for n, r in enumerate(items):
    s, q, ch, g = r.subject, r.question, list(r.choices), int(r.answer)
    row = {"s": s, "q": q, "ch": ch, "g": g}
    lp, nt = next_logprobs(p_orig(s, q, ch, 5)); row["c1"] = [round(float(lp[t]), 3) for t in LT]; row["c1top"] = top5(lp); row["c1tok"] = nt
    lp0, _ = next_logprobs(p_orig(s, q, ch, 0)); row["c2"] = [round(float(lp0[t]), 3) for t in LT]; row["c2top"] = top5(lp0)
    ph = p_helm(s, q, ch, 5); lph, _ = next_logprobs(ph); row["c10"] = [round(float(lph[t]), 3) for t in LT]
    row["c5g"] = greedy(tok(ph, return_tensors="pt").input_ids, 6)
    pj = p_jan(s, q, ch, 5, rnd); row["c3"] = cont_ll(pj, [" " + c for c in ch])
    p0 = p_orig(s, q, ch, 0); row["c6g"] = greedy(tok(p0, return_tensors="pt").input_ids, 6)
    row["c7g"] = greedy(tok(chat(p0), return_tensors="pt", add_special_tokens=False).input_ids, 96)
    row["c9g"] = greedy(tok(chat(p0[:-len("Answer:")] + "Answer with only the letter."), return_tensors="pt", add_special_tokens=False).input_ids, 6)
    rows.append(row)
    if n % 20 == 0: print(n, len(items), round(time.time() - t0), flush=True)
    if n % 50 == 0 or n == len(items) - 1: json.dump({"model": MD, "per_subject": PER, "rows": rows}, open(out, "w"))
print("done", round(time.time() - t0))
