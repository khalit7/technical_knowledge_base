def parse(s: str) -> int:
    return int(s)              # raises ValueError on bad input

try:
    parse("4x2")
except ValueError as e:
    print("caught:", e)
parse("4x2")                   # not caught: the program stops with a traceback
