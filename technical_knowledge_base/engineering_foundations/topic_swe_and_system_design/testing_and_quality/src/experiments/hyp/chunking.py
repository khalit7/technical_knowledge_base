def chunk(text: str, size: int, overlap: int) -> list[str]:
    """Split text into windows of `size` characters; neighbours share `overlap` characters.
    Used to cut uploaded documents into pieces before embedding them for retrieval."""
    if not 0 <= overlap < size:
        raise ValueError("need 0 <= overlap < size")
    step = size - overlap
    return [text[i:i + size] for i in range(0, len(text) - size + 1, step)]


def unchunk(chunks: list[str], overlap: int) -> str:
    """Inverse of chunk: glue the windows back, dropping each repeated overlap."""
    if not chunks:
        return ""
    return chunks[0] + "".join(c[overlap:] for c in chunks[1:])
