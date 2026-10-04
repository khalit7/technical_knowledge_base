def chunk(text: str, size: int, overlap: int) -> list[str]:
    if not 0 <= overlap < size:
        raise ValueError("need 0 <= overlap < size")
    if not text:
        return []
    step = size - overlap
    # start a window wherever there is still text the previous window did not cover
    return [text[i:i + size] for i in range(0, max(len(text) - overlap, 1), step)]


def unchunk(chunks: list[str], overlap: int) -> str:
    if not chunks:
        return ""
    return chunks[0] + "".join(c[overlap:] for c in chunks[1:])
