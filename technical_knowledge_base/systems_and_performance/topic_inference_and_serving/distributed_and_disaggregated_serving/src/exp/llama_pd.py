"""Prefill/decode disaggregation with two llama-server processes on one Apple M1 Pro (Metal), standard library only.

Servers (started by llama_pd.sh): P on PORT_P (prefill), D on PORT_D (decode), same model, both with --slot-save-path
pointing at one folder and the host prompt cache off (--cache-ram 0).
Part 1, transfer: for each prompt, P computes the prompt (n_predict 1), saves slot 0's KV to a file, D restores it
into its slot 0 and generates 64 tokens reusing it; then D erases the slot and recomputes the same prompt (baseline).
Part 2, interference: a decode stream (short prompt, 300 tokens) runs on D while a long prompt arrives either at D
(colocated, other slot) or at P (a separate process on the same GPU); every token's arrival time is recorded.
usage: python3 -I llama_pd.py PORT_P PORT_D SAVE_DIR OUT.json SEED
"""
import http.client, json, os, random, sys, threading, time

PP, PD, SAVE, OUT, SEED = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4], int(sys.argv[5])
WORDS = ("the of and to in a is that for it as was with be by on not he this are or his from at which but have an they "
         "you were her she there been one all we their has would when if more no out so said what up its about into than "
         "them can only other new some could time these two may then do first any my now such like our over man me even").split()
rng = random.Random(SEED)
words = lambda n: " ".join(rng.choice(WORDS) for _ in range(n))


def post(port, path, body, timeout=600):
    c = http.client.HTTPConnection("127.0.0.1", port, timeout=timeout)
    t = time.perf_counter()
    c.request("POST", path, json.dumps(body), {"Content-Type": "application/json"})
    r = c.getresponse()
    d = json.loads(r.read() or b"{}")
    c.close()
    return d, time.perf_counter() - t


def transfer(n_words, k):
    prompt = words(n_words) + "\nSummarise the text above."
    fn = "dd_%d_%d.bin" % (SEED, k)
    a, wa = post(PP, "/completion", dict(prompt=prompt, n_predict=1, id_slot=0, cache_prompt=True, temperature=0))
    s, ws = post(PP, "/slots/0?action=save", dict(filename=fn))
    r, wr = post(PD, "/slots/0?action=restore", dict(filename=fn))
    d, wd = post(PD, "/completion", dict(prompt=prompt, n_predict=64, id_slot=0, cache_prompt=True, temperature=0))
    post(PD, "/slots/0?action=erase", {})
    b, wb = post(PD, "/completion", dict(prompt=prompt, n_predict=64, id_slot=0, cache_prompt=True, temperature=0))
    post(PD, "/slots/0?action=erase", {})
    post(PP, "/slots/0?action=erase", {})
    size = os.path.getsize(os.path.join(SAVE, fn))
    os.remove(os.path.join(SAVE, fn))
    T = lambda x: x.get("timings", {})
    return dict(words=n_words, prefill=dict(wall=wa, prompt_n=T(a).get("prompt_n"), prompt_ms=T(a).get("prompt_ms")),
                save=dict(wall=ws, n_saved=s.get("n_saved"), n_written=s.get("n_written"), ms=T(s).get("save_ms")),
                restore=dict(wall=wr, n_restored=r.get("n_restored"), n_read=r.get("n_read"), ms=T(r).get("restore_ms")),
                decode=dict(wall=wd, prompt_n=T(d).get("prompt_n"), prompt_ms=T(d).get("prompt_ms"), pred_n=T(d).get("predicted_n"),
                            per_tok_ms=T(d).get("predicted_per_token_ms"), same_text=(d.get("content") == b.get("content"))),
                baseline=dict(wall=wb, prompt_n=T(b).get("prompt_n"), prompt_ms=T(b).get("prompt_ms"), per_tok_ms=T(b).get("predicted_per_token_ms")),
                file_bytes=size)


def stream(port, prompt, n, slot, times, started):
    c = http.client.HTTPConnection("127.0.0.1", port, timeout=600)
    c.request("POST", "/completion", json.dumps(dict(prompt=prompt, n_predict=n, stream=True, id_slot=slot, temperature=0,
                                                     ignore_eos=True, cache_prompt=False)), {"Content-Type": "application/json"})
    r = c.getresponse()
    started.set()
    for line in r:
        if line.startswith(b"data: "):
            times.append(time.perf_counter())
    c.close()


def interfere(where, n_words):
    times, st = [], threading.Event()
    th = threading.Thread(target=stream, args=(PD, words(30), 300, 0, times, st))
    t0 = time.perf_counter()
    th.start()
    st.wait()
    while len(times) < 60:  # let the stream settle
        time.sleep(0.01)
    t_in = time.perf_counter()
    big, wbig = post(PD if where == "colocated" else PP, "/completion",
                     dict(prompt=words(n_words), n_predict=1, id_slot=1 if where == "colocated" else 0, cache_prompt=False, temperature=0))
    t_out = time.perf_counter()
    th.join()
    gaps = [(times[i] - times[i - 1]) * 1e3 for i in range(1, len(times))]
    during = [(times[i] - times[i - 1]) * 1e3 for i in range(1, len(times)) if times[i] >= t_in and times[i - 1] <= t_out + 0.2]
    before = [(times[i] - times[i - 1]) * 1e3 for i in range(1, len(times)) if times[i] < t_in][5:]
    q = lambda xs, p: sorted(xs)[min(len(xs) - 1, int(p * len(xs)))] if xs else None
    return dict(where=where, words=n_words, big_prompt_n=big.get("timings", {}).get("prompt_n"),
                big_prompt_ms=big.get("timings", {}).get("prompt_ms"), big_wall=wbig,
                gap_before_p50=q(before, 0.5), gap_during_max=max(during) if during else None, gap_during_p50=q(during, 0.5),
                n_during=len(during), stall_ms=sum(g for g in during), n_tokens=len(times), gaps=[round(g, 2) for g in gaps])


res = dict(seed=SEED, transfer=[], interfere=[])
for k, n in enumerate((750, 1500, 3000)):
    res["transfer"].append(transfer(n, k))
    print("transfer", n, json.dumps(res["transfer"][-1])[:400], flush=True)
for where in ("colocated", "separate", "colocated", "separate"):
    res["interfere"].append(interfere(where, 3000))
    x = res["interfere"][-1]
    print("interfere", where, x["big_prompt_n"], x["big_prompt_ms"], x["gap_before_p50"], x["gap_during_max"], x["gap_during_p50"], flush=True)
json.dump(res, open(OUT, "w"), indent=1)
