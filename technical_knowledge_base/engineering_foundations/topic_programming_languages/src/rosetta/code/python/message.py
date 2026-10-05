"""Task: a Message type; what happens when you 'copy' it and change the copy."""
from dataclasses import dataclass, replace

from count_tokens import tokens


@dataclass
class Message:
    user: str
    text: str

    def tokens(self) -> int:
        return tokens(self.text)


a = Message("u0029", "hello world")
b = a                      # a second name for the SAME object
b.text = "changed"
print(a.text, a is b)      # a changed too

c = replace(a, text="copy")  # a real copy
print(a.text, c.text, a is c)
print(c, c.tokens())
