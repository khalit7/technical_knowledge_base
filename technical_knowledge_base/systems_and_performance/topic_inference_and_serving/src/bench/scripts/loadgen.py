"""Load generator for OpenAI-compatible completion servers (llama-server, mlx_lm.server, vLLM).

Standard library only. Two modes:
  closed:  C concurrent users, each sends its next request as soon as the previous one finishes.
  poisson: open loop, requests arrive as a Poisson process at RATE per second (fixed seed).
Each request streams (SSE). Per request we record: arrival time, TTFT (send -> first token chunk),
inter-token gaps, end-to-end latency, output tokens (from usage when the server sends it, else chunk count).

usage: python3 -I loadgen.py --url http://127.0.0.1:8080 --model NAME --mode closed --conc 4 --n 32 \
         --prompt-tokens 512 --max-tokens 128 --seed 1 --out result.json [--prefix-tokens 0]
"""
import argparse, os, json, random, threading, time, http.client, urllib.parse, statistics, sys

WORDS = ("the of and to in a is that for it as was with be by on not he this are or his from at which "
         "but have an they you were her she there been one all we their has would when if more no out "
         "so said what up its about into than them can only other new some could time these two may "
         "then do first any my now such like our over man me even most made after also did many before "
         "must through back years where much your way well down should because each just those people "
         "how too little state good very make world still own see men work long get here between both "
         "life being under never day same another know while last might us great old year off come since "
         "against go came right used take three").split()


def make_prompt(rng, n_words):
    # about 1.3 words per token for this word list with the Qwen3 tokenizer is not assumed:
    # the server's own prompt token count is recorded instead.
    return " ".join(rng.choice(WORDS) for _ in range(n_words))


def one_request(url, model, prompt, max_tokens, extra, rec):
    rec["t_first"] = time.perf_counter()
    for attempt in range(4):
        try:
            return _one_request(url, model, prompt, max_tokens, extra, rec)
        except (ConnectionError, OSError) as e:
            rec["retries"] = rec.get("retries", 0) + 1
            rec["last_exc"] = repr(e)[:120]
            for k in ("ttft", "gaps", "e2e", "tpot", "chunks"):
                rec.pop(k, None)
            time.sleep(0.05 * (attempt + 1))
    rec["error"] = "gave up after retries: " + rec.get("last_exc", "")


def _one_request(url, model, prompt, max_tokens, extra, rec):
    u = urllib.parse.urlparse(url)
    conn = http.client.HTTPConnection(u.hostname, u.port, timeout=600)
    body = {"model": model, "prompt": prompt, "max_tokens": max_tokens, "stream": True,
            "temperature": 0.0, "stream_options": {"include_usage": True}}
    body.update(extra)
    data = json.dumps(body)
    t0 = rec.get("t_first") or time.perf_counter()  # latency counts from the first attempt, retries included
    rec["t_send"] = t0
    conn.request("POST", "/v1/completions", body=data, headers={"Content-Type": "application/json"})
    resp = conn.getresponse()
    if resp.status != 200:
        rec["error"] = f"HTTP {resp.status}: {resp.read()[:200]!r}"
        return
    times = []
    usage = None
    buf = b""
    while True:
        chunk = resp.read1(65536) if hasattr(resp, "read1") else resp.read(1)
        if not chunk:
            break
        buf += chunk
        while b"\n\n" in buf:
            ev, buf = buf.split(b"\n\n", 1)
            for line in ev.split(b"\n"):
                if not line.startswith(b"data:"):
                    continue
                payload = line[5:].strip()
                if payload == b"[DONE]":
                    continue
                try:
                    j = json.loads(payload)
                except Exception:
                    continue
                if j.get("usage"):
                    usage = j["usage"]
                ch = j.get("choices") or []
                if ch and (ch[0].get("text") or "") != "":
                    times.append(time.perf_counter())
    t1 = time.perf_counter()
    conn.close()
    rec["e2e"] = t1 - t0
    rec["chunks"] = len(times)
    if times:
        rec["ttft"] = times[0] - t0
        gaps = [b - a for a, b in zip(times, times[1:])]
        rec["gaps"] = gaps
    if usage:
        rec["prompt_tokens"] = usage.get("prompt_tokens")
        rec["completion_tokens"] = usage.get("completion_tokens")
    out = rec.get("completion_tokens") or len(times)
    rec["out_tokens"] = out
    if times and out > 1:
        rec["tpot"] = (t1 - times[0]) / (out - 1)


