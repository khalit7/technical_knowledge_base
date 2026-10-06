import sys
from .core import word_count, top_words


def main(argv):
    if len(argv) != 2:
        print("usage: python3 -m textstats FILE")
        return 2
    with open(argv[1], encoding="utf-8") as f:
        text = f.read()
    print(f"words: {word_count(text)}")
    print("top: " + ", ".join(f"{w}={c}" for w, c in top_words(text)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
