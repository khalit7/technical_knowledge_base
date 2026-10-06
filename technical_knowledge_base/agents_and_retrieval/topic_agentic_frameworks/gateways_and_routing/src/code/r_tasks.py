"""Router experiment task set: 48 questions with exact, checkable answers, in four families of 12.
Deterministic (seed 7). Written for this page (no public set fits: we need answers we can grade by exact match,
and a spread of difficulty for a 4B local model). Families:
  facts   one-step facts and conversions
  arith   multi-step arithmetic word problems, 2 to 7 steps
  code    "what does this Python print?" on small loops
  letters counting a letter in a made-up word, or reversing a word
"""
import json, random, sys

rng = random.Random(7)
T = []

facts = [("What is the capital of Australia?", "canberra"), ("How many minutes are in 3.5 hours?", "210"),
         ("What is the chemical symbol for sodium?", "na"), ("How many sides does a hexagon have?", "6"),
         ("What is 15% of 240?", "36"), ("Which planet is closest to the Sun?", "mercury"),
         ("How many grams are in 2.5 kilograms?", "2500"), ("What is the square root of 144?", "12"),
         ("In which year did the Berlin Wall fall?", "1989"), ("How many bits are in 4 bytes?", "32"),
         ("What is the capital of Canada?", "ottawa"), ("How many seconds are in 2 minutes and 15 seconds?", "135")]
for q, a in facts:
    T.append({"family": "facts", "q": q, "a": a})

names = ["Ana", "Ben", "Chen", "Dev", "Eli", "Fay"]
for i in range(12):
    steps = 2 + i // 2  # 2..7 steps
    x = rng.randint(20, 90)
    who = rng.choice(names)
    parts = [f"{who} starts with {x} marbles."]
    for s in range(steps):
        op = rng.choice(["gain", "lose", "double", "give"])
        if op == "gain":
            n = rng.randint(3, 40); x += n; parts.append(f"Then {who} wins {n} more.")
        elif op == "lose" and x > 10:
            n = rng.randint(1, min(30, x - 1)); x -= n; parts.append(f"Then {who} loses {n}.")
        elif op == "double" and x < 400:
            x *= 2; parts.append(f"Then {who}'s collection doubles.")
        else:
            k = rng.choice([2, 3, 4]); r = x % k
            give = x // k; x -= give; parts.append(f"Then {who} gives away one {['', '', 'half', 'third', 'quarter'][k]} of the marbles (rounded down).")
    parts.append(f"How many marbles does {who} have now?")
    T.append({"family": "arith", "q": " ".join(parts), "a": str(x), "steps": steps})

codes = []
for i in range(12):
    n = rng.randint(3, 6 + i // 2)
    a0, m = rng.randint(1, 5), rng.randint(2, 4)
    kind = i % 3
    if kind == 0:
        src = f"t = {a0}\nfor i in range({n}):\n    t = t * {m} - i\nprint(t)"
        t = a0
        for j in range(n):
            t = t * m - j
    elif kind == 1:
        src = f"xs = [{', '.join(str(rng.randint(1, 9)) for _ in range(n + 2))}]\nprint(sum(x for i, x in enumerate(xs) if i % 2 == 1) - max(xs))"
        xs = eval(src.split("\n")[0].split("=", 1)[1]); t = sum(x for k, x in enumerate(xs) if k % 2 == 1) - max(xs)
    else:
        src = f"s = 0\nk = {a0}\nwhile k < {a0 + 6 * n}:\n    if k % 3 == 0:\n        s += k\n    k += {m}\nprint(s)"
        s, k = 0, a0
        while k < a0 + 6 * n:
            if k % 3 == 0:
                s += k
            k += m
        t = s
    T.append({"family": "code", "q": "What does this Python program print?\n\n" + src, "a": str(t)})

syll = ["ra", "bel", "tor", "mi", "sk", "rr", "on", "qua", "ter", "rin", "lo", "rrap"]
for i in range(12):
    w = "".join(rng.choice(syll) for _ in range(3 + i // 3))
    if i % 2 == 0:
        T.append({"family": "letters", "q": f"How many times does the letter r appear in the word '{w}'?", "a": str(w.count("r"))})
    else:
        T.append({"family": "letters", "q": f"Write the word '{w}' backwards, letter by letter, as one word.", "a": w[::-1]})

for i, t in enumerate(T):
    t["id"] = f"q{i:02d}"
if __name__ == "__main__":
    json.dump(T, open(sys.argv[1], "w"), indent=1)
    print(len(T))
