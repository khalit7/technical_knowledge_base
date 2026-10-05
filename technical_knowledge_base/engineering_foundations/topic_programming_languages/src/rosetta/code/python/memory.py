"""Task: where do 8 timestamps live in memory? (CPython 3.14, 64-bit)"""
import ctypes
import sys

ts = [1759650000 + 7 * i for i in range(8)]       # 8 fresh int objects
buf = ctypes.c_void_p.from_address(id(ts) + 24).value  # PyListObject.ob_item: the pointer array
print(f"list object at {id(ts):#x}, pointer array at {buf:#x}, 8 bytes per slot")
print(f"each int object: {sys.getsizeof(ts[0])} bytes")
for i, x in enumerate(ts):
    print(f"ts[{i}] slot {buf + 8 * i:#x} -> object {id(x):#x}  value {x}")
order = [3, 0, 6, 1, 7, 2, 5, 4]                   # e.g. after sorting by user
re = [ts[i] for i in order]
print("same objects, new order:", " ".join(f"{id(x):#x}" for x in re))
