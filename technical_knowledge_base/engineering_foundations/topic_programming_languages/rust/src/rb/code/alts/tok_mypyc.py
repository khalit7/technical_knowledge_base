"""The Rosetta token loop, unchanged except for type hints; mypyc compiles it to a C extension."""


def tokens(text: str) -> int:
    n, inside = 0, False
    for ch in text:
        is_tok = ch.isascii() and ch.isalnum()
        if is_tok and not inside:
            n += 1
        inside = is_tok
    return n


def count_many(texts: list[str]) -> list[int]:
    return [tokens(t) for t in texts]
