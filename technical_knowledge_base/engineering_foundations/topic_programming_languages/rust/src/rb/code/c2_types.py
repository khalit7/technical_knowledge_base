import tokrs

calls = [
    'tokrs.count_tokens(5)',
    'tokrs.count_tokens(b"raw bytes")',
    'tokrs.count_tokens(text="keyword works")',
    'tokrs.count_many(["fine", 3])',
    'tokrs.count_many(("a", "tuple"))',
    'tokrs.count_many_owned(("a", "tuple"))',
    'tokrs.count_many_owned("abc")',
    'tokrs.count_bytes("a str")',
    'tokrs.count_tokens("\\ud800 lone surrogate")',
]
for c in calls:
    try:
        r = eval(c)
        print(f"{c}\n  -> {r!r}")
    except Exception as e:
        notes = "".join(f" ({n})" for n in getattr(e, "__notes__", []))
        print(f"{c}\n  -> {type(e).__name__}: {e}{notes}")
