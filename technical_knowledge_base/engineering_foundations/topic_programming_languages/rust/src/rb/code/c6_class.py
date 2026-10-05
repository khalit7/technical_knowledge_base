import tokrs

c = tokrs.Counter()
c.add("u0029", "attention is all you need")
c.add("u0005", "x86_64 café")
c.add("u0029", "v2.1 of the model")
print(c, len(c), c.total)
print(c.top(), c.top(n=1))
for stmt in ["c.total = 0", "c.extra = 1", "class Mine(tokrs.Counter): pass", "c.add('u1')"]:
    try:
        exec(stmt)
        print(stmt, "-> ok")
    except Exception as e:
        print(stmt, "->", f"{type(e).__name__}: {e}")
