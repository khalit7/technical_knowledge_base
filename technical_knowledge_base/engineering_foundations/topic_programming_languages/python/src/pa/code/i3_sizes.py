import sys
for v in [0, 1, 2**30, 2**60, 2**100, 1.5, "", "a", "é", "日", "🙂", b"", (), [], {}, set()]:
    print(f"{v!r:>40}  {type(v).__name__:6} {sys.getsizeof(v):4} bytes")
xs, last = [], None
growth = []
for i in range(33):
    size = sys.getsizeof(xs)
    if size != last:
        growth.append((len(xs), size))
        last = size
    xs.append(i)
print("list size jumps (length, bytes):", growth)
