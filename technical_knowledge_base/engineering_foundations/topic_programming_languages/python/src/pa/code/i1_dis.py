import dis

def total(xs):
    s = 0
    for x in xs:
        s = s + x
    return s

print("--- before running (generic instructions)")
dis.dis(total, adaptive=True)
total(list(range(1000)))            # warm up with ints only
print("--- after 1000 int additions (specialised in place)")
dis.dis(total, adaptive=True)
for _ in range(100):
    total([0.5] * 1000)             # now feed floats
print("--- after floats arrive (re-specialised)")
dis.dis(total, adaptive=True)
