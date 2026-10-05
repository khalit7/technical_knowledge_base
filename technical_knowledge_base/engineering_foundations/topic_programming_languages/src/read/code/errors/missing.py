per_user = {"u0029": 9491}
print(per_user.get("nobody"))          # None: the "no value" value
print(per_user.get("nobody", 0) + 1)   # you choose a default
print(per_user["nobody"] + 1)          # raises KeyError
