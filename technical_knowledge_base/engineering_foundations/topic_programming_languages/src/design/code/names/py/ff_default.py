def add(item, acc=[]):       # the default list is built once, at def time
    acc.append(item)
    return acc
print(add(1), add(2))
