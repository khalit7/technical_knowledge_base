from typing import Protocol


class Encoder(Protocol):
    def encode(self, text: str) -> list[int]: ...


class Whitespace:
    def encode(self, text: str) -> list[str]:
        return text.split()


def count(enc: Encoder, text: str) -> int:
    return len(enc.encode(text))


count(Whitespace(), "a b")
