from typing import TypedDict


class Message(TypedDict):
    user: str
    text: str


def length(m: Message) -> int:
    return len(m["txt"])
