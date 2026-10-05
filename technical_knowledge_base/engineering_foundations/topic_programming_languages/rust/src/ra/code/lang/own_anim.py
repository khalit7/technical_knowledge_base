# The same steps in Python: names point at objects; nothing is moved.
import sys
v = [10, 20, 30]
print("1 v id=%#x refcount=%d len=%d" % (id(v), sys.getrefcount(v) - 1, len(v)))
r = v
print("2 r id=%#x (same object) refcount=%d" % (id(r), sys.getrefcount(v) - 1))
v.append(40)
print("3 v id=%#x r sees %s" % (id(v), r))
m = v
m[0] = 11
print("4 m id=%#x refcount=%d v=%s" % (id(m), sys.getrefcount(v) - 1, v))
w = v
print("5 w id=%#x refcount=%d (v still usable: %s)" % (id(w), sys.getrefcount(v) - 1, v))
c = w.copy()
print("6 c id=%#x (new object) refcount=%d" % (id(c), sys.getrefcount(c) - 1))
del w
print("7 del w: object still alive, refcount=%d (v, r, m remain)" % (sys.getrefcount(v) - 1))
print("8 c=%s v=%s" % (c, v))
