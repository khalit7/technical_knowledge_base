"""Generate a seeded JSONL chat log for the running example (see ../PROGRAM.md).

usage: python3 gen_chat.py [--lines N] [--seed S] [--users U] > chat.jsonl
Standard library only. Same arguments give the same bytes (random.Random with a fixed seed).
"""
import argparse
import json
import random

VOCAB = (
    "the a of to and in is it that for model token tokens batch loss gradient "
    "attention layer weights eval prompt reply cache GPU CUDA kernel latency "
    "throughput train trained training fine tune inference agent tool call "
    "Python Rust TypeScript C++ memory pointer thread async error result ok "
    "please thanks why how what can you could explain show me code bug fix"
).split()
EXTRAS = ["café", "naïve", "über", "日本語", "🙂", "x86_64", "fp16", "v2.1", "3.14", "42"]
PUNCT = [",", ".", "?", "!", ":", ";", " -", "'s", "(", ")"]

MALFORMED = [
    '{"user": "u0001", "role": "user", "text": "this line was cut off',
    '{"user": "u0002" "role": "user", "text": "missing comma"}',
    '{"user": 17, "role": "user", "text": "user is a number"}',
    '{"role": "user", "text": "no user field"}',
    "not json at all",
    '{"user": "u0003", "role": "user", "text": "bad escape \\x41"}',
    "{'user': 'u0004', 'role': 'user', 'text': 'single quotes'}",
    '{"user": "u0005", "role": "user", "text": null}',
]


def sentence(rng: random.Random) -> str:
    out = []
    for _ in range(rng.randint(3, 40)):
        r = rng.random()
        if r < 0.04:
            out.append(rng.choice(EXTRAS))
        else:
            out.append(rng.choice(VOCAB))
        if rng.random() < 0.12:
            out[-1] += rng.choice(PUNCT)
    s = " ".join(out)
    if rng.random() < 0.05:
        s += '\nsaid "hi" \\ bye'  # newline, quotes and a backslash: JSON escapes in the file
    return s


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lines", type=int, default=2000)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--users", type=int, default=200)
    a = ap.parse_args()
    rng = random.Random(a.seed)
    # Zipf-like weights: a few heavy users, a long tail.
    users = [f"u{i:04d}" for i in range(1, a.users + 1)]
    weights = [1.0 / (i ** 1.1) for i in range(1, a.users + 1)]
    rng.shuffle(users)
    bad_at = set(rng.sample(range(a.lines), min(len(MALFORMED), a.lines)))
    bad = iter(MALFORMED * (a.lines // 1000 + 1))
    import sys
    w = sys.stdout
    for i in range(a.lines):
        if i in bad_at:
            w.write(next(bad) + "\n")
            continue
        u = rng.choices(users, weights)[0]
        role = "user" if rng.random() < 0.5 else "assistant"
        rec = {"ts": 1759650000 + i * 7, "user": u, "role": role, "text": sentence(rng)}
        w.write(json.dumps(rec, ensure_ascii=(i % 3 == 0)) + "\n")


if __name__ == "__main__":
    main()
