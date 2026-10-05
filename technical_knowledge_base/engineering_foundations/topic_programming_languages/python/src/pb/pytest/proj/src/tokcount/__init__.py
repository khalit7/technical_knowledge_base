import json
import os
from collections import Counter
from pathlib import Path


def tokens(text: str) -> int:
    """Number of maximal runs of ASCII letters and digits (the root page's rule)."""
    n, inside = 0, False
    for ch in text:
        is_tok = ch.isascii() and ch.isalnum()
        if is_tok and not inside:
            n += 1
        inside = is_tok
    return n


def per_user(path: Path) -> Counter[str]:
    counts: Counter[str] = Counter()
    for line in path.read_text(encoding="utf-8").splitlines():
        rec = json.loads(line)
        counts[rec["user"]] += tokens(rec["text"])
    return counts


def limit() -> int:
    return int(os.environ.get("TOKCOUNT_LIMIT", "5"))
