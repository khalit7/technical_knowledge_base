import json
LINES = ['{"user": "a", "text": "hi there"}', 'oops', '{"user": "b", "text": "ok"}']

# Eager: each stage builds and returns a full list. Lazy: the same stages with yield.
def read_list(lines):
    out = []
    for line in lines:
        print("  read  ", line[:12]); out.append(line)
    return out
def parse_list(lines):
    out = []
    for line in lines:
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            print("  parse  skip"); continue
        print("  parse ", msg["user"]); out.append(msg)
    return out
def count_list(msgs):
    out = []
    for m in msgs:
        n = len(m["text"].split()); print("  count ", m["user"], n); out.append(n)
    return out

def read_gen(lines):
    for line in lines:
        print("  read  ", line[:12]); yield line
def parse_gen(lines):
    for line in lines:
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            print("  parse  skip"); continue
        print("  parse ", msg["user"]); yield msg
def count_gen(msgs):
    for m in msgs:
        n = len(m["text"].split()); print("  count ", m["user"], n); yield n

print("eager (lists):")
print("total", sum(count_list(parse_list(read_list(LINES)))))
print("lazy (generators):")
print("total", sum(count_gen(parse_gen(read_gen(LINES)))))
