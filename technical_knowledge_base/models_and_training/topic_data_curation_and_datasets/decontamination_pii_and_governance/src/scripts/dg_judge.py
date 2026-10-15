"""Pending GPU run: stage two of the LLM decontaminator (Yang et al., arXiv 2311.04850, Algorithm 2) with a local model.

For the top pairs from dg_embed.py (each test item's nearest post-training prompt), Qwen3 answers whether the two are
the same question (identical, reworded or translated) or merely similar. Agreement with the hand labels in
labels/embed_labels.json is printed. Thinking disabled, greedy decoding, answer parsed from the first word.

Usage: python dg_judge.py --model <Qwen3 HF folder> [--device mps] [--top 300] [--smoke]
Output: $DC_SCRATCH/data/dg/embed/judge_<model>.json
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dg_common as C  # noqa: E402
import dg_embed as M  # noqa: E402

PROMPT = ("You check training data for benchmark contamination. Test question:\n<<<{a}>>>\n\nTraining prompt:\n<<<{b}>>>\n\n"
          "Is the training prompt the same question as the test question (identical, reworded, or translated, even if "
          "numbers or names are formatted differently)? Answer SAME if it is the same question, otherwise DIFFERENT. "
          "Answer with one word.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--top", type=int, default=300)
    ap.add_argument("--smoke", action="store_true")
    a = ap.parse_args()
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    tok = AutoTokenizer.from_pretrained(a.model)
    model = AutoModelForCausalLM.from_pretrained(a.model, dtype=torch.bfloat16 if a.device != "cpu" else torch.float32)
    model = model.to(a.device).eval()
    od = C.out_dir("embed")
    top = json.load(open(os.path.join(od, "top.json")))["items"]
    tr = {(c, d): t for c, d, t in M.train_prompts()}
    items = {(it["bench"], it["idx"]): it for it in C.bench_items()}
    pairs = sorted(top, key=lambda r: -r["top"][0]["score"])[:3 if a.smoke else a.top]
    out = []
    for r in pairs:
        t0 = r["top"][0]
        q = M.stem(items[(r["bench"], r["bidx"])])
        b = tr[(t0["corpus"], t0["doc"])]
        msgs = [{"role": "user", "content": PROMPT.format(a=q[:1500], b=b[:1500])}]
        enc = tok.apply_chat_template(msgs, add_generation_prompt=True, enable_thinking=False, return_tensors="pt",
                                      return_dict=True)
        ids = enc["input_ids"].to(a.device)
        with torch.inference_mode():
            g = model.generate(ids, max_new_tokens=4, do_sample=False)
        ans = tok.decode(g[0, ids.shape[1]:], skip_special_tokens=True).strip().upper()
        out.append({"bench": r["bench"], "bidx": r["bidx"], "doc": t0["doc"], "score": t0["score"],
                    "judge": "SAME" if ans.startswith("SAME") else "DIFFERENT", "raw": ans})
        print(out[-1], flush=True)
    lab_p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "labels", "embed_labels.json")
    if os.path.exists(lab_p):
        import gzip
        lab = {k: v["cat"] for k, v in json.load(open(lab_p)).items()}
        for line in gzip.open(os.path.join(C.out_dir("contam"), "labelled.jsonl.gz"), "rt"):
            r = json.loads(line)
            lab.setdefault(f'{r["bench"]}|{r["bidx"]}|{r["doc"]}', r["cat"])
        def gold(o):
            return lab.get(f'{o["bench"]}|{o["bidx"]}') or lab.get(f'{o["bench"]}|{o["bidx"]}|{o["doc"]}')
        # SAME should mean a copy (identical or reworded); variants and the rest are DIFFERENT
        agree = [(o["judge"] == "SAME") == (gold(o) == "copy") for o in out if gold(o)]
        print("agreement with hand labels", sum(agree), "of", len(agree))
    name = os.path.basename(a.model.rstrip("/"))
    json.dump(out, open(os.path.join(od, f"judge_{name}{'.smoke' if a.smoke else ''}.json"), "w"))


if __name__ == "__main__":
    main()
