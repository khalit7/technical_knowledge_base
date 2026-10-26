"""The hero of "Python: the essentials": three lines, and what each one does to names, objects and methods."""
import dis, sys

x = [1, 2]
print("refs to the list after x = [1, 2]:", sys.getrefcount(x) - 1)   # getrefcount counts its own argument; subtract it
y = x
print("after y = x:      y is x ->", y is x, "| refs:", sys.getrefcount(x) - 1)
y.append(3)
print("after y.append(3): x ->", x)
z = x + [4]
rz = sys.getrefcount(z) - 1   # measured before print, whose argument tuple would hold one more
print("after z = x + [4]: x ->", x, "| z ->", z, "| z is x ->", z is x, "| refs to z:", rz)
print("x + [4] calls      ->", type(x).__add__)
print("y.append is found on ->", type(y).append)

print("\nbytecode of the three lines (dis, CPython", sys.version.split()[0] + "):")
dis.dis(compile("y = x\ny.append(3)\nz = x + [4]", "<hero>", "exec"))
