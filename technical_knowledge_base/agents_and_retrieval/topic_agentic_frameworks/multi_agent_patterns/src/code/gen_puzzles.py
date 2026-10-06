"""Knights and knaves puzzles with exactly one solution (checked by brute force).
Knights always tell the truth, knaves always lie. Answer: a string of K/N in name order.
usage: python3 gen_puzzles.py <n_puzzles> <n_people> <seed> <out.json>
"""
import itertools, json, random, sys

NAMES = ["Ada", "Ben", "Cleo", "Dev", "Eli", "Fay", "Gus", "Hana", "Ivo", "Jun"]


def statements(R, i, n):
    others = [j for j in range(n) if j != i]
    k = R.randint(0, 6)
    a, b = R.sample(others, 2)
    if k == 0:
        return (f"{NAMES[a]} is a knave.", lambda s: not s[a])
    if k == 1:
        return (f"{NAMES[a]} and {NAMES[b]} are the same kind.", lambda s: s[a] == s[b])
    if k == 2:
        return (f"{NAMES[a]} and {NAMES[b]} are different kinds.", lambda s: s[a] != s[b])
    if k == 3:
        m = R.randint(1, n - 1)
        return (f"Exactly {m} of us {n} are knights.", lambda s: sum(s) == m)
    if k == 4:
        return (f"If {NAMES[a]} is a knight, then {NAMES[b]} is a knave.", lambda s: (not s[a]) or (not s[b]))
    if k == 5:
        return (f"At least one of {NAMES[a]} and {NAMES[b]} is a knave.", lambda s: (not s[a]) or (not s[b]))
    m = R.randint(1, 2)
    return (f"At most {m} of {NAMES[a]}, {NAMES[b]} and I are knights.", lambda s: s[a] + s[b] + s[i] <= m)


def main():
    count, n, seed, out = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    R = random.Random(seed)
    puzzles, tries = [], 0
    while len(puzzles) < count:
        tries += 1
        st = [statements(R, i, n) for i in range(n)]
        sols = [s for s in itertools.product([True, False], repeat=n)
                if all(s[i] == st[i][1](s) for i in range(n))]
        if len(sols) != 1:
            continue
        text = "\n".join(f"{NAMES[i]} says: \"{st[i][0]}\"" for i in range(n))
        ans = "".join("K" if x else "N" for x in sols[0])
        puzzles.append(dict(id=f"p{len(puzzles) + 1:02d}", people=NAMES[:n], text=text, answer=ans))
    json.dump(dict(n_people=n, seed=seed, tries=tries, puzzles=puzzles), open(out, "w"), indent=1)
    print(len(puzzles), "puzzles from", tries, "tries")


main()
