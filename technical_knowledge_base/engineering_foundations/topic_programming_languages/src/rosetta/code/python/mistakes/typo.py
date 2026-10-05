from dataclasses import dataclass


@dataclass
class Message:
    user: str
    text: str


def owner(m: Message) -> str:
    return m.usr  # typo


print("starting")
print(owner(Message("u0029", "hi")))
