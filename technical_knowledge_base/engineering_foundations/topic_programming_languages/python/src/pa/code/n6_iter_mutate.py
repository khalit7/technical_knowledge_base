xs = [1, 2, 2, 3]
for x in xs:
    if x == 2:
        xs.remove(x)           # shifts the list under the running iterator
print(xs)

xs = [1, 2, 2, 3]
xs = [x for x in xs if x != 2] # build a new list instead
print(xs)

d = {"a": 1, "b": 2}
try:
    for k in d:
        d[k + "2"] = 0
except RuntimeError as e:
    print("RuntimeError:", e)
