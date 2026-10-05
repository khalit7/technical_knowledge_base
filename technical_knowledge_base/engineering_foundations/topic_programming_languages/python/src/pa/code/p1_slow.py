"""A deliberately slow per-user token counter (the root page's running program, written badly)."""
import json, random

def make_log(n=20_000, seed=7):
    rnd = random.Random(seed)
    words = ["attention", "token", "café", "x86_64", "v2.1", "the", "model", "train"]
    return [json.dumps({"user": f"u{rnd.randrange(200):04d}",
                        "text": " ".join(rnd.choice(words) for _ in range(rnd.randrange(5, 40)))})
            for _ in range(n)]

def is_token_char(c):
    return c.isascii() and c.isalnum()

def count_tokens(text):
    n, inside = 0, False
    for c in text:                          # one Python-level call per character
        tok = is_token_char(c)
        if tok and not inside:
            n += 1
        inside = tok
    return n

def per_user(lines):
    users, totals = [], []                  # parallel lists: `in` and .index() scan them
    for line in lines:
        msg = json.loads(line)
        u = msg["user"]
        if u not in users:
            users.append(u)
            totals.append(0)
        totals[users.index(u)] += count_tokens(msg["text"])
    return sorted(zip(users, totals), key=lambda p: (-p[1], p[0]))[:5]

if __name__ == "__main__":
    print(per_user(make_log()))
