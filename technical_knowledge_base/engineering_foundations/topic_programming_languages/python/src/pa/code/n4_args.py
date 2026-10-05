def add_item(xs):
    xs.append("new")           # mutates the object the caller passed

def replace(xs):
    xs = ["other"]             # rebinds the local name only

items = ["a"]
add_item(items)
replace(items)
print(items)

def bad(x, acc=[]):            # the default list is built ONCE, at def time
    acc.append(x)
    return acc

print(bad(1), bad(2))

def good(x, acc=None):
    if acc is None:
        acc = []
    acc.append(x)
    return acc

print(good(1), good(2))
