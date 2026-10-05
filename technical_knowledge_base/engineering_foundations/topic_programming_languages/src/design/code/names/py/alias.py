a = [1, 2, 3]
b = a            # b is a second name for the same list
b.append(4)
print(a, a is b)
b = b + [5]      # + builds a new list; b now names it
print(a, b)
