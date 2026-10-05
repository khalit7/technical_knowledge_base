# cython: language_level=3, boundscheck=False, wraparound=False
# The Rosetta token loop with C types: Cython compiles it to C against the CPython API.
cpdef long tokens(str text):
    cdef long n = 0
    cdef bint inside = False, t
    cdef Py_UCS4 ch
    for ch in text:
        t = (ch < 128) and ((ch >= 48 and ch <= 57) or (ch >= 65 and ch <= 90) or (ch >= 97 and ch <= 122))
        if t and not inside:
            n += 1
        inside = t
    return n

cpdef list count_many(list texts):
    return [tokens(t) for t in texts]
