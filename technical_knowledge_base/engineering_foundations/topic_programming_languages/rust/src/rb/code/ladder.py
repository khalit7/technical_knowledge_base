"""The optimisation ladder: the root page's count_tokens program, one step further into Rust each time.
usage: ladder.py STEP path [--phases]
  python    no Rust: the root's Rosetta program, restructured into the same phases as the steps below
  percall   Python parses each line with json.loads; Rust counts each message (one call per message)
  owned     Python parses; one call for all messages, received as Vec<String> (every string copied)
  borrowed  Python parses; one call for all messages, received as &str views (no copies)
  bytes     Python reads the file; one call: Rust parses (serde_json) and counts, GIL held
  parallel  as bytes, with the GIL released and the work split over 8 rayon threads
Every step prints exactly the expected output of PROGRAM.md. --phases prints where the time went (stderr)."""
import json
import sys
import time
from collections import Counter

import tokrs


def py_tokens(text):
    """The Rosetta Python token loop."""
    n, inside = 0, False
    for ch in text:
        is_tok = ch.isascii() and ch.isalnum()
        if is_tok and not inside:
            n += 1
        inside = is_tok
    return n


def report(lines, ok, bad, first_bad, per_user):
    total = sum(per_user.values())
    print(f"lines {lines}  ok {ok}  malformed {bad} (first at line {first_bad})")
    print(f"users {len(per_user)}  tokens {total}")
    print("top 5 users by tokens:")
    top = sorted(per_user.items(), key=lambda kv: (-kv[1], kv[0]))[:5]
    for rank, (user, n) in enumerate(top, start=1):
        print(f"{rank:>2}. {user}  {n}")


def parse(line):
    try:
        rec = json.loads(line)
        user, text = rec["user"], rec["text"]
    except (ValueError, KeyError, TypeError):
        return None
    if not isinstance(user, str) or not isinstance(text, str):
        return None
    return user, text


def main(step, path, phases=False):
    t = [time.perf_counter()]
    if step in ("bytes", "parallel"):
        with open(path, "rb") as f:
            data = f.read()
        t.append(time.perf_counter())
        if step == "bytes":
            res = tokrs.tally_bytes(data)
        else:
            res = tokrs.tally_bytes_parallel(data, 8)
        t.append(time.perf_counter())
        report(*res)
        names = ["read file", "Rust: parse + count"]
    else:
        per_user = Counter()
        lines = ok = bad = first_bad = 0
        users, texts = [], []
        with open(path, encoding="utf-8") as f:
            raw = f.readlines()
        t.append(time.perf_counter())
        for lineno, line in enumerate(raw, start=1):
            lines += 1
            rec = parse(line)
            if rec is None:
                bad += 1
                first_bad = first_bad or lineno
                continue
            ok += 1
            users.append(rec[0])
            texts.append(rec[1])
        t.append(time.perf_counter())
        if step == "python":
            counts = [py_tokens(s) for s in texts]
        elif step == "percall":
            counts = [tokrs.count_tokens(s) for s in texts]
        elif step == "owned":
            counts = tokrs.count_many_owned(texts)
        else:
            counts = tokrs.count_many(texts)
        t.append(time.perf_counter())
        for u, n in zip(users, counts):
            per_user[u] += n
        t.append(time.perf_counter())
        report(lines, ok, bad, first_bad, per_user)
        names = ["read lines", "Python: json.loads", "count tokens" if step == "python" else "Rust: count (with crossings)", "Python: add per user"]
    if phases:
        print(json.dumps({n: round((b - a) * 1e3, 2) for n, a, b in zip(names, t, t[1:])}), file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], "--phases" in sys.argv)
