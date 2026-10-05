# Read a small file into memory: the Python way.
with open("/work/hello.txt") as f:      # io.open -> FileIO -> open(2)
    s = f.read()                          # BufferedReader/TextIOWrapper -> read(2)
print(len(s))
