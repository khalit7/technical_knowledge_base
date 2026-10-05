from typing import Protocol

class HasTokens(Protocol):            # structural: anything with a .tokens() method fits
    def tokens(self) -> int: ...

class Message:
    def __init__(self, text: str): self.text = text
    def tokens(self) -> int: return len(self.text.split())

class Batch:
    def __init__(self, msgs: list[Message]): self.msgs = msgs
    def tokens(self) -> int: return sum(m.tokens() for m in self.msgs)

def total(items: list[HasTokens]) -> int:
    return sum(x.tokens() for x in items)

print(total([Message("hello there"), Batch([Message("a b c"), Message("d")])]))
print(total([42]))                    # duck typing: fails only when .tokens() is called
