import gc, sys
a = []
b = a
print(sys.getrefcount(a))   # names a, b, plus the call's own argument
class Node: pass
n = Node()
n.me = n                    # a cycle: its count can never reach zero
del n
print(gc.collect())         # the cycle collector finds and frees it
