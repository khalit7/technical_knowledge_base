t = ([1], 2)
try:
    t[0] += [3]                # list += mutates in place, THEN tuple item assignment fails
except TypeError as e:
    print("TypeError:", e)
print(t)

cache = {}
try:
    cache[[1, 2]] = "x"        # a list cannot be a dict key
except TypeError as e:
    print("TypeError:", e)
cache[(1, 2)] = "x"            # a tuple of hashables can
print(cache)
