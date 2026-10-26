import argparse

lazy import httpx
lazy import pydantic
lazy from rich.console import Console


def tokens(text: str) -> int:
    return sum(1 for w in text.replace("_", " ").split() if w.isascii() and w.isalnum())


def main() -> None:
    p = argparse.ArgumentParser(prog="tokcli")
    p.add_argument("cmd", choices=["count", "fetch", "pretty"])
    p.add_argument("text")
    a = p.parse_args()
    if a.cmd == "count":  # the common, fast path: needs none of the heavy imports
        print(tokens(a.text))
    elif a.cmd == "fetch":
        print(httpx.get(a.text).status_code)
    else:
        Console().print(pydantic.TypeAdapter(list[str]).validate_python(a.text.split()))


main()
