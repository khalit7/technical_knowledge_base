a = [1, 2]
b = a              # a second name for the same list object
b.append(3)
print(a, a is b)

x = 10
y = x
y += 1             # ints are immutable: += builds a new int and rebinds y
print(x, y)
