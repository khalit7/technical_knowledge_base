import tokrs

good = '{"user": "u0029", "text": "attention is all you need"}'
print(tokrs.parse_line(good))
for line in ['{"user": 17, "text": "hi"}', '{"user": "u1", "text": "unterminated', "   "]:
    try:
        tokrs.parse_line(line)
    except tokrs.MalformedLine as e:
        print("MalformedLine:", e)
    except ValueError as e:
        print("ValueError:", e)
print(tokrs.MalformedLine.__mro__)

try:
    tokrs.tally_file("no_such_file.jsonl")
except OSError as e:
    print(f"{type(e).__name__}: {e}")

print(tokrs.first_token_len("hello world"))
try:
    tokrs.first_token_len("!!!")
except Exception as e:
    print("caught by except Exception:", type(e).__name__)
except BaseException as e:
    print("only caught by except BaseException:", type(e).__name__, "|", e)
    print(type(e).__mro__)
