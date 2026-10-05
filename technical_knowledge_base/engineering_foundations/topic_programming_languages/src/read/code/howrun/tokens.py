def count_tokens(text: str) -> int:
    n, inside = 0, False
    for ch in text:
        tok = ch.isascii() and ch.isalnum()
        if tok and not inside:
            n += 1
        inside = tok
    return n
