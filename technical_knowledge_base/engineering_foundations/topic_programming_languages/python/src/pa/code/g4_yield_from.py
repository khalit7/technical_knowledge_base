def flatten(xs):
    for x in xs:
        if isinstance(x, list):
            yield from flatten(x)       # delegate to a sub-generator
        else:
            yield x

print(list(flatten([1, [2, [3, 4]], 5])))

def worker():
    total = 0
    while (x := (yield)) is not None:   # receives values sent in
        total += x
    return total                        # becomes the value of `yield from`

def manager(results):
    results.append((yield from worker()))

res = []
g = manager(res)
next(g)                                 # run to the first yield
for v in (10, 20, 30):
    g.send(v)
try:
    g.send(None)
except StopIteration:
    pass
print(res)
