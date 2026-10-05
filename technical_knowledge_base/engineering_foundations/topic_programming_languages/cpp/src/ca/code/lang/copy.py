a = [1, 2, 3]
b = a          # no copy: a second name for the same list
b.append(4)
print(f"a has {len(a)}, b has {len(b)}")
