import gc, sys, weakref

class Node:
    def __init__(self, name):
        self.name, self.other = name, None

a = Node("a")
print("refcount:", sys.getrefcount(a))          # +1 for getrefcount's own argument
b = a
print("refcount:", sys.getrefcount(a))
weakref.finalize(a, print, "  a freed")          # prints when the object dies
del a
print("del a: still alive through b")
del b                                            # count hits 0: freed immediately
print("del b done")

x, y = Node("x"), Node("y")
x.other, y.other = y, x                          # a reference cycle
weakref.finalize(x, print, "  x freed")
weakref.finalize(y, print, "  y freed")
del x, y                                         # counts never reach 0
print("after del x, y: nothing freed yet")
print("gc.collect() found", gc.collect(), "unreachable objects")
print("thresholds:", gc.get_threshold())
