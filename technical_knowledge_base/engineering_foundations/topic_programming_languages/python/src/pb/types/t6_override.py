class Tokenizer:
    def encode(self, text: str) -> list[int]:
        return [ord(c) for c in text]


class ByteTokenizer(Tokenizer):
    def encode(self, text: bytes) -> list[int]:
        return list(text)
