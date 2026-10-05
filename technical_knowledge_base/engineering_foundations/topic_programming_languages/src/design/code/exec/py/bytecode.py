import dis

def add(a, b):
    return a + b

dis.dis(add)                   # the bytecode CPython's loop will interpret
print(add(2, 3), add("2", "3"))  # one BINARY_OP serves ints and strings
