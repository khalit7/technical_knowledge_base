import sys

with open(__file__) as f:
    print("utf8_mode:", sys.flags.utf8_mode, "| open() encoding:", f.encoding)
