"""Shared parsing and printing for the benchmark variants of count_tokens (spec: rosetta/PROGRAM.md)."""
import json


def parse(line):
    """Return (user, text) for an ok line, or None for a malformed one (rule 2)."""
    try:
        rec = json.loads(line)
        user, text = rec["user"], rec["text"]
    except (ValueError, KeyError, TypeError):
        return None
    if not isinstance(user, str) or not isinstance(text, str):
        return None
    return user, text


def report(lines, ok, bad, first_bad, per_user):
    total = sum(per_user.values())
    print(f"lines {lines}  ok {ok}  malformed {bad} (first at line {first_bad})")
    print(f"users {len(per_user)}  tokens {total}")
    print("top 5 users by tokens:")
    top = sorted(per_user.items(), key=lambda kv: (-kv[1], kv[0]))[:5]
    for rank, (user, n) in enumerate(top, start=1):
        print(f"{rank:>2}. {user}  {n}")
