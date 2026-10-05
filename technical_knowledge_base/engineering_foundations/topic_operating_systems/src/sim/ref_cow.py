"""Copy-on-write after fork (OSTEP chapter 5 for fork, chapter 23 for copy-on-write in complete VM systems).

A model of the parent's memory as pages, and of which pages the child writes:
- a Python list of n int objects: the list's pointer array (8 bytes per element) and the objects themselves
  (an int above the small-int cache is 28 bytes, stored in a 32-byte pymalloc block: 128 per 4 KiB page);
- a numpy int64 array of n numbers: one array object plus 8 bytes per number in one buffer.
Reading an object from Python writes its reference count (Py_INCREF), so that object's page is copied.
The model ignores allocator headers and the interpreter's own pages; the real run (real/cow.py) includes them.
"""
import math


def regions(n, kind, page=4096, obj=32):
    if kind == "list":
        return {"header": 1, "pointers": math.ceil(n * 8 / page), "objects": math.ceil(n * obj / page)}
    return {"header": 1, "data": math.ceil(n * 8 / page)}


def copied(n, kind, action, page=4096, obj=32):
    """Pages the child copies (first write to a shared page = one page fault and one 4 KiB copy)."""
    r = regions(n, kind, page, obj)
    if kind == "list" and action == "iterate":
        return r["header"] + r["objects"]
    return r["header"]  # len(list), numpy sum, numpy iterate: only the container object's refcount changes


def touch_order(n, kind, action, page=4096, obj=32):
    """For the animation: the object page index written by each element in turn (list iterate), else []."""
    if kind == "list" and action == "iterate":
        per = page // obj
        return [i // per for i in range(n)]
    return []
