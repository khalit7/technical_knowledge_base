"""B concurrent closed-loop clients against llama-server /completion, greedy, fixed prompts.
usage: xclient.py URL OUT B ROUNDS N_PREDICT PROMPTS_JSON [label]
Each client c sends ROUNDS requests one after another, prompt index (c + r * B) mod len(prompts).
Records llama-server's own timings per request plus wall time."""
import json, sys, time, threading, urllib.request
url, out, B, R, NP, pf = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
label = sys.argv[7] if len(sys.argv) > 7 else ""
T = "<|im_start|>user\n{q} /no_think<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n"
prompts = json.load(open(pf))
names = list(prompts)
res, lock = [], threading.Lock()
bar = threading.Barrier(B)
def client(c):
    bar.wait()
    for r in range(R):
        name = names[(c + r * B) % len(names)]
        body = json.dumps({"prompt": T.format(q=prompts[name]), "n_predict": NP, "temperature": 0, "cache_prompt": False}).encode()
        t0 = time.perf_counter()
        j = json.load(urllib.request.urlopen(urllib.request.Request(url + "/completion", body, {"Content-Type": "application/json"}), timeout=1800))
        t1 = time.perf_counter()
        t = j.get("timings", {})
        with lock:
            res.append({"client": c, "round": r, "prompt": name, "t0": t0, "t1": t1, "n_out": t.get("predicted_n"),
                        "gen_ms": t.get("predicted_ms"), "tok_s": t.get("predicted_per_second"), "prompt_ms": t.get("prompt_ms"),
                        "prompt_n": t.get("prompt_n"), "draft_n": t.get("draft_n"), "draft_acc": t.get("draft_n_accepted"),
                        "head": j.get("content", "")[:60]})
ths = [threading.Thread(target=client, args=(c,)) for c in range(B)]
w0 = time.perf_counter(); [t.start() for t in ths]; [t.join() for t in ths]; w1 = time.perf_counter()
tot = sum(x["n_out"] or 0 for x in res)
summ = {"label": label, "B": B, "rounds": R, "n_predict": NP, "wall": w1 - w0, "tokens": tot, "agg_tok_s": tot / (w1 - w0),
        "mean_user_tok_s": sum(x["tok_s"] or 0 for x in res) / len(res),
        "draft_n": sum(x["draft_n"] or 0 for x in res), "draft_acc": sum(x["draft_acc"] or 0 for x in res)}
json.dump({"summary": summ, "requests": res}, open(out, "w"))
print(json.dumps(summ), flush=True)
