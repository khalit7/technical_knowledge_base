"""Where a conversation's KV comes back from: in the slot, from host memory, from a file, or recomputed.

llama-server with one slot (-np 1). Its prompt cache (--cache-ram, 8,192 MiB by default) keeps the KV of prompts that a
slot drops when it switches to another conversation, and loads it back when that prompt returns
(tools/server/server-context.cpp: prompt_save / prompt_load around get_available_slot). /slots/0?action=save|restore
writes and reads a slot's KV to a file (--slot-save-path). Per repetition, with fresh prompts:
  1. A cold: nothing cached, the whole prompt is computed (recompute)
  2. A again: the slot still holds A (resident)
  3. B cold: the slot switches to B; A's KV is copied to the host prompt cache
  4. A: loaded back from the host prompt cache
  5. save the slot (A) to a file, erase the slot, restore it from the file, then A (file tier)
Each completion request streams 1 token; we record TTFT and the server's own timings (prompt_n, cache_n, prompt_ms).
Standard library only. usage: python3 -I tiers_client.py --url http://127.0.0.1:8132 --out res.json --rep 1
"""
import argparse, json, random, time, http.client, urllib.parse

WORDS = ("the of and to in a is that for it as was with be by on not he this are or his from at which "
         "but have an they you were her she there been one all we their has would when if more no out "
         "so said what up its about into than them can only other new some could time these two may "
         "then do first any my now such like our over man me even most made after also did many before").split()


def text(seed, n):
    r = random.Random(seed)
    return " ".join(r.choice(WORDS) for _ in range(n))


def post(url, path, body):
    u = urllib.parse.urlparse(url)
    c = http.client.HTTPConnection(u.hostname, u.port, timeout=900)
    t0 = time.perf_counter()
    c.request("POST", path, body=json.dumps(body), headers={"Content-Type": "application/json"})
    r = c.getresponse()
    data = r.read()
    t1 = time.perf_counter()
    c.close()
    return r.status, json.loads(data or b"{}"), t1 - t0


def complete(url, prompt):
    # non-streamed, one token: the wall time is TTFT plus one tiny response; the server reports its own timings
    st, j, dt = post(url, "/completion", {"prompt": prompt, "n_predict": 1, "temperature": 0, "cache_prompt": True})
    t = j.get("timings", {})
    return {"status": st, "wall_s": dt, "prompt_n": t.get("prompt_n"), "cache_n": t.get("cache_n"),
            "prompt_ms": t.get("prompt_ms"), "tokens": j.get("tokens_evaluated")}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--rep", type=int, default=1)
    ap.add_argument("--words", type=int, default=5000)
    a = ap.parse_args()
    nonce = "%08x" % random.getrandbits(32)
    A = "conversation A %s. " % nonce + text(a.rep * 10 + 1, a.words)
    B = "conversation B %s. " % nonce + text(a.rep * 10 + 2, a.words)
    complete(a.url, "warm up %s" % nonce)
    res = {}
    res["recompute"] = complete(a.url, A)
    res["resident"] = complete(a.url, A)
    res["switch_to_B"] = complete(a.url, B)
    res["host_cache"] = complete(a.url, A)
    fn = "bk_%s.bin" % nonce
    st, j, dt = post(a.url, "/slots/0?action=save", {"filename": fn})
    res["file_save"] = {"status": st, "wall_s": dt, "resp": j}
    st, j, dt = post(a.url, "/slots/0?action=erase", {})
    res["erase"] = {"status": st, "wall_s": dt, "resp": j}
    st, j, dt = post(a.url, "/slots/0?action=restore", {"filename": fn})
    res["file_restore"] = {"status": st, "wall_s": dt, "resp": j}
    res["after_file_restore"] = complete(a.url, A)
    json.dump({"rep": a.rep, "words": a.words, "results": res}, open(a.out, "w"), indent=1)
    print(json.dumps({k: (v.get("wall_s"), v.get("cache_n"), v.get("prompt_n")) for k, v in res.items()}))


if __name__ == "__main__":
    main()
