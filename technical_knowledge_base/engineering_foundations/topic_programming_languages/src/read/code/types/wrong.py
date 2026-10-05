def count_tokens(text: str) -> int:
    n, inside = 0, False
    for ch in text:
        tok = ch.isascii() and ch.isalnum()
        if tok and not inside:
            n += 1
        inside = tok
    return n

print(count_tokens("x86_64 café"))
print(count_tokens(42))          # wrong type: a user id instead of the message text
