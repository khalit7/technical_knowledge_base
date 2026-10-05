def make_counter():
    count = 0
    def inc():
        nonlocal count            # without this, count += 1 is an UnboundLocalError
        count += 1
        return count
    return inc

c = make_counter()
print(c(), c(), c(), c.__closure__[0].cell_contents)

fs = [lambda: i for i in range(3)]       # every lambda reads the SAME variable i, later
print([f() for f in fs])
fs = [lambda i=i: i for i in range(3)]   # a default is evaluated now: one value each
print([f() for f in fs])

def broken():
    total = 0
    def add(x):
        total += x                       # assignment makes total local to add
    add(1)
try:
    broken()
except UnboundLocalError as e:
    print("UnboundLocalError:", e)
