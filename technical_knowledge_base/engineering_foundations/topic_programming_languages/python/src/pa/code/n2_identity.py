a = [1, 2]
b = [1, 2]
print(a == b, a is b)          # equal values, two objects

x, y = 256, int("256")
print(x is y)                  # CPython keeps one shared object for -5..256
x, y = 257, int("257")
print(x is y)                  # outside that range: two objects
print(x == y)                  # == is the question you meant to ask
