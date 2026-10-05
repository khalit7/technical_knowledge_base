# Where do the records of a list live in memory? (CPython 3.14, default build, 64-bit)
# Reads the object headers directly with ctypes: [reference count, type pointer, ...].
import ctypes, json, sys
records = [(1000 + i, 1_000_000 + 7 * i) for i in range(4)]   # (user_id, tokens) pairs
word = lambda addr: ctypes.c_ssize_t.from_address(addr).value
items = ctypes.c_void_p.from_address(id(records) + 24).value     # PyListObject.ob_item: the pointer array
out = {"list": {"addr": id(records), "size": sys.getsizeof(records), "refcnt": word(id(records)), "ob_item": items},
       "slots": [ctypes.c_void_p.from_address(items + 8 * i).value for i in range(4)], "records": []}
# reference counts read before any loop variable holds a second reference
trc = [word(id(records[i])) for i in range(4)]
irc = [[word(id(records[i][0])), word(id(records[i][1]))] for i in range(4)]
print(f"list object   at {hex(id(records))}  {sys.getsizeof(records)} B  refcount {word(id(records))}  -> pointer array at {hex(items)}")
for i, rec in enumerate(records):
    u, t = rec
    print(f"slot {i}: {hex(out['slots'][i])} -> tuple at {hex(id(rec))} ({sys.getsizeof(rec)} B, refcount {trc[i]})"
          f" -> ints at {hex(id(u))} ({sys.getsizeof(u)} B, refcount {irc[i][0]}), {hex(id(t))} ({sys.getsizeof(t)} B, refcount {irc[i][1]})")
    out["records"].append({"tuple": id(rec), "tsize": sys.getsizeof(rec), "trc": trc[i],
                           "ints": [id(u), id(t)], "isize": [sys.getsizeof(u), sys.getsizeof(t)], "irc": irc[i]})
per = 8 + sys.getsizeof(records[0]) + sys.getsizeof(records[0][0]) + sys.getsizeof(records[0][1])
print(f"bytes per record: 8 (pointer) + {sys.getsizeof(records[0])} (tuple) + {sys.getsizeof(records[0][0]) + sys.getsizeof(records[0][1])} (two ints) = {per}; the data itself is 12 (a 4-byte id, an 8-byte count)")
out["per_record"] = per
json.dump(out, open("out/py_layout.json", "w"))
