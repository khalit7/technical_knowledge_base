"""Task: report why each malformed line fails, then let one error escape."""
import json
import sys


class BadLine(Exception):
    """Our own error type: one line of the log could not be used."""


def parse(line: str) -> tuple[str, str]:
    try:
        rec = json.loads(line)
    except json.JSONDecodeError as e:
        raise BadLine(f"invalid JSON: {e}") from e
    if not isinstance(rec, dict):
        raise BadLine("not a JSON object")
    user, text = rec.get("user"), rec.get("text")
    if not isinstance(user, str) or not isinstance(text, str):
        raise BadLine(f"user/text must be strings, got {type(user).__name__}/{type(text).__name__}")
    return user, text


with open(sys.argv[1], encoding="utf-8") as f:
    for n, line in enumerate(f, start=1):
        try:
            parse(line)
        except BadLine as e:
            print(f"line {n}: {e}")

print("now without try/except:")
parse("not json at all")
