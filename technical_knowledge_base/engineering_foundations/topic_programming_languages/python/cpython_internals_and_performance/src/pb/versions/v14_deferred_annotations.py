def handle(msg: Message) -> Reply:  # Message and Reply are defined below
    return Reply(msg.text.upper())


class Message:
    def __init__(self, text: str) -> None:
        self.text = text


class Reply(Message):
    pass


print(handle(Message("hi")).text, handle.__annotations__["msg"].__name__)
