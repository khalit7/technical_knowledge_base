"""Task: one generic top_k used for two different element types."""
from collections.abc import Callable, Iterable


def top_k[T](items: Iterable[T], k: int, key: Callable[[T], int]) -> list[T]:
    return sorted(items, key=key, reverse=True)[:k]


counts = [("u0005", 4816), ("u0029", 9491), ("u0042", 3499)]
print(top_k(counts, 2, key=lambda kv: kv[1]))
words = ["kernel", "a", "attention", "GPU"]
print(top_k(words, 2, key=len))
print(top_k([0.5, float("nan"), 2.0], 2, key=lambda x: x))  # type says int; Python runs it anyway
