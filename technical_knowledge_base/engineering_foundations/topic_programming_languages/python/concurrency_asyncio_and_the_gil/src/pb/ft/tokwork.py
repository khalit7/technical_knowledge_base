"""The workload for the free-threading, JIT and subinterpreter measurements:
the root page's count_tokens rules (src/rosetta/PROGRAM.md) applied to a slice of JSONL lines."""
import json
from collections import Counter


def tokens(text: str) -> int:
    """Number of maximal runs of ASCII letters and digits."""
    n, inside = 0, False
    for ch in text:
        is_tok = ch.isascii() and ch.isalnum()
        if is_tok and not inside:
            n += 1
        inside = is_tok
    return n


def parse(line: str):
    try:
        rec = json.loads(line)
        user, text = rec["user"], rec["text"]
        if isinstance(user, str) and isinstance(text, str):
            return user, text
    except (ValueError, KeyError, TypeError):
        pass
    return None


def count_slice(lines: list[str]) -> Counter:
    """Correct parallel pattern: each worker fills its own Counter; the caller merges."""
    per_user: Counter = Counter()
    for line in lines:
        r = parse(line)
        if r:
            per_user[r[0]] += tokens(r[1])
    return per_user


def count_into(shared: dict, lines: list[str], lock=None) -> None:
    """Racy pattern: every worker updates one shared dict (read, add, write back)."""
    for line in lines:
        r = parse(line)
        if r:
            n = tokens(r[1])
            if lock is None:
                shared[r[0]] = shared.get(r[0], 0) + n
            else:
                with lock:
                    shared[r[0]] = shared.get(r[0], 0) + n
