"""Task: closures. A tally that remembers state, and the loop-capture trap."""
from collections.abc import Callable


def make_tally() -> Callable[[str, int], int]:
    counts: dict[str, int] = {}

    def add(user: str, n: int) -> int:
        counts[user] = counts.get(user, 0) + n   # the dict is captured by reference
        return counts[user]

    return add


add = make_tally()
add("u0029", 5)
print(add("u0029", 7), add("u0005", 3))

fns = [lambda: i for i in range(3)]
print([f() for f in fns])          # all see the last i
fns = [lambda i=i: i for i in range(3)]
print([f() for f in fns])          # default argument freezes each i
