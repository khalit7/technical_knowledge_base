"""Memory for 100,000 small records, measured with tracemalloc (Python allocations only)."""
import tracemalloc
from collections import namedtuple
from dataclasses import dataclass

class Plain:
    def __init__(self, user, n): self.user, self.n = user, n
class Slotted:
    __slots__ = ("user", "n")
    def __init__(self, user, n): self.user, self.n = user, n
@dataclass
class DC:
    user: str; n: int
@dataclass(slots=True)
class DCS:
    user: str; n: int
NT = namedtuple("NT", "user n")

USERS = [f"u{i:04d}" for i in range(200)]       # shared strings, not counted per record
N = 100_000
kinds = [("class", Plain), ("class + __slots__", Slotted), ("dataclass", DC),
         ("dataclass(slots=True)", DCS), ("namedtuple", NT), ("tuple", lambda u, n: (u, n)),
         ("dict", lambda u, n: {"user": u, "n": n})]
for name, make in kinds:
    tracemalloc.start()
    rows = [make(USERS[i % 200], i % 250) for i in range(N)]   # small ints are cached: no int allocation
    cur, _ = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    del rows
    print(f"{name:22} {cur / N:6.1f} bytes per record")