def pct(xs, p):
    if not xs:
        return None
    xs = sorted(xs)
    k = (len(xs) - 1) * p / 100
    f = int(k)
    c = min(f + 1, len(xs) - 1)
    return xs[f] + (xs[c] - xs[f]) * (k - f)


def summarize(recs, wall):
    ok = [r for r in recs if "e2e" in r and "error" not in r]
    ttft = [r["ttft"] for r in ok if "ttft" in r]
    tpot = [r["tpot"] for r in ok if "tpot" in r]
    e2e = [r["e2e"] for r in ok]
    out_tok = sum(r["out_tokens"] for r in ok)
    in_tok = sum(r.get("prompt_tokens") or 0 for r in ok)
    gaps = [g for r in ok for g in r.get("gaps", [])]
    s = {"n_ok": len(ok), "n_err": len(recs) - len(ok), "n_retried": sum(1 for r in recs if r.get("retries")), "wall_s": wall,
         "out_tok_per_s": out_tok / wall if wall else None,
         "in_tok_total": in_tok, "out_tok_total": out_tok,
         "req_per_s": len(ok) / wall if wall else None}
    for name, xs in (("ttft", ttft), ("tpot", tpot), ("e2e", e2e), ("itl", gaps)):
        s[name + "_p50"] = pct(xs, 50)
        s[name + "_p90"] = pct(xs, 90)
        s[name + "_p99"] = pct(xs, 99)
        s[name + "_mean"] = statistics.fmean(xs) if xs else None
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--model", default="m")
    ap.add_argument("--mode", choices=["closed", "poisson"], default="closed")
    ap.add_argument("--conc", type=int, default=1)
    ap.add_argument("--rate", type=float, default=1.0)
    ap.add_argument("--n", type=int, default=16)
    ap.add_argument("--prompt-words", type=int, default=400)
    ap.add_argument("--prefix-words", type=int, default=0, help="shared prefix (system prompt) length in words")
    ap.add_argument("--max-tokens", type=int, default=128)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--extra", default="{}", help="JSON merged into each request body")
    ap.add_argument("--warmup", type=int, default=1)
    ap.add_argument("--out", required=True)
    ap.add_argument("--label", default="")
    ap.add_argument("--no-nonce", action="store_true", help="do not put a unique tag after the shared prefix (lets the server reuse cached prompts across runs)")
    a = ap.parse_args()
    rng = random.Random(a.seed)
    extra = json.loads(a.extra)
    prefix = make_prompt(random.Random(12345), a.prefix_words) + "\n\n" if a.prefix_words else ""
    run_tag = "" if a.no_nonce else "run %s. " % os.urandom(4).hex()
    prompts = [prefix + (run_tag and run_tag.replace(".", " %d." % i)) + make_prompt(rng, a.prompt_words) for i in range(a.n)]
    for i in range(a.warmup):
        one_request(a.url, a.model, make_prompt(random.Random(999 + i), 32), 8, extra, {})
    recs = [dict(i=i) for i in range(a.n)]
    t_start = time.perf_counter()
    if a.mode == "closed":
        nxt = [0]
        lock = threading.Lock()

        def user():
            while True:
                with lock:
                    i = nxt[0]
                    nxt[0] += 1
                if i >= a.n:
                    return
                recs[i]["t_arrive"] = time.perf_counter() - t_start
                one_request(a.url, a.model, prompts[i], a.max_tokens, extra, recs[i])
        ths = [threading.Thread(target=user) for _ in range(a.conc)]
        for t in ths:
            t.start()
        for t in ths:
            t.join()
    else:
        arr = random.Random(a.seed + 1000)
        t = 0.0
        ths = []
        for i in range(a.n):
            t += arr.expovariate(a.rate)
            delay = t_start + t - time.perf_counter()
            if delay > 0:
                time.sleep(delay)
            recs[i]["t_arrive"] = time.perf_counter() - t_start
            th = threading.Thread(target=one_request, args=(a.url, a.model, prompts[i], a.max_tokens, extra, recs[i]))
            th.start()
            ths.append(th)
        for th in ths:
            th.join()
    wall = time.perf_counter() - t_start
    for r in recs:
        if "t_send" in r:
            r["t_send"] -= t_start
        r.pop("t_first", None)
    s = summarize(recs, wall)
    cfg = {k: v for k, v in vars(a).items() if k != "out"}
    json.dump({"config": cfg, "summary": s, "requests": recs}, open(a.out, "w"))
    print(json.dumps({"label": a.label, **{k: (round(v, 4) if isinstance(v, float) else v) for k, v in s.items()}}))


if __name__ == "__main__":
    main()
