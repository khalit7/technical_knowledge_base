fs = [lambda: i for i in range(3)]   # each lambda sees the variable, not its value
print([f() for f in fs])
