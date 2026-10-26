import sys

v = [1.0, 2.0, 3.0]
print("v is a name bound to a list object:", sys.getsizeof(v), "bytes on the heap")
print("the list holds", len(v), "pointers; each points at its own float object of", sys.getsizeof(v[0]), "bytes")
print("references to the list:", sys.getrefcount(v) - 1, "(the name v); it is freed when that count reaches 0")
del v
print("after del v: the count reached 0 and CPython freed the list (no destructor call you can see)")
