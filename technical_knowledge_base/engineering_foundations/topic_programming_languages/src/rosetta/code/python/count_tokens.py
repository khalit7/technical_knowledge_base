"""Count tokens per user in a JSONL chat log; print the top 5. Spec: ../../PROGRAM.md"""
import json
import sys
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


def main(path: str) -> int:
    per_user: Counter[str] = Counter()
    lines = ok = bad = 0
    first_bad = 0
    try:
        f = open(path, encoding="utf-8")
    except OSError as e:
        print(f"error: cannot open {path}: {e.strerror}", file=sys.stderr)
        return 1
    with f:
        for lineno, line in enumerate(f, start=1):
            lines += 1
            try:
                rec = json.loads(line)
                user, text = rec["user"], rec["text"]
                if not isinstance(user, str) or not isinstance(text, str):
                    raise TypeError("user and text must be strings")
            except (ValueError, KeyError, TypeError):
                bad += 1
                first_bad = first_bad or lineno
                continue
            ok += 1
            per_user[user] += tokens(text)
    total = sum(per_user.values())
    print(f"lines {lines}  ok {ok}  malformed {bad} (first at line {first_bad})")
    print(f"users {len(per_user)}  tokens {total}")
    print("top 5 users by tokens:")
    top = sorted(per_user.items(), key=lambda kv: (-kv[1], kv[0]))[:5]
    for rank, (user, n) in enumerate(top, start=1):
        print(f"{rank:>2}. {user}  {n}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "chat.jsonl"))
