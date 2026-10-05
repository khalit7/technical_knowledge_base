class Vec:
    def __init__(self, *xs):
        self.xs = tuple(xs)
    def __repr__(self):                 # what the REPL and debuggers show
        return f"Vec{self.xs}"
    def __len__(self):                  # len(v)
        return len(self.xs)
    def __iter__(self):                 # for, list(), unpacking, sum()
        return iter(self.xs)
    def __getitem__(self, i):           # v[i], v[1:]
        return self.xs[i]
    def __eq__(self, other):            # ==
        if not isinstance(other, Vec):
            return NotImplemented       # "I don't know": let Python try the other side
        return self.xs == other.xs
    def __hash__(self):                 # dict keys, set members; must agree with ==
        return hash(self.xs)
    def __add__(self, other):           # v + w
        if not isinstance(other, Vec):
            return NotImplemented
        return Vec(*(a + b for a, b in zip(self.xs, other.xs, strict=True)))
    def __radd__(self, other):          # 0 + v, which sum() does first
        return self if other == 0 else NotImplemented
    def __bool__(self):                 # if v:
        return any(self.xs)

v, w = Vec(1, 2), Vec(3, 4)
print(v + w, len(v), list(v), 2 in v, v[-1])
print(sum([v, w, Vec(10, 10)]))
print(v == Vec(1, 2), len({v, Vec(1, 2)}), bool(Vec(0, 0)))
print(v == (1, 2))
try:
    v + 1
except TypeError as e:
    print("TypeError:", e)
