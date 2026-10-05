top = [("u0029", 9491), ("u0005", 4816)]
first = top[0]               # a reference to the tuple object, not to a slot in the list
for i in range(1000):
    top.append((f"x{i}", i))  # the list's internal array is reallocated several times
print(first, len(top))       # still fine: the tuple itself never moved
