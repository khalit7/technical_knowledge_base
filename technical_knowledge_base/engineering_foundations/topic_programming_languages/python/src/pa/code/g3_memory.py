"""Peak memory of the same token count, eager lists against a lazy generator pipeline.
1,000,000 synthetic lines made on the fly; tracemalloc measures Python allocations."""
import tracemalloc

N = 1_000_000
def lines():
    for i in range(N):
        yield f'{{"user": "u{i % 200:04d}", "text": "token number {i} here"}}'

def eager():
    rows = list(lines())                         # every line in memory
    words = [len(r.split()) for r in rows]       # plus a list of counts
    return sum(words)

def lazy():
    return sum(len(r.split()) for r in lines())  # one line at a time

for fn in (eager, lazy):
    tracemalloc.start()
    total = fn()
    cur, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    print(f"{fn.__name__:5}  total={total}  peak={peak / 1024:9,.1f} KiB")
