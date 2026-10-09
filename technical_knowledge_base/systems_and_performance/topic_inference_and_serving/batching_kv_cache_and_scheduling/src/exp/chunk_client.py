"""Chunked prefill on a real engine (llama-server): four users are mid-answer when a fifth sends a long prompt.

llama-server builds each step's batch decode-first: every generating slot adds its one sampled token, then
pending prompt tokens fill the batch up to n_batch (-b) (tools/server/server-context.cpp, update_slots, at the
pinned commit). So -b is the per-step token budget, the same knob as vLLM's max_num_batched_tokens, and a long
prompt is read in chunks of about -b tokens, one chunk per step, riding with the decodes.

This client: starts D decode streams (short prompt, ignore_eos, fixed max_tokens), waits until each has produced
some tokens, then sends one long prompt (streamed, 8 output tokens). Records every token time of every stream.
Standard library only.

usage: python3 -I chunk_client.py --url http://127.0.0.1:8131 --out res.json [--decoders 4] [--long-words 6000]
"""
import argparse, json, random, threading, time, http.client, urllib.parse

WORDS = ("the of and to in a is that for it as was with be by on not he this are or his from at which "
         "but have an they you were her she there been one all we their has would when if more no out "
         "so said what up its about into than them can only other new some could time these two may "
         "then do first any my now such like our over man me even most made after also did many before "
         "must through back years where much your way well down should because each just those people").split()


def prompt(seed, n):
    r = random.Random(seed)
    return " ".join(r.choice(WORDS) for _ in range(n))


def stream(url, body, rec):
    u = urllib.parse.urlparse(url)
    c = http.client.HTTPConnection(u.hostname, u.port, timeout=900)
    rec["t_send"] = time.perf_counter()
    c.request("POST", "/v1/completions", body=json.dumps(body), headers={"Content-Type": "application/json"})
    r = c.getresponse()
    if r.status != 200:
        rec["error"] = "HTTP %d %r" % (r.status, r.read()[:200])
        return
    times, buf, usage = [], b"", None
    rec["times"] = times
    while True:
        ch = r.read1(65536)
        if not ch:
            break
        buf += ch
        while b"\n\n" in buf:
            ev, buf = buf.split(b"\n\n", 1)
            for line in ev.split(b"\n"):
                if not line.startswith(b"data:"):
                    continue
                p = line[5:].strip()
                if p == b"[DONE]":
                    continue
                try:
                    j = json.loads(p)
                except Exception:
                    continue
                if j.get("usage"):
                    usage = j["usage"]
                cc = j.get("choices") or []
                if cc and (cc[0].get("text") or "") != "":
                    times.append(time.perf_counter())
    rec["t_end"] = time.perf_counter()
    rec["usage"] = usage
    c.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--decoders", type=int, default=4)
    ap.add_argument("--dec-words", type=int, default=150)
    ap.add_argument("--dec-tokens", type=int, default=500)
    ap.add_argument("--long-words", type=int, default=6000)
    ap.add_argument("--long-tokens", type=int, default=8)
    ap.add_argument("--start-after", type=int, default=40, help="send the long prompt once every stream has this many tokens")
    ap.add_argument("--no-long", action="store_true")
    ap.add_argument("--seed", type=int, default=1)
    a = ap.parse_args()
    nonce = "%08x" % random.getrandbits(32)
    # warm-up (load weights, build graphs)
    stream(a.url, {"prompt": "warm up " + nonce, "max_tokens": 4, "stream": True, "temperature": 0}, {})
    recs = [dict(kind="dec", i=i) for i in range(a.decoders)]
    ths = []
    t0 = time.perf_counter()
    for i, rec in enumerate(recs):
        body = {"prompt": "user %d %s. " % (i, nonce) + prompt(a.seed * 100 + i, a.dec_words), "max_tokens": a.dec_tokens,
                "stream": True, "temperature": 0, "ignore_eos": True, "stream_options": {"include_usage": True}}
        th = threading.Thread(target=stream, args=(a.url, body, rec))
        th.start()
        ths.append(th)
    long_rec = dict(kind="long")
    if not a.no_long:
        while True:
            time.sleep(0.01)
            if all(len(r.get("times", [])) >= a.start_after for r in recs) or time.perf_counter() - t0 > 120:
                break
        body = {"prompt": "document %s. " % nonce + prompt(a.seed * 100 + 99, a.long_words), "max_tokens": a.long_tokens,
                "stream": True, "temperature": 0, "ignore_eos": True, "stream_options": {"include_usage": True}}
        tl = threading.Thread(target=stream, args=(a.url, body, long_rec))
        tl.start()
        ths.append(tl)
    for th in ths:
        th.join()
    for r in recs + [long_rec]:
        for k in ("t_send", "t_end"):
            if k in r:
                r[k] -= t0
        if "times" in r:
            r["times"] = [round(x - t0, 6) for x in r["times"]]
    json.dump({"config": vars(a), "decoders": recs, "long": long_rec}, open(a.out, "w"))


if __name__ == "__main__":
    main()
