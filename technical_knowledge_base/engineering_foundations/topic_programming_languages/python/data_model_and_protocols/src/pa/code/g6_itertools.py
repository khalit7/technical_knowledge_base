import itertools as it

print(list(it.islice(it.count(10, 5), 4)))         # lazy slice of an infinite iterator
print(list(it.batched(range(7), 3)))               # 3.12+: fixed-size chunks
print(list(it.chain([1, 2], (3,), "ab")))
users = ["b", "a", "b", "a"]
print([(k, len(list(g))) for k, g in it.groupby(users)])          # groups RUNS, not keys
print([(k, len(list(g))) for k, g in it.groupby(sorted(users))])  # sort first
a, b = it.tee(iter([1, 2, 3]))
print(list(a), list(b))
